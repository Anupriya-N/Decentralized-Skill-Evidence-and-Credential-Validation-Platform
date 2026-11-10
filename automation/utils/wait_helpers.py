import time
import requests

def wait_for_service(url, timeout_sec=20, interval_sec=1):
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            res = requests.get(url, timeout=3)
            if res.status_code in (200, 404, 304, 302):
                return True
        except Exception:
            pass
        time.sleep(interval_sec)
    return False
