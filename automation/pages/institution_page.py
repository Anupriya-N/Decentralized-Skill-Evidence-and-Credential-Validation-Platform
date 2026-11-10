from config import Config

class InstitutionPage:
    def __init__(self, page):
        self.page = page
        self.url = f"{Config.FRONTEND_URL}/issuer/requests"
        self.evidence_list = page.locator('[data-testid="evidence-list"]')
        self.approve_btn = page.locator('[data-testid="evidence-approve"]')
        self.reject_btn = page.locator('[data-testid="evidence-reject"]')

    def open(self):
        self.page.goto(self.url)
        self.page.wait_for_load_state("networkidle")

    def approve_first(self):
        self.approve_btn.first.click()

    def reject_first(self):
        self.reject_btn.first.click()
