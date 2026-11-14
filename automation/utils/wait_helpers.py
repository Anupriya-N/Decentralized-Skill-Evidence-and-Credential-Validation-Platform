import time
import requests

def wait_for_service(url, timeout_sec=25, interval_sec=1):
    start = time.time()
    targets = [url]
    if "localhost" in url:
        targets.append(url.replace("localhost", "127.0.0.1"))
    while time.time() - start < timeout_sec:
        for target in targets:
            try:
                res = requests.get(target, timeout=2)
                if res.status_code in (200, 404, 304, 302):
                    return True
            except Exception:
                pass
        time.sleep(interval_sec)
    return False
