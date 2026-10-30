export type DocumentCategoryId =
  | 'aadhaar'
  | 'pan'
  | 'passport'
  | 'driving_licence'
  | 'voter_id'
  | 'educational_certificate'
  | 'bank_statement'
  | 'income_certificate'
  | 'other';

export interface DocumentTypeItem {
  id: DocumentCategoryId;
  name: string;
  description: string;
  supported_formats: string[];
  max_size_mb: number;
  has_deterministic_rules: boolean;
  limitations_note: string;
}

export type CheckResult = 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED' | 'INFO';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FinalStatus =
  | 'VERIFIED AGAINST AVAILABLE RULES'
  | 'INVALID'
  | 'REQUIRES MANUAL REVIEW'
  | 'UNABLE TO VERIFY';

export interface CheckItem {
  id?: number;
  check_name: string;
  result: CheckResult;
  severity: Severity;
  explanation: string;
  evidence_reference?: string;
}

export interface ExtractedFieldItem {
  id?: number;
  field_name: string;
  normalized_value: string | null;
  raw_value: string | null;
  extraction_confidence: number;
  is_sensitive: boolean;
}

export interface ProcessingEventItem {
  stage: string;
  event_status: string;
  message?: string;
  created_at?: string;
}

export interface VerificationResult {
  reference_id: string;
  document_type: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  processing_status: string;
  final_status: FinalStatus;
  summary: string;
  created_at: string;
  completed_at?: string;
  checks: CheckItem[];
  extracted_fields: ExtractedFieldItem[];
  events: ProcessingEventItem[];
  passed_checks_count: number;
  failed_checks_count: number;
  warning_checks_count: number;
  recommended_next_steps: string[];
  suggested_type?: string | null;
  suggested_type_name?: string | null;
  detected_category?: string;
  user_id?: number | null;
  source_document_id?: number | null;
  is_duplicate?: boolean;
  duplicate_of_reference_id?: string | null;
}

export interface FieldComparison {
  field: string;
  label: string;
  primary_value: string;
  supporting_value: string;
  match: boolean;
  both_present: boolean;
}

export interface CrossVerifyResult {
  reference_id: string;
  supporting_document_type: string;
  supporting_verification: VerificationResult;
  field_comparison: FieldComparison[];
  matched_fields: number;
  total_comparable_fields: number;
  overall_identity_match: boolean;
  cross_verify_status: 'IDENTITY_CONFIRMED' | 'IDENTITY_MISMATCH' | 'INSUFFICIENT_DATA';
  cross_verify_summary: string;
}

export interface HistoryItem {
  id: number;
  reference_id: string;
  document_type: string;
  original_filename: string;
  final_status: string;
  created_at: string;
  file_size: number;
  failed_checks_count: number;
  user_id?: number | null;
  source_document_id?: number | null;
  is_duplicate?: boolean;
}

export interface DashboardStats {
  total_processed: number;
  verified_count: number;
  invalid_count: number;
  requires_review_count: number;
  unable_to_verify_count: number;
  recent_verifications: HistoryItem[];
  status_distribution: {
    verified: number;
    invalid: number;
    requires_review: number;
    unable_to_verify: number;
  };
  document_type_distribution: Record<string, number>;
}

export interface DemoSample {
  id: string;
  title: string;
  document_type: string;
  expected_result: string;
  fixture_file: string;
  description: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  total_verifications?: number;
  total_my_docs?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserDocumentItem {
  id: number;
  user_id: number;
  original_filename: string;
  stored_filename?: string;
  filename?: string;
  file_size: number;
  mime_type: string;
  file_hash: string;
  category: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  latest_verification_id?: string | null;
  latest_verification_status?: string | null;
  last_verified_at?: string | null;
  last_verification_status?: string | null;
  last_verification_ref_id?: string | null;
}

export interface UserDocumentListResponse {
  documents?: UserDocumentItem[];
  items?: UserDocumentItem[];
  total: number;
  total_size_bytes?: number;
}

export interface DuplicateCheckResponse {
  is_duplicate: boolean;
  file_hash: string;
  matched_type?: 'MY_DOC' | 'VERIFICATION_HISTORY' | null;
  existing_reference_id?: string | null;
  existing_document_id?: number | null;
  existing_filename?: string | null;
  existing_created_at?: string | null;
  existing_status?: string | null;
}

export interface ActivityTrendItem {
  month: string;
  count: number;
}

export interface PersonalAnalyticsResponse {
  total_verifications: number;
  verified_count: number;
  invalid_count: number;
  review_count: number;
  unable_count: number;
  pass_rate_percent: number;
  status_distribution: {
    verified: number;
    invalid: number;
    requires_review: number;
    unable_to_verify: number;
  };
  category_distribution: Record<string, number>;
  monthly_trend: ActivityTrendItem[];
  total_stored_docs: number;
  total_storage_bytes: number;
  duplicate_detections_count: number;
}
