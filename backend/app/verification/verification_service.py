import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.models.database import db_session
from app.schemas.schemas import FinalStatusEnum, SeverityEnum, CheckResultEnum
from app.verification.file_validator import FileValidator
from app.verification.ocr_service import OCRService
from app.verification.document_classifier import DocumentClassifier
from app.verification.field_extractor import FieldExtractor
from app.verification.document_rules import DocumentRulesEngine
from app.verification.consistency_checker import ConsistencyChecker
from app.verification.manipulation_analyzer import ManipulationAnalyzer

class VerificationService:
    @classmethod
    def generate_reference_id(cls) -> str:
        date_str = datetime.now().strftime("%Y%m%d")
        rand_str = uuid.uuid4().hex[:6].upper()
        return f"VD-{date_str}-{rand_str}"

    @classmethod
    def run_verification(
        cls,
        file_bytes: bytes,
        original_filename: str,
        declared_mime: str,
        selected_type: str,
        saved_file_path: str
    ) -> Dict[str, Any]:
        """
        Executes the full 8-stage verification pipeline.
        Saves all records, events, checks, and extracted fields to the database.
        Returns the structured verification result.
        """
        ref_id = cls.generate_reference_id()
        file_hash = FileValidator.calculate_file_hash(file_bytes)
        file_size = len(file_bytes)
        created_at = datetime.now()

        all_checks: List[Dict[str, Any]] = []
        events: List[Dict[str, Any]] = []
        extracted_fields: List[Dict[str, Any]] = []

        # Helper to log event
        def add_event(stage: str, status: str, msg: str):
            events.append({
                "stage": stage,
                "event_status": status,
                "message": msg,
                "created_at": datetime.now()
            })

        add_event("upload_received", "COMPLETED", f"File '{original_filename}' ({file_size} bytes) received.")

        # Stage 1: File integrity validation
        add_event("file_integrity_check", "IN_PROGRESS", "Validating file signatures, headers, and structure.")
        val_res = FileValidator.validate_file(file_bytes, original_filename, declared_mime)
        all_checks.extend(val_res["checks"])

        if not val_res["is_valid"]:
            add_event("file_integrity_check", "FAILED", val_res["message"])
            final_status = FinalStatusEnum.UNABLE_TO_VERIFY if val_res["error_code"] in ["EMPTY_FILE", "CORRUPTED_PDF", "CORRUPTED_IMAGE"] else FinalStatusEnum.INVALID
            summary = f"Verification terminated during Stage 1: {val_res['message']}"
            
            return cls._persist_and_return(
                ref_id=ref_id,
                doc_type=selected_type,
                filename=original_filename,
                file_hash=file_hash,
                file_path=saved_file_path,
                file_size=file_size,
                mime_type=declared_mime,
                final_status=final_status.value,
                summary=summary,
                error_code=val_res["error_code"],
                created_at=created_at,
                checks=all_checks,
                fields=[],
                events=events
            )

        add_event("file_integrity_check", "COMPLETED", "File passed integrity and structure validation.")

        # Stage 2: OCR and text extraction
        add_event("text_extraction", "IN_PROGRESS", f"Extracting text from {val_res['detected_type'].upper()} content.")
        ocr_res = OCRService.process_document_text(file_bytes, val_res["detected_type"])
        raw_text = ocr_res["text"]

        if ocr_res["is_empty"] or ocr_res["char_count"] < 5:
            all_checks.append({
                "check_name": "Optical Character Recognition (OCR) Readability",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": "No readable alphanumeric text could be extracted from the document.",
                "evidence_reference": "Extracted character count: 0"
            })
            add_event("text_extraction", "FAILED", "No readable text detected in document.")
            
            return cls._persist_and_return(
                ref_id=ref_id,
                doc_type=selected_type,
                filename=original_filename,
                file_hash=file_hash,
                file_path=saved_file_path,
                file_size=file_size,
                mime_type=declared_mime,
                final_status=FinalStatusEnum.UNABLE_TO_VERIFY.value,
                summary="Unable to verify: Document contains no legible machine-readable text or scan resolution is inadequate.",
                error_code="UNREADABLE_DOCUMENT",
                created_at=created_at,
                checks=all_checks,
                fields=[],
                events=events
            )

        all_checks.append({
            "check_name": "Optical Character Recognition (OCR) Readability",
            "result": "PASSED",
            "severity": "INFO",
            "explanation": f"Successfully extracted text content ({ocr_res['char_count']} characters across {ocr_res['page_count']} page(s)).",
            "evidence_reference": f"Extracted chars: {ocr_res['char_count']}"
        })
        add_event("text_extraction", "COMPLETED", f"Extracted {ocr_res['char_count']} characters.")

        # Stage 3: Document type classification & mismatch check
        add_event("type_classification", "IN_PROGRESS", f"Evaluating consistency against category '{selected_type}'.")
        class_res = DocumentClassifier.classify_and_check_consistency(raw_text, selected_type)
        all_checks.extend(class_res["checks"])

        if class_res["is_mismatch"]:
            add_event("type_classification", "FAILED", f"Mismatch detected: Document content indicates '{class_res['detected_category']}'.")
        else:
            add_event("type_classification", "COMPLETED", "Category classification complete.")

        # Stage 4: Field extraction
        add_event("field_extraction", "IN_PROGRESS", "Extracting key identifiers, dates, and entity attributes.")
        extracted_fields = FieldExtractor.extract_fields(raw_text, selected_type)
        add_event("field_extraction", "COMPLETED", f"Extracted {len(extracted_fields)} field(s).")

        # Stage 5: Document-specific validation rules
        add_event("rules_evaluation", "IN_PROGRESS", "Executing deterministic validation rules.")
        rule_checks = DocumentRulesEngine.evaluate_rules(selected_type, extracted_fields, raw_text)
        all_checks.extend(rule_checks)
        add_event("rules_evaluation", "COMPLETED", f"Evaluated {len(rule_checks)} rule checks.")

        # Stage 6: Consistency checks
        add_event("consistency_check", "IN_PROGRESS", "Cross-checking temporal and entity consistency.")
        consistency_checks = ConsistencyChecker.check_internal_consistency(selected_type, extracted_fields, raw_text)
        all_checks.extend(consistency_checks)
        add_event("consistency_check", "COMPLETED", "Internal consistency checks complete.")

        # Stage 7: Manipulation indicators assessment
        add_event("manipulation_analysis", "IN_PROGRESS", "Assessing forensic and metadata indicators.")
        manipulation_checks = ManipulationAnalyzer.analyze_forensics(
            file_bytes, val_res["detected_type"], ocr_res.get("metadata", {}), raw_text, selected_type
        )
        all_checks.extend(manipulation_checks)
        add_event("manipulation_analysis", "COMPLETED", "Forensic analysis complete.")

        # Stage 8: Final decision engine
        has_critical_failure = any(c["result"] == "FAILED" and c["severity"] in ["CRITICAL", "HIGH"] for c in all_checks)
        has_warnings = any(c["result"] == "WARNING" for c in all_checks)
        is_ambiguous = class_res["is_ambiguous"]

        if class_res["is_mismatch"] or has_critical_failure:
            final_status = FinalStatusEnum.INVALID
            reasons = [c["explanation"] for c in all_checks if c["result"] == "FAILED"]
            summary = f"Document marked as INVALID. Failed checks: {'; '.join(reasons[:2])}"
        elif is_ambiguous or has_warnings:
            final_status = FinalStatusEnum.REQUIRES_REVIEW
            reasons = [c["explanation"] for c in all_checks if c["result"] in ["FAILED", "WARNING"]]
            summary = f"Document REQUIRES MANUAL REVIEW. Inconclusive findings: {'; '.join(reasons[:2])}"
        else:
            final_status = FinalStatusEnum.VERIFIED
            summary = f"All available format and integrity rules PASSED for {selected_type.replace('_', ' ').title()}. Official authenticity not independently queried."

        add_event("final_decision", "COMPLETED", f"Final decision rendered: {final_status.value}")

        return cls._persist_and_return(
            ref_id=ref_id,
            doc_type=selected_type,
            filename=original_filename,
            file_hash=file_hash,
            file_path=saved_file_path,
            file_size=file_size,
            mime_type=declared_mime,
            final_status=final_status.value,
            summary=summary,
            error_code=None,
            created_at=created_at,
            checks=all_checks,
            fields=extracted_fields,
            events=events,
            suggested_type=class_res.get("suggested_type"),
            suggested_type_name=class_res.get("suggested_type_name"),
            detected_category=class_res.get("detected_category", "")
        )

    @classmethod
    def _persist_and_return(
        cls,
        ref_id: str,
        doc_type: str,
        filename: str,
        file_hash: str,
        file_path: str,
        file_size: int,
        mime_type: str,
        final_status: str,
        summary: str,
        error_code: Optional[str],
        created_at: datetime,
        checks: List[Dict[str, Any]],
        fields: List[Dict[str, Any]],
        events: List[Dict[str, Any]],
        suggested_type: Optional[str] = None,
        suggested_type_name: Optional[str] = None,
        detected_category: str = ""
    ) -> Dict[str, Any]:
        """
        Persists verification record, checks, extracted fields, and processing events into SQLite.
        """
        completed_at = datetime.now()

        try:
            with db_session() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO verification_records (
                    reference_id, document_type, original_filename, file_hash, file_path,
                    file_size, mime_type, processing_status, final_status, summary,
                    error_code, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ref_id, doc_type, filename, file_hash, file_path,
                    file_size, mime_type, "completed", final_status, summary,
                    error_code, created_at.isoformat(), completed_at.isoformat()
                ))
                ver_id = cursor.lastrowid

                # Save checks
                for c in checks:
                    cursor.execute("""
                    INSERT INTO verification_checks (
                        verification_id, check_name, result, severity, explanation, evidence_reference
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        ver_id, c["check_name"], c["result"], c["severity"],
                        c["explanation"], c.get("evidence_reference")
                    ))

                # Save fields
                for f in fields:
                    cursor.execute("""
                    INSERT INTO extracted_fields (
                        verification_id, field_name, normalized_value, raw_value,
                        extraction_confidence, is_sensitive
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        ver_id, f["field_name"], f.get("normalized_value"), f.get("raw_value"),
                        f.get("extraction_confidence", 1.0), 1 if f.get("is_sensitive") else 0
                    ))

                # Save events
                for e in events:
                    cursor.execute("""
                    INSERT INTO processing_events (
                        verification_id, stage, event_status, message, created_at
                    ) VALUES (?, ?, ?, ?, ?)
                    """, (
                        ver_id, e["stage"], e["event_status"], e.get("message"),
                        e["created_at"].isoformat() if isinstance(e["created_at"], datetime) else str(e["created_at"])
                    ))
        except Exception as db_err:
            print("Database persistence warning:", db_err)

        passed = sum(1 for c in checks if c["result"] == "PASSED")
        failed = sum(1 for c in checks if c["result"] == "FAILED")
        warnings = sum(1 for c in checks if c["result"] == "WARNING")

        recommendations = []
        if final_status == FinalStatusEnum.VERIFIED.value:
            recommendations.append("Document satisfies all applicable deterministic format, checksum, and structure rules.")
            recommendations.append("Proceed with authorized workflow or download verification audit report.")
        elif final_status == FinalStatusEnum.INVALID.value:
            recommendations.append("Do not accept document as valid for official onboarding.")
            recommendations.append("Request the user re-upload an unexpired, unedited original document.")
        elif final_status == FinalStatusEnum.REQUIRES_REVIEW.value:
            recommendations.append("Route document to compliance officer for manual verification.")
            recommendations.append("Check physical document or verify via official issuer portal where permitted.")
        else:
            recommendations.append("Request a higher-resolution scan or supported uncorrupted document file.")

        return {
            "reference_id": ref_id,
            "document_type": doc_type,
            "original_filename": filename,
            "file_size": file_size,
            "mime_type": mime_type,
            "processing_status": "completed",
            "final_status": final_status,
            "summary": summary,
            "created_at": created_at,
            "completed_at": completed_at,
            "checks": checks,
            "extracted_fields": fields,
            "events": events,
            "passed_checks_count": passed,
            "failed_checks_count": failed,
            "warning_checks_count": warnings,
            "recommended_next_steps": recommendations,
            "suggested_type": suggested_type,
            "suggested_type_name": suggested_type_name,
            "detected_category": detected_category
        }
