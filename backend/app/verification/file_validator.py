import os
import io
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Tuple
from pypdf import PdfReader
from PIL import Image
from app.core.config import settings

class FileValidator:
    MAGIC_SIGNATURES = {
        "pdf": b"%PDF",
        "png": b"\x89PNG\r\n\x1a\n",
        "jpeg": b"\xff\xd8\xff",
    }

    @staticmethod
    def calculate_file_hash(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @classmethod
    def validate_file(cls, file_bytes: bytes, original_filename: str, declared_mime: str) -> Dict[str, Any]:
        """
        Validates file integrity, magic bytes, structure, corruption, and encryption.
        Returns a dict containing validation result, detected format, checks, and metadata.
        """
        checks: List[Dict[str, Any]] = []
        is_valid = True
        file_size = len(file_bytes)
        ext = Path(original_filename).suffix.lower()

        # 1. Zero-byte check
        if file_size == 0:
            checks.append({
                "check_name": "File Size & Emptiness",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": "Uploaded file is 0 bytes (empty file).",
                "evidence_reference": f"Size: 0 bytes, Filename: {original_filename}"
            })
            return {
                "is_valid": False,
                "error_code": "EMPTY_FILE",
                "message": "The uploaded file is empty.",
                "checks": checks,
                "file_size": 0,
                "detected_type": "unknown",
                "page_count": 0
            }

        # 2. Maximum file size check
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            checks.append({
                "check_name": "File Size Limit",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": f"File size ({file_size / (1024*1024):.2f} MB) exceeds maximum allowed size ({settings.MAX_FILE_SIZE_BYTES / (1024*1024):.0f} MB).",
                "evidence_reference": f"Size: {file_size} bytes"
            })
            return {
                "is_valid": False,
                "error_code": "FILE_TOO_LARGE",
                "message": "File exceeds size limit.",
                "checks": checks,
                "file_size": file_size,
                "detected_type": "unknown",
                "page_count": 0
            }

        checks.append({
            "check_name": "File Size Limit",
            "result": "PASSED",
            "severity": "INFO",
            "explanation": f"File size ({file_size / 1024:.1f} KB) is within the acceptable limit.",
            "evidence_reference": f"{file_size} bytes"
        })

        # 3. File extension check
        if ext not in settings.ALLOWED_EXTENSIONS:
            checks.append({
                "check_name": "File Extension",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": f"File extension '{ext}' is not supported. Supported extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}",
                "evidence_reference": f"Filename: {original_filename}"
            })
            return {
                "is_valid": False,
                "error_code": "UNSUPPORTED_EXTENSION",
                "message": f"Unsupported file extension: {ext}",
                "checks": checks,
                "file_size": file_size,
                "detected_type": "unknown",
                "page_count": 0
            }

        checks.append({
            "check_name": "File Extension",
            "result": "PASSED",
            "severity": "INFO",
            "explanation": f"File extension '{ext}' is valid and supported.",
            "evidence_reference": f"Filename: {original_filename}"
        })

        # 4. Dangerous executable detection
        if file_bytes.startswith(b"MZ") or file_bytes.startswith(b"\x7fELF"):
            checks.append({
                "check_name": "Malicious Executable Signature Detection",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": "File contains executable binary header signature (PE/ELF). Execution blocked.",
                "evidence_reference": "Binary signature: MZ/ELF detected"
            })
            return {
                "is_valid": False,
                "error_code": "MALICIOUS_FILE",
                "message": "Binary executable detected. Upload rejected.",
                "checks": checks,
                "file_size": file_size,
                "detected_type": "executable",
                "page_count": 0
            }

        # 5. Magic bytes & content inspection
        detected_format = "unknown"
        if file_bytes.startswith(cls.MAGIC_SIGNATURES["pdf"]):
            detected_format = "pdf"
        elif file_bytes.startswith(cls.MAGIC_SIGNATURES["png"]):
            detected_format = "png"
        elif file_bytes.startswith(cls.MAGIC_SIGNATURES["jpeg"]):
            detected_format = "jpeg"

        # Check signature vs extension mismatch
        expected_format = "pdf" if ext == ".pdf" else ("png" if ext == ".png" else "jpeg")
        if detected_format != expected_format:
            checks.append({
                "check_name": "Magic Byte & MIME Consistency",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": f"Declared file type ({ext}) does not match actual binary signature (detected: {detected_format}).",
                "evidence_reference": f"Extension: {ext}, Detected magic signature: {detected_format}"
            })
            return {
                "is_valid": False,
                "error_code": "MIME_MISMATCH",
                "message": "File content does not match its file extension.",
                "checks": checks,
                "file_size": file_size,
                "detected_type": detected_format,
                "page_count": 0
            }

        checks.append({
            "check_name": "Magic Byte & MIME Consistency",
            "result": "PASSED",
            "severity": "INFO",
            "explanation": f"File header magic signature correctly matches {detected_format.upper()} format.",
            "evidence_reference": f"Header matches {detected_format.upper()}"
        })

        # 6. Deep structural inspection
        page_count = 1
        if detected_format == "pdf":
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                if reader.is_encrypted:
                    checks.append({
                        "check_name": "PDF Encryption Status",
                        "result": "FAILED",
                        "severity": "HIGH",
                        "explanation": "The PDF document is encrypted or password-protected and cannot be analyzed.",
                        "evidence_reference": "PDF encryption flag: True"
                    })
                    return {
                        "is_valid": False,
                        "error_code": "ENCRYPTED_PDF",
                        "message": "PDF is encrypted or password protected.",
                        "checks": checks,
                        "file_size": file_size,
                        "detected_type": "pdf",
                        "page_count": 0
                    }
                
                page_count = len(reader.pages)
                if page_count == 0:
                    checks.append({
                        "check_name": "PDF Structure & Page Count",
                        "result": "FAILED",
                        "severity": "CRITICAL",
                        "explanation": "PDF contains zero pages.",
                        "evidence_reference": "Page count: 0"
                    })
                    return {
                        "is_valid": False,
                        "error_code": "EMPTY_PDF",
                        "message": "PDF has no pages.",
                        "checks": checks,
                        "file_size": file_size,
                        "detected_type": "pdf",
                        "page_count": 0
                    }

                # Check for suspicious embedded launch scripts in PDF
                raw_text_check = file_bytes.decode('latin1', errors='ignore')
                if "/JavaScript" in raw_text_check or "/Launch" in raw_text_check:
                    checks.append({
                        "check_name": "PDF Embedded Script Inspection",
                        "result": "WARNING",
                        "severity": "MEDIUM",
                        "explanation": "PDF contains embedded script tags (/JavaScript or /Launch). Automated execution is strictly sandboxed.",
                        "evidence_reference": "Embedded script dictionary keys found"
                    })
                else:
                    checks.append({
                        "check_name": "PDF Embedded Script Inspection",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": "No suspicious executable action dictionaries detected in PDF structure.",
                        "evidence_reference": "Safe PDF structure"
                    })

                checks.append({
                    "check_name": "PDF Structural Integrity",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": f"PDF parsed successfully with {page_count} page(s).",
                    "evidence_reference": f"Total pages: {page_count}"
                })

            except Exception as e:
                checks.append({
                    "check_name": "PDF Structural Integrity",
                    "result": "FAILED",
                    "severity": "CRITICAL",
                    "explanation": f"PDF is corrupted or malformed and failed parsing: {str(e)[:120]}",
                    "evidence_reference": "Parser exception during stream decoding"
                })
                return {
                    "is_valid": False,
                    "error_code": "CORRUPTED_PDF",
                    "message": "The PDF file is corrupted and cannot be parsed.",
                    "checks": checks,
                    "file_size": file_size,
                    "detected_type": "pdf",
                    "page_count": 0
                }

        elif detected_format in ["png", "jpeg"]:
            try:
                img = Image.open(io.BytesIO(file_bytes))
                img.verify()
                # Reopen to load pixel data to ensure no truncated stream
                img = Image.open(io.BytesIO(file_bytes))
                img.load()
                width, height = img.size
                if width <= 0 or height <= 0:
                    raise ValueError(f"Invalid image dimensions: {width}x{height}")

                checks.append({
                    "check_name": "Image Structural Integrity",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": f"Image successfully decoded ({width}x{height} pixels, format: {img.format}).",
                    "evidence_reference": f"Resolution: {width}x{height}, Mode: {img.mode}"
                })
            except Exception as e:
                checks.append({
                    "check_name": "Image Structural Integrity",
                    "result": "FAILED",
                    "severity": "CRITICAL",
                    "explanation": f"Image file is corrupted or incomplete: {str(e)[:120]}",
                    "evidence_reference": "Image decoding failure"
                })
                return {
                    "is_valid": False,
                    "error_code": "CORRUPTED_IMAGE",
                    "message": "Image is corrupted or cannot be decoded.",
                    "checks": checks,
                    "file_size": file_size,
                    "detected_type": detected_format,
                    "page_count": 1
                }

        return {
            "is_valid": True,
            "error_code": None,
            "message": "File passed integrity and structure validation.",
            "checks": checks,
            "file_size": file_size,
            "detected_type": detected_format,
            "page_count": page_count
        }
