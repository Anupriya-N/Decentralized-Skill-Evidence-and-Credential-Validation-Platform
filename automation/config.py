import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment if present
env_path = Path(__file__).parent.parent / 'backend' / '.env'
if env_path.exists():
    load_dotenv(env_path)

class Config:
    BACKEND_PORT = int(os.getenv("PORT", 5000))
    BACKEND_URL = os.getenv("BACKEND_URL", f"http://localhost:{BACKEND_PORT}")
    API_BASE = f"{BACKEND_URL}/api/v1"
    
    FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", 5173))
    FRONTEND_URL = os.getenv("FRONTEND_URL", f"http://localhost:{FRONTEND_PORT}")
    
    BLOCKCHAIN_RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "http://localhost:8545")
    CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    
    DEFAULT_TIMEOUT = int(os.getenv("TEST_TIMEOUT", "15"))
    HEADLESS = os.getenv("HEADLESS", "true").lower() in ("true", "1", "yes")
    
    REPORTS_DIR = Path(__file__).parent / "reports"
    SCREENSHOTS_DIR = REPORTS_DIR / "screenshots"

Config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
Config.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
