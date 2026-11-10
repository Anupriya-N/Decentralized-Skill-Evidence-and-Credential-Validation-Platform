import pytest

@pytest.mark.api
class TestRevocationLifecycle:
    def test_revocation_by_authorized_issuer(self, api, auth_institution):
        inst_client = auth_institution["client"]
        
        # Issue fresh credential
        issue_res = inst_client.post("/credentials", json={
            "studentEmail": "alex.chen@student.edu",
            "title": "Temporary Accreditation Specialization",
            "type": "CERTIFICATE"
        })
        assert issue_res.status_code == 201
        cert_num = issue_res.json()["data"]["certificateNumber"]

        # Revoke by issuing institution
        revoke_res = inst_client.post(f"/credentials/{cert_num}/revoke", json={
            "reason": "Administrative correction: upgraded to senior certification."
        })
        assert revoke_res.status_code == 200, f"Expected 200 for revocation, got {revoke_res.status_code}: {revoke_res.text}"
        assert revoke_res.json().get("success") is True

        # Verify on public verification endpoint
        verify_res = api.get(f"/verification/verify/{cert_num}")
        assert verify_res.status_code == 200
        checks = verify_res.json()["data"]["checks"]
        assert checks["notRevoked"] is False, "Revoked credential must report notRevoked=False"

    def test_revocation_by_unauthorized_user_blocked(self, auth_student):
        student_client = auth_student["client"]
        # Student attempts to revoke an institution credential
        res = student_client.post("/credentials/CRT-2026-CS-901-1404/revoke", json={
            "reason": "Student attempt to self-revoke"
        })
        assert res.status_code == 403, f"Expected 403 Forbidden for non-issuer revocation, got {res.status_code}"
