from config import Config

class EvidencePage:
    def __init__(self, page):
        self.page = page
        self.url = f"{Config.FRONTEND_URL}/student/upload"
        self.file_input = page.locator('[data-testid="evidence-upload-input"]')
        self.submit_btn = page.locator('[data-testid="evidence-submit"]')

    def open(self):
        self.page.goto(self.url)
        self.page.wait_for_load_state("networkidle")

    def upload_file(self, file_path):
        self.file_input.set_input_files(str(file_path))

    def submit_evidence(self):
        self.submit_btn.click()
