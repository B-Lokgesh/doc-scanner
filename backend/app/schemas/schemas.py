from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class DocumentType(str, Enum):
    AADHAAR = "aadhaar"
    PAN = "pan"
    PASSPORT = "passport"
    DRIVING_LICENCE = "driving_licence"
    VOTER_ID = "voter_id"
    EDUCATIONAL_CERTIFICATE = "educational_certificate"
    BANK_STATEMENT = "bank_statement"
    INCOME_CERTIFICATE = "income_certificate"
    OTHER = "other"

class CheckResultEnum(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    WARNING = "WARNING"
    SKIPPED = "SKIPPED"
    INFO = "INFO"

class SeverityEnum(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class FinalStatusEnum(str, Enum):
    VERIFIED = "VERIFIED AGAINST AVAILABLE RULES"
    INVALID = "INVALID"
    REQUIRES_REVIEW = "REQUIRES MANUAL REVIEW"
    UNABLE_TO_VERIFY = "UNABLE TO VERIFY"

class CheckItem(BaseModel):
    check_name: str
    result: CheckResultEnum
    severity: SeverityEnum
    explanation: str
    evidence_reference: Optional[str] = None

class ExtractedFieldItem(BaseModel):
    field_name: str
    normalized_value: Optional[str] = None
    raw_value: Optional[str] = None
    extraction_confidence: float = 1.0
    is_sensitive: bool = False

class ProcessingEventItem(BaseModel):
    stage: str
    event_status: str
    message: Optional[str] = None
    created_at: Optional[datetime] = None

class VerificationResultResponse(BaseModel):
    reference_id: str
    document_type: str
    original_filename: str
    file_size: int
    mime_type: str
    processing_status: str
    final_status: FinalStatusEnum
    summary: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    checks: List[CheckItem]
    extracted_fields: List[ExtractedFieldItem]
    events: List[ProcessingEventItem]
    passed_checks_count: int
    failed_checks_count: int
    warning_checks_count: int
    recommended_next_steps: List[str]
    suggested_type: Optional[str] = None
    suggested_type_name: Optional[str] = None
    detected_category: Optional[str] = None
    is_duplicate: Optional[bool] = False
    duplicate_of_reference_id: Optional[str] = None

class DashboardStatsResponse(BaseModel):
    total_processed: int
    verified_count: int
    invalid_count: int
    requires_review_count: int
    unable_to_verify_count: int
    recent_verifications: List[Dict[str, Any]]
    status_distribution: Dict[str, int]
    document_type_distribution: Dict[str, int]
    user_name: Optional[str] = None

class DocumentTypeInfo(BaseModel):
    id: str
    name: str
    description: str
    supported_formats: List[str]
    max_size_mb: int
    has_deterministic_rules: bool
    limitations_note: str

class VerificationHistoryItem(BaseModel):
    id: int
    reference_id: str
    document_type: str
    original_filename: str
    final_status: str
    failed_checks_count: int
    created_at: datetime
    file_size: int
    user_id: Optional[int] = None
    source_document_id: Optional[int] = None

# ==================== User Authentication Schemas ====================

class UserSignup(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=150)
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    email: str
    password: str
    remember_me: Optional[bool] = False

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str = Field(..., min_length=6, max_length=100)

# ==================== My_Doc Personal Document Storage Schemas ====================

class UserDocumentItem(BaseModel):
    id: int
    user_id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    file_hash: str
    category: str
    created_at: str
    updated_at: str
    last_verified_at: Optional[str] = None
    last_verification_status: Optional[str] = None
    last_verification_ref_id: Optional[str] = None

class UserDocumentListResponse(BaseModel):
    total: int
    items: List[UserDocumentItem]
    documents: Optional[List[UserDocumentItem]] = None
    total_size_bytes: int = 0

class RenameDocumentRequest(BaseModel):
    new_name: str = Field(..., min_length=1, max_length=255)

class DuplicateCheckRequest(BaseModel):
    file_hash: str

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    source: Optional[str] = None  # "my_doc" or "verification"
    original_filename: Optional[str] = None
    reference_id: Optional[str] = None
    uploaded_at: Optional[str] = None

# ==================== Personal Analytics Schemas ====================

class ActivityTrendItem(BaseModel):
    date: str
    count: int
    verified: int
    invalid: int

class PersonalAnalyticsResponse(BaseModel):
    total_verifications: int
    verified_count: int
    invalid_count: int
    requires_review_count: int
    unable_to_verify_count: int
    pass_rate_percentage: float
    total_stored_documents: int
    total_storage_bytes: int
    status_distribution: Dict[str, int]
    document_type_distribution: Dict[str, int]
    monthly_activity: List[ActivityTrendItem]
    recent_activity_summary: List[Dict[str, Any]]
