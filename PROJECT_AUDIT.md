# Comprehensive Project Audit: CertiTrust Platform
**Decentralized Skill Evidence and Credential Validation Platform**
**Date:** November 2026

---

## 1. Executive Summary & Existing Architecture

The CertiTrust platform is designed as a decentralized credential issuance, evidence verification, and cryptographic revocation ecosystem. The repository is organized into three primary operational modules:
- **`backend/`**: Node.js ES Modules, Express.js REST API with Prisma ORM connecting to PostgreSQL 18. Implements authentication (JWT + rotating refresh tokens), role-based access control (`STUDENT`, `INSTITUTION`, `EMPLOYER`, `ADMIN`), cryptographic SHA-256 evidence hashing, EIP-712 relayed blockchain anchoring, and Groq Llama-3 AI skill extraction.
- **`blockchain/`**: Solidity 0.8.24 smart contract (`CertiTrustAnchor.sol`) with Hardhat test and deployment tooling. Implements EIP-712 domain hashing, low-$s$ ECDSA signature malleability safeguards, single and batch Merkle credential anchoring, and decentralized multi-authority revocation.
- **`frontend/`**: React 18, Vite, Tailwind CSS, Lucide icons, and React Router. Implements role-specific dashboards for Students, Issuing Institutions, Recruiters/Employers, and Administrators, as well as public QR and cryptographic credential verification pages.

---

## 2. Existing Functionality

1. **Authentication & Identity**:
   - Multi-role user registration and login (`STUDENT`, `INSTITUTION`, `EMPLOYER`, `ADMIN`).
   - Secure Argon2/Bcrypt password hashing (work factor 12).
   - Atomic refresh token rotation with family revocation upon replay detection.
   - Dedicated password reset lifecycle with cryptographic reset tokens.
   - IDOR-protected notifications subsystem.

2. **Evidence Management**:
   - File uploads with MIME-type and magic-bytes verification (enforcing genuine PDF, PNG, JPEG formats).
   - SHA-256 content-addressed hash generation via Node.js streaming crypto.
   - Evidence lifecycle status tracking (`PENDING_REVIEW`, `APPROVED`, `REJECTED`).
   - Strict institutional review workflows preventing unapproved evidence from credential binding.

3. **Cryptographic Credential Lifecycle**:
   - Normalized deterministic JSON payload serialization.
   - Institutional ECDSA secp256k1 key derivation and signing.
   - AES-256-GCM encryption at rest for institutional private signing keys.
   - Merkle tree batch issuance with sibling proof generation and verification.
   - Public multi-point verification audits (ECDSA signature, Merkle root match, issuer accreditation, on-chain revocation status).

4. **Blockchain Smart Contract (`CertiTrustAnchor.sol`)**:
   - EIP-712 typed-data authorization (`RegisterAuthorization` and `RevokeAuthorization`).
   - Relayed gasless transactions submitted by platform relayer on behalf of accredited institutions.
   - Canonical low-$s$ ECDSA signature malleability check ($s \le \text{secp256k1n}/2$).
   - Strict authorization gates preventing unapproved or deauthorized issuers from registering records.

---

## 3. Identified Deficiencies & Broken Connections

### A. Frontend Mock Fallback vs. Backend API Disconnect
- **Issue**: Frontend services (`authService.js`, `credentialService.js`, `issuerService.js`) operated primarily against `storageService.js` (localStorage prototype mocks), rather than communicating with the live Express backend on `http://localhost:5000/api/v1`.
- **Impact**: Real user credentials, database records, and blockchain transactions were not displayed in the browser; operations in the UI did not persist to PostgreSQL.
- **Resolution**: Refactor frontend service layers to prioritize `apiClient.js` against backend `/api/v1` routes with transparent token injection, retaining clean fallback handling only when backend servers are not running.

### B. Blockchain Signer Reference in Direct Revocation
- **Issue**: In `backend/src/services/blockchain.service.js`, the direct revocation method checked `this.wallet.getAddress()` while the instance initialized the signer as `this.signer`.
- **Impact**: Calling `revokeOnChain` failed with `TypeError: Cannot read properties of null (reading 'getAddress')`.
- **Resolution**: Corrected to `await this.signer.getAddress()`.

### C. Fallback Nonce & Replay Vulnerabilities
- **Issue**: Historical implementations returned `0` when on-chain nonce retrieval encountered an RPC timeout.
- **Impact**: Could allow transaction failures or signature collisions under RPC latency.
- **Resolution**: Replaced with strict address validation, RPC query timeout guards, and explicit error throwing.

### D. Unregistered Students in Batch Issuances
- **Issue**: Previous batch endpoints automatically created placeholder student accounts with dummy passwords (`passwordHash: 'placeholder-needs-reset'`).
- **Impact**: Security vulnerability and dirty database state.
- **Resolution**: Refactored `batchIssue` to validate student registration upfront; unregistered recipients or unapproved evidence are tracked in a structured `failures` array while valid credentials in the batch proceed without interruption.

### E. Missing Stable Automation Selectors
- **Issue**: Frontend JSX components relied on complex Tailwind CSS class names without stable test identifiers (`data-testid`).
- **Impact**: Browser automation frameworks (Playwright/Selenium) were prone to brittle element locator failures.
- **Resolution**: Add explicit `data-testid` attributes to all forms, inputs, buttons, status indicators, and modal triggers.

---

## 4. Security & Consistency Audit Matrix

| Security Domain | Vulnerability Risk | Implemented Safeguard | Verification Status |
| :--- | :--- | :--- | :--- |
| **ECDSA Signatures** | Signature Malleability (High-$s$) | Enforce canonical $s \le \text{secp256k1n}/2$ in smart contract | PASS (Hardhat test 14) |
| **Relayed Nonces** | Nonce Replay / Collision | On-chain mapping `nonces[issuer]++` + live read before signing | PASS (Hardhat test 9 & API test 23) |
| **Signing Secrets** | Plaintext Key Exposure | AES-256-GCM encryption with master secret; decrypted only in RAM | PASS (API test 19) |
| **File Uploads** | Malicious Extension Cloaking | Magic-bytes buffer inspection (rejects disguised executables) | PASS (API test 12) |
| **Authorization** | IDOR on Notifications/Evidence | Ownership verification on `userId` and `institutionProfile` | PASS (API test 12 & 21) |
| **Token Security** | Refresh Token Theft | Family invalidation on reuse; 15-minute access token lifespan | PASS (API test 4) |

---

## 5. Next Steps for Complete System Integration

1. Integrate `apiClient` with automatic JWT Bearer token headers into `frontend/src/services/authService.js`, `credentialService.js`, and `issuerService.js`.
2. Annotate frontend pages with `data-testid` test selectors across Student, Issuer, Employer, Admin, and Public views.
3. Build the complete Python Playwright & Pytest automation testing suite in `automation/`.
4. Validate full end-to-end workflows from browser login through evidence upload, institutional review, blockchain registration, and public verification.
