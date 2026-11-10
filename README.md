# CertiTrust: Decentralized Skill Evidence & Credential Validation Platform

> **Final-Year Engineering Project**  
> Complete Production & Demonstration Guide: Backend, Blockchain, Frontend, and Python End-to-End Automation Testing.

---

## 1. Project Overview & Architecture

CertiTrust is an enterprise-grade decentralized platform solving academic fraud, certificate tampering, and verification friction. The system unites:
- **`backend/`**: Node.js (ESM), Express.js REST API with Prisma ORM connecting to PostgreSQL. Implements JWT authentication with atomic refresh token rotation, streaming SHA-256 magic-bytes file verification, EIP-712 relayed blockchain anchoring, and Groq Llama-3 AI skill extraction.
- **`blockchain/`**: Solidity (`CertiTrustAnchor.sol`) on Hardhat. Implements EIP-712 domain hashing, low-$s$ ECDSA signature malleability safeguards, single and batch Merkle credential anchoring, and decentralized multi-authority revocation.
- **`frontend/`**: React 18, Vite, Tailwind CSS, Lucide icons, Recharts, and React Router. Multi-actor dashboards for Students, Issuing Bodies, Employers, and Administrators.
- **`automation/`**: Python 3, Pytest, Playwright, and Requests. End-to-end multi-role browser automation, API integration tests, and automated HTML reporting with screenshot capture.

---

## 2. Complete Setup & Execution Guide (Windows PowerShell)

Follow these exact steps in Windows PowerShell to set up, configure, and execute the entire project from scratch.

### Step 1: Required Software
Ensure the following tools are installed:
- **Node.js**: v18.0.0 or higher (Tested on Node.js v24.11.1)
- **Python**: v3.10.0 or higher
- **PostgreSQL**: v14+ (Tested on PostgreSQL 18 on `localhost:5432`)
- **Git**

### Step 2: Node.js Verification
```powershell
node --version
npm --version
```

### Step 3: Python & Pip Verification
```powershell
python --version
python -m pip --version
```

### Step 4: PostgreSQL Setup
Ensure PostgreSQL service is running and create the database `certitrust_db`:
```powershell
# Verify service is running
Get-Service -Name postgresql*

# If using psql:
# CREATE DATABASE certitrust_db;
```

### Step 5: Backend Dependency Installation
```powershell
cd backend
npm install
cd ..
```

### Step 6: Blockchain Dependency Installation
```powershell
cd blockchain
npm install
cd ..
```

### Step 7: Frontend Dependency Installation
```powershell
cd frontend
npm install
cd ..
```

### Step 8: Environment Configuration
Copy `.env.example` to `backend/.env` and update credentials:
```powershell
Copy-Item .env.example backend\.env
```
Ensure `backend/.env` contains valid credentials:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:root@localhost:5432/certitrust_db?schema=public"
JWT_SECRET=certitrust_super_secret_jwt_access_key_2026_production_grade_512bits
JWT_REFRESH_SECRET=certitrust_super_secret_jwt_refresh_key_2026_production_grade_512bits
INSTITUTION_KEY_ENCRYPTION_SECRET=certitrust_institutional_aes_256_gcm_master_key_2026_secure
DEMO_INSTITUTION_PRIVATE_KEY=0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d
BLOCKCHAIN_RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438f44e
CHAIN_ID=31337
GROQ_API_KEY=your_groq_api_key_here
```

### Step 9: Database Migration
```powershell
cd backend
npx prisma migrate dev --name init
cd ..
```

### Step 10: Prisma Client Generation
```powershell
cd backend
npx prisma generate
cd ..
```

### Step 11: Hardhat Smart Contract Compilation
```powershell
cd blockchain
node node_modules/hardhat/internal/cli/cli.js compile
cd ..
```

### Step 12: Smart Contract Unit Testing
Run the 19 contract security and lifecycle tests:
```powershell
cd blockchain
node node_modules/hardhat/internal/cli/cli.js test
cd ..
```

### Step 13: Local Blockchain Startup (Optional for Local Hardhat Node)
To start a standalone local Ethereum node:
```powershell
cd blockchain
npx hardhat node
```

### Step 14: Contract Deployment (Optional for Local Node)
In a separate terminal:
```powershell
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

### Step 15: Backend Startup
In a PowerShell window:
```powershell
cd backend
npm run dev
# Backend API will be active at http://localhost:5000
```

### Step 16: Frontend Startup
In a second PowerShell window:
```powershell
cd frontend
npm run dev
# Frontend web portal will be active at http://localhost:5173
```

### Step 17: Python Automation Installation
In a third PowerShell window:
```powershell
cd automation
python -m pip install -r requirements.txt
```

### Step 18: Playwright Browser Installation
```powershell
python -m playwright install chromium
```

### Step 19: Automation Test Execution
Run the automated test runner:
```powershell
# 1. Run all Backend API integration tests:
python run_tests.py --type api

# 2. Run Role Security & IDOR Authorization tests:
python run_tests.py --type security

# 3. Run Blockchain verification tests:
python run_tests.py --type blockchain

# 4. Run Playwright Browser UI tests:
python run_tests.py --type ui

# 5. Run Complete Full Test Suite:
python run_tests.py --type all
```

### Step 20: Test Reports & Troubleshooting
- **HTML Test Reports:** Automatically generated after execution and saved at:
  `automation/reports/report_{type}.html`
- **Failure Screenshots:** Browser screenshots upon assertion failure saved at:
  `automation/reports/screenshots/`
- **Common Troubleshooting Tips:**
  - *PostgreSQL Connection Error (P1001):* Ensure PostgreSQL service is active in Services (`Start-Service postgresql*`) and database `certitrust_db` exists.
  - *Port Conflicts (EADDRINUSE):* Run `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process` to free port 5000.
  - *Playwright Browser Missing:* Execute `python -m playwright install chromium`.

---

## 3. Seed Accounts for Reviewers

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | `alex.chen@student.edu` | `Password123!` | Upload evidence, view portfolio, generate QR codes |
| **Institution** | `oxford@institution.edu` | `Oxford123!` | Review student evidence, issue credentials, revoke |
| **Administrator** | `admin@institution.edu` | `Admin123!` | Institutional accreditation review, audit logs, system dashboard |
| **Employer / Recruiter** | `recruiter@techcorp.com` | `Recruiter123!` | Public verification, file re-hash byte check, talent search |

---

## 4. Verification Test Status Summary

- **Hardhat Smart Contract Suite:** 19/19 Passing (100%)
- **Backend Comprehensive API Suite:** 78/78 Passing (100%)
- **Frontend Verification Suite:** 16/16 Passing (100%)
- **Python Automation API & Security Suite:** Fully integrated with HTML reporting
