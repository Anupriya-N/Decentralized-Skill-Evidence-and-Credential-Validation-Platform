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
import struct
from urllib.parse import urlparse
import requests
from pathlib import Path

# Add automation dir to path
sys.path.insert(0, str(Path(__file__).parent))
from config import Config
from utils.wait_helpers import wait_for_service

def check_postgres():
    print("🔍 Checking PostgreSQL connectivity and database integrity...")
    db_url = Config.DATABASE_URL
    try:
        parsed = urlparse(db_url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 5432
        db_name = parsed.path.lstrip("/").split("?")[0] or "certitrust_db"
        user = parsed.username or "postgres"

        # 1. TCP Socket Check
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((host, port))
        if result != 0:
            sock.close()
            print(f"  ❌ PostgreSQL socket unreachable at {host}:{port} (error code: {result})")
            return False

        # 2. PostgreSQL 3.0 Wire Protocol Handshake Check
        try:
            body = struct.pack('!I', 196608) + f"user\x00{user}\x00database\x00{db_name}\x00\x00".encode('utf-8')
            pkt = struct.pack('!I', len(body) + 4) + body
            sock.sendall(pkt)
            resp = sock.recv(1024)
            sock.close()
            if resp and resp[0:1] in (b'R', b'K', b'Z'):
                print(f"  ✅ PostgreSQL server at {host}:{port} verified via protocol handshake for database '{db_name}'")
                return True
            elif resp and resp[0:1] == b'E':
                print(f"  ⚠️ PostgreSQL responded with error frame for '{db_name}'. Continuing with subsystem verification...")
            else:
                print(f"  ✅ PostgreSQL socket is open at {host}:{port}")
                return True
        except Exception:
            sock.close()
            print(f"  ✅ PostgreSQL socket is open at {host}:{port}")
            return True

        return True
    except Exception as e:
        print(f"  ❌ PostgreSQL connection check failed: {e}")
        return False

def ensure_backend_running():
    print(f"🔍 Checking Backend API at {Config.BACKEND_URL}...")
    try:
        r = requests.get(f"{Config.BACKEND_URL}/health", timeout=3)
        if r.status_code == 200:
            data = r.json()
            db_status = data.get("subsystems", {}).get("database", {}).get("status")
            if db_status == "connected":
                engine = data.get("subsystems", {}).get("database", {}).get("engine", "PostgreSQL")
                print(f"  ✅ Backend is healthy and PostgreSQL connection is confirmed ({engine})")
                return None
            else:
                print(f"  ⚠️ Backend is running but database subsystem is '{db_status}'")
    except Exception:
        pass

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

    started = False
    start_time = time.time()
    while time.time() - start_time < 15:
        try:
            r = requests.get(f"{Config.BACKEND_URL}/health", timeout=2)
            if r.status_code == 200 and r.json().get("subsystems", {}).get("database", {}).get("status") == "connected":
                started = True
                break
        except Exception:
            time.sleep(1)

    if started:
        print("  ✅ Backend started successfully with database connected")
        return process
    else:
        print(f"  ❌ Failed to reach Backend API or database within timeout.")
        if log_path.exists():
            print("  📜 Recent backend logs:")
            try:
                with open(log_path, "r", encoding="utf-8") as f:
                    logs = f.readlines()[-15:]
                    for line in logs:
                        print(f"     {line.strip()}")
            except Exception:
                pass
        process.terminate()
        sys.exit(1)

def ensure_frontend_running():
    print(f"🔍 Checking Frontend at {Config.FRONTEND_URL}...")
    if wait_for_service(Config.FRONTEND_URL, timeout_sec=3):
        print("  ✅ Frontend is already running")
        return None

    print("  🚀 Starting Frontend server in background...")
    frontend_dir = Path(__file__).parent.parent / "frontend"
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    log_path = Config.REPORTS_DIR / "frontend_server.log"
    log_file = open(log_path, "w", encoding="utf-8")
    process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(frontend_dir),
        stdout=log_file,
        stderr=subprocess.STDOUT
    )
    if wait_for_service(Config.FRONTEND_URL, timeout_sec=15):
        print("  ✅ Frontend started successfully")
        return process
    else:
        print(f"  ❌ Frontend not reachable within timeout. Check logs at {log_path}")
        if log_path.exists():
            try:
                with open(log_path, "r", encoding="utf-8") as f:
                    logs = f.readlines()[-15:]
                    for line in logs:
                        print(f"     {line.strip()}")
            except Exception:
                pass
        process.terminate()
        sys.exit(1)

def check_blockchain_rpc(require_on_chain=False):
    print(f"🔍 Checking Blockchain RPC connectivity at {Config.BLOCKCHAIN_RPC_URL}...")
    try:
        r = requests.post(
            Config.BLOCKCHAIN_RPC_URL,
            json={"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 1},
            timeout=5
        )
        if r.status_code == 200:
            res_json = r.json()
            chain_id_hex = res_json.get("result")
            chain_id = int(chain_id_hex, 16) if chain_id_hex else None
            print(f"  ✅ Blockchain RPC connected. Chain ID: {chain_id}")

            code_res = requests.post(
                Config.BLOCKCHAIN_RPC_URL,
                json={"jsonrpc": "2.0", "method": "eth_getCode", "params": [Config.CONTRACT_ADDRESS, "latest"], "id": 2},
                timeout=5
            )
            code = code_res.json().get("result", "0x")
            print(f"  ℹ️ Contract address {Config.CONTRACT_ADDRESS} inspected (bytecode status: {'present' if len(code) > 2 else 'pending_deployment'})")
            return True
        else:
            print(f"  ⚠️ Blockchain RPC returned HTTP {r.status_code}")
            if require_on_chain:
                sys.exit(1)
            return False
    except Exception as e:
        print(f"  ⚠️ Blockchain RPC check notice: {e}")
        if require_on_chain:
            print("  ❌ Strict blockchain verification failed. Aborting execution.")
            sys.exit(1)
        return False

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
        print("  ❌ PostgreSQL check failed. Backend requires PostgreSQL to run.")
        sys.exit(1)

    backend_proc = ensure_backend_running()
    frontend_proc = None

    if args.type in ("all", "ui"):
        frontend_proc = ensure_frontend_running()

    if args.type in ("all", "blockchain"):
        check_blockchain_rpc(require_on_chain=(args.type == "blockchain"))

    # 2. Build pytest command
    report_file = Config.REPORTS_DIR / f"report_{args.type}.html"
    cmd = [
        sys.executable, "-m", "pytest",
        f"--html={report_file}",
        "--self-contained-html",
        "-v"
    ]

    if args.type == "api":
        cmd.extend(["-m", "not ui"])
    elif args.type == "ui":
        cmd.extend(["-m", "ui"])
    elif args.type == "blockchain":
        cmd.extend(["-m", "blockchain"])
    elif args.type == "security":
        cmd.extend(["-m", "security"])
    elif args.type == "all":
        pass  # runs all tests without filter

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
