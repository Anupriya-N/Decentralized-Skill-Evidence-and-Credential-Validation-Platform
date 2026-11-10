from config import Config

class LoginPage:
    def __init__(self, page):
        self.page = page
        self.url = f"{Config.FRONTEND_URL}/login"
        self.email_input = page.locator('[data-testid="login-email"]')
        self.password_input = page.locator('[data-testid="login-password"]')
        self.submit_btn = page.locator('[data-testid="login-submit"]')
        self.error_msg = page.locator('[data-testid="login-error"]')

    def open(self):
        self.page.goto(self.url)
        self.page.wait_for_load_state("networkidle")

    def login(self, email, password):
        self.email_input.fill(email)
        self.password_input.fill(password)
        self.submit_btn.click()

    def get_error(self):
        return self.error_msg.inner_text()
