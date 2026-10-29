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
