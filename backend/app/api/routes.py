import os
import io
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Response
from fastapi.responses import StreamingResponse, FileResponse
from app.core.config import settings, UPLOAD_DIR, REPORT_DIR
from app.models.database import db_session
from app.schemas.schemas import (
    DocumentTypeInfo, DashboardStatsResponse, VerificationHistoryItem,
    VerificationResultResponse
)
from app.verification.verification_service import VerificationService
from app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/api")

# Supported Document Types catalog
DOCUMENT_TYPES_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "aadhaar",
        "name": "Aadhaar Card",
        "description": "Indian 12-digit Unique Identification Number. Evaluates official Verhoeff dihedral checksum, structure, and masks sensitive UID.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Evaluates Verhoeff mathematical checksum and format. Official validity requires UIDAI OTP/biometric authentication by law."
    },
    {
        "id": "pan",
        "name": "PAN Card",
        "description": "Permanent Account Number issued by Income Tax Department. Validates 10-character syntax, entity codes, and surname initials.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Validates syntax, tax entity types, and surname initials. Official status requires NSDL/UTIITSL database query."
    },
    {
        "id": "passport",
        "name": "Passport",
        "description": "Travel document & identity proof. Validates ICAO format, issue date chronology, and flags expired passports.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Validates ICAO identifier format, expiry dates, and issue dates. Official authenticity requires consular database query."
    },
    {
        "id": "driving_licence",
        "name": "Driving Licence",
        "description": "State transport motor vehicle licence. Validates state codes, minimum age at issuance, and expiry dates.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Evaluates state/RTO codes and validity dates. Official verification requires Sarathi / Parivahan API integration."
    },
    {
        "id": "voter_id",
        "name": "Voter ID (EPIC)",
        "description": "Election Commission of India Photo Identity Card. Validates 10-character alphanumeric EPIC syntax.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Validates standard 3-letter + 7-digit EPIC structure. Official verification requires ECI electoral roll lookup."
    },
    {
        "id": "educational_certificate",
        "name": "Educational Certificate",
        "description": "Degree, diploma, or marksheet. Validates roll numbers, passing year chronological consistency, and grading bounds.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Validates roll numbers and chronological passing year sanity. Official authentication requires National Academic Depository (NAD)."
    },
    {
        "id": "bank_statement",
        "name": "Bank Statement",
        "description": "Financial account statement. Performs arithmetic reconciliation (Opening + Credits - Debits = Closing).",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Evaluates financial arithmetic consistency and account formatting. Official verification requires Account Aggregator or bank API."
    },
    {
        "id": "income_certificate",
        "name": "Income Certificate",
        "description": "Revenue authority revenue/income certificate. Validates financial year syntax and declared income figures.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": True,
        "limitations_note": "Validates certificate number format and financial year period. Official verification requires state e-District portal lookup."
    },
    {
        "id": "other",
        "name": "Other Document",
        "description": "General legal, employment, or municipal document. Performs structural integrity, OCR extraction, and forensic inspection.",
        "supported_formats": ["PDF", "JPG", "PNG"],
        "max_size_mb": 10,
        "has_deterministic_rules": False,
        "limitations_note": "General structural and OCR extraction performed without document-specific deterministic rules."
    }
]

@router.get("/health")
def get_health():
    """System health check and diagnostic info."""
    db_ok = False
    try:
        with db_session() as conn:
            conn.execute("SELECT 1").fetchone()
            db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database_connected": db_ok,
        "timestamp": datetime.now().isoformat(),
        "storage_dirs_ready": UPLOAD_DIR.exists() and REPORT_DIR.exists()
    }

@router.get("/document-types")
def get_document_types():
    """Returns catalog of supported document categories."""
    return DOCUMENT_TYPES_CATALOG

@router.post("/verifications")
async def create_verification(
    file: UploadFile = File(...),
    document_type: str = Form(...)
):
    """
    Main upload and verification pipeline endpoint.
    Performs file integrity validation, OCR, classification, deterministic checks,
    consistency verification, forensics, and renders a final decision.
    """
    valid_doc_types = {d["id"] for d in DOCUMENT_TYPES_CATALOG}
    if document_type not in valid_doc_types:
        raise HTTPException(status_code=400, detail=f"Invalid document type '{document_type}'.")

    # Read uploaded file bytes
    file_bytes = await file.read()
    filename = file.filename or "uploaded_file"
    declared_mime = file.content_type or "application/octet-stream"

    # Save to secure temporary storage path
    file_ext = Path(filename).suffix.lower()
    temp_filename = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{file_ext}"
    saved_path = UPLOAD_DIR / temp_filename
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        with open(saved_path, "wb") as f:
            f.write(file_bytes)
    except Exception:
        try:
            saved_path = Path("/tmp") / temp_filename
            with open(saved_path, "wb") as f:
                f.write(file_bytes)
        except Exception:
            saved_path = Path(f"/tmp/{temp_filename}")

    # Run complete verification engine
    result = VerificationService.run_verification(
        file_bytes=file_bytes,
        original_filename=filename,
        declared_mime=declared_mime,
        selected_type=document_type,
        saved_file_path=str(saved_path)
    )

    return result

import uuid

@router.get("/verifications/{reference_id}")
def get_verification_by_ref(reference_id: str):
    """
    Retrieves full verification results and checks by reference ID.
    """
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM verification_records WHERE reference_id = ?", (reference_id,))
        rec = cursor.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Verification record not found.")

        ver_id = rec["id"]

        # Fetch checks
        cursor.execute("SELECT * FROM verification_checks WHERE verification_id = ? ORDER BY id ASC", (ver_id,))
        checks = [dict(r) for r in cursor.fetchall()]

        # Fetch extracted fields
        cursor.execute("SELECT * FROM extracted_fields WHERE verification_id = ? ORDER BY id ASC", (ver_id,))
        fields = [dict(r) for r in cursor.fetchall()]

        # Fetch events
        cursor.execute("SELECT * FROM processing_events WHERE verification_id = ? ORDER BY id ASC", (ver_id,))
        events = [dict(r) for r in cursor.fetchall()]

    passed = sum(1 for c in checks if c["result"] == "PASSED")
    failed = sum(1 for c in checks if c["result"] == "FAILED")
    warnings = sum(1 for c in checks if c["result"] == "WARNING")

    recommendations = []
    final_status = rec["final_status"]
    if "VERIFIED" in str(final_status):
        recommendations.append("Document satisfies all applicable deterministic format, checksum, and structure rules.")
        recommendations.append("Proceed with authorized workflow or download verification audit report.")
    elif "INVALID" in str(final_status):
        recommendations.append("Do not accept document as valid for official onboarding.")
        recommendations.append("Request the user re-upload an unexpired, unedited original document.")
    elif "REVIEW" in str(final_status):
        recommendations.append("Route document to compliance officer for manual verification.")
        recommendations.append("Check physical document or verify via official issuer portal where permitted.")
    else:
        recommendations.append("Request a higher-resolution scan or supported uncorrupted document file.")

    return {
        "reference_id": rec["reference_id"],
        "document_type": rec["document_type"],
        "original_filename": rec["original_filename"],
        "file_size": rec["file_size"],
        "mime_type": rec["mime_type"],
        "processing_status": rec["processing_status"],
        "final_status": rec["final_status"],
        "summary": rec["summary"],
        "created_at": rec["created_at"],
        "completed_at": rec["completed_at"],
        "checks": checks,
        "extracted_fields": fields,
        "events": events,
        "passed_checks_count": passed,
        "failed_checks_count": failed,
        "warning_checks_count": warnings,
        "recommended_next_steps": recommendations
    }

@router.get("/verifications/{reference_id}/report")
def download_verification_report(reference_id: str):
    """
    Generates and downloads a real, beautifully formatted compliance PDF report.
    """
    res = get_verification_by_ref(reference_id)
    pdf_bytes = ReportGenerator.generate_pdf_report(res)

    filename = f"VeriDoc_Report_{reference_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/documents/{reference_id}/preview")
def get_document_preview(reference_id: str):
    """
    Serves safe preview stream of the uploaded document.
    """
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT file_path, mime_type, original_filename FROM verification_records WHERE reference_id = ?", (reference_id,))
        rec = cursor.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Document not found.")

        file_path = Path(rec["file_path"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Document storage file not found or expired.")

        return FileResponse(path=file_path, media_type=rec["mime_type"], filename=rec["original_filename"])

@router.get("/history")
def get_verification_history(
    search: Optional[str] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Retrieves paginated verification history with multi-filter search.
    """
    query = """
    SELECT r.id, r.reference_id, r.document_type, r.original_filename,
           r.final_status, r.created_at, r.file_size,
           (SELECT COUNT(*) FROM verification_checks c WHERE c.verification_id = r.id AND c.result = 'FAILED') as failed_checks_count
    FROM verification_records r
    WHERE 1=1
    """
    params: List[Any] = []

    if search:
        query += " AND (r.reference_id LIKE ? OR r.original_filename LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term])

    if document_type and document_type != "all":
        query += " AND r.document_type = ?"
        params.append(document_type)

    if status and status != "all":
        query += " AND r.final_status LIKE ?"
        params.append(f"%{status}%")

    # Count total
    count_query = f"SELECT COUNT(*) FROM ({query})"
    
    with db_session() as conn:
        cursor = conn.cursor()
        total_count = cursor.execute(count_query, params).fetchone()[0]

        query += " ORDER BY r.id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        records = [dict(r) for r in cursor.fetchall()]

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "items": records
    }

@router.get("/dashboard/stats")
def get_dashboard_stats():
    """
    Computes real metrics and distribution charts from the SQLite database.
    """
    with db_session() as conn:
        cursor = conn.cursor()

        total = cursor.execute("SELECT COUNT(*) FROM verification_records").fetchone()[0]
        verified = cursor.execute("SELECT COUNT(*) FROM verification_records WHERE final_status LIKE '%VERIFIED%'").fetchone()[0]
        invalid = cursor.execute("SELECT COUNT(*) FROM verification_records WHERE final_status = 'INVALID'").fetchone()[0]
        review = cursor.execute("SELECT COUNT(*) FROM verification_records WHERE final_status LIKE '%REVIEW%'").fetchone()[0]
        unable = cursor.execute("SELECT COUNT(*) FROM verification_records WHERE final_status LIKE '%UNABLE%'").fetchone()[0]

        # Recent 5 verifications
        cursor.execute("""
        SELECT r.id, r.reference_id, r.document_type, r.original_filename,
               r.final_status, r.created_at, r.file_size,
               (SELECT COUNT(*) FROM verification_checks c WHERE c.verification_id = r.id AND c.result = 'FAILED') as failed_checks_count
        FROM verification_records r
        ORDER BY r.id DESC LIMIT 5
        """)
        recent = [dict(r) for r in cursor.fetchall()]

        # Document type distribution
        cursor.execute("""
        SELECT document_type, COUNT(*) as cnt
        FROM verification_records
        GROUP BY document_type
        """)
        type_dist = {r["document_type"]: r["cnt"] for r in cursor.fetchall()}

    return {
        "total_processed": total,
        "verified_count": verified,
        "invalid_count": invalid,
        "requires_review_count": review,
        "unable_to_verify_count": unable,
        "recent_verifications": recent,
        "status_distribution": {
            "verified": verified,
            "invalid": invalid,
            "requires_review": review,
            "unable_to_verify": unable
        },
        "document_type_distribution": type_dist
    }

@router.delete("/verifications/{reference_id}")
def delete_verification_record(reference_id: str):
    """
    Deletes verification record, cascade DB data, and storage files.
    """
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, file_path FROM verification_records WHERE reference_id = ?", (reference_id,))
        rec = cursor.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Record not found.")

        # Remove local file safely
        try:
            p = Path(rec["file_path"])
            if p.exists():
                p.unlink()
        except Exception:
            pass

        cursor.execute("DELETE FROM verification_records WHERE reference_id = ?", (reference_id,))

    return {"success": True, "message": f"Verification record '{reference_id}' deleted."}

@router.post("/settings/purge")
def purge_all_data():
    """
    Purges all verification records and clears temporary storage.
    """
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM verification_records")

    for f in UPLOAD_DIR.glob("*"):
        try:
            if f.is_file():
                f.unlink()
        except Exception:
            pass

    return {"success": True, "message": "All verification data and storage files have been purged."}

DEMO_SAMPLES_CATALOG = [
    {
        "id": "valid_pan",
        "title": "Valid PAN Card (Format & Syntax Match)",
        "document_type": "pan",
        "expected_result": "VERIFIED AGAINST AVAILABLE RULES",
        "fixture_file": "valid_pan.pdf",
        "description": "Standard 10-char PAN with matching entity code and valid DOB format."
    },
    {
        "id": "valid_aadhaar",
        "title": "Valid Aadhaar Card (Verhoeff Checksum Passed)",
        "document_type": "aadhaar",
        "expected_result": "VERIFIED AGAINST AVAILABLE RULES",
        "fixture_file": "valid_aadhaar.pdf",
        "description": "12-digit Aadhaar UID passing the official Verhoeff dihedral algorithm."
    },
    {
        "id": "invalid_aadhaar_checksum",
        "title": "Invalid Aadhaar (Verhoeff Checksum Failure)",
        "document_type": "aadhaar",
        "expected_result": "INVALID",
        "fixture_file": "invalid_checksum_aadhaar.pdf",
        "description": "Aadhaar UID with intentional mathematical checksum corruption."
    },
    {
        "id": "valid_passport",
        "title": "Valid Passport (Active & Chronological)",
        "document_type": "passport",
        "expected_result": "VERIFIED AGAINST AVAILABLE RULES",
        "fixture_file": "valid_passport.pdf",
        "description": "ICAO standard passport with valid active expiry date in the future."
    },
    {
        "id": "expired_passport",
        "title": "Expired Passport (Past Validity Date)",
        "document_type": "passport",
        "expected_result": "INVALID",
        "fixture_file": "expired_passport.pdf",
        "description": "Passport whose expiry date has passed current calendar date."
    },
    {
        "id": "consistent_bank_statement",
        "title": "Consistent Bank Statement (Arithmetic Reconciled)",
        "document_type": "bank_statement",
        "expected_result": "VERIFIED AGAINST AVAILABLE RULES",
        "fixture_file": "consistent_bank_statement.pdf",
        "description": "Opening + Credits - Debits exactly balances with Closing Balance."
    },
    {
        "id": "inconsistent_bank_statement",
        "title": "Inconsistent Bank Statement (Arithmetic Mismatch)",
        "document_type": "bank_statement",
        "expected_result": "INVALID",
        "fixture_file": "inconsistent_arithmetic_bank_statement.pdf",
        "description": "Closing balance does not match transaction totals math."
    },
    {
        "id": "mismatched_document",
        "title": "Category Mismatch (Invoice uploaded as PAN)",
        "document_type": "pan",
        "expected_result": "INVALID",
        "fixture_file": "unrelated_invoice.pdf",
        "description": "Document content lacks PAN markers and indicates invoice layout."
    }
]

@router.get("/demo/samples")
def get_demo_samples():
    """Returns curated synthetic demo documents representing various verification outcomes."""
    return DEMO_SAMPLES_CATALOG

@router.post("/demo/verify-sample/{sample_id}")
def verify_demo_sample(sample_id: str):
    """
    Executes actual verification pipeline on a synthetic test fixture.
    """
    from app.core.config import FIXTURES_DIR
    sample = next((s for s in DEMO_SAMPLES_CATALOG if s["id"] == sample_id), None)
    if not sample:
        raise HTTPException(status_code=404, detail="Demo sample not found.")

    filepath = FIXTURES_DIR / sample["fixture_file"]
    if not filepath.exists():
        raise HTTPException(status_code=500, detail="Fixture file missing on server.")

    with open(filepath, "rb") as f:
        file_bytes = f.read()

    # Save to upload dir
    saved_filename = f"demo_{sample_id}_{sample['fixture_file']}"
    saved_path = UPLOAD_DIR / saved_filename
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    result = VerificationService.run_verification(
        file_bytes=file_bytes,
        original_filename=sample["fixture_file"],
        declared_mime="application/pdf",
        selected_type=sample["document_type"],
        saved_file_path=str(saved_path)
    )

    return result

