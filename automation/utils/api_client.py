import requests
from config import Config

class APIClient:
    def __init__(self, base_url=None):
        self.base_url = (base_url or Config.API_BASE).rstrip('/')
        self.session = requests.Session()
        self.token = None

    def set_token(self, token):
        self.token = token
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            self.session.headers.pop("Authorization", None)

    def _url(self, endpoint):
        clean = endpoint.lstrip('/')
        return f"{self.base_url}/{clean}"

    def get(self, endpoint, **kwargs):
        kwargs.setdefault('timeout', Config.DEFAULT_TIMEOUT)
        return self.session.get(self._url(endpoint), **kwargs)

    def post(self, endpoint, json=None, data=None, files=None, **kwargs):
        kwargs.setdefault('timeout', Config.DEFAULT_TIMEOUT)
        return self.session.post(self._url(endpoint), json=json, data=data, files=files, **kwargs)

    def patch(self, endpoint, json=None, **kwargs):
        kwargs.setdefault('timeout', Config.DEFAULT_TIMEOUT)
        return self.session.patch(self._url(endpoint), json=json, **kwargs)

    def put(self, endpoint, json=None, **kwargs):
        kwargs.setdefault('timeout', Config.DEFAULT_TIMEOUT)
        return self.session.put(self._url(endpoint), json=json, **kwargs)

    def delete(self, endpoint, **kwargs):
        kwargs.setdefault('timeout', Config.DEFAULT_TIMEOUT)
        return self.session.delete(self._url(endpoint), **kwargs)
