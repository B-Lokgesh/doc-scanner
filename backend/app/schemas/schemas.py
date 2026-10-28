from pydantic import BaseModel, Field
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

class DashboardStatsResponse(BaseModel):
    total_processed: int
    verified_count: int
    invalid_count: int
    requires_review_count: int
    unable_to_verify_count: int
    recent_verifications: List[Dict[str, Any]]
    status_distribution: Dict[str, int]
    document_type_distribution: Dict[str, int]

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
