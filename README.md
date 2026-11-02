# CertiTrust: Decentralized Skill Evidence & Credential Validation Platform

> **Final-Year Engineering Project**  
> Responsive Web Application for Cryptographic Credential Management & Multi-Factor Verification.  
> Implemented strictly in **JavaScript (React JSX)** without TypeScript.

---

## 1. Project Overview & Value Proposition

CertiTrust solves the fragmentation, fraud vulnerability, and manual verification friction of modern skill credentials. Students can organize their degree transcripts, workshop certificates, and project evidence into one verifiable portfolio. 

### Critical Academic Distinction
CertiTrust explicitly distinguishes between:
1. **File Integrity (Cryptographic Hash Match):** Proves that the bytes of a submitted certificate document match the exact bytes anchored to the registry via SHA-256.
2. **Issuer Authenticity (Accreditation Trust):** Independently evaluates whether the issuing body is recognized, vetted, pending, or suspended.
3. **Skill Proficiency (Evidence-Backed vs. Self-Reported):** Clearly separates skills proven by on-chain proofs from candidate declarations.
4. **Lifecycle Validity (Active / Expired / Revoked):** Even if a document's SHA-256 hash matches, a revoked or expired credential is immediately flagged.

---

## 2. Technology Stack

- **UI Framework:** React.js 18 (ES6+ JavaScript, JSX)
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS (Navy / Indigo SaaS Design System)
- **Icons:** Lucide React
- **Charts:** Recharts
- **Notifications:** React Hot Toast
- **QR Engine:** `qrcode.react` (Level H error correction, PNG download, Web Share API)
- **Cryptography:** Native **Web Crypto API** (`crypto.subtle.digest('SHA-256', ...)`)
- **State & Storage:** React Context (`AuthContext`, `AppContext`) + persistent `localStorage`

---

## 3. Pre-configured Demo Accounts (1-Click Login)

For demonstration and academic defense, CertiTrust provides pre-seeded accounts across all four system roles:

| Role | Email | Password | Primary Capabilities |
|---|---|---|---|
| **Student** | `student@example.com` | `student123` | Upload evidence, compute SHA-256, portfolio, QR codes, AI assistant |
| **Recruiter** | `recruiter@example.com` | `recruiter123` | Validate credentials, file re-hash comparison, candidate search, shortlists |
| **Issuer** | `issuer@example.com` | `issuer123` | Organization charter, issue credentials, review student claims, revoke |
| **Admin** | `admin@example.com` | `admin123` | Issuer approvals, credential moderation, blockchain explorer, audit trail |

*Note: You can switch roles in one click from the persistent top banner in Demo Mode.*

---

## 4. Key Functional Modules & Routes

### Public Website
- `/` — Interactive landing page with problem statement, how it works, and stakeholder benefits.
- `/about` — Technical project blueprint, privacy architecture, and zero-PII ledger guarantee.
- `/verify/:credentialId` — Public multi-factor verification screen with optional drag-and-drop file re-hash.
- `/portfolio/:studentId` — Public verifiable candidate portfolio.

### Student Portal (`/student/*`)
- `/student/dashboard` — Metric cards, skill distribution chart, recent verifications.
- `/student/credentials` — Searchable and filterable credentials table.
- `/student/credentials/:id` — Full details, SHA-256 hex digest, and simulated block explorer.
- `/student/upload` — Drag-and-drop file upload, Web Crypto SHA-256 hashing, optional AI extraction suggestions.
- `/student/portfolio` — Evidence-backed vs. self-reported skill portfolio.
- `/student/shared` — Public/private visibility controls and QR code sharing.
- `/student/history` — Verifier access logs.
- `/student/ai-assistant` — Job description skill gap analyzer & portfolio bio generator.

### Recruiter Portal (`/recruiter/*`)
- `/recruiter/dashboard` — Recruiter metrics and recent candidate checks.
- `/recruiter/verify` — QR string and credential ID validator with live file byte comparison.
- `/recruiter/candidates` — Search candidates by skills and evidence status.
- `/recruiter/saved` — Private candidate shortlist.
- `/recruiter/history` — Recruiter audit log.

### Issuer Portal (`/issuer/*`)
- `/issuer/dashboard` — Accreditation status, issued proofs, and claim counts.
- `/issuer/profile` — Institutional charter and accreditation details.
- `/issuer/credentials` — Issued certificates with auditable revocation actions.
- `/issuer/requests` — Student claim approvals and rejections.
- `/issuer/issue` — Direct credential issuance and SHA-256 proof anchoring.

### Admin Portal (`/admin/*`)
- `/admin/dashboard` — System metrics and health indicators.
- `/admin/users` — Role management and account suspension.
- `/admin/issuers` — Institutional accreditation reviews (Approve, Reject, Suspend).
- `/admin/credentials` — Credential moderation with reason recording.
- `/admin/blockchain` — Simulated Sepolia smart contract proof explorer.
- `/admin/logs` — Platform-wide verification event feed.
- `/admin/reports` — Export credentials and audit logs to CSV.
- `/admin/audit` — Immutable administrator action audit trail.

---

## 5. Getting Started

### Prerequisites
- Node.js (v18+ recommended; tested on Node v24)
- npm (v9+ recommended)

### Installation & Execution
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start development server
npm run dev
# The application starts on http://localhost:3000

# 4. Production build & preview
npm run build
npm run preview
```

---

## 6. Security & Privacy Guarantees

1. **Zero Personally Identifiable Information (PII) on Ledger:** Proof transactions register only the Credential ID, SHA-256 digest, issuer identifier, and block timestamp.
2. **Client-Side SHA-256 Computation:** Hashes are generated inside the user's browser using the native Web Crypto API directly from binary file bytes.
3. **Assistive AI Boundary:** AI feature outputs are strictly classified as editable suggestions and require explicit human review and confirmation before submission.
