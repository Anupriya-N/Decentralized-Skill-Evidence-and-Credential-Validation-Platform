import pytest
from config import Config
from utils.api_client import APIClient
from utils.test_data import generate_student_payload

@pytest.fixture(scope="session")
def base_api():
    return APIClient(Config.API_BASE)

@pytest.fixture
def api():
    return APIClient(Config.API_BASE)

@pytest.fixture
def auth_student():
    client = APIClient(Config.API_BASE)
    payload = generate_student_payload()
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 201, f"Failed to register dedicated test student: {res.text}"
    
    data = res.json().get("data", {})
    token = data.get("accessToken")
    user = data.get("user", {})
    assert token, "Registration response must contain a valid access token"
    client.set_token(token)
    return {"client": client, "user": user, "token": token, "email": user.get("email")}

@pytest.fixture
def auth_admin():
    client = APIClient(Config.API_BASE)
    res = client.post("/auth/login", json={
        "email": Config.TEST_ADMIN_EMAIL,
        "password": Config.TEST_ADMIN_PASSWORD
    })
    assert res.status_code == 200, f"Failed to authenticate dedicated admin: {res.text}"
    data = res.json().get("data", {})
    token = data.get("accessToken")
    user = data.get("user", {})
    assert token, "Admin login response must contain a valid access token"
    client.set_token(token)
    return {"client": client, "user": user, "token": token}

@pytest.fixture
def auth_institution():
    client = APIClient(Config.API_BASE)
    res = client.post("/auth/login", json={
        "email": Config.TEST_INSTITUTION_EMAIL,
        "password": Config.TEST_INSTITUTION_PASSWORD
    })
    assert res.status_code == 200, f"Failed to authenticate dedicated test institution: {res.text}"
    data = res.json().get("data", {})
    token = data.get("accessToken")
    user = data.get("user", {})
    assert token, "Institution login response must contain a valid access token"
    client.set_token(token)
    return {"client": client, "user": user, "token": token}
