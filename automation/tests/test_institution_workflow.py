import pytest
import io
from utils.test_data import generate_valid_pdf_bytes

@pytest.mark.api
class TestInstitutionWorkflow:
    def test_unapproved_institution_blocked_from_issuance(self, api):
        # Register fresh institution (defaults to pendingApproval=true)
        import time
        email = f"pending.inst.{int(time.time()*1000)}@univ.edu"
        reg_res = api.post("/auth/register", json={
            "email": email,
            "password": "Password123!",
            "name": "Unaccredited College",
            "role": "INSTITUTION",
            "institutionName": "Unaccredited College"
        })
        assert reg_res.status_code == 201
        token = reg_res.json()["data"]["accessToken"]
        api.set_token(token)

        issue_res = api.post("/credentials", json={
            "studentEmail": "alex.chen@student.edu",
            "title": "Unaccredited Degree",
            "type": "DEGREE"
        })
        assert issue_res.status_code == 403, f"Expected 403 for unapproved institution issuance, got {issue_res.status_code}"

    def test_institution_reviews_and_approves_evidence(self, auth_student, auth_institution):
        student_client = auth_student["client"]
        pdf_bytes = generate_valid_pdf_bytes()
        files = {"file": ("diploma_evidence.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        upload_res = student_client.post("/evidence/upload", data={"title": "Master of Computing Project"}, files=files)
        evidence_id = upload_res.json()["data"]["id"]

        # Oxford institution approves evidence
        inst_client = auth_institution["client"]
        review_res = inst_client.patch(f"/evidence/{evidence_id}/review", json={
            "status": "APPROVED",
            "reviewNotes": "All course milestones verified against registry records."
        })
        assert review_res.status_code == 200, f"Expected 200 for institutional review, got {review_res.status_code}"
        assert review_res.json()["data"]["status"] == "APPROVED"
