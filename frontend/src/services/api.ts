import {
  DocumentTypeItem,
  VerificationResult,
  DashboardStats,
  HistoryItem,
  DemoSample,
} from '../types';

const API_BASE = '/api';

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

export async function uploadAndVerifyDocument(
  file: File,
  documentType: string
): Promise<VerificationResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const res = await fetch(`${API_BASE}/verifications`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Document verification request failed');
  }

  return res.json();
}

export async function fetchVerificationResult(referenceId: string): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/verifications/${referenceId}`);
  if (!res.ok) throw new Error('Verification result not found');
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
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

  const res = await fetch(`${API_BASE}/history?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load verification history');
  return res.json();
}

export async function deleteVerificationRecord(referenceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/verifications/${referenceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete verification record');
}

export async function purgeAllData(): Promise<void> {
  const res = await fetch(`${API_BASE}/settings/purge`, {
    method: 'POST',
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
  });
  if (!res.ok) throw new Error('Failed to run demo sample verification');
  return res.json();
}

export function getReportDownloadUrl(referenceId: string): string {
  return `${API_BASE}/verifications/${referenceId}/report`;
}

export function getDocumentPreviewUrl(referenceId: string): string {
  return `${API_BASE}/documents/${referenceId}/preview`;
}
