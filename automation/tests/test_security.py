import pytest

@pytest.mark.security
class TestSecurity:
    def test_student_blocked_from_admin_dashboard(self, auth_student):
        client = auth_student["client"]
        res = client.get("/admin/dashboard")
        assert res.status_code == 403, f"Expected 403 Forbidden for student accessing admin endpoints, got {res.status_code}"

    def test_admin_can_access_admin_dashboard(self, auth_admin):
        client = auth_admin["client"]
        res = client.get("/admin/dashboard")
        assert res.status_code == 200, f"Expected 200 OK for admin accessing admin dashboard, got {res.status_code}"

    def test_idor_protection_on_notifications(self, auth_student, auth_admin):
        student_client = auth_student["client"]
        admin_client = auth_admin["client"]

        # Admin gets own notifications
        admin_notifs = admin_client.get("/notifications")
        if admin_notifs.status_code == 200 and len(admin_notifs.json().get("data", [])) > 0:
            target_id = admin_notifs.json()["data"][0]["id"]
            # Student attempts to mark admin notification as read -> 404 Not Found (scoped to user)
            idor_res = student_client.patch(f"/notifications/{target_id}/read")
            assert idor_res.status_code == 404, f"Expected 404 for IDOR notification attempt, got {idor_res.status_code}"
