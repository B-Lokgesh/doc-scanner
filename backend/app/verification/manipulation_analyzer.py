import re
from typing import Dict, Any, List

class ManipulationAnalyzer:
    EDITING_SOFTWARE_INDICATORS = [
        "photoshop", "gimp", "canva", "illustrator", "inkscape",
        "pdf-lib", "ilovepdf", "smallpdf", "sejda", "nitro", "pdfcreator",
        "adobe acrobat", "foxit", "pdfelement", "scribus"
    ]

    # Mandatory keywords that MUST appear in a real Aadhaar document
    AADHAAR_MANDATORY_KEYWORDS = [
        ["uidai", "unique identification authority"],
        ["government of india", "भारत सरकार"],
        ["aadhaar", "आधार"],
    ]

    # Mandatory keywords in a real PAN card
    PAN_MANDATORY_KEYWORDS = [
        ["income tax department", "income tax", "incometax"],
        ["permanent account number", "pan"],
        ["govt. of india", "government of india"],
    ]

    # Suspicious Aadhaar number patterns
    OBVIOUSLY_FAKE_AADHAAR_PATTERNS = [
        r"\b0000\s0000\s0000\b",   # all zeros
        r"\b1111\s1111\s1111\b",   # all ones
        r"\b1234\s5678\s9012\b",   # sequential pattern
        r"\b9999\s9999\s9999\b",   # all nines
        r"\b1234\s1234\s1234\b",   # repeated chunk
    ]

    @classmethod
    def analyze_forensics(cls, file_bytes: bytes, file_format: str, metadata: Dict[str, Any], text: str, doc_type: str = "") -> List[Dict[str, Any]]:
        """
        Assesses technical forensic indicators and metadata anomalies.
        Returns a list of check findings.
        """
        checks: List[Dict[str, Any]] = []
        text_lower = text.lower()

        # 1. Metadata Producer / Creator Analysis
        if file_format == "pdf" and metadata:
            creator = str(metadata.get("Creator", "")).lower()
            producer = str(metadata.get("Producer", "")).lower()
            software_tags = []
            for tag in cls.EDITING_SOFTWARE_INDICATORS:
                if tag in creator or tag in producer:
                    software_tags.append(tag)

            if software_tags:
                checks.append({
                    "check_name": "Metadata Software Signature Inspection",
                    "result": "WARNING",
                    "severity": "MEDIUM",
                    "explanation": f"Document metadata indicates generation or resaving via editing software ({', '.join(software_tags)}). Legitimate tools may also use these libraries, but this warrants review.",
                    "evidence_reference": f"Producer: {metadata.get('Producer')}, Creator: {metadata.get('Creator')}"
                })
            else:
                checks.append({
                    "check_name": "Metadata Software Signature Inspection",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": "No suspicious external editor software signatures flagged in document metadata.",
                    "evidence_reference": f"Producer: {metadata.get('Producer', 'Standard')}"
                })

            # Check creation vs modification date if present
            c_date = metadata.get("CreationDate", "")
            m_date = metadata.get("ModDate", "")
            if c_date and m_date and c_date != m_date:
                checks.append({
                    "check_name": "Document Revision History Check",
                    "result": "INFO",
                    "severity": "INFO",
                    "explanation": "Document contains a post-creation modification timestamp, consistent with standard PDF printing or export.",
                    "evidence_reference": f"Created: {c_date[:12]}..., Modified: {m_date[:12]}..."
                })

        # 2. Duplicate / Inconsistent Text Stacking in PDF/Text
        lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 8]
        if lines:
            line_counts: Dict[str, int] = {}
            for l in lines:
                line_counts[l] = line_counts.get(l, 0) + 1
            suspicious_repeats = [l for l, count in line_counts.items() if count >= 4]
            if suspicious_repeats:
                checks.append({
                    "check_name": "Text Layer Overlay & Stacking Inspection",
                    "result": "WARNING",
                    "severity": "MEDIUM",
                    "explanation": f"Found {len(suspicious_repeats)} instances of unusually repeated text lines, which can occasionally indicate overlaid text layers or OCR artifacting.",
                    "evidence_reference": f"Repeated: '{suspicious_repeats[0][:30]}...'"
                })
            else:
                checks.append({
                    "check_name": "Text Layer Overlay & Stacking Inspection",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": "Document text streams exhibit standard sequential layout without aberrant line duplicates.",
                    "evidence_reference": "Standard layout stream"
                })

        # 3. Document-specific Deep Fake Detection
        if doc_type == "aadhaar":
            checks.extend(cls._check_aadhaar_authenticity(text, text_lower))
        elif doc_type == "pan":
            checks.extend(cls._check_pan_authenticity(text, text_lower))

        # 4. File Size Plausibility
        file_size = len(file_bytes)
        if file_size < 3000:
            checks.append({
                "check_name": "File Size Plausibility Check",
                "result": "WARNING",
                "severity": "HIGH",
                "explanation": f"File is unusually small ({file_size} bytes). Authentic government-issued documents are typically larger. This may indicate a minimally generated or fabricated file.",
                "evidence_reference": f"Size: {file_size} bytes (threshold: 3000 bytes)"
            })
        elif file_size > 50000:
            checks.append({
                "check_name": "File Size Plausibility Check",
                "result": "PASSED",
                "severity": "INFO",
                "explanation": f"File size ({file_size // 1024} KB) is within expected range for a genuine document scan.",
                "evidence_reference": f"Size: {file_size} bytes"
            })

        # 5. Overall Authenticity Disclaimer
        checks.append({
            "check_name": "Autonomous Authenticity Verification Bounds",
            "result": "INFO",
            "severity": "INFO",
            "explanation": "Document format and available fields were checked. Official authenticity has not been independently confirmed by an external government authority.",
            "evidence_reference": "Authenticity notice"
        })

        return checks

    @classmethod
    def _check_aadhaar_authenticity(cls, text: str, text_lower: str) -> List[Dict[str, Any]]:
        """Deep forensic checks specifically for Aadhaar cards."""
        checks = []

        # Check mandatory UIDAI keywords
        missing_groups = []
        for keyword_group in cls.AADHAAR_MANDATORY_KEYWORDS:
            found = any(kw in text_lower for kw in keyword_group)
            if not found:
                missing_groups.append(keyword_group[0])

        if missing_groups:
            checks.append({
                "check_name": "Aadhaar Mandatory Field Presence Check",
                "result": "FAILED",
                "severity": "HIGH",
                "explanation": f"Genuine Aadhaar cards must contain specific UIDAI authority markers. Missing expected fields: {', '.join(missing_groups)}. This may indicate a non-genuine or altered document.",
                "evidence_reference": f"Missing: {', '.join(missing_groups)}"
            })
        else:
            checks.append({
                "check_name": "Aadhaar Mandatory Field Presence Check",
                "result": "PASSED",
                "severity": "INFO",
                "explanation": "All mandatory UIDAI authority markers and Aadhaar-specific labels are present in the document.",
                "evidence_reference": "UIDAI markers: found"
            })

        # Check for obviously fake Aadhaar number patterns
        found_fake_pattern = None
        for pattern in cls.OBVIOUSLY_FAKE_AADHAAR_PATTERNS:
            if re.search(pattern, text):
                found_fake_pattern = pattern
                break

        if found_fake_pattern:
            checks.append({
                "check_name": "Aadhaar UID Suspicious Pattern Check",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": "The Aadhaar UID number matches a known placeholder/test pattern (e.g., all zeros, sequential digits). UIDAI does not issue UIDs with such patterns. This document is highly likely fabricated.",
                "evidence_reference": f"Matched suspicious pattern in UID field"
            })
        else:
            # Check that aadhaar number doesn't start with 0 or 1 (UIDAI rule)
            aadhaar_match = re.search(r'\b(\d{4})\s\d{4}\s\d{4}\b', text)
            if aadhaar_match:
                first_digit = aadhaar_match.group(1)[0]
                if first_digit in ['0', '1']:
                    checks.append({
                        "check_name": "Aadhaar UID Starting Digit Validation",
                        "result": "FAILED",
                        "severity": "CRITICAL",
                        "explanation": f"UIDAI policy mandates that valid Aadhaar numbers cannot start with 0 or 1. The detected UID begins with '{first_digit}', indicating a fabricated or invalid number.",
                        "evidence_reference": f"First digit: {first_digit} (must be 2-9)"
                    })
                else:
                    checks.append({
                        "check_name": "Aadhaar UID Starting Digit Validation",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": f"Aadhaar UID starts with a valid digit ({first_digit}), consistent with UIDAI issuance policy.",
                        "evidence_reference": f"First digit: {first_digit}"
                    })

        # Check for QR code reference or VID mention (modern Aadhaar feature)
        has_vid_or_qr = any(kw in text_lower for kw in ["vid", "virtual id", "qr", "download"])
        if not has_vid_or_qr:
            checks.append({
                "check_name": "Aadhaar Modern Security Feature Check",
                "result": "WARNING",
                "severity": "LOW",
                "explanation": "Post-2018 Aadhaar cards typically include QR codes or Virtual ID (VID) references. These markers are absent, which may indicate an older card or reduced-quality scan.",
                "evidence_reference": "VID/QR markers: not detected"
            })
        else:
            checks.append({
                "check_name": "Aadhaar Modern Security Feature Check",
                "result": "PASSED",
                "severity": "INFO",
                "explanation": "Modern Aadhaar security features (VID or QR reference) detected in document content.",
                "evidence_reference": "VID/QR markers: present"
            })

        return checks

    @classmethod
    def _check_pan_authenticity(cls, text: str, text_lower: str) -> List[Dict[str, Any]]:
        """Deep forensic checks specifically for PAN cards."""
        checks = []

        # Check mandatory Income Tax Department keywords
        missing_groups = []
        for keyword_group in cls.PAN_MANDATORY_KEYWORDS:
            found = any(kw in text_lower for kw in keyword_group)
            if not found:
                missing_groups.append(keyword_group[0])

        if missing_groups:
            checks.append({
                "check_name": "PAN Mandatory Authority Marker Check",
                "result": "FAILED",
                "severity": "HIGH",
                "explanation": f"Genuine PAN cards must contain Income Tax Department authority markers. Missing: {', '.join(missing_groups)}. This may indicate a non-genuine document.",
                "evidence_reference": f"Missing markers: {', '.join(missing_groups)}"
            })
        else:
            checks.append({
                "check_name": "PAN Mandatory Authority Marker Check",
                "result": "PASSED",
                "severity": "INFO",
                "explanation": "All mandatory Income Tax Department authority markers are present in the document.",
                "evidence_reference": "IT Dept markers: found"
            })

        # Check PAN entity type code validity (4th character)
        pan_match = re.search(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b', text)
        if pan_match:
            pan_val = pan_match.group(1)
            valid_entity_codes = {'P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G'}
            entity_code = pan_val[3]
            if entity_code in valid_entity_codes:
                entity_map = {'P': 'Individual', 'C': 'Company', 'H': 'HUF', 'F': 'Firm',
                              'A': 'AOP/BOI', 'T': 'AOP (Trust)', 'B': 'BOI', 'L': 'Local Authority',
                              'J': 'AJP', 'G': 'Govt'}
                checks.append({
                    "check_name": "PAN Entity Type Code Authenticity",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": f"PAN entity code '{entity_code}' is a valid Income Tax entity designator corresponding to: {entity_map.get(entity_code, 'Known Entity')}.",
                    "evidence_reference": f"Entity code: {entity_code}"
                })
            else:
                checks.append({
                    "check_name": "PAN Entity Type Code Authenticity",
                    "result": "FAILED",
                    "severity": "HIGH",
                    "explanation": f"PAN 4th character '{entity_code}' is not a recognized Income Tax entity designator. Valid codes are P/C/H/F/A/T/B/L/J/G. This indicates a fabricated or incorrectly formatted PAN.",
                    "evidence_reference": f"Invalid entity code: {entity_code}"
                })

        return checks
