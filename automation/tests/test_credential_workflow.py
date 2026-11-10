import pytest
import io
import time
from utils.test_data import generate_valid_pdf_bytes

@pytest.mark.api
class TestCredentialWorkflow:
    def test_issuing_requires_approved_evidence(self, auth_student, auth_institution):
        student_client = auth_student["client"]
        inst_client = auth_institution["client"]

        # Student uploads unreviewed evidence
        pdf_bytes = generate_valid_pdf_bytes()
        upload_res = student_client.post("/evidence/upload", data={"title": "Draft Lab Report"}, files={"file": ("draft.pdf", io.BytesIO(pdf_bytes), "application/pdf")})
        evidence_id = upload_res.json()["data"]["id"]

        # Attempt to issue with unapproved evidence -> 400 Bad Request
        issue_res = inst_client.post("/credentials", json={
            "studentEmail": auth_student["email"],
            "title": "Quantum Computing Specialization",
            "type": "CERTIFICATE",
            "badgeLevel": "GOLD",
            "evidenceId": evidence_id
        })
        assert issue_res.status_code == 400, f"Expected 400 Bad Request when binding unapproved evidence, got {issue_res.status_code}"

        # Approve evidence
        review_res = inst_client.patch(f"/evidence/{evidence_id}/review", json={
            "status": "APPROVED",
            "reviewNotes": "Evidence authenticated."
        })
        assert review_res.status_code == 200

        # Now issue with approved evidence -> 201 Created
        valid_res = inst_client.post("/credentials", json={
            "studentEmail": auth_student["email"],
            "title": "Quantum Computing Specialization",
            "type": "CERTIFICATE",
            "badgeLevel": "GOLD",
            "evidenceId": evidence_id
        })
        assert valid_res.status_code == 201, f"Expected 201 Created for valid credential issuance, got {valid_res.status_code}: {valid_res.text}"
        cred_data = valid_res.json()["data"]
        assert cred_data.get("certificateNumber") is not None
        assert cred_data.get("digitalSignature") is not None

    def test_issuance_to_non_student_role_rejected(self, auth_institution):
        inst_client = auth_institution["client"]
        res = inst_client.post("/credentials", json={
            "studentEmail": "admin@certitrust.io",
            "title": "Invalid Target Credential",
            "type": "DEGREE"
        })
        assert res.status_code == 400, f"Expected 400 when issuing credential to non-student, got {res.status_code}"
