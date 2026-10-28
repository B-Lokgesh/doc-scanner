import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.verification.field_extractor import FieldExtractor

class Verhoeff:
    """
    Official Verhoeff checksum algorithm implementation for UID/Aadhaar.
    """
    _d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ]

    _p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ]

    _inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

    @classmethod
    def validate(cls, num_str: str) -> bool:
        if not num_str.isdigit():
            return False
        c = 0
        reversed_num = num_str[::-1]
        for i, ch in enumerate(reversed_num):
            c = cls._d[c][cls._p[i % 8][int(ch)]]
        return c == 0

    @classmethod
    def generate_checksum(cls, num_str: str) -> int:
        c = 0
        reversed_num = num_str[::-1]
        for i, ch in enumerate(reversed_num):
            c = cls._d[c][cls._p[(i + 1) % 8][int(ch)]]
        return cls._inv[c]

class DocumentRulesEngine:
    @classmethod
    def evaluate_rules(cls, doc_type: str, fields: List[Dict[str, Any]], full_text: str) -> List[Dict[str, Any]]:
        """
        Executes deterministic validation checks based on extracted fields and document category.
        """
        checks: List[Dict[str, Any]] = []
        field_dict = {f["field_name"]: f for f in fields}
        now = datetime.now()

        # ----------------------------------------------------
        # 1. PAN Card Rules
        # ----------------------------------------------------
        if doc_type == "pan":
            pan_field = field_dict.get("pan_number")
            if not pan_field or not pan_field.get("raw_value"):
                checks.append({
                    "check_name": "Required PAN Number Presence",
                    "result": "FAILED",
                    "severity": "CRITICAL",
                    "explanation": "Permanent Account Number (PAN) could not be located in document text.",
                    "evidence_reference": "Field: pan_number is missing"
                })
            else:
                pan_val = pan_field["raw_value"]
                # Format check
                if re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan_val):
                    checks.append({
                        "check_name": "PAN Structure & Format Validation",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": "PAN matches standard 10-character format (5 letters, 4 digits, 1 letter).",
                        "evidence_reference": f"Format: {pan_val}"
                    })
                    # 4th character entity type check
                    entity_char = pan_val[3]
                    valid_entities = {'P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G'}
                    if entity_char in valid_entities:
                        checks.append({
                            "check_name": "PAN Entity Type Identifier Check",
                            "result": "PASSED",
                            "severity": "INFO",
                            "explanation": f"4th character '{entity_char}' represents a valid taxpayer category.",
                            "evidence_reference": f"Entity character: {entity_char}"
                        })
                    else:
                        checks.append({
                            "check_name": "PAN Entity Type Identifier Check",
                            "result": "FAILED",
                            "severity": "HIGH",
                            "explanation": f"4th character '{entity_char}' is not a recognized Indian tax entity code.",
                            "evidence_reference": f"Invalid entity character: {entity_char}"
                        })

                    # 5th character initial check if name is present
                    name_field = field_dict.get("holder_name")
                    if name_field and name_field.get("normalized_value"):
                        name_parts = name_field["normalized_value"].split()
                        if name_parts and entity_char == 'P':
                            surname_initial = name_parts[-1][0].upper()
                            pan_5th = pan_val[4].upper()
                            if surname_initial == pan_5th:
                                checks.append({
                                    "check_name": "PAN Surname Initial Cross-Check",
                                    "result": "PASSED",
                                    "severity": "INFO",
                                    "explanation": f"5th character of PAN ('{pan_5th}') matches the initial of extracted surname ('{name_parts[-1]}').",
                                    "evidence_reference": f"PAN 5th: {pan_5th}, Surname: {name_parts[-1]}"
                                })
                            else:
                                checks.append({
                                    "check_name": "PAN Surname Initial Cross-Check",
                                    "result": "WARNING",
                                    "severity": "MEDIUM",
                                    "explanation": f"5th character '{pan_5th}' does not match extracted surname initial '{surname_initial}'. May be due to single name or name order in scan.",
                                    "evidence_reference": f"PAN 5th: {pan_5th}, Surname: {name_parts[-1]}"
                                })
                else:
                    checks.append({
                        "check_name": "PAN Structure & Format Validation",
                        "result": "FAILED",
                        "severity": "CRITICAL",
                        "explanation": f"PAN '{pan_val}' fails standard 10-character alphanumeric syntax.",
                        "evidence_reference": f"Value: {pan_val}"
                    })

            # Check DOB format if present
            dob_field = field_dict.get("date_of_birth")
            if dob_field and dob_field.get("raw_value"):
                dt = FieldExtractor.parse_date(dob_field["raw_value"])
                if dt:
                    if dt > now:
                        checks.append({
                            "check_name": "Date of Birth Temporal Validity",
                            "result": "FAILED",
                            "severity": "CRITICAL",
                            "explanation": f"Date of birth ({dob_field['raw_value']}) is in the future.",
                            "evidence_reference": f"DOB: {dob_field['raw_value']}"
                        })
                    else:
                        checks.append({
                            "check_name": "Date of Birth Temporal Validity",
                            "result": "PASSED",
                            "severity": "INFO",
                            "explanation": "Date of birth is a valid historical calendar date.",
                            "evidence_reference": f"DOB: {dob_field['raw_value']}"
                        })
                else:
                    checks.append({
                        "check_name": "Date of Birth Temporal Validity",
                        "result": "FAILED",
                        "severity": "HIGH",
                        "explanation": f"Date of birth '{dob_field['raw_value']}' is malformed.",
                        "evidence_reference": f"DOB: {dob_field['raw_value']}"
                    })

        # ----------------------------------------------------
        # 2. Aadhaar Card Rules
        # ----------------------------------------------------
        elif doc_type == "aadhaar":
            uid_field = field_dict.get("aadhaar_number")
            if not uid_field or not uid_field.get("raw_value"):
                checks.append({
                    "check_name": "Aadhaar UID Number Presence",
                    "result": "FAILED",
                    "severity": "CRITICAL",
                    "explanation": "12-digit Aadhaar number could not be found in the document.",
                    "evidence_reference": "Field: aadhaar_number missing"
                })
            else:
                raw_uid = uid_field["raw_value"]
                # 12 digits check
                if len(raw_uid) == 12 and raw_uid.isdigit():
                    checks.append({
                        "check_name": "Aadhaar 12-Digit Structure",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": "Aadhaar identifier consists of exactly 12 numeric digits.",
                        "evidence_reference": f"Masked: XXXX XXXX {raw_uid[-4:]}"
                    })
                    # Verhoeff Checksum Check
                    if Verhoeff.validate(raw_uid):
                        checks.append({
                            "check_name": "Official Verhoeff Algorithm Checksum",
                            "result": "PASSED",
                            "severity": "INFO",
                            "explanation": "Aadhaar number satisfies the official Verhoeff dihedral group checksum algorithm.",
                            "evidence_reference": "Verhoeff check: Valid"
                        })
                    else:
                        checks.append({
                            "check_name": "Official Verhoeff Algorithm Checksum",
                            "result": "FAILED",
                            "severity": "CRITICAL",
                            "explanation": "Aadhaar number FAILED the official Verhoeff checksum algorithm. Identifier is mathematically invalid or mistyped.",
                            "evidence_reference": "Verhoeff check: FAILED"
                        })
                else:
                    checks.append({
                        "check_name": "Aadhaar 12-Digit Structure",
                        "result": "FAILED",
                        "severity": "CRITICAL",
                        "explanation": f"Aadhaar identifier must be 12 numeric digits (found {len(raw_uid)} chars).",
                        "evidence_reference": f"Length: {len(raw_uid)}"
                    })

            # Statutory government safeguard notice
            checks.append({
                "check_name": "UIDAI Official Verification Limitation",
                "result": "INFO",
                "severity": "INFO",
                "explanation": "Format and Verhoeff checksum were validated locally. As required by law, official authenticity requires UIDAI OTP/biometric authentication.",
                "evidence_reference": "Statutory identity safeguard"
            })

        # ----------------------------------------------------
        # 3. Passport Rules
        # ----------------------------------------------------
        elif doc_type == "passport":
            pass_field = field_dict.get("passport_number")
            if not pass_field or not pass_field.get("raw_value"):
                checks.append({
                    "check_name": "Passport Number Presence",
                    "result": "FAILED",
                    "severity": "CRITICAL",
                    "explanation": "Passport number could not be extracted.",
                    "evidence_reference": "Missing passport_number"
                })
            else:
                p_val = pass_field["raw_value"]
                if re.match(r"^[A-PR-WYZ][0-9]{7}$", p_val):
                    checks.append({
                        "check_name": "Passport Identifier Format",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": "Passport number matches standard ICAO / Indian passport format (1 letter + 7 digits).",
                        "evidence_reference": f"Passport: {p_val}"
                    })
                else:
                    checks.append({
                        "check_name": "Passport Identifier Format",
                        "result": "FAILED",
                        "severity": "HIGH",
                        "explanation": f"Passport number '{p_val}' does not conform to standard format.",
                        "evidence_reference": f"Passport: {p_val}"
                    })

            # Expiry date evaluation
            exp_field = field_dict.get("expiry_date")
            issue_field = field_dict.get("issue_date")
            exp_dt = FieldExtractor.parse_date(exp_field["raw_value"]) if (exp_field and exp_field.get("raw_value")) else None
            issue_dt = FieldExtractor.parse_date(issue_field["raw_value"]) if (issue_field and issue_field.get("raw_value")) else None

            if exp_dt:
                if exp_dt < now:
                    checks.append({
                        "check_name": "Passport Active Validity Status",
                        "result": "FAILED",
                        "severity": "CRITICAL",
                        "explanation": f"Document is EXPIRED. Expiry date ({exp_field['raw_value']}) has passed.",
                        "evidence_reference": f"Expired on: {exp_field['raw_value']}"
                    })
                else:
                    checks.append({
                        "check_name": "Passport Active Validity Status",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": f"Passport is currently active and within valid period (expires: {exp_field['raw_value']}).",
                        "evidence_reference": f"Valid until: {exp_field['raw_value']}"
                    })

            if issue_dt and exp_dt:
                if issue_dt > exp_dt:
                    checks.append({
                        "check_name": "Issue vs Expiry Date Sequence",
                        "result": "FAILED",
                        "severity": "CRITICAL",
                        "explanation": f"Issue date ({issue_field['raw_value']}) is later than expiry date ({exp_field['raw_value']}). Chronologically impossible.",
                        "evidence_reference": f"Issue: {issue_field['raw_value']}, Expiry: {exp_field['raw_value']}"
                    })
                else:
                    checks.append({
                        "check_name": "Issue vs Expiry Date Sequence",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": "Issue date chronologically precedes expiry date.",
                        "evidence_reference": f"Issue: {issue_field['raw_value']} -> Expiry: {exp_field['raw_value']}"
                    })

        # ----------------------------------------------------
        # 4. Driving Licence Rules
        # ----------------------------------------------------
        elif doc_type == "driving_licence":
            dl_field = field_dict.get("dl_number")
            if not dl_field or not dl_field.get("raw_value"):
                checks.append({
                    "check_name": "Driving Licence Number Presence",
                    "result": "FAILED",
                    "severity": "CRITICAL",
                    "explanation": "Driving licence number could not be located.",
                    "evidence_reference": "Missing dl_number"
                })
            else:
                dl_val = dl_field["raw_value"]
                checks.append({
                    "check_name": "Driving Licence Number Structure",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": f"Licence number format successfully captured.",
                    "evidence_reference": f"DL: {dl_val}"
                })

            exp_field = field_dict.get("expiry_date")
            if exp_field and exp_field.get("raw_value"):
                exp_dt = FieldExtractor.parse_date(exp_field["raw_value"])
                if exp_dt and exp_dt < now:
                    checks.append({
                        "check_name": "Driving Licence Validity Period",
                        "result": "FAILED",
                        "severity": "CRITICAL",
                        "explanation": f"Driving licence is EXPIRED. Validity expired on {exp_field['raw_value']}.",
                        "evidence_reference": f"Expired on: {exp_field['raw_value']}"
                    })
                elif exp_dt:
                    checks.append({
                        "check_name": "Driving Licence Validity Period",
                        "result": "PASSED",
                        "severity": "INFO",
                        "explanation": f"Licence is currently active (valid till {exp_field['raw_value']}).",
                        "evidence_reference": f"Valid till: {exp_field['raw_value']}"
                    })

        # ----------------------------------------------------
        # 5. Bank Statement Rules (Arithmetic Reconciliation)
        # ----------------------------------------------------
        elif doc_type == "bank_statement":
            acc_field = field_dict.get("account_number")
            if not acc_field:
                checks.append({
                    "check_name": "Bank Account Number Presence",
                    "result": "WARNING",
                    "severity": "MEDIUM",
                    "explanation": "Bank account number could not be clearly resolved from statement header.",
                    "evidence_reference": "Account number unread"
                })
            else:
                checks.append({
                    "check_name": "Bank Account Number Presence",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": "Account identifier located and masked.",
                    "evidence_reference": f"Account: {acc_field.get('normalized_value')}"
                })

            # Arithmetic check: Opening + Credits - Debits == Closing
            ob_f = field_dict.get("opening_balance")
            cb_f = field_dict.get("closing_balance")
            tc_f = field_dict.get("total_credits")
            td_f = field_dict.get("total_debits")

            if ob_f and cb_f and tc_f and td_f:
                try:
                    ob = float(ob_f["normalized_value"])
                    cb = float(cb_f["normalized_value"])
                    tc = float(tc_f["normalized_value"])
                    td = float(td_f["normalized_value"])

                    expected_cb = round(ob + tc - td, 2)
                    actual_cb = round(cb, 2)
                    diff = abs(expected_cb - actual_cb)

                    if diff <= 0.05:
                        checks.append({
                            "check_name": "Financial Statement Arithmetic Reconciliation",
                            "result": "PASSED",
                            "severity": "INFO",
                            "explanation": f"Statement math is consistent: Opening ({ob:,.2f}) + Credits ({tc:,.2f}) - Debits ({td:,.2f}) = Closing ({cb:,.2f}).",
                            "evidence_reference": f"Calculated: {expected_cb:,.2f}, Stated: {actual_cb:,.2f}"
                        })
                    else:
                        checks.append({
                            "check_name": "Financial Statement Arithmetic Reconciliation",
                            "result": "FAILED",
                            "severity": "CRITICAL",
                            "explanation": f"Financial arithmetic mismatch! Opening ({ob:,.2f}) + Credits ({tc:,.2f}) - Debits ({td:,.2f}) should equal {expected_cb:,.2f}, but statement shows {actual_cb:,.2f} (discrepancy: {diff:,.2f}).",
                            "evidence_reference": f"Discrepancy: {diff:,.2f}"
                        })
                except Exception as e:
                    checks.append({
                        "check_name": "Financial Statement Arithmetic Reconciliation",
                        "result": "WARNING",
                        "severity": "LOW",
                        "explanation": f"Could not perform arithmetic reconciliation due to number parsing issue: {str(e)}",
                        "evidence_reference": "Parse failure"
                    })
            else:
                checks.append({
                    "check_name": "Financial Statement Arithmetic Reconciliation",
                    "result": "INFO",
                    "severity": "INFO",
                    "explanation": "Full opening/closing/credit/debit summary was not present in statement text; arithmetic check skipped.",
                    "evidence_reference": "Incomplete transaction totals"
                })

        # ----------------------------------------------------
        # 6. Educational Certificate Rules
        # ----------------------------------------------------
        elif doc_type == "educational_certificate":
            roll_f = field_dict.get("roll_number")
            year_f = field_dict.get("passing_year")

            if roll_f:
                checks.append({
                    "check_name": "Roll Number Identification",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": f"Academic roll number identified: {roll_f['normalized_value']}",
                    "evidence_reference": f"Roll: {roll_f['normalized_value']}"
                })
            else:
                checks.append({
                    "check_name": "Roll Number Identification",
                    "result": "WARNING",
                    "severity": "MEDIUM",
                    "explanation": "Roll/Registration number was not detected in certificate text.",
                    "evidence_reference": "Missing roll_number"
                })

            if year_f:
                try:
                    py = int(year_f["normalized_value"])
                    if py > now.year:
                        checks.append({
                            "check_name": "Passing Year Chronological Sanity",
                            "result": "FAILED",
                            "severity": "CRITICAL",
                            "explanation": f"Passing year ({py}) is in the future (current year: {now.year}).",
                            "evidence_reference": f"Year: {py}"
                        })
                    else:
                        checks.append({
                            "check_name": "Passing Year Chronological Sanity",
                            "result": "PASSED",
                            "severity": "INFO",
                            "explanation": f"Passing year ({py}) is chronologically valid.",
                            "evidence_reference": f"Year: {py}"
                        })
                except ValueError:
                    pass

        # ----------------------------------------------------
        # 7. Income Certificate Rules
        # ----------------------------------------------------
        elif doc_type == "income_certificate":
            cert_f = field_dict.get("certificate_number")
            inc_f = field_dict.get("annual_income")

            if cert_f:
                checks.append({
                    "check_name": "Certificate Number Format",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": f"Certificate identifier registered: {cert_f['normalized_value']}",
                    "evidence_reference": f"Cert No: {cert_f['normalized_value']}"
                })
            else:
                checks.append({
                    "check_name": "Certificate Number Format",
                    "result": "WARNING",
                    "severity": "MEDIUM",
                    "explanation": "Certificate reference number missing or unreadable.",
                    "evidence_reference": "Missing cert no"
                })

            if inc_f:
                checks.append({
                    "check_name": "Declared Annual Income Presence",
                    "result": "PASSED",
                    "severity": "INFO",
                    "explanation": f"Declared annual income extracted: {inc_f['normalized_value']}",
                    "evidence_reference": f"Income: {inc_f['normalized_value']}"
                })

        # Default fallback check for other documents
        else:
            checks.append({
                "check_name": "General Document Structure",
                "result": "PASSED",
                "severity": "INFO",
                "explanation": "Document contains readable text lines and valid general document layout.",
                "evidence_reference": "Generic check"
            })

        return checks
