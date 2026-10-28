import re
from datetime import datetime
from typing import Dict, Any, List
from app.verification.field_extractor import FieldExtractor

class ConsistencyChecker:
    @classmethod
    def check_internal_consistency(cls, doc_type: str, fields: List[Dict[str, Any]], full_text: str) -> List[Dict[str, Any]]:
        """
        Evaluates internal consistency between multiple fields in the document.
        """
        checks: List[Dict[str, Any]] = []
        field_dict = {f["field_name"]: f for f in fields}
        now = datetime.now()

        dob_field = field_dict.get("date_of_birth")
        issue_field = field_dict.get("issue_date")

        dob_dt = FieldExtractor.parse_date(dob_field["raw_value"]) if (dob_field and dob_field.get("raw_value")) else None
        issue_dt = FieldExtractor.parse_date(issue_field["raw_value"]) if (issue_field and issue_field.get("raw_value")) else None

        # 1. Date of Birth vs Issue Date Consistency
        if dob_dt and issue_dt:
            if dob_dt >= issue_dt:
                checks.append({
                    "check_name": "Date of Birth vs Document Issue Date",
                    "result": "FAILED",
                    "severity": "CRITICAL",
                    "explanation": f"Date of birth ({dob_field['raw_value']}) is on or after the document issue date ({issue_field['raw_value']}). This is chronologically impossible.",
                    "evidence_reference": f"DOB: {dob_field['raw_value']} vs Issue: {issue_field['raw_value']}"
                })
            else:
                age_at_issue = (issue_dt - dob_dt).days // 365
                # Special check for driving licence minimum age (18)
                if doc_type == "driving_licence" and age_at_issue < 18:
                    checks.append({
                        "check_name": "Minimum Age Requirement at Issue",
                        "result": "FAILED",
                        "severity": "HIGH",
                        "explanation": f"Holder was {age_at_issue} years old at the time of driving licence issuance (minimum legal age is 18).",
                        "evidence_reference": f"Calculated age at issue: {age_at_issue}"
                    })
                else:
                    checks.append({
                        "check_name": "Date of Birth vs Document Issue Date",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": f"Chronological order is valid (holder was {age_at_issue} years old when document was issued).",
                        "evidence_reference": f"Age at issue: {age_at_issue}"
                    })

        # 2. Conflicting Names in text
        name_field = field_dict.get("holder_name") or field_dict.get("given_name")
        if name_field and name_field.get("normalized_value"):
            name = name_field["normalized_value"]
            # Look for lines like "Name: John Doe" and another "Name: Jane Smith"
            all_names_found = re.findall(r"(?:name|holder)[\s:]*([A-Z][a-z]+\s+[A-Z][a-z]+)", full_text, re.IGNORECASE)
            distinct_names = set(n.title() for n in all_names_found if len(n.split()) >= 2)
            if len(distinct_names) > 2:
                # If there are radically conflicting names for the same role
                checks.append({
                    "check_name": "Name Entity Singularity Cross-Check",
                    "result": "WARNING",
                    "severity": "MEDIUM",
                    "explanation": f"Multiple differing person names detected in document text ({', '.join(list(distinct_names)[:3])}). May indicate secondary party or OCR anomaly.",
                    "evidence_reference": f"Detected names: {', '.join(list(distinct_names)[:3])}"
                })
            else:
                checks.append({
                    "check_name": "Name Entity Singularity Cross-Check",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": "Extracted subject name is consistent across document instances.",
                    "evidence_reference": f"Name: {name}"
                })

        return checks
