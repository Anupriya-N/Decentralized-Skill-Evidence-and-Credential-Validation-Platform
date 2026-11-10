# CertiTrust Automation Testing Framework

Comprehensive end-to-end Python test automation suite for the CertiTrust Platform, covering API integration, security authorization, cryptographic proof validation, multi-actor workflows, and Playwright browser UI testing.

---

## 1. Directory Structure

```
automation/
├── requirements.txt         # Python dependencies (pytest, playwright, requests, pytest-html)
├── pytest.ini               # Pytest configuration and test markers
├── conftest.py              # Shared fixtures (API clients, authentication states)
├── config.py                # Environment configuration and target URLs
├── run_tests.py             # CLI runner script coordinating service readiness and test suites
├── pages/                   # Page Object Models for frontend browser automation
│   ├── login_page.py
│   ├── dashboard_page.py
│   ├── evidence_page.py
│   ├── institution_page.py
│   └── credential_page.py
├── utils/                   # Reusable testing utilities
│   ├── api_client.py        # Centralized HTTP client with automatic token injection
│   ├── test_data.py         # Timestamped payload generators and synthetic PDF builders
│   └── wait_helpers.py      # Service polling readiness helpers
├── tests/                   # Test modules
│   ├── test_api_integration.py
│   ├── test_authentication.py
│   ├── test_blockchain_verification.py
│   ├── test_credential_workflow.py
│   ├── test_evidence_workflow.py
│   ├── test_frontend_ui.py
│   ├── test_institution_workflow.py
│   ├── test_revocation.py
│   ├── test_security.py
│   └── test_student_workflow.py
└── reports/                 # Auto-generated HTML reports and failure screenshots
```

---

## 2. Prerequisites & Installation

### Windows PowerShell Setup:

```powershell
# 1. Navigate to automation directory
cd automation

# 2. Install dependencies
python -m pip install -r requirements.txt

# 3. Install Playwright browser binaries (for UI testing)
python -m playwright install chromium
```

---

## 3. Running Automated Tests

### A. Run via CLI Test Runner:

```powershell
# Run API integration suite (Default)
python run_tests.py --type api

# Run Security and RBAC authorization tests
python run_tests.py --type security

# Run Blockchain verification tests
python run_tests.py --type blockchain

# Run Playwright Browser UI tests
python run_tests.py --type ui

# Run Full Combined Test Suite
python run_tests.py --type all
```

### B. Run Directly via Pytest:

```powershell
# Run all tests with HTML report
python -m pytest --html=reports/report.html --self-contained-html -v

# Run specific test file
python -m pytest tests/test_authentication.py -v
```

---

## 4. Test Reporting & Artifacts

- **HTML Report**: Stored in `automation/reports/report_{type}.html`. Open in any browser for detailed pass/fail metrics, execution timings, and stack traces.
- **Screenshots**: Automatically captured on any browser test failure and stored in `automation/reports/screenshots/`.
