import pytest
import io
from utils.test_data import generate_valid_pdf_bytes, compute_sha256

@pytest.mark.api
class TestEvidenceWorkflow:
    def test_upload_valid_pdf_evidence(self, auth_student):
        client = auth_student["client"]
        pdf_bytes = generate_valid_pdf_bytes()
        file_hash = compute_sha256(pdf_bytes)

        files = {
            "file": ("sample_transcript.pdf", io.BytesIO(pdf_bytes), "application/pdf")
        }
        data = {
            "title": "Certified Academic Transcript",
            "category": "ACADEMIC",
            "fileHash": file_hash
        }

        res = client.post("/evidence/upload", data=data, files=files)
        assert res.status_code == 201, f"Expected 201 Created for valid evidence upload, got {res.status_code}: {res.text}"
        body = res.json()
        assert body.get("success") is True
        evidence_id = body.get("data", {}).get("id")
        assert evidence_id is not None
        assert body.get("data", {}).get("status") == "PENDING_REVIEW"

    def test_upload_invalid_magic_bytes_rejected(self, auth_student):
        client = auth_student["client"]
        fake_bytes = b"MZ\x90\x00NotARealPdfExecutable"  # Windows PE executable magic bytes

        files = {
            "file": ("malicious.pdf", io.BytesIO(fake_bytes), "application/pdf")
        }
        data = {
            "title": "Disguised Executable",
            "category": "ACADEMIC"
        }

        res = client.post("/evidence/upload", data=data, files=files)
        assert res.status_code == 400, f"Expected 400 Bad Request for corrupted magic bytes, got {res.status_code}"

    def test_unauthorized_user_cannot_download_student_evidence(self, auth_student, auth_admin):
        # Student uploads evidence
        client = auth_student["client"]
        pdf_bytes = generate_valid_pdf_bytes()
        files = {"file": ("test_doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        upload_res = client.post("/evidence/upload", data={"title": "Private Research"}, files=files)
        evidence_id = upload_res.json()["data"]["id"]

        # Student downloads own evidence -> 200
        download_res = client.get(f"/evidence/{evidence_id}/download")
        assert download_res.status_code == 200

        # Unrelated student attempts download -> 403
        import uuid
        from utils.api_client import APIClient
        from config import Config
        other_client = APIClient(Config.API_BASE)
        other_reg = other_client.post("/auth/register", json={
            "email": f"intruder.{uuid.uuid4().hex[:8]}@test.edu",
            "password": "Password123!",
            "name": "Intruder User",
            "role": "STUDENT"
        })
        assert other_reg.status_code == 201, f"Expected 201 for intruder register, got {other_reg.status_code}: {other_reg.text}"
        other_token = other_reg.json()["data"]["accessToken"]
        other_client.set_token(other_token)

        forbidden_res = other_client.get(f"/evidence/{evidence_id}/download")
        assert forbidden_res.status_code == 403, f"Expected 403 Forbidden for unauthorized evidence access, got {forbidden_res.status_code}"
