import re
from typing import Dict, Any, List, Optional
from datetime import datetime

class FieldExtractor:
    @staticmethod
    def parse_date(date_str: str) -> Optional[datetime]:
        """
        Parses dates in formats like DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD.
        """
        formats = [
            "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d.%m.%Y",
            "%d/%m/%y", "%d-%m-%y", "%Y/%m/%d"
        ]
        clean_str = date_str.strip()
        for fmt in formats:
            try:
                return datetime.strptime(clean_str, fmt)
            except ValueError:
                continue
        return None

    @classmethod
    def extract_fields(cls, text: str, doc_type: str) -> List[Dict[str, Any]]:
        """
        Extracts structured fields according to document type.
        Returns a list of ExtractedField dictionaries.
        """
        fields: List[Dict[str, Any]] = []

        if doc_type == "pan":
            # PAN Number: 5 uppercase letters, 4 digits, 1 uppercase letter
            pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text)
            if pan_match:
                pan_val = pan_match.group(1)
                entity_char = pan_val[3]
                entity_map = {
                    'P': 'Individual / Person',
                    'C': 'Company',
                    'H': 'Hindu Undivided Family (HUF)',
                    'F': 'Firm / Partnership',
                    'A': 'Association of Persons (AOP)',
                    'T': 'Trust',
                    'B': 'Body of Individuals (BOI)',
                    'L': 'Local Authority',
                    'J': 'Artificial Juridical Person',
                    'G': 'Government Agency'
                }
                fields.append({
                    "field_name": "pan_number",
                    "raw_value": pan_val,
                    "normalized_value": pan_val,
                    "extraction_confidence": 0.95,
                    "is_sensitive": True
                })
                fields.append({
                    "field_name": "pan_entity_type",
                    "raw_value": entity_char,
                    "normalized_value": entity_map.get(entity_char, 'Unknown Entity Type'),
                    "extraction_confidence": 0.95,
                    "is_sensitive": False
                })

            # Name extraction
            name_match = re.search(r"(?:name|name\s*:\s*|incometax\s*department\s*\n)([A-Z\s]{3,35})(?:\n|father)", text, re.IGNORECASE)
            if name_match:
                val = name_match.group(1).strip()
                if not any(k in val.lower() for k in ["government", "income", "tax", "permanent"]):
                    fields.append({
                        "field_name": "holder_name",
                        "raw_value": val,
                        "normalized_value": val.title(),
                        "extraction_confidence": 0.85,
                        "is_sensitive": False
                    })

            # Father's Name
            father_match = re.search(r"father(?:'s)?\s*name\s*[:\n]?\s*([A-Z\s]{3,35})(?:\n|date)", text, re.IGNORECASE)
            if father_match:
                fields.append({
                    "field_name": "father_name",
                    "raw_value": father_match.group(1).strip(),
                    "normalized_value": father_match.group(1).strip().title(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

            # DOB
            dob_match = re.search(r"(?:date\s*of\s*birth|dob)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
            if not dob_match:
                # Try generic date
                dob_match = re.search(r"\b([0-9]{2}/[0-9]{2}/[0-9]{4})\b", text)
            if dob_match:
                fields.append({
                    "field_name": "date_of_birth",
                    "raw_value": dob_match.group(1),
                    "normalized_value": dob_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

        elif doc_type == "aadhaar":
            # 12-digit Aadhaar UID (usually formatted as XXXX XXXX XXXX or contiguous)
            uid_match = re.search(r"\b(\d{4}\s\d{4}\s\d{4})\b", text)
            if not uid_match:
                uid_match = re.search(r"\b(\d{12})\b", text)
            if uid_match:
                raw_uid = uid_match.group(1).replace(" ", "")
                # Masked presentation: XXXX XXXX 1234
                masked = f"XXXX XXXX {raw_uid[-4:]}"
                fields.append({
                    "field_name": "aadhaar_number",
                    "raw_value": raw_uid,
                    "normalized_value": masked,
                    "extraction_confidence": 0.95,
                    "is_sensitive": True
                })

            # Gender
            gender_match = re.search(r"\b(Male|Female|Transgender|MALE|FEMALE)\b", text)
            if gender_match:
                fields.append({
                    "field_name": "gender",
                    "raw_value": gender_match.group(1),
                    "normalized_value": gender_match.group(1).capitalize(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # DOB or Year of birth
            dob_match = re.search(r"(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4}|[0-9]{4})", text, re.IGNORECASE)
            if dob_match:
                fields.append({
                    "field_name": "date_of_birth",
                    "raw_value": dob_match.group(1),
                    "normalized_value": dob_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Name extraction (handles standard Aadhaar cards, e-Aadhaar headers, and labeled formats)
            name_match = re.search(r"(?:name\s*[:\n]|holder\s*[:\n])\s*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|dob|date|gender|year|male|female|$))", text, re.IGNORECASE)
            if not name_match:
                name_match = re.search(r"(?:government of india|uidai|enrolment|pehchan)\s*[\n:]?\s*([A-Z][a-zA-Z\s]{2,30}?)(?=\s*(?:\n|DOB|Spbs|Year|Gender|Male|Female|[0-9]{2}[/-]))", text, re.IGNORECASE)
            if not name_match:
                name_match = re.search(r"(?:government of india|uidai|enrolment)\s*\n([A-Z][a-zA-Z\s]{2,30})\n", text, re.IGNORECASE)
            if name_match:
                val = name_match.group(1).strip()
                if not any(k in val.lower() for k in ["government", "unique", "authority", "india", "enrolment"]):
                    # If name is written with glued trailing uppercase initial (e.g. LokgeshB -> Lokgesh B)
                    if re.match(r"^[A-Za-z]+[A-Z]$", val) and len(val) >= 4 and val[-2].islower():
                        val = val[:-1] + " " + val[-1]
                    norm_val = f"{val[:-2].title()} {val[-1].upper()}" if val.endswith(f" {val[-1]}") else val.title()
                    fields.append({
                        "field_name": "holder_name",
                        "raw_value": val,
                        "normalized_value": norm_val,
                        "extraction_confidence": 0.90,
                        "is_sensitive": False
                    })

            # Pin code
            pin_match = re.search(r"\b([1-9][0-9]{5})\b", text)
            if pin_match:
                fields.append({
                    "field_name": "pin_code",
                    "raw_value": pin_match.group(1),
                    "normalized_value": pin_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

        elif doc_type == "passport":
            # Indian Passport Number: 1 letter (except Q, X, Z usually A-PR-WYZ) + 7 digits
            pass_match = re.search(r"\b([A-PR-WYZ][0-9]{7})\b", text)
            if pass_match:
                fields.append({
                    "field_name": "passport_number",
                    "raw_value": pass_match.group(1),
                    "normalized_value": pass_match.group(1),
                    "extraction_confidence": 0.95,
                    "is_sensitive": True
                })

            # Nationality
            nat_match = re.search(r"nationality[\s:]*([A-Za-z]{3,20})", text, re.IGNORECASE)
            if nat_match:
                fields.append({
                    "field_name": "nationality",
                    "raw_value": nat_match.group(1).strip(),
                    "normalized_value": nat_match.group(1).strip().title(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Given Name & Surname (stop before newline to avoid trailing field labels)
            sur_match = re.search(r"surname[\s:]*([A-Za-z]{2,30})", text, re.IGNORECASE)
            if sur_match:
                fields.append({
                    "field_name": "surname",
                    "raw_value": sur_match.group(1).strip(),
                    "normalized_value": sur_match.group(1).strip().title(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })
            given_match = re.search(r"given\s*name(?:s)?[\s:]*([A-Za-z\s]{2,30}?)(?=\n|$)", text, re.IGNORECASE)
            if given_match:
                fields.append({
                    "field_name": "given_name",
                    "raw_value": given_match.group(1).strip(),
                    "normalized_value": given_match.group(1).strip().title(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

            # Combine full holder_name for passport
            given_str = given_match.group(1).strip() if given_match else ""
            sur_str = sur_match.group(1).strip() if sur_match else ""
            full_pass_name = f"{given_str} {sur_str}".strip()
            if full_pass_name:
                fields.append({
                    "field_name": "holder_name",
                    "raw_value": full_pass_name,
                    "normalized_value": full_pass_name.title(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Date of Birth
            dob_match = re.search(r"(?:date\s*of\s*birth|dob)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
            if dob_match:
                fields.append({
                    "field_name": "date_of_birth",
                    "raw_value": dob_match.group(1),
                    "normalized_value": dob_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Gender / Sex
            gender_match = re.search(r"(?:sex|gender)[\s:]*([MF]|Male|Female)\b", text, re.IGNORECASE)
            if gender_match:
                g_val = "Male" if gender_match.group(1).upper() in ["M", "MALE"] else "Female"
                fields.append({
                    "field_name": "gender",
                    "raw_value": gender_match.group(1),
                    "normalized_value": g_val,
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Dates
            issue_match = re.search(r"(?:date\s*of\s*issue|issue\s*date)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
            if issue_match:
                fields.append({
                    "field_name": "issue_date",
                    "raw_value": issue_match.group(1),
                    "normalized_value": issue_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })
            exp_match = re.search(r"(?:date\s*of\s*expiry|expiry\s*date|valid\s*until)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
            if exp_match:
                fields.append({
                    "field_name": "expiry_date",
                    "raw_value": exp_match.group(1),
                    "normalized_value": exp_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

        elif doc_type == "driving_licence":
            # DL Number: State code (2 letters) + 2 digits + year/serial (e.g. DL14 20110012345 or TN94Z20250000206 or MH02-20150001234)
            dl_match = re.search(r"\b([A-Z]{2}[0-9]{2}[ -]?[0-9]{11})\b", text)
            if not dl_match:
                dl_match = re.search(r"\b([A-Z]{2}[0-9]{2}[A-Z0-9 -]{7,15})\b", text)
            if dl_match:
                fields.append({
                    "field_name": "dl_number",
                    "raw_value": dl_match.group(1).strip(),
                    "normalized_value": dl_match.group(1).strip().replace(" ", "-"),
                    "extraction_confidence": 0.95,
                    "is_sensitive": True
                })

            # Name extraction
            name_match = re.search(r"(?:Name\s*[:\n]|Holder\s*[:\n])\s*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|son|daughter|father|dob|date|$))", text, re.IGNORECASE)
            if not name_match:
                name_match = re.search(r"(?:(?:Name|Signa[a-z]*|Sign[a-z]*)[^A-Za-z0-9]*)\s*([A-Za-z][A-Za-z\s\.]{1,30}?)\s*(?:Date\s*of\s*Birth|DateofBirth|DOB)", text, re.IGNORECASE)
            if not name_match:
                name_match = re.search(r"\b([A-Z][A-Z\s]{1,30}?)\s*(?:Date\s*of\s*Birth|DateofBirth|DOB)", text)
            if not name_match:
                name_match = re.search(r"Name\s*[:\n]\s*([A-Za-z\s]{3,35})(?:\n|Son|Daughter|Father|Date)", text, re.IGNORECASE)
            if name_match:
                val = name_match.group(1).strip()
                if not any(k in val.lower() for k in ["government", "driving", "licence", "license", "tamil", "union", "india"]):
                    fields.append({
                        "field_name": "holder_name",
                        "raw_value": val,
                        "normalized_value": val.title(),
                        "extraction_confidence": 0.90,
                        "is_sensitive": False
                    })

            # Date of Birth
            dob_match = re.search(r"(?:Date\s*of\s*Birth|DateofBirth|DOB)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
            if dob_match:
                fields.append({
                    "field_name": "date_of_birth",
                    "raw_value": dob_match.group(1),
                    "normalized_value": dob_match.group(1),
                    "extraction_confidence": 0.95,
                    "is_sensitive": False
                })

            # Father / Parent Name
            father_match = re.search(r"(?:Son(?:/|\s+)of|Daughter(?:/|\s+)of|Wife(?:/|\s+)of|Son/Daughter/Wife\s*of|S/D/W\s*of|Father(?:'s)?\s*Name)[\s:]*([A-Za-z\s\.]{2,30}?)(?=\s*(?:Blo|Organ|Address|\n|$))", text, re.IGNORECASE)
            if father_match:
                f_val = father_match.group(1).strip()
                fields.append({
                    "field_name": "father_name",
                    "raw_value": f_val,
                    "normalized_value": f_val.title(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

            # All dates on DL for issue and expiry reconciliation
            all_dates = re.findall(r"\b([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})\b", text)
            parsed_dates = []
            for d in all_dates:
                p = cls.parse_date(d)
                if p:
                    # Ignore DOB in issue/expiry determination
                    if dob_match and d == dob_match.group(1):
                        continue
                    parsed_dates.append((p, d))

            if parsed_dates:
                # Earliest non-DOB date is typically Issue Date
                earliest = min(parsed_dates, key=lambda x: x[0])
                fields.append({
                    "field_name": "issue_date",
                    "raw_value": earliest[1],
                    "normalized_value": earliest[1],
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })
                # Latest date is Expiry / Validity Date
                latest = max(parsed_dates, key=lambda x: x[0])
                if latest[0] != earliest[0]:
                    fields.append({
                        "field_name": "expiry_date",
                        "raw_value": latest[1],
                        "normalized_value": latest[1],
                        "extraction_confidence": 0.90,
                        "is_sensitive": False
                    })
            else:
                exp_match = re.search(r"(?:valid\s*till|valid\s*upto|expiry\s*date|validity\s*\(nt\))[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
                if exp_match:
                    fields.append({
                        "field_name": "expiry_date",
                        "raw_value": exp_match.group(1),
                        "normalized_value": exp_match.group(1),
                        "extraction_confidence": 0.90,
                        "is_sensitive": False
                    })

            # Blood Group
            blood_match = re.search(r"(?:Blo[^\w\s]*t?Group|Blood\s*Group)[\s:]*([ABO0][12]?[+-])", text, re.IGNORECASE)
            if blood_match:
                fields.append({
                    "field_name": "blood_group",
                    "raw_value": blood_match.group(1).strip(),
                    "normalized_value": blood_match.group(1).strip(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

            # Address & Pin Code
            addr_match = re.search(r"(?:Address[\s:]*|NO\s+\d+[\w\s,-]+)\s*([A-Za-z0-9\s,/-]{10,120}?\d{6})", text, re.IGNORECASE)
            if addr_match:
                fields.append({
                    "field_name": "address",
                    "raw_value": addr_match.group(0).strip(),
                    "normalized_value": addr_match.group(0).strip(),
                    "extraction_confidence": 0.80,
                    "is_sensitive": False
                })
            pin_match = re.search(r"\b([1-9][0-9]{5})\b", text)
            if pin_match:
                fields.append({
                    "field_name": "pin_code",
                    "raw_value": pin_match.group(1),
                    "normalized_value": pin_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

        elif doc_type == "voter_id":
            # EPIC Number: 3 letters + 7 digits (e.g. ABC1234567)
            epic_match = re.search(r"\b([A-Z]{3}[0-9]{7})\b", text)
            if epic_match:
                fields.append({
                    "field_name": "epic_number",
                    "raw_value": epic_match.group(1),
                    "normalized_value": epic_match.group(1),
                    "extraction_confidence": 0.95,
                    "is_sensitive": True
                })

            # Elector / Holder Name
            name_match = re.search(r"(?:Elector(?:'s)?\s*Name|Name\s*[:\n]|Holder\s*[:\n])\s*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|father|husband|sex|gender|dob|age|$))", text, re.IGNORECASE)
            if name_match:
                val = name_match.group(1).strip()
                fields.append({
                    "field_name": "holder_name",
                    "raw_value": val,
                    "normalized_value": val.title(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Father / Husband Name
            father_match = re.search(r"(?:Father(?:'s)?\s*Name|Husband(?:'s)?\s*Name|Relation\s*Name)[\s:]*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|sex|gender|dob|age|$))", text, re.IGNORECASE)
            if father_match:
                fields.append({
                    "field_name": "father_name",
                    "raw_value": father_match.group(1).strip(),
                    "normalized_value": father_match.group(1).strip().title(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

            # Date of Birth
            dob_match = re.search(r"(?:Date\s*of\s*Birth|DOB)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
            if dob_match:
                fields.append({
                    "field_name": "date_of_birth",
                    "raw_value": dob_match.group(1),
                    "normalized_value": dob_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Gender
            gender_match = re.search(r"(?:Sex|Gender)[\s:]*([MF]|Male|Female)\b", text, re.IGNORECASE)
            if gender_match:
                g_val = "Male" if gender_match.group(1).upper() in ["M", "MALE"] else "Female"
                fields.append({
                    "field_name": "gender",
                    "raw_value": gender_match.group(1),
                    "normalized_value": g_val,
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            pin_match = re.search(r"\b([1-9][0-9]{5})\b", text)
            if pin_match:
                fields.append({
                    "field_name": "pin_code",
                    "raw_value": pin_match.group(1),
                    "normalized_value": pin_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

        elif doc_type == "bank_statement":
            # Account Number
            acc_match = re.search(r"(?:account\s*(?:no|number)|a/c\s*(?:no|number))[\s:]*([0-9]{9,18})", text, re.IGNORECASE)
            if acc_match:
                acc_val = acc_match.group(1)
                masked_acc = f"{'X' * (len(acc_val) - 4)}{acc_val[-4:]}"
                fields.append({
                    "field_name": "account_number",
                    "raw_value": acc_val,
                    "normalized_value": masked_acc,
                    "extraction_confidence": 0.95,
                    "is_sensitive": True
                })

            # Account Holder Name
            name_match = re.search(r"(?:Account\s*Holder(?:\s*Name)?|Customer\s*Name|Account\s*Name|Name\s*[:\n])\s*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|account|a/c|statement|address|$))", text, re.IGNORECASE)
            if name_match:
                fields.append({
                    "field_name": "holder_name",
                    "raw_value": name_match.group(1).strip(),
                    "normalized_value": name_match.group(1).strip().title(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Opening Balance
            ob_match = re.search(r"opening\s*balance[\s:]*(?:rs\.?|inr)?\s*([0-9,]+\.[0-9]{2}|[0-9,]+)", text, re.IGNORECASE)
            if ob_match:
                val = ob_match.group(1).replace(",", "")
                fields.append({
                    "field_name": "opening_balance",
                    "raw_value": ob_match.group(1),
                    "normalized_value": val,
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Closing Balance
            cb_match = re.search(r"closing\s*balance[\s:]*(?:rs\.?|inr)?\s*([0-9,]+\.[0-9]{2}|[0-9,]+)", text, re.IGNORECASE)
            if cb_match:
                val = cb_match.group(1).replace(",", "")
                fields.append({
                    "field_name": "closing_balance",
                    "raw_value": cb_match.group(1),
                    "normalized_value": val,
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Total Credits (Deposits)
            tc_match = re.search(r"(?:total\s*credits?|total\s*deposits?)[\s:]*(?:rs\.?|inr)?\s*([0-9,]+\.[0-9]{2}|[0-9,]+)", text, re.IGNORECASE)
            if tc_match:
                val = tc_match.group(1).replace(",", "")
                fields.append({
                    "field_name": "total_credits",
                    "raw_value": tc_match.group(1),
                    "normalized_value": val,
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Total Debits (Withdrawals)
            td_match = re.search(r"(?:total\s*debits?|total\s*withdrawals?)[\s:]*(?:rs\.?|inr)?\s*([0-9,]+\.[0-9]{2}|[0-9,]+)", text, re.IGNORECASE)
            if td_match:
                val = td_match.group(1).replace(",", "")
                fields.append({
                    "field_name": "total_debits",
                    "raw_value": td_match.group(1),
                    "normalized_value": val,
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            pin_match = re.search(r"\b([1-9][0-9]{5})\b", text)
            if pin_match:
                fields.append({
                    "field_name": "pin_code",
                    "raw_value": pin_match.group(1),
                    "normalized_value": pin_match.group(1),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

        elif doc_type == "educational_certificate":
            # Roll Number
            roll_match = re.search(r"(?:roll\s*(?:no|number)|registration\s*(?:no|number))[\s:]*([A-Za-z0-9/-]{4,20})", text, re.IGNORECASE)
            if roll_match:
                fields.append({
                    "field_name": "roll_number",
                    "raw_value": roll_match.group(1).strip(),
                    "normalized_value": roll_match.group(1).strip(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Candidate / Student Name
            name_match = re.search(r"(?:This\s*is\s*to\s*certify\s*that|Candidate(?:'s)?\s*Name|Student\s*Name|Name\s*[:\n])\s*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|roll|reg|son|daughter|father|born|dob|date|$))", text, re.IGNORECASE)
            if name_match:
                fields.append({
                    "field_name": "holder_name",
                    "raw_value": name_match.group(1).strip(),
                    "normalized_value": name_match.group(1).strip().title(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Father / Parent Name
            father_match = re.search(r"(?:Son\s*of|Daughter\s*of|Father(?:'s)?\s*Name)[\s:]*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|roll|reg|dob|date|$))", text, re.IGNORECASE)
            if father_match:
                fields.append({
                    "field_name": "father_name",
                    "raw_value": father_match.group(1).strip(),
                    "normalized_value": father_match.group(1).strip().title(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

            # Date of Birth
            dob_match = re.search(r"(?:Date\s*of\s*Birth|DOB|Born\s*on)[\s:]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})", text, re.IGNORECASE)
            if dob_match:
                fields.append({
                    "field_name": "date_of_birth",
                    "raw_value": dob_match.group(1),
                    "normalized_value": dob_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Passing Year
            year_match = re.search(r"(?:year\s*of\s*passing|passed\s*in|examination\s*of)[\s:]*([0-9]{4})", text, re.IGNORECASE)
            if year_match:
                fields.append({
                    "field_name": "passing_year",
                    "raw_value": year_match.group(1),
                    "normalized_value": year_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Marks / CGPA
            marks_match = re.search(r"(?:cgpa|marks|percentage|grade)[\s:]*([0-9]{1,3}(?:\.[0-9]{1,2})?%?|[A-D][+]?)", text, re.IGNORECASE)
            if marks_match:
                fields.append({
                    "field_name": "academic_result",
                    "raw_value": marks_match.group(1),
                    "normalized_value": marks_match.group(1),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

        elif doc_type == "income_certificate":
            # Certificate Number
            cert_match = re.search(r"(?:certificate\s*(?:no|number))[\s:]*([A-Za-z0-9/-]{5,25})", text, re.IGNORECASE)
            if cert_match:
                fields.append({
                    "field_name": "certificate_number",
                    "raw_value": cert_match.group(1),
                    "normalized_value": cert_match.group(1),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Applicant / Holder Name
            name_match = re.search(r"(?:Certified\s*that|Applicant\s*Name|Name\s*[:\n])\s*([A-Za-z \.]{2,35}?)(?=\s*(?:\n|son|daughter|resident|annual|$))", text, re.IGNORECASE)
            if name_match:
                fields.append({
                    "field_name": "holder_name",
                    "raw_value": name_match.group(1).strip(),
                    "normalized_value": name_match.group(1).strip().title(),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Father / Spouse Name
            father_match = re.search(r"(?:Son\s*of|Daughter\s*of|Wife\s*of|Father(?:'s)?\s*Name)[\s:]*([A-Za-z\s\.]{2,35})(?=\s*(?:\n|resident|annual|$))", text, re.IGNORECASE)
            if father_match:
                fields.append({
                    "field_name": "father_name",
                    "raw_value": father_match.group(1).strip(),
                    "normalized_value": father_match.group(1).strip().title(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

            # Annual Income
            inc_match = re.search(r"(?:annual\s*income|income\s*is)[\s:]*(?:rs\.?|inr)?\s*([0-9,]+)", text, re.IGNORECASE)
            if inc_match:
                clean_inc = inc_match.group(1).replace(",", "")
                fields.append({
                    "field_name": "annual_income",
                    "raw_value": inc_match.group(1),
                    "normalized_value": f"INR {int(clean_inc):,}",
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            # Financial Year
            fy_match = re.search(r"(?:financial\s*year|f\.y\.)[\s:]*([0-9]{4}\s*-\s*[0-9]{2,4})", text, re.IGNORECASE)
            if fy_match:
                fields.append({
                    "field_name": "financial_year",
                    "raw_value": fy_match.group(1),
                    "normalized_value": fy_match.group(1).replace(" ", ""),
                    "extraction_confidence": 0.90,
                    "is_sensitive": False
                })

            pin_match = re.search(r"\b([1-9][0-9]{5})\b", text)
            if pin_match:
                fields.append({
                    "field_name": "pin_code",
                    "raw_value": pin_match.group(1),
                    "normalized_value": pin_match.group(1),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })

        # General dates fallback if no specific date extracted
        date_matches = re.findall(r"\b([0-9]{2}[/-][0-9]{2}[/-][0-9]{4})\b", text)
        if date_matches and not any("date" in f["field_name"] for f in fields):
            fields.append({
                "field_name": "document_date",
                "raw_value": date_matches[0],
                "normalized_value": date_matches[0],
                "extraction_confidence": 0.80,
                "is_sensitive": False
            })

        # Universal Identity Attribute Enrichment:
        # Ensures critical cross-verification identity attributes (Name, DOB, Father Name, Pin Code, Gender)
        # are detected across all document variants when present in OCR or electronic document text.
        field_names = {f["field_name"] for f in fields}

        if "holder_name" not in field_names and "given_name" not in field_names:
            gen_name = re.search(r"(?:Name|Holder|Applicant|Student|Candidate|Customer|Elector)\s*[:\n]\s*([A-Za-z\s\.]{2,35})(?=\n|$)", text, re.IGNORECASE)
            if gen_name:
                v = gen_name.group(1).strip()
                if not any(k in v.lower() for k in ["government", "authority", "department", "statement", "certificate"]):
                    fields.append({
                        "field_name": "holder_name",
                        "raw_value": v,
                        "normalized_value": v.title(),
                        "extraction_confidence": 0.85,
                        "is_sensitive": False
                    })
                    field_names.add("holder_name")

        if "date_of_birth" not in field_names:
            gen_dob = re.search(r"(?:DOB|Date\s*of\s*Birth|Birth\s*Date|Born\s*on)[\s:\-]+([0-9]{2}[/-][0-9]{2}[/-][0-9]{4}|[0-9]{4})", text, re.IGNORECASE)
            if gen_dob:
                fields.append({
                    "field_name": "date_of_birth",
                    "raw_value": gen_dob.group(1),
                    "normalized_value": gen_dob.group(1),
                    "extraction_confidence": 0.88,
                    "is_sensitive": False
                })
                field_names.add("date_of_birth")

        if "father_name" not in field_names:
            gen_father_matches = list(re.finditer(
                r"(?:Father(?:'s)?\s*Name|S[/I1\\|\-\s]+O|D[/I1\\|\-\s]+O|W[/I1\\|\-\s]+O|Son\s*of|Daughter\s*of|Wife\s*of|Parent\s*Name|C[/I1\\|\-\s]+O)[\s:\-]+([A-Za-z\s\.]{2,35})(?=\s*(?:,|\n|NO|\d|$))",
                text,
                re.IGNORECASE
            ))
            if gen_father_matches:
                valid_candidates = []
                for gm in gen_father_matches:
                    cand = gm.group(1).strip()
                    if not any(k in cand.lower() for k in ["government", "authority", "department", "unique", "india"]):
                        valid_candidates.append(cand)
                
                if valid_candidates:
                    # Prefer proper capitalized candidate over all-lowercase OCR artifacts
                    chosen = next((c for c in valid_candidates if c[0].isupper() and not c.islower()), valid_candidates[0])
                    fields.append({
                        "field_name": "father_name",
                        "raw_value": chosen,
                        "normalized_value": chosen.title(),
                        "extraction_confidence": 0.85,
                        "is_sensitive": False
                    })
                    field_names.add("father_name")

        if "pin_code" not in field_names:
            pin_m = re.search(r"(?:\b|\D)([1-9][0-9]{5})(?:\D|$)", text)
            if pin_m:
                fields.append({
                    "field_name": "pin_code",
                    "raw_value": pin_m.group(1),
                    "normalized_value": pin_m.group(1),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })
                field_names.add("pin_code")

        if "gender" not in field_names:
            g_m = re.search(r"\b(Male|Female|Transgender)\b", text, re.IGNORECASE)
            if g_m:
                fields.append({
                    "field_name": "gender",
                    "raw_value": g_m.group(1),
                    "normalized_value": g_m.group(1).capitalize(),
                    "extraction_confidence": 0.85,
                    "is_sensitive": False
                })
                field_names.add("gender")

        return fields
