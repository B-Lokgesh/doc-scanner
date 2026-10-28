import os
import io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from app.verification.document_rules import Verhoeff
from app.core.config import BASE_DIR

FIXTURES_DIR = BASE_DIR / "test_fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

def generate_pdf_text_doc(filepath: Path, lines: list):
    c = canvas.Canvas(str(filepath), pagesize=letter)
    y = 750
    for line in lines:
        c.drawString(72, y, line)
        y -= 25
    c.save()

def generate_image_doc(filepath: Path, lines: list):
    img = Image.new('RGB', (600, 400), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    y = 30
    for line in lines:
        draw.text((30, y), line, fill=(0, 0, 0))
        y += 30
    img.save(str(filepath))

def create_all_fixtures():
    # 1. Valid PAN PDF
    pan_lines = [
        "INCOMETAX DEPARTMENT",
        "GOVT. OF INDIA",
        "Permanent Account Number Card",
        "Name: RAHUL SHARMA",
        "Father's Name: SURESH SHARMA",
        "Date of Birth: 15/08/1990",
        "PAN: ABCPS1234F",
        "Signature: Verified"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "valid_pan.pdf", pan_lines)

    # 2. Valid PAN Image (PNG)
    generate_image_doc(FIXTURES_DIR / "valid_pan.png", pan_lines)

    # 3. Valid Aadhaar PDF (with valid Verhoeff checksum)
    # Generate 11 digits: e.g. "20261028123"
    base11 = "20261028123"
    c_digit = Verhoeff.generate_checksum(base11)
    valid_aadhaar_num = f"{base11[:4]} {base11[4:8]} {base11[8:]}{c_digit}"
    aadhaar_lines = [
        "Government of India",
        "Unique Identification Authority of India",
        "Mera Aadhaar, Meri Pehchan",
        "Name: Priya Patel",
        "DOB: 10/05/1995",
        "Gender: Female",
        f"Aadhaar No: {valid_aadhaar_num}",
        "Address: 102 MG Road, Bengaluru 560001"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "valid_aadhaar.pdf", aadhaar_lines)

    # 4. Invalid Aadhaar (Invalid Verhoeff Checksum)
    wrong_c_digit = (c_digit + 1) % 10
    invalid_aadhaar_num = f"{base11[:4]} {base11[4:8]} {base11[8:]}{wrong_c_digit}"
    invalid_aadhaar_lines = [
        "Government of India",
        "Unique Identification Authority of India",
        "Name: Priya Patel",
        "DOB: 10/05/1995",
        "Gender: Female",
        f"Aadhaar No: {invalid_aadhaar_num}"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "invalid_checksum_aadhaar.pdf", invalid_aadhaar_lines)

    # 5. Valid Passport (Active)
    passport_lines = [
        "REPUBLIC OF INDIA",
        "PASSPORT",
        "Type: P, Country Code: IND",
        "Passport No: Z1234567",
        "Surname: VERMA",
        "Given Name: ANANYA",
        "Nationality: INDIAN",
        "Date of Birth: 20/03/1992",
        "Date of Issue: 10/01/2021",
        "Date of Expiry: 09/01/2031",
        "Place of Issue: NEW DELHI"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "valid_passport.pdf", passport_lines)

    # 6. Expired Passport
    expired_passport_lines = [
        "REPUBLIC OF INDIA",
        "PASSPORT",
        "Passport No: J9876543",
        "Surname: VERMA",
        "Given Name: ANANYA",
        "Nationality: INDIAN",
        "Date of Birth: 20/03/1992",
        "Date of Issue: 10/01/2010",
        "Date of Expiry: 09/01/2020",
        "Place of Issue: NEW DELHI"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "expired_passport.pdf", expired_passport_lines)

    # 7. Inconsistent Passport (Issue Date later than Expiry Date)
    inconsistent_dates_passport = [
        "REPUBLIC OF INDIA",
        "PASSPORT",
        "Passport No: W5544332",
        "Surname: VERMA",
        "Given Name: ANANYA",
        "Date of Issue: 10/01/2025",
        "Date of Expiry: 09/01/2020"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "issue_after_expiry_passport.pdf", inconsistent_dates_passport)

    # 8. Valid Bank Statement (Consistent Arithmetic)
    bank_lines = [
        "NATIONAL APEX BANK",
        "ACCOUNT STATEMENT",
        "Account Holder: VIKRAM MEHTA",
        "Account No: 123456789012",
        "Statement Period: 01/01/2024 to 31/01/2024",
        "Opening Balance: INR 50,000.00",
        "Total Credits: INR 25,000.00",
        "Total Debits: INR 15,000.00",
        "Closing Balance: INR 60,000.00"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "consistent_bank_statement.pdf", bank_lines)

    # 9. Inconsistent Bank Statement (Arithmetic Mismatch)
    inconsistent_bank_lines = [
        "NATIONAL APEX BANK",
        "ACCOUNT STATEMENT",
        "Account Holder: VIKRAM MEHTA",
        "Account No: 123456789012",
        "Opening Balance: INR 50,000.00",
        "Total Credits: INR 25,000.00",
        "Total Debits: INR 15,000.00",
        "Closing Balance: INR 99,999.00"  # Expected 60,000.00!
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "inconsistent_arithmetic_bank_statement.pdf", inconsistent_bank_lines)

    # 10. Driving Licence (Valid)
    dl_lines = [
        "UNION OF INDIA - DRIVING LICENCE",
        "DL No: DL14-20150001234",
        "Name: ARUN KUMAR",
        "DOB: 12/04/1990",
        "Valid Upto: 11/04/2035",
        "Transport Department Delhi"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "valid_driving_licence.pdf", dl_lines)

    # 11. Driving Licence (Underage at issue: DOB 2010, Issued 2020 -> age 10)
    underage_dl = [
        "UNION OF INDIA - DRIVING LICENCE",
        "DL No: DL14-20200001234",
        "Name: BABY DRIVER",
        "DOB: 12/04/2010",
        "Date of Issue: 12/04/2020",
        "Valid Upto: 11/04/2035"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "underage_driving_licence.pdf", underage_dl)

    # 12. Educational Certificate
    edu_lines = [
        "CENTRAL BOARD OF SECONDARY EDUCATION",
        "SENIOR SCHOOL CERTIFICATE EXAMINATION",
        "Roll No: 12345678",
        "Candidate Name: SNEHA GUPTA",
        "Year of Passing: 2022",
        "CGPA: 9.4",
        "Date of Issue: 25/05/2022"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "valid_educational_certificate.pdf", edu_lines)

    # 13. Income Certificate
    inc_lines = [
        "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT",
        "INCOME CERTIFICATE",
        "Certificate No: RD0038291048",
        "Beneficiary Name: SURESH REDDY",
        "Annual Income: INR 1,80,000",
        "Financial Year: 2023-2024",
        "Issued by: Tahsildar"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "valid_income_certificate.pdf", inc_lines)

    # 14. Corrupted PDF (starts with %PDF- but truncated garbage)
    with open(FIXTURES_DIR / "corrupted.pdf", "wb") as f:
        f.write(b"%PDF-1.4\n%corrupted_byte_stream_without_xref_or_trailer_1234567890\x00\xFF")

    # 15. Fake PDF (text file with .pdf extension)
    with open(FIXTURES_DIR / "fake_extension.pdf", "wb") as f:
        f.write(b"This is just a plaintext file claiming to be a PDF.")

    # 16. Empty File (0 bytes)
    with open(FIXTURES_DIR / "empty_file.pdf", "wb") as f:
        pass

    # 17. Malicious Executable header renamed to PDF
    with open(FIXTURES_DIR / "malicious_exe.pdf", "wb") as f:
        f.write(b"MZ\x90\x00\x03\x00\x00\x00This is a Windows executable simulation.")

    # 18. Corrupted Image
    with open(FIXTURES_DIR / "corrupted_image.png", "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDRcorrupted_data_here")

    # 19. Unrelated document (Invoice selected as PAN)
    invoice_lines = [
        "ACME CORP - INVOICE #998822",
        "Date: 12/10/2024",
        "Bill To: Global Logistics Ltd",
        "Item: Cloud Hosting Services",
        "Total Amount: $1,250.00",
        "Payment Terms: Net 30"
    ]
    generate_pdf_text_doc(FIXTURES_DIR / "unrelated_invoice.pdf", invoice_lines)

    print(f"Generated test fixtures in {FIXTURES_DIR}")

if __name__ == "__main__":
    create_all_fixtures()
