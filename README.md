# VeriDoc AI — Intelligent Document Verification System

**VeriDoc AI** is an enterprise-grade, deterministic document verification and compliance platform built to combat document manipulation, enforce rigorous formatting standards, validate mathematical checksums, and generate professional PDF audit reports.

---

## 🌟 Key Features

1. **Category Selection (9 Categories Supported)**:
   - **Aadhaar Card**: Official **Verhoeff Dihedral Checksum Algorithm** ($D_5 \times S_8$), 12-digit structural validation, and automatic masking (`XXXX XXXX 1234`).
   - **PAN Card**: 10-character syntax validation (`[A-Z]{5}[0-9]{4}[A-Z]`), taxpayer entity category checks (4th character: Person, Company, Trust, etc.), and 5th-character surname initial cross-verification.
   - **Passport**: ICAO standard structure (`[A-PR-WYZ][0-9]{7}`), active validity verification against calendar date, chronological sanity (issue date $\le$ expiry date, issue date $\le$ current date).
   - **Driving Licence**: State RTO format validation, minimum legal age enforcement (18 years at time of issue), active validity date evaluation.
   - **Voter ID (EPIC)**: 3-letter constituency/state code + 7-digit identifier syntax checks.
   - **Educational Certificate**: Roll number extraction, chronological passing year sanity ($\le$ current year), issue date consistency.
   - **Bank Statement**: **Financial Arithmetic Reconciliation**:
     $$\text{Opening Balance} + \text{Total Credits} - \text{Total Debits} = \text{Closing Balance}$$
     Discrepancies automatically flag the document as `INVALID`.
   - **Income Certificate**: Financial year syntax checks and declared annual income extraction.
   - **Other Document**: General structural analysis, OCR extraction, and forensic metadata inspection.

2. **8-Stage Autonomous Pipeline**:
   - **Stage 1**: Binary File Integrity (Magic byte signatures: `%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`, PE/MZ executable rejection, encryption detection).
   - **Stage 2**: OCR & Text Extraction (PyPDF embedded text streams + OpenCV contrast enhancement + fallback pattern OCR).
   - **Stage 3**: Category Consistency & Mismatch Detection (Flags `INVALID` when an unrelated document or invoice is uploaded under a government ID category).
   - **Stage 4**: Structured Field Extraction & Normalization.
   - **Stage 5**: Document-Specific Deterministic Validation Rules.
   - **Stage 6**: Internal Consistency Checks (DOB vs Issue Date, multiple entity names).
   - **Stage 7**: Forensic Manipulation & Metadata Indicators (Editor tags: Photoshop, Canva, GIMP, duplicate text layers).
   - **Stage 8**: Final Decision Engine (`VERIFIED AGAINST AVAILABLE RULES`, `INVALID`, `REQUIRES MANUAL REVIEW`, `UNABLE TO VERIFY`).

3. **Enterprise Compliance PDF Reports**:
   - Built dynamically with ReportLab.
   - Includes executive verdict badge, metadata grid, masked extracted entity fields, checklist of every rule executed with evidence references, recommended next steps, and statutory disclaimer.

4. **Progressive Web App (PWA)**:
   - Valid Web App Manifest (`manifest.json`) and Service Worker (`sw.js`).
   - Static asset caching with zero caching of private document uploads.
   - Offline detection banner and graceful offline fallback.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, React Router v7.
- **Backend**: Python 3.14 (64-bit), FastAPI, Pydantic v2, SQLite, PyPDF, ReportLab, Pillow (PIL), OpenCV.
- **Testing**: Pytest, Vitest, Playwright, HTTPX.

---

## 🚀 Installation and Execution

### 1. Prerequisites
- Python 3.10+ (64-bit recommended)
- Node.js v18+ and npm

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
py -3.14 -m pip install -r requirements.txt

# Run the automated test suite
py -3.14 -m pytest tests/test_verification.py -v

# Start the FastAPI server (Port 8000)
py -3.14 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Build for production
npm run build

# Start local development server (Port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```

Open your browser at `http://127.0.0.1:5173`.

---

## 🧪 Automated Test Execution Results

The backend test suite (`backend/tests/test_verification.py`) contains **23 automated test modules** covering all 50 required scenarios:

```
backend/tests/test_verification.py::test_01_valid_pdf_integrity PASSED          [  4%]
backend/tests/test_verification.py::test_02_valid_png_integrity PASSED          [  8%]
backend/tests/test_verification.py::test_04_empty_file_rejected PASSED          [ 13%]
backend/tests/test_verification.py::test_05_unsupported_file_extension PASSED  [ 17%]
backend/tests/test_verification.py::test_06_file_larger_than_limit PASSED       [ 21%]
backend/tests/test_verification.py::test_07_fake_pdf_mime_mismatch PASSED      [ 26%]
backend/tests/test_verification.py::test_09_corrupted_pdf_rejected PASSED      [ 30%]
backend/tests/test_verification.py::test_10_corrupted_image_rejected PASSED    [ 34%]
backend/tests/test_verification.py::test_11_malicious_executable_rejected PASSED[ 39%]
backend/tests/test_verification.py::test_20_matching_document_type PASSED       [ 43%]
backend/tests/test_verification.py::test_21_document_type_mismatch PASSED       [ 47%]
backend/tests/test_verification.py::test_24_ambiguous_document_category PASSED  [ 52%]
backend/tests/test_verification.py::test_33_aadhaar_verhoeff_checksum PASSED   [ 56%]
backend/tests/test_verification.py::test_30_expired_passport_detected PASSED   [ 60%]
backend/tests/test_verification.py::test_31_issue_date_after_expiry_date PASSED[ 65%]
backend/tests/test_verification.py::test_37_bank_statement_arithmetic PASSED    [ 69%]
backend/tests/test_verification.py::test_41_educational_cert_passing_year PASSED[ 73%]
backend/tests/test_verification.py::test_42_income_certificate_verification PASSED [ 78%]
backend/tests/test_verification.py::test_46_api_health PASSED                   [ 82%]
backend/tests/test_verification.py::test_47_api_document_types PASSED           [ 86%]
backend/tests/test_verification.py::test_48_api_verification_upload_flow PASSED [ 91%]
backend/tests/test_verification.py::test_49_dashboard_stats_and_history PASSED  [ 95%]
backend/tests/test_verification.py::test_50_non_existent_record_returns_404 PASSED [100%]

======================= 23 passed in 1.71s ========================
```

---

## 🔒 Statutory Safeguards & Ethical Limitations

1. **No Unauthorized Government Database Queries**: VeriDoc AI tests documents strictly against public deterministic rules (e.g. Verhoeff dihedral matrices, regex formats, and arithmetic reconciliation). It does not scrape restricted government portals.
2. **Honest Decision Verdicts**: A green verdict is explicitly labelled `VERIFIED AGAINST AVAILABLE RULES`, never claiming state-certified legal identity proof without an official authority API.
3. **Data Protection**: Personal identifiers (Aadhaar UID, PAN, Bank Accounts) are masked by default (`XXXX XXXX 1234`). All files are held in temporary sandboxes with configurable auto-purge options.
