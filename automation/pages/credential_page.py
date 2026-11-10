from config import Config

class CredentialPage:
    def __init__(self, page):
        self.page = page
        self.url = f"{Config.FRONTEND_URL}/verify"
        self.search_input = page.locator('[data-testid="verification-input"]')
        self.submit_btn = page.locator('[data-testid="verification-submit"]')
        self.result_container = page.locator('[data-testid="verification-result"]')
        self.status_badge = page.locator('[data-testid="verification-status"]')

    def open(self, cred_id=None):
        target = f"{self.url}/{cred_id}" if cred_id else self.url
        self.page.goto(target)
        self.page.wait_for_load_state("networkidle")

    def verify(self, cred_id):
        self.search_input.fill(cred_id)
        self.submit_btn.click()

    def get_status(self):
        return self.status_badge.inner_text()
