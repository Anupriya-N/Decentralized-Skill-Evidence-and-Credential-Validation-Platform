import pytest

@pytest.mark.api
class TestAPIIntegration:
    def test_health_check_subsystems(self, api):
        res = api.get("/health")
        assert res.status_code == 200, f"Expected 200 from /health, got {res.status_code}: {res.text}"
        body = res.json()
        assert body.get("status") in ("healthy", "degraded")
        subsystems = body.get("subsystems", {})
        assert "database" in subsystems
        assert subsystems["database"]["status"] == "connected"
        assert "ai" in subsystems
        assert "blockchain" in subsystems

    def test_groq_ai_skill_extraction(self, auth_student):
        client = auth_student["client"]
        res = client.post("/ai/extract-skills", json={
            "text": "Completed advanced course in Solidity development, smart contract auditing, and EVM gas optimization."
        })
        assert res.status_code == 200, f"Expected 200 from AI skill extraction, got {res.status_code}: {res.text}"
        body = res.json()
        assert body.get("success") is True
        skills = body.get("data", {}).get("skills", [])
        assert len(skills) > 0, "AI must extract at least one relevant skill from the text"

    def test_groq_ai_empty_text_error_handling(self, auth_student):
        client = auth_student["client"]
        res = client.post("/ai/extract-skills", json={})
        assert res.status_code == 400, f"Expected 400 Bad Request for empty AI extraction payload, got {res.status_code}"
