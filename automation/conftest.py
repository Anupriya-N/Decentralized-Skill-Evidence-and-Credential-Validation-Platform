import pytest
import os
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
def auth_student(api):
    payload = generate_student_payload()
    res = api.post("/auth/register", json=payload)
    if res.status_code != 201:
        res = api.post("/auth/login", json={"email": "alex.chen@student.edu", "password": "Password123!"})
    
    data = res.json().get("data", {})
    token = data.get("accessToken")
    user = data.get("user", {})
    api.set_token(token)
    return {"client": api, "user": user, "token": token, "email": user.get("email")}

@pytest.fixture
def auth_admin(api):
    res = api.post("/auth/login", json={"email": "admin@certitrust.io", "password": "AdminSecure2026!"})
    data = res.json().get("data", {})
    token = data.get("accessToken")
    user = data.get("user", {})
    api.set_token(token)
    return {"client": api, "user": user, "token": token}

@pytest.fixture
def auth_institution(api):
    res = api.post("/auth/login", json={"email": "oxford@institution.edu", "password": "Password123!"})
    data = res.json().get("data", {})
    token = data.get("accessToken")
    user = data.get("user", {})
    api.set_token(token)
    return {"client": api, "user": user, "token": token}
