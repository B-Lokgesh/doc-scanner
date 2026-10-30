import {
  DocumentTypeItem,
  VerificationResult,
  DashboardStats,
  HistoryItem,
  DemoSample,
  CrossVerifyResult,
  User,
  AuthResponse,
  UserDocumentItem,
  UserDocumentListResponse,
  DuplicateCheckResponse,
  PersonalAnalyticsResponse,
} from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// -------------------------------------------------------------
// System & Types
// -------------------------------------------------------------

export async function fetchHealth(): Promise<{
  status: string;
  version: string;
  database_connected: boolean;
}> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDocumentTypes(): Promise<DocumentTypeItem[]> {
  const res = await fetch(`${API_BASE}/document-types`);
  if (!res.ok) throw new Error('Failed to load document types');
  return res.json();
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

export async function apiSignup(data: {
  full_name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Signup failed');
  }
  const result: AuthResponse = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function apiLogin(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid email or password');
  }
  const result: AuthResponse = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function apiGetMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Unauthorized or session expired');
  }
  return res.json();
}

export async function apiUpdateProfile(fullName: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ full_name: fullName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update profile');
  }
  return res.json();
}

export async function apiChangePassword(data: {
  old_password: string;
  new_password: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to change password');
  }
  return res.json();
}

export async function apiForgotPassword(email: string): Promise<{ message: string; reset_code_debug?: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to initiate password reset');
  }
  return res.json();
}

export async function apiResetPassword(data: {
  email: string;
  token: string;
  new_password: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reset password');
  }
  return res.json();
}

export async function apiDeleteAccount(password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/account`, {
    method: 'DELETE',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete account');
  }
  setAuthToken(null);
  return res.json();
}

// -------------------------------------------------------------
// Verification Operations
// -------------------------------------------------------------

export async function checkDuplicateDocument(file: File): Promise<DuplicateCheckResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/verifications/check-duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    return { is_duplicate: false, file_hash: '' };
  }
  return res.json();
}

export async function uploadAndVerifyDocument(
  file: File,
  documentType: string
): Promise<VerificationResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const res = await fetch(`${API_BASE}/verifications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Document verification request failed');
  }

  return res.json();
}

export async function fetchVerificationResult(referenceId: string): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/verifications/${referenceId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('Access denied: this verification belongs to another account');
    throw new Error('Verification result not found');
  }
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
  return res.json();
}

export async function fetchHistory(params?: {
  search?: string;
  document_type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; limit: number; offset: number; items: HistoryItem[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.document_type) query.append('document_type', params.document_type);
  if (params?.status) query.append('status', params.status);
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.offset) query.append('offset', params.offset.toString());

  const res = await fetch(`${API_BASE}/history?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load verification history');
  return res.json();
}

export async function deleteVerificationRecord(referenceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/verifications/${referenceId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('Access denied: you cannot delete another user\'s verification');
    throw new Error('Failed to delete verification record');
  }
}

export async function purgeAllData(): Promise<void> {
  const res = await fetch(`${API_BASE}/settings/purge`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to purge data');
}

export async function fetchDemoSamples(): Promise<DemoSample[]> {
  const res = await fetch(`${API_BASE}/demo/samples`);
  if (!res.ok) throw new Error('Failed to fetch demo samples');
  return res.json();
}

export async function verifyDemoSample(sampleId: string): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/demo/verify-sample/${sampleId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to run demo sample verification');
  return res.json();
}

export function getReportDownloadUrl(referenceId: string): string {
  const token = getAuthToken();
  const url = `${API_BASE}/verifications/${referenceId}/report`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export function getDocumentPreviewUrl(referenceId: string): string {
  const token = getAuthToken();
  const url = `${API_BASE}/documents/${referenceId}/preview`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export async function crossVerifyDocument(
  referenceId: string,
  file: File,
  documentType: string,
  primaryFields: any[]
): Promise<CrossVerifyResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  formData.append('primary_fields_json', JSON.stringify(primaryFields || []));

  const res = await fetch(`${API_BASE}/verifications/${referenceId}/cross-verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Supporting document cross-verification failed');
  }

  return res.json();
}

// -------------------------------------------------------------
// My_Doc Personal Document Manager
// -------------------------------------------------------------

export async function fetchUserDocuments(params?: {
  category?: string;
  search?: string;
}): Promise<UserDocumentListResponse> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/my-doc?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load My_Doc documents');
  return res.json();
}

export async function uploadUserDocument(
  file: File,
  category: string = 'other',
  notes?: string
): Promise<UserDocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (notes) formData.append('notes', notes);

  const res = await fetch(`${API_BASE}/my-doc/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document to My_Doc');
  }
  return res.json();
}

export async function checkMyDocDuplicate(file: File): Promise<DuplicateCheckResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/my-doc/check-duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) return { is_duplicate: false, file_hash: '' };
  return res.json();
}

export async function renameUserDocument(
  docId: number,
  newFilename: string,
  category?: string,
  notes?: string
): Promise<UserDocumentItem> {
  const res = await fetch(`${API_BASE}/my-doc/${docId}/rename`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      new_filename: newFilename,
      category,
      notes,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update document details');
  }
  return res.json();
}

export async function deleteUserDocument(docId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/my-doc/${docId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

export async function verifyStoredDocument(
  docId: number,
  documentType: string
): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/my-doc/${docId}/verify`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ document_type: documentType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Verification of stored document failed');
  }
  return res.json();
}

export function getUserDocDownloadUrl(docId: number): string {
  const token = getAuthToken();
  const url = `${API_BASE}/my-doc/${docId}/download`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export function getUserDocPreviewUrl(docId: number): string {
  const token = getAuthToken();
  const url = `${API_BASE}/my-doc/${docId}/preview`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

// -------------------------------------------------------------
// Personal Analytics
// -------------------------------------------------------------

export async function fetchPersonalAnalytics(): Promise<PersonalAnalyticsResponse> {
  const res = await fetch(`${API_BASE}/analytics/personal`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch personal analytics');
  return res.json();
}
