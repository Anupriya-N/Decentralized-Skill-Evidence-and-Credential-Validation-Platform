import pytest
from config import Config
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.credential_page import CredentialPage

@pytest.mark.ui
class TestFrontendUI:
    @pytest.fixture(autouse=True)
    def setup_browser(self):
        playwright_mod = pytest.importorskip("playwright.sync_api")
        self.sync_playwright = playwright_mod.sync_playwright

    def test_frontend_login_and_dashboard_navigation(self):
        with self.sync_playwright() as p:
            browser = p.chromium.launch(headless=Config.HEADLESS)
            context = browser.new_context()
            page = context.new_page()

            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

            try:
                login_page = LoginPage(page)
                login_page.open()

                # Verify login elements exist
                assert login_page.email_input.is_visible()
                assert login_page.password_input.is_visible()
                assert login_page.submit_btn.is_visible()

                # Perform login
                login_page.login("alex.chen@student.edu", "Password123!")

                # Wait for navigation to dashboard
                page.wait_for_url("**/student/dashboard", timeout=8000)
                dashboard = DashboardPage(page)
                assert dashboard.is_visible()
            except Exception as e:
                screenshot_path = Config.SCREENSHOTS_DIR / "test_login_failure.png"
                page.screenshot(path=str(screenshot_path))
                raise e
            finally:
                browser.close()

    def test_public_credential_verification_ui(self):
        with self.sync_playwright() as p:
            browser = p.chromium.launch(headless=Config.HEADLESS)
            context = browser.new_context()
            page = context.new_page()

            try:
                cred_page = CredentialPage(page)
                cred_page.open("CRT-2026-CS-901-1404")

                # Verify verification elements exist
                assert cred_page.search_input.is_visible()
                assert cred_page.submit_btn.is_visible()
            except Exception as e:
                screenshot_path = Config.SCREENSHOTS_DIR / "test_verify_failure.png"
                page.screenshot(path=str(screenshot_path))
                raise e
            finally:
                browser.close()
