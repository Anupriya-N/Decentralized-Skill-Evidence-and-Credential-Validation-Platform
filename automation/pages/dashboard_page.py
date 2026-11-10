from config import Config

class DashboardPage:
    def __init__(self, page):
        self.page = page
        self.container = page.locator('[data-testid="dashboard-container"]')
        self.title = page.locator('[data-testid="dashboard-title"]')
        self.statistics = page.locator('[data-testid="dashboard-statistics"]')

    def is_visible(self):
        return self.container.is_visible()

    def get_title_text(self):
        return self.title.inner_text()
