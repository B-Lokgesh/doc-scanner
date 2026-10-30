import pytest
import io
import sys
import uuid
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_signup_and_login_flow():
    uid = uuid.uuid4().hex[:6]
    email = f"alice_{uid}@veridoc.ai"

    # 1. Signup User 1
    signup_data = {
        "full_name": "Alice Johnson",
        "email": email,
        "password": "Password123!"
    }
    resp = client.post("/api/auth/signup", json=signup_data)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == email
    alice_token = data["access_token"]

    # 2. Duplicate signup rejected
    dup_resp = client.post("/api/auth/signup", json=signup_data)
    assert dup_resp.status_code == 400

    # 3. Login with correct password
    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 4. Login with wrong password rejected
    wrong_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword!"
    })
    assert wrong_resp.status_code == 401

    # 5. Access protected /auth/me
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {alice_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["full_name"] == "Alice Johnson"

    # 6. Unauthenticated access rejected
    unauth_resp = client.get("/api/auth/me")
    assert unauth_resp.status_code == 401

def test_user_data_isolation():
    uid = uuid.uuid4().hex[:6]
    email_a = f"alpha_{uid}@veridoc.ai"
    email_b = f"beta_{uid}@veridoc.ai"

    # Signup User A
    resp_a = client.post("/api/auth/signup", json={
        "full_name": "User Alpha",
        "email": email_a,
        "password": "AlphaPassword123!"
    })
    assert resp_a.status_code == 200
    token_a = resp_a.json()["access_token"]
    user_a_id = resp_a.json()["user"]["id"]

    # Signup User B
    resp_b = client.post("/api/auth/signup", json={
        "full_name": "User Beta",
        "email": email_b,
        "password": "BetaPassword123!"
    })
    assert resp_b.status_code == 200
    token_b = resp_b.json()["access_token"]

    # User A uploads a document to My_Doc
    dummy_pdf = b"%PDF-1.4 dummy alpha pdf content for isolation testing"
    upload_resp = client.post(
        "/api/my-doc/upload",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("alpha_doc.pdf", dummy_pdf, "application/pdf")},
        data={"category": "identity"}
    )
    assert upload_resp.status_code == 200
    doc_a_id = upload_resp.json()["id"]

    # User A sees doc in My_Doc
    list_a = client.get("/api/my-doc", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    assert any(d["id"] == doc_a_id for d in list_a.json()["items"])

    # User B lists My_Doc -> does NOT see User A's document!
    list_b = client.get("/api/my-doc", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    assert not any(d["id"] == doc_a_id for d in list_b.json()["items"])

    # User B tries to download User A's document -> 404/403 Forbidden!
    dl_b = client.get(f"/api/my-doc/{doc_a_id}/download", headers={"Authorization": f"Bearer {token_b}"})
    assert dl_b.status_code == 404

    # User A verifies a document
    ver_resp = client.post(
        "/api/verifications",
        headers={"Authorization": f"Bearer {token_a}"},
        files={"file": ("test_pan.pdf", dummy_pdf, "application/pdf")},
        data={"document_type": "pan"}
    )
    assert ver_resp.status_code == 200
    ref_id = ver_resp.json()["reference_id"]

    # User A can access their verification result
    get_a = client.get(f"/api/verifications/{ref_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert get_a.status_code == 200

    # User B tries to access User A's verification result -> 403 Access Denied!
    get_b = client.get(f"/api/verifications/{ref_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_b.status_code == 403

    # User B tries to download User A's PDF report -> 403 Access Denied!
    rep_b = client.get(f"/api/verifications/{ref_id}/report", headers={"Authorization": f"Bearer {token_b}"})
    assert rep_b.status_code == 403

def test_my_doc_verify_integration_and_duplicates():
    uid = uuid.uuid4().hex[:6]
    email = f"charlie_{uid}@veridoc.ai"

    # Signup User
    resp = client.post("/api/auth/signup", json={
        "full_name": "Charlie Doc",
        "email": email,
        "password": "CharliePassword123!"
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    dummy_pdf = b"%PDF-1.4 demo test document stream for verify test"
    # Upload to My_Doc
    upload_resp = client.post(
        "/api/my-doc/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("charlie_doc.pdf", dummy_pdf, "application/pdf")},
        data={"category": "financial"}
    )
    doc_id = upload_resp.json()["id"]

    # Verify directly from My_Doc
    verify_resp = client.post(
        f"/api/my-doc/{doc_id}/verify",
        headers={"Authorization": f"Bearer {token}"},
        data={"document_type": "bank_statement"}
    )
    assert verify_resp.status_code == 200
    res_data = verify_resp.json()
    assert res_data["source_document_id"] == doc_id
    assert "reference_id" in res_data

    # Check duplicate detection endpoint
    dup_check = client.post(
        "/api/verifications/check-duplicate",
        headers={"Authorization": f"Bearer {token}"},
        json={"file_hash": upload_resp.json()["file_hash"]}
    )
    assert dup_check.status_code == 200
    assert dup_check.json()["is_duplicate"] is True

    # Check personal analytics endpoint
    analytics = client.get("/api/analytics/personal", headers={"Authorization": f"Bearer {token}"})
    assert analytics.status_code == 200
    assert analytics.json()["total_stored_documents"] >= 1
