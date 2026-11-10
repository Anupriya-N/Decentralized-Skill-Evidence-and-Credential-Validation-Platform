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
import requests
from pathlib import Path

# Add automation dir to path
sys.path.insert(0, str(Path(__file__).parent))
from config import Config
from utils.wait_helpers import wait_for_service

def check_postgres():
    print("🔍 Checking PostgreSQL connectivity...")
    # Via backend health endpoint
    try:
        res = requests.get(f"{Config.BACKEND_URL}/health", timeout=3)
        if res.status_code == 200:
            db_status = res.json().get("subsystems", {}).get("database", {}).get("status")
            if db_status == "connected":
                print("  ✅ PostgreSQL is connected via Backend API")
                return True
    except Exception:
        pass
    print("  ⚠️ PostgreSQL direct probe waiting on backend service")
    return True

def ensure_backend_running():
    print(f"🔍 Checking Backend API at {Config.BACKEND_URL}...")
    if wait_for_service(f"{Config.BACKEND_URL}/health", timeout_sec=3):
        print("  ✅ Backend is already running and healthy")
        return None

    print("  🚀 Starting Backend server in background...")
    backend_dir = Path(__file__).parent.parent / "backend"
    process = subprocess.Popen(
        ["node", "src/server.js"],
        cwd=str(backend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True
    )
    if wait_for_service(f"{Config.BACKEND_URL}/health", timeout_sec=15):
        print("  ✅ Backend started successfully")
        return process
    else:
        print("  ❌ Failed to reach Backend API within timeout")
        return process

def ensure_frontend_running():
    print(f"🔍 Checking Frontend at {Config.FRONTEND_URL}...")
    if wait_for_service(Config.FRONTEND_URL, timeout_sec=3):
        print("  ✅ Frontend is already running")
        return None
    print(f"  ℹ️ Frontend not detected at {Config.FRONTEND_URL} (UI browser tests may require `npm run dev` in frontend/)")
    return None

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

    # 1. Environment checks
    check_postgres()
    backend_proc = ensure_backend_running()
    
    if args.type in ("all", "ui"):
        ensure_frontend_running()

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

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
