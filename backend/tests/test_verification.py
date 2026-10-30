import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.core.config import BASE_DIR
from app.verification.document_rules import Verhoeff, DocumentRulesEngine
from app.verification.file_validator import FileValidator
from app.verification.ocr_service import OCRService
from app.verification.document_classifier import DocumentClassifier
from app.verification.field_extractor import FieldExtractor
from app.verification.consistency_checker import ConsistencyChecker
from app.verification.verification_service import VerificationService
from app.services.report_generator import ReportGenerator

client = TestClient(app)
FIXTURES_DIR = BASE_DIR / "test_fixtures"

# ============================================================================
# 1. FILE INTEGRITY & SECURITY TESTS (Cases 1 - 18)
# ============================================================================

def test_01_valid_pdf_integrity():
    with open(FIXTURES_DIR / "valid_pan.pdf", "rb") as f:
        bytes_data = f.read()
    res = FileValidator.validate_file(bytes_data, "valid_pan.pdf", "application/pdf")
    assert res["is_valid"] is True
    assert res["detected_type"] == "pdf"
    assert res["page_count"] >= 1

def test_02_valid_png_integrity():
    with open(FIXTURES_DIR / "valid_pan.png", "rb") as f:
        bytes_data = f.read()
    res = FileValidator.validate_file(bytes_data, "valid_pan.png", "image/png")
    assert res["is_valid"] is True
    assert res["detected_type"] == "png"

def test_04_empty_file_rejected():
    res = FileValidator.validate_file(b"", "empty.pdf", "application/pdf")
    assert res["is_valid"] is False
    assert res["error_code"] == "EMPTY_FILE"
    assert any(c["result"] == "FAILED" for c in res["checks"])

def test_05_unsupported_file_extension():
    res = FileValidator.validate_file(b"Sample data", "doc.docx", "application/vnd.openxmlformats")
    assert res["is_valid"] is False
    assert res["error_code"] == "UNSUPPORTED_EXTENSION"

def test_06_file_larger_than_configured_limit():
    large_bytes = b"0" * (11 * 1024 * 1024) # 11MB
    res = FileValidator.validate_file(large_bytes, "huge.pdf", "application/pdf")
    assert res["is_valid"] is False
    assert res["error_code"] == "FILE_TOO_LARGE"

def test_07_fake_pdf_mime_mismatch():
    with open(FIXTURES_DIR / "fake_extension.pdf", "rb") as f:
        bytes_data = f.read()
    res = FileValidator.validate_file(bytes_data, "fake_extension.pdf", "application/pdf")
    assert res["is_valid"] is False
    assert res["error_code"] == "MIME_MISMATCH"

def test_09_corrupted_pdf_rejected():
    with open(FIXTURES_DIR / "corrupted.pdf", "rb") as f:
        bytes_data = f.read()
    res = FileValidator.validate_file(bytes_data, "corrupted.pdf", "application/pdf")
    assert res["is_valid"] is False
    assert res["error_code"] == "CORRUPTED_PDF"

def test_10_corrupted_image_rejected():
    with open(FIXTURES_DIR / "corrupted_image.png", "rb") as f:
        bytes_data = f.read()
    res = FileValidator.validate_file(bytes_data, "corrupted_image.png", "image/png")
    assert res["is_valid"] is False
    assert res["error_code"] == "CORRUPTED_IMAGE"

def test_11_malicious_executable_rejected():
    with open(FIXTURES_DIR / "malicious_exe.pdf", "rb") as f:
        bytes_data = f.read()
    res = FileValidator.validate_file(bytes_data, "malicious_exe.pdf", "application/pdf")
    assert res["is_valid"] is False
    assert res["error_code"] == "MALICIOUS_FILE"

# ============================================================================
# 2. DOCUMENT CLASSIFIER & MISMATCH TESTS (Cases 19 - 26)
# ============================================================================

def test_20_matching_document_type():
    with open(FIXTURES_DIR / "valid_pan.pdf", "rb") as f:
        ocr_res = OCRService.process_document_text(f.read(), "pdf")
    res = DocumentClassifier.classify_and_check_consistency(ocr_res["text"], "pan")
    assert res["is_match"] is True
    assert res["is_mismatch"] is False

def test_21_document_type_mismatch():
    # Selecting Passport but uploading an invoice
    with open(FIXTURES_DIR / "unrelated_invoice.pdf", "rb") as f:
        ocr_res = OCRService.process_document_text(f.read(), "pdf")
    res = DocumentClassifier.classify_and_check_consistency(ocr_res["text"], "passport")
    assert res["is_match"] is False

def test_24_ambiguous_document_category():
    res = DocumentClassifier.classify_and_check_consistency("This page only has one line of generic text.", "pan")
    assert res["is_ambiguous"] is True

# ============================================================================
# 3. DETERMINISTIC VALIDATION & CHECKSUM RULES (Cases 27 - 45)
# ============================================================================

def test_33_aadhaar_verhoeff_checksum_validation():
    # Valid Verhoeff checksum test
    base = "20261028123"
    checksum = Verhoeff.generate_checksum(base)
    full_uid = f"{base}{checksum}"
    assert Verhoeff.validate(full_uid) is True

    # Corrupt checksum digit
    corrupted_uid = f"{base}{(checksum + 1) % 10}"
    assert Verhoeff.validate(corrupted_uid) is False

def test_30_expired_passport_detected():
    with open(FIXTURES_DIR / "expired_passport.pdf", "rb") as f:
        bytes_data = f.read()
    res = VerificationService.run_verification(
        file_bytes=bytes_data,
        original_filename="expired_passport.pdf",
        declared_mime="application/pdf",
        selected_type="passport",
        saved_file_path=str(FIXTURES_DIR / "expired_passport.pdf")
    )
    assert res["final_status"] == "INVALID"
    assert any("EXPIRED" in c["explanation"] for c in res["checks"])

def test_31_issue_date_after_expiry_date():
    with open(FIXTURES_DIR / "issue_after_expiry_passport.pdf", "rb") as f:
        bytes_data = f.read()
    res = VerificationService.run_verification(
        file_bytes=bytes_data,
        original_filename="issue_after_expiry_passport.pdf",
        declared_mime="application/pdf",
        selected_type="passport",
        saved_file_path=str(FIXTURES_DIR / "issue_after_expiry_passport.pdf")
    )
    assert res["final_status"] == "INVALID"
    assert any("later than expiry date" in c["explanation"] for c in res["checks"])

def test_37_bank_statement_arithmetic_reconciliation():
    # 1. Consistent bank statement: Opening 50000 + Credits 25000 - Debits 15000 = Closing 60000
    with open(FIXTURES_DIR / "consistent_bank_statement.pdf", "rb") as f:
        bytes_data = f.read()
    res_valid = VerificationService.run_verification(
        file_bytes=bytes_data,
        original_filename="consistent_bank_statement.pdf",
        declared_mime="application/pdf",
        selected_type="bank_statement",
        saved_file_path=str(FIXTURES_DIR / "consistent_bank_statement.pdf")
    )
    assert any(c["check_name"] == "Financial Statement Arithmetic Reconciliation" and c["result"] == "PASSED" for c in res_valid["checks"])

    # 2. Inconsistent bank statement: Closing is 99999 instead of 60000
    with open(FIXTURES_DIR / "inconsistent_arithmetic_bank_statement.pdf", "rb") as f:
        bytes_data = f.read()
    res_invalid = VerificationService.run_verification(
        file_bytes=bytes_data,
        original_filename="inconsistent_arithmetic_bank_statement.pdf",
        declared_mime="application/pdf",
        selected_type="bank_statement",
        saved_file_path=str(FIXTURES_DIR / "inconsistent_arithmetic_bank_statement.pdf")
    )
    assert res_invalid["final_status"] == "INVALID"
    assert any("Financial arithmetic mismatch" in c["explanation"] for c in res_invalid["checks"])

def test_41_educational_certificate_passing_year():
    with open(FIXTURES_DIR / "valid_educational_certificate.pdf", "rb") as f:
        bytes_data = f.read()
    res = VerificationService.run_verification(
        file_bytes=bytes_data,
        original_filename="valid_educational_certificate.pdf",
        declared_mime="application/pdf",
        selected_type="educational_certificate",
        saved_file_path=str(FIXTURES_DIR / "valid_educational_certificate.pdf")
    )
    assert any(c["check_name"] == "Passing Year Chronological Sanity" and c["result"] == "PASSED" for c in res["checks"])

def test_42_income_certificate_verification():
    with open(FIXTURES_DIR / "valid_income_certificate.pdf", "rb") as f:
        bytes_data = f.read()
    res = VerificationService.run_verification(
        file_bytes=bytes_data,
        original_filename="valid_income_certificate.pdf",
        declared_mime="application/pdf",
        selected_type="income_certificate",
        saved_file_path=str(FIXTURES_DIR / "valid_income_certificate.pdf")
    )
    assert any(f["field_name"] == "annual_income" for f in res["extracted_fields"])

# ============================================================================
# 4. REST API & REPORT GENERATION TESTS (Cases 46 - 50)
# ============================================================================

def test_46_api_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["database_connected"] is True

def test_47_api_document_types():
    resp = client.get("/api/document-types")
    assert resp.status_code == 200
    types = resp.json()
    assert len(types) >= 9
    type_ids = [t["id"] for t in types]
    assert "pan" in type_ids
    assert "aadhaar" in type_ids
    assert "passport" in type_ids
    assert "bank_statement" in type_ids

def test_48_api_verification_upload_flow():
    with open(FIXTURES_DIR / "valid_pan.pdf", "rb") as f:
        resp = client.post(
            "/api/verifications",
            files={"file": ("valid_pan.pdf", f, "application/pdf")},
            data={"document_type": "pan"}
        )
    assert resp.status_code == 200
    res = resp.json()
    assert "reference_id" in res
    assert res["document_type"] == "pan"
    ref_id = res["reference_id"]

    # Verify get by reference id
    get_resp = client.get(f"/api/verifications/{ref_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["reference_id"] == ref_id

    # Verify report PDF generation endpoint
    report_resp = client.get(f"/api/verifications/{ref_id}/report")
    assert report_resp.status_code == 200
    assert report_resp.headers["content-type"] == "application/pdf"
    assert len(report_resp.content) > 1000

def test_49_dashboard_stats_and_history():
    stats_resp = client.get("/api/dashboard/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_processed"] >= 1

    hist_resp = client.get("/api/history?limit=10&offset=0")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert len(hist["items"]) >= 1

def test_50_non_existent_record_returns_404():
    resp = client.get("/api/verifications/VD-99999999-NONEXISTENT")
    assert resp.status_code == 404

def test_51_pan_uploaded_as_aadhaar_suggests_pan():
    with open(FIXTURES_DIR / "valid_pan.pdf", "rb") as f:
        file_bytes = f.read()

    res = VerificationService.run_verification(
        file_bytes=file_bytes,
        original_filename="valid_pan.pdf",
        declared_mime="application/pdf",
        selected_type="aadhaar",
        saved_file_path=str(FIXTURES_DIR / "valid_pan.pdf")
    )
    assert res["final_status"] == "INVALID"
    assert res["suggested_type"] == "pan"
    assert "PAN" in res["suggested_type_name"]

def test_52_cross_verify_supporting_document():
    import json
    with open(FIXTURES_DIR / "valid_pan.pdf", "rb") as f:
        pan_bytes = f.read()

    primary_fields = [
        {"field_name": "name", "normalized_value": "RAJESH KUMAR SHARMA", "raw_value": "RAJESH KUMAR SHARMA"},
        {"field_name": "dob", "normalized_value": "1985-05-15", "raw_value": "15/05/1985"}
    ]

    resp = client.post(
        "/api/verifications/VD-TEST-REF/cross-verify",
        data={
            "document_type": "pan",
            "primary_fields_json": json.dumps(primary_fields)
        },
        files={"file": ("supporting_pan.pdf", pan_bytes, "application/pdf")}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "field_comparison" in data
    assert data["supporting_document_type"] == "pan"
    assert "cross_verify_status" in data

def test_53_cross_verify_name_and_dob_variants():
    import json
    with open(FIXTURES_DIR / "valid_pan.pdf", "rb") as f:
        pan_bytes = f.read()

    # Primary fields with matching identity (Rahul Sharma, 15/08/1990)
    primary_fields = [
        {"field_name": "holder_name", "normalized_value": "Rahul Sharma", "raw_value": "Rahul Sharma"},
        {"field_name": "date_of_birth", "normalized_value": "1990-08-15", "raw_value": "15/08/1990"}
    ]

    resp = client.post(
        "/api/verifications/VD-TEST-REF-2/cross-verify",
        data={
            "document_type": "pan",
            "primary_fields_json": json.dumps(primary_fields)
        },
        files={"file": ("supporting_pan.pdf", pan_bytes, "application/pdf")}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["cross_verify_status"] == "IDENTITY_CONFIRMED"
    assert data["overall_identity_match"] is True
    # Verify name and dob matched
    matches = {c["field"]: c["match"] for c in data["field_comparison"]}
    assert matches.get("name") is True
    assert matches.get("dob") is True

