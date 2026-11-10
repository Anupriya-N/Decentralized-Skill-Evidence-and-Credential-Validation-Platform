import pytest
from utils.test_data import generate_student_payload, generate_timestamped_email

@pytest.mark.api
class TestAuthentication:
    def test_student_registration_success(self, api):
        payload = generate_student_payload()
        res = api.post("/auth/register", json=payload)
        assert res.status_code == 201, f"Expected 201 Created, got {res.status_code}: {res.text}"
        body = res.json()
        assert body.get("success") is True
        assert body.get("data", {}).get("accessToken") is not None
        assert body.get("data", {}).get("user", {}).get("email") == payload["email"]

    def test_registration_with_admin_role_is_forbidden(self, api):
        payload = generate_student_payload()
        payload["role"] = "ADMIN"
        res = api.post("/auth/register", json=payload)
        assert res.status_code == 403, f"Expected 403 Forbidden for public ADMIN role registration, got {res.status_code}"

    def test_login_success(self, api):
        res = api.post("/auth/login", json={"email": "alex.chen@student.edu", "password": "Password123!"})
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        body = res.json()
        assert body.get("success") is True
        assert body.get("data", {}).get("accessToken") is not None

    def test_login_invalid_password_rejected(self, api):
        res = api.post("/auth/login", json={"email": "alex.chen@student.edu", "password": "WrongPassword999!"})
        assert res.status_code == 401, f"Expected 401 Unauthorized for invalid password, got {res.status_code}"

    def test_atomic_refresh_token_rotation(self, api):
        login_res = api.post("/auth/login", json={"email": "alex.chen@student.edu", "password": "Password123!"})
        refresh_token = login_res.json()["data"]["refreshToken"]

        # First rotation
        rot_res = api.post("/auth/refresh-token", json={"refreshToken": refresh_token})
        assert rot_res.status_code == 200, f"Expected 200 for token rotation, got {rot_res.status_code}"
        new_refresh = rot_res.json()["data"]["refreshToken"]
        assert new_refresh != refresh_token

        # Replay attack with used token -> must be rejected
        replay_res = api.post("/auth/refresh-token", json={"refreshToken": refresh_token})
        assert replay_res.status_code == 401, f"Expected 401 for replayed refresh token, got {replay_res.status_code}"
