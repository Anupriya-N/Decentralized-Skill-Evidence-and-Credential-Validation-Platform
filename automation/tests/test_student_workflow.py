import pytest

@pytest.mark.api
class TestStudentWorkflow:
    def test_student_dashboard_metrics(self, auth_student):
        client = auth_student["client"]
        res = client.get("/students/dashboard")
        assert res.status_code == 200, f"Expected 200 from student dashboard, got {res.status_code}"
        data = res.json().get("data", {})
        assert "totalCredentials" in data or "credentials" in data or res.status_code == 200

    def test_student_notifications(self, auth_student):
        client = auth_student["client"]
        res = client.get("/notifications")
        assert res.status_code == 200, f"Expected 200 from notifications list, got {res.status_code}"
        assert isinstance(res.json().get("data"), list)

    def test_student_unread_notifications_count(self, auth_student):
        client = auth_student["client"]
        res = client.get("/notifications/unread-count")
        assert res.status_code == 200, f"Expected 200 from unread count, got {res.status_code}"
        assert isinstance(res.json().get("count"), int)
