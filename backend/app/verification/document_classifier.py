import re
from typing import Dict, Any, List, Tuple

DOCUMENT_DISPLAY_NAMES = {
    "pan": "PAN Card",
    "aadhaar": "Aadhaar Card",
    "passport": "Passport",
    "driving_licence": "Driving Licence",
    "voter_id": "Voter ID",
    "educational_certificate": "Educational Certificate",
    "bank_statement": "Bank Statement",
    "income_certificate": "Income Certificate",
    "other": "Other Document"
}

class DocumentClassifier:
    CATEGORY_INDICATORS = {
        "pan": {
            "keywords": ["income tax", "permanent account number", "pan", "father's name", "govt. of india", "incometax"],
            "regex": r"[A-Z]{5}[0-9]{4}[A-Z]",
            "min_score": 2
        },
        "aadhaar": {
            "keywords": ["unique identification", "uidai", "aadhaar", "government of india", "mera aadhaar", "help@uidai", "enrollment"],
            "regex": r"\b\d{4}\s\d{4}\s\d{4}\b",
            "min_score": 2
        },
        "passport": {
            "keywords": ["passport", "republic of india", "type p", "given name", "surname", "nationality", "place of issue"],
            "regex": r"\b[A-PR-WYZ][0-9]{7}\b",
            "min_score": 2
        },
        "driving_licence": {
            "keywords": [
                "driving licence", "driving license", "dl no", "licence to drive", "motor vehicles",
                "transport department", "rto", "indian union", "union driving licence",
                "issued by government", "validity (nt)", "validity (tr)", "validity",
                "holder's signature", "son/daughter/wife", "blood group", "organ donor", "licence"
            ],
            "regex": r"\b[A-Z]{2}[0-9]{2}[A-Z0-9 -]{7,15}\b",
            "min_score": 2
        },
        "voter_id": {
            "keywords": ["election commission of india", "elector", "epic no", "voter identity card", "voter id", "vidhan sabha"],
            "regex": r"\b[A-Z]{3}[0-9]{7}\b",
            "min_score": 2
        },
        "educational_certificate": {
            "keywords": ["board", "university", "examination", "marksheet", "statement of marks", "roll no", "degree", "cgpa", "percentage", "passed"],
            "regex": r"\b(roll\s*no|reg\s*no)\b",
            "min_score": 2
        },
        "bank_statement": {
            "keywords": ["account statement", "statement of account", "bank", "account no", "opening balance", "closing balance", "debit", "credit", "transaction"],
            "regex": r"\b(balance|transaction|account\s*no)\b",
            "min_score": 2
        },
        "income_certificate": {
            "keywords": ["income certificate", "annual income", "revenue department", "tahsildar", "financial year", "sub-divisional magistrate", "tehsildar"],
            "regex": r"\b(income\s*certificate|annual\s*income)\b",
            "min_score": 2
        }
    }

    @classmethod
    def classify_and_check_consistency(cls, text: str, selected_type: str) -> Dict[str, Any]:
        """
        Evaluates whether extracted text is consistent with the selected document type.
        Detects type mismatches and ambiguous content.
        """
        text_lower = text.lower()
        checks: List[Dict[str, Any]] = []

        if selected_type == "other":
            checks.append({
                "check_name": "Document Category Classification",
                "result": "INFO",
                "severity": "INFO",
                "explanation": "Selected category is 'Other Document'. General structural analysis applied without category-specific rules.",
                "evidence_reference": "Category: other"
            })
            return {
                "is_match": True,
                "is_mismatch": False,
                "is_ambiguous": False,
                "detected_category": "other",
                "confidence": 0.5,
                "checks": checks
            }

        scores: Dict[str, int] = {}
        for cat, data in cls.CATEGORY_INDICATORS.items():
            score = 0
            for kw in data["keywords"]:
                if kw in text_lower:
                    score += 1
            if re.search(data["regex"], text, re.IGNORECASE):
                score += 2
            scores[cat] = score

        selected_score = scores.get(selected_type, 0)
        best_detected_cat = max(scores, key=scores.get) if scores else "unknown"
        best_score = scores.get(best_detected_cat, 0)

        # Case 1: Strong indicators match selected type
        min_required = cls.CATEGORY_INDICATORS.get(selected_type, {}).get("min_score", 2)
        if selected_score >= min_required:
            checks.append({
                "check_name": "Document Category Consistency",
                "result": "PASSED",
                "severity": "INFO",
                "explanation": f"Document content contains key vocabulary and structural markers consistent with {selected_type.replace('_', ' ').title()}.",
                "evidence_reference": f"Match score: {selected_score} for {selected_type}"
            })
            return {
                "is_match": True,
                "is_mismatch": False,
                "is_ambiguous": False,
                "detected_category": selected_type,
                "suggested_type": None,
                "suggested_type_name": None,
                "confidence": min(0.95, 0.6 + (selected_score * 0.1)),
                "checks": checks
            }

        # Case 2: Content strongly matches ANOTHER category (Mismatch!)
        # Trigger if selected score is low AND another category scores higher
        if best_score >= min_required and best_detected_cat != selected_type and selected_score < min_required:
            detected_name = DOCUMENT_DISPLAY_NAMES.get(best_detected_cat, best_detected_cat.replace('_', ' ').title())
            selected_name = DOCUMENT_DISPLAY_NAMES.get(selected_type, selected_type.replace('_', ' ').title())
            checks.append({
                "check_name": "Document Category Consistency",
                "result": "FAILED",
                "severity": "CRITICAL",
                "explanation": f"Wrong document type uploaded! This appears to be a {detected_name}, not a {selected_name}. Please upload a valid {selected_name} to proceed.",
                "evidence_reference": f"Expected: {selected_type}, Detected: {best_detected_cat} (score: {best_score})"
            })
            return {
                "is_match": False,
                "is_mismatch": True,
                "is_ambiguous": False,
                "detected_category": best_detected_cat,
                "suggested_type": best_detected_cat,
                "suggested_type_name": detected_name,
                "confidence": 0.85,
                "checks": checks
            }

        # Case 3: Ambiguous or weak signals (e.g. poor OCR or missing headers)
        checks.append({
            "check_name": "Document Category Consistency",
            "result": "WARNING",
            "severity": "MEDIUM",
            "explanation": f"Could not decisively confirm '{selected_type.replace('_', ' ').title()}' headers from OCR text. Manual review recommended.",
            "evidence_reference": f"Score: {selected_score}/{min_required} for {selected_type}"
        })
        return {
            "is_match": False,
            "is_mismatch": False,
            "is_ambiguous": True,
            "detected_category": "ambiguous",
            "suggested_type": None,
            "suggested_type_name": None,
            "confidence": 0.4,
            "checks": checks
        }
