import re
from typing import Dict, Any, List

class ManipulationAnalyzer:
    EDITING_SOFTWARE_INDICATORS = [
        "photoshop", "gimp", "canva", "illustrator", "inkscape",
        "pdf-lib", "ilovepdf", "smallpdf", "sejda", "nitro"
    ]

    @classmethod
    def analyze_forensics(cls, file_bytes: bytes, file_format: str, metadata: Dict[str, Any], text: str) -> List[Dict[str, Any]]:
        """
        Assesses technical forensic indicators and metadata anomalies.
        Returns a list of check findings.
        """
        checks: List[Dict[str, Any]] = []

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
                    "severity": "LOW",
                    "explanation": f"Document metadata indicates generation or resaving via editing software ({', '.join(software_tags)}). Note: Legitimate tools and scanners may also use these libraries.",
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

        # 3. Overall Authenticity Disclaimer
        checks.append({
            "check_name": "Autonomous Authenticity Verification Bounds",
            "result": "INFO",
            "severity": "INFO",
            "explanation": "Document format and available fields were checked. Official authenticity has not been independently confirmed by an external government authority.",
            "evidence_reference": "Authenticity notice"
        })

        return checks
