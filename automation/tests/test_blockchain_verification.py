import pytest

@pytest.mark.blockchain
class TestBlockchainVerification:
    def test_multi_point_verification_audit(self, api, auth_institution):
        inst_client = auth_institution["client"]
        cert_num = f"CRT-AUTO-{pytest.importorskip('time').time()}"
        
        issue_res = inst_client.post("/credentials", json={
            "studentEmail": "alex.chen@student.edu",
            "title": "Decentralized Security Architecture",
            "type": "CERTIFICATE",
            "badgeLevel": "GOLD",
            "courseCode": "SEC-801"
        })
        assert issue_res.status_code == 201
        created_cert_num = issue_res.json()["data"]["certificateNumber"]

        # Run public verification audit
        verify_res = api.get(f"/verification/verify/{created_cert_num}")
        assert verify_res.status_code == 200, f"Expected 200 from verify, got {verify_res.status_code}: {verify_res.text}"
        body = verify_res.json()
        assert body.get("success") is True
        checks = body.get("data", {}).get("checks", {})
        assert checks.get("signatureValid") is True, "ECDSA digital signature must mathematically verify"
        assert checks.get("issuerAccredited") is True, "Issuer must be marked as accredited"
        assert checks.get("notRevoked") is True, "Active credential must report notRevoked=True"

    def test_qr_code_generation_endpoint(self, api):
        res = api.get("/credentials/qr/CRT-2026-CS-901-1404")
        assert res.status_code == 200, f"Expected 200 from QR endpoint, got {res.status_code}"
        assert res.json().get("success") is True
        assert "dataUrl" in res.json().get("data", {})

    def test_non_existent_credential_reports_404(self, api):
        res = api.get("/verification/verify/NON-EXISTENT-CRED-999")
        assert res.status_code == 404, f"Expected 404 for unknown credential identifier, got {res.status_code}"
        assert res.json().get("status") == "NOT_FOUND"
