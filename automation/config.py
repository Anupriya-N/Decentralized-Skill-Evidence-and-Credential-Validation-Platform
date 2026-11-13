import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment if present
env_path = Path(__file__).parent.parent / 'backend' / '.env'
if env_path.exists():
    load_dotenv(env_path)

automation_env = Path(__file__).parent / '.env'
if automation_env.exists():
    load_dotenv(automation_env)

class Config:
    BACKEND_PORT = int(os.getenv("PORT", 5000))
    BACKEND_URL = os.getenv("BACKEND_URL", f"http://localhost:{BACKEND_PORT}")
    API_BASE = f"{BACKEND_URL}/api/v1"
    
    FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", 3000))
    FRONTEND_URL = os.getenv("FRONTEND_URL", f"http://localhost:{FRONTEND_PORT}")
    
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:root@127.0.0.1:5432/certitrust_db?schema=public")
    
    BLOCKCHAIN_RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "http://localhost:8545")
    CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
    
    # Dedicated test credentials
    TEST_STUDENT_EMAIL = os.getenv("TEST_STUDENT_EMAIL", "alex.chen@student.edu")
    TEST_STUDENT_PASSWORD = os.getenv("TEST_STUDENT_PASSWORD", "Password123!")
    
    TEST_INSTITUTION_EMAIL = os.getenv("TEST_INSTITUTION_EMAIL", "oxford@institution.edu")
    TEST_INSTITUTION_PASSWORD = os.getenv("TEST_INSTITUTION_PASSWORD", "Password123!")
    
    TEST_ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@certitrust.io")
    TEST_ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "AdminSecure2026!")
    
    DEFAULT_TIMEOUT = int(os.getenv("TEST_TIMEOUT", "15"))
    HEADLESS = os.getenv("HEADLESS", "true").lower() in ("true", "1", "yes")
    
    REPORTS_DIR = Path(__file__).parent / "reports"
    SCREENSHOTS_DIR = REPORTS_DIR / "screenshots"

Config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
Config.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
