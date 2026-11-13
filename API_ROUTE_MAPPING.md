# CertiTrust API Route Mapping Report

**Decentralized Skill Evidence and Credential Validation Platform**  
**Audit & Integration Mapping Document**

---

## 1. Authentication Routes

| Frontend API Call | Backend Route | HTTP Method | Auth Required | Description & Status |
| :--- | :--- | :--- | :--- | :--- |
| `apiClient.post('/auth/login', ...)` | `/api/v1/auth/login` | `POST` | Public | Multi-role user authentication with JWT & rotating refresh token. **Integrated** |
| `apiClient.post('/auth/register', ...)` | `/api/v1/auth/register` | `POST` | Public | Student, Institution, or Employer registration. **Integrated** |
| `apiClient.post('/auth/refresh-token', ...)` | `/api/v1/auth/refresh-token` | `POST` | Public (Token) | Atomic refresh token rotation with replay attack detection. **Integrated** |
| `apiClient.post('/auth/logout', ...)` | `/api/v1/auth/logout` | `POST` | Authenticated | Clears user session tokens. **Integrated** |
| `apiClient.post('/auth/forgot-password', ...)`| `/api/v1/auth/forgot-password`| `POST` | Public | Generates cryptographic password reset token. **Integrated** |
| `apiClient.post('/auth/reset-password', ...)` | `/api/v1/auth/reset-password` | `POST` | Public | Completes password reset with secure hash. **Integrated** |

---

## 2. Evidence Management Routes

| Frontend API Call | Backend Route | HTTP Method | Auth Required | Description & Status |
| :--- | :--- | :--- | :--- | :--- |
| `apiClient.upload('/evidence/upload', ...)` | `/api/v1/evidence/upload` | `POST` | Student | Uploads PDF/image evidence with magic-bytes & streaming SHA-256. **Integrated** |
| `apiClient.get('/evidence', ...)` | `/api/v1/evidence` | `GET` | Authenticated | Lists evidence records belonging to user or accessible to institution. **Integrated** |
| `apiClient.patch('/evidence/:id/review', ...)`| `/api/v1/evidence/:id/review` | `PATCH`| Institution/Admin | Reviews evidence (`APPROVED` or `REJECTED`) with audit comments. **Integrated** |
| `apiClient.get('/evidence/:id/download', ...)`| `/api/v1/evidence/:id/download`| `GET`| Owner/Reviewer | Securely downloads verified evidence file. **Integrated** |

---

## 3. Credential Lifecycle Routes

| Frontend API Call | Backend Route | HTTP Method | Auth Required | Description & Status |
| :--- | :--- | :--- | :--- | :--- |
| `apiClient.post('/credentials', ...)` | `/api/v1/credentials` | `POST` | Institution | Issues credential linked to approved evidence with ECDSA signature. **Integrated** |
| `apiClient.get('/credentials/:id', ...)` | `/api/v1/credentials/:id` | `GET` | Authenticated | Retrieves credential details by certificate number or ID. **Integrated** |
| `apiClient.post('/credentials/:id/revoke', ...)`| `/api/v1/credentials/:id/revoke`| `POST` | Issuer/Admin | Revokes credential with on-chain EIP-712 relay or owner transaction. **Integrated** |
| `apiClient.get('/credentials/qr/:id', ...)` | `/api/v1/credentials/qr/:id` | `GET` | Public | Returns high-error-correction QR code image and verify link. **Integrated** |
| `apiClient.post('/institutions/batch-issue', ...)`| `/api/v1/institutions/batch-issue`| `POST`| Institution | Merkle tree batch issuance with sequential EIP-712 nonces. **Integrated** |
| `apiClient.get('/students/credentials', ...)` | `/api/v1/students/credentials`| `GET` | Student | Retrieves student portfolio credentials. **Integrated** |
| `apiClient.get('/institutions/credentials', ...)`| `/api/v1/institutions/credentials`| `GET`| Institution | Retrieves institution issued credentials registry. **Integrated** |

---

## 4. Verification & Blockchain Routes

| Frontend API Call | Backend Route | HTTP Method | Auth Required | Description & Status |
| :--- | :--- | :--- | :--- | :--- |
| `apiClient.get('/verification/verify/:id')` | `/api/v1/verification/verify/:id` | `GET` | Public | 6-point cryptographic and on-chain verification audit. **Integrated** |
| `apiClient.post('/verification/verify-document')`| `/api/v1/verification/verify-document`| `POST`| Public | Physical evidence file re-hash digest match comparison. **Integrated** |
| `apiClient.get('/blockchain/status')` | `/api/v1/blockchain/status` | `GET` | Public | Live EVM network, contract address, block number, relayer status. **Integrated** |
| `apiClient.get('/blockchain/verify/:id')` | `/api/v1/blockchain/verify/:id` | `GET` | Public | Distributed ledger proof verification check. **Integrated** |
| `apiClient.post('/blockchain/register-proof')`| `/api/v1/blockchain/register-proof`| `POST`| Institution/Admin | Relayed cryptographic anchor transaction submission. **Integrated** |

---

## 5. AI Assistance Routes

| Frontend API Call | Backend Route | HTTP Method | Auth Required | Description & Status |
| :--- | :--- | :--- | :--- | :--- |
| `apiClient.post('/ai/extract-skills', ...)` | `/api/v1/ai/extract-skills` | `POST` | Authenticated | Groq Llama-3 AI skill extraction from certificate text. **Integrated** |
| `apiClient.post('/ai/gap-analysis', ...)` | `/api/v1/ai/gap-analysis` | `POST` | Authenticated | Compares candidate skills against job description. **Integrated** |
| `apiClient.post('/ai/chat', ...)` | `/api/v1/ai/chat` | `POST` | Authenticated | Conversational AI skill advisory and verification guidance. **Integrated** |

---

## 6. Administrative & Notification Routes

| Frontend API Call | Backend Route | HTTP Method | Auth Required | Description & Status |
| :--- | :--- | :--- | :--- | :--- |
| `apiClient.get('/admin/dashboard', ...)` | `/api/v1/admin/dashboard` | `GET` | Admin | System health, user counts, and ledger audit metrics. **Integrated** |
| `apiClient.get('/notifications', ...)` | `/api/v1/notifications` | `GET` | Authenticated | User notifications with strict IDOR isolation. **Integrated** |
| `apiClient.get('/notifications/unread-count')` | `/api/v1/notifications/unread-count`| `GET`| Authenticated | Unread count badge value. **Integrated** |
| `apiClient.patch('/notifications/:id/read')` | `/api/v1/notifications/:id/read` | `PATCH`| Authenticated | Marks notification read (scoped strictly to user ID). **Integrated** |
