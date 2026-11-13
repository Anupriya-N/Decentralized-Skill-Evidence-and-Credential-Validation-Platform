#!/usr/bin/env python
"""
CertiTrust Automated Test Runner
Coordinates service readiness checks, executes pytest suites,
generates HTML reports and captures screenshots on failure.
"""

import sys
import os
import argparse
import subprocess
import time
import socket
from urllib.parse import urlparse
import requests
from pathlib import Path

# Add automation dir to path
sys.path.insert(0, str(Path(__file__).parent))
from config import Config
from utils.wait_helpers import wait_for_service

def check_postgres():
    print("🔍 Checking PostgreSQL connectivity...")
    db_url = Config.DATABASE_URL
    try:
        parsed = urlparse(db_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((host, port))
        sock.close()
        if result == 0:
            print(f"  ✅ PostgreSQL socket is reachable at {host}:{port}")
            return True
        else:
            print(f"  ❌ PostgreSQL socket unreachable at {host}:{port} (socket code: {result})")
            return False
    except Exception as e:
        print(f"  ❌ PostgreSQL connection check failed: {e}")
        return False

def ensure_backend_running():
    print(f"🔍 Checking Backend API at {Config.BACKEND_URL}...")
    if wait_for_service(f"{Config.BACKEND_URL}/health", timeout_sec=3):
        print("  ✅ Backend is already running and healthy")
        return None

    print("  🚀 Starting Backend server in background...")
    backend_dir = Path(__file__).parent.parent / "backend"
    log_path = Config.REPORTS_DIR / "backend_server.log"
    log_file = open(log_path, "w", encoding="utf-8")
    
    process = subprocess.Popen(
        ["node", "src/server.js"],
        cwd=str(backend_dir),
        stdout=log_file,
        stderr=subprocess.STDOUT
    )
    if wait_for_service(f"{Config.BACKEND_URL}/health", timeout_sec=15):
        print("  ✅ Backend started successfully")
        return process
    else:
        print(f"  ❌ Failed to reach Backend API within timeout. Check logs at {log_path}")
        return process

def ensure_frontend_running():
    print(f"🔍 Checking Frontend at {Config.FRONTEND_URL}...")
    if wait_for_service(Config.FRONTEND_URL, timeout_sec=3):
        print("  ✅ Frontend is already running")
        return None

    print(f"  🚀 Starting Frontend server in background...")
    frontend_dir = Path(__file__).parent.parent / "frontend"
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(frontend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    if wait_for_service(Config.FRONTEND_URL, timeout_sec=15):
        print("  ✅ Frontend started successfully")
        return process
    else:
        print(f"  ℹ️ Frontend not reachable within timeout. Continuing...")
        return process

def main():
    parser = argparse.ArgumentParser(description="CertiTrust Automated Test Runner")
    parser.add_argument("--type", choices=["all", "api", "ui", "blockchain", "security"], default="api",
                        help="Type of test suite to execute (default: api)")
    parser.add_argument("--browser", choices=["chromium", "firefox", "webkit"], default="chromium")
    parser.add_argument("--headed", action="store_true", help="Run browser tests in headed mode")
    args = parser.parse_args()

    print("==================================================================")
    print("🧪 CertiTrust Automated Testing Suite (Python / Pytest)")
    print(f"   Target Suite: {args.type.upper()}")
    print("==================================================================")

    # 1. Environment and database checks
    pg_ok = check_postgres()
    if not pg_ok:
        print("  ⚠️ PostgreSQL check failed. Backend may not function correctly.")

    backend_proc = ensure_backend_running()
    frontend_proc = None
    
    if args.type in ("all", "ui"):
        frontend_proc = ensure_frontend_running()

    # 2. Build pytest command
    report_file = Config.REPORTS_DIR / f"report_{args.type}.html"
    cmd = [
        sys.executable, "-m", "pytest",
        f"--html={report_file}",
        "--self-contained-html",
        "-v"
    ]

    if args.type == "api":
        cmd.extend(["-m", "api or not ui"])
    elif args.type == "ui":
        cmd.extend(["-m", "ui"])
    elif args.type == "blockchain":
        cmd.extend(["-m", "blockchain"])
    elif args.type == "security":
        cmd.extend(["-m", "security"])

    print(f"\n🏃 Executing: {' '.join(cmd)}")
    exit_code = subprocess.call(cmd, cwd=str(Path(__file__).parent))

    print("\n==================================================================")
    print(f"📊 Test Execution Finished with Exit Code: {exit_code}")
    print(f"📁 HTML Report Generated: {report_file}")
    print("==================================================================")

    if backend_proc:
        backend_proc.terminate()
    if frontend_proc:
        frontend_proc.terminate()

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
