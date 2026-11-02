# Project Details & Complete Development Blueprint
## Decentralized Skill Evidence and Credential Validation Platform

**Document purpose:** This file is the single source of truth for building the project phase by phase in Google Antigravity or another AI coding environment. The development agent must read this document before making changes and follow the requirements, milestones, acceptance criteria, and constraints.

**Project type:** Final-year engineering project  
**Application type:** Responsive web application  
**Primary domain:** Blockchain / Education Technology (EdTech)  
**Main users:** Students, trusted issuers, recruiters, administrators  
**Implementation language for frontend:** JavaScript only (React JSX; no TypeScript)

---

# 1. Project overview

The Decentralized Skill Evidence and Credential Validation Platform is a digital platform through which students can organize evidence of their skills, receive or upload credentials, share selected credentials, and allow recruiters or other authorized verifiers to check credential records.

Today, evidence of skills is scattered across PDF certificates, workshop records, internship letters, course platforms, project portfolios, and institutional portals. Recruiters may need to contact different organizations or manually inspect documents. A document can also be modified after it is issued.

The proposed platform brings skill evidence into one portfolio and uses cryptographic hashes and blockchain-backed records to make later changes detectable. A QR code or credential link gives a verifier a convenient way to open the credential's verification page.

**Important distinction:** A hash match proves that a checked file matches the file represented by the originally registered hash. It does not, by itself, prove that the issuer is genuine or that the student has the claimed skill. Issuer trust and skill assessment are separate checks and must be represented separately in the user interface.

## 1.1 One-line explanation

A platform that helps students manage and share skill evidence while enabling recruiters to check credential integrity and issuer status through a simple digital verification process.

## 1.2 Project problem statement

Students store certificates and skill evidence across different platforms and files. Recruiters and institutions often rely on manual or disconnected verification processes. This can be slow, difficult to manage, and vulnerable to document alteration or untrusted claims. The project aims to provide a unified skill evidence portfolio and a verifiable credential record using cryptographic hashing, QR-based access, trusted issuer information, and blockchain-backed proof records.

## 1.3 Main objectives

1. Provide a unified digital portfolio for skills and credentials.
2. Allow students to upload and organize evidence files.
3. Generate a SHA-256 digest from the exact uploaded file bytes.
4. Register credential proof records on a blockchain or clearly labelled development ledger.
5. Generate unique credential IDs and QR verification links.
6. Allow recruiters to verify a credential without creating a student account.
7. Distinguish file-integrity status from issuer-authenticity status.
8. Allow trusted issuers and administrators to manage issuer trust.
9. Maintain verification history and audit events.
10. Provide optional AI assistance for skill extraction, categorization, summaries, and job-skill matching, with human review.

## 1.4 Scope and implementation approach

Build the complete user experience in phases. The application must remain usable during development.

- **Frontend requirement:** React.js with JavaScript and JSX only. No TypeScript files or TypeScript syntax.
- **Recommended final architecture:** React frontend + JavaScript backend + database + file storage + blockchain integration + optional AI service.
- **Development strategy:** Start with a complete frontend using realistic mock data and LocalStorage. Then replace mock services with real backend integrations in later phases.
- **Never describe mock data, LocalStorage, or simulated transactions as real blockchain or production security.**
- Keep service interfaces consistent so that mock services can later be replaced by API services without rebuilding the UI.

If the project must be submitted as frontend-only, complete Phases 1–7 and use clearly labelled simulations for blockchain and AI. If full-stack implementation is permitted, continue with the integration phases.

---

# 2. Users and role permissions

## 2.1 Student

Can:
- Register and sign in.
- Maintain profile and academic details.
- Upload certificate or skill evidence files.
- Add skills and link evidence to skills.
- View credential details, hash, issuer information, and registration status.
- Generate and download QR codes.
- Share a credential using a public verification link.
- Choose whether a credential or portfolio is public or private.
- View verification activity for their credentials.
- Request issuer validation if the issuer is not yet trusted.
- Use AI-assisted extraction and skill categorization, then review and confirm suggestions.

Cannot:
- Approve their own issuer.
- Edit an already registered file while keeping the old hash.
- Change blockchain transaction information.
- See another student's private credentials.

## 2.2 Trusted issuer

Examples: college, university, training provider, certification organization, internship provider.

Can:
- Register an organization profile.
- Submit evidence of organization identity for admin review.
- View credentials issued by that organization, subject to permissions.
- Issue or attest to credentials for a student if this feature is enabled.
- Confirm or reject credential claims assigned to the issuer.
- Revoke or supersede a credential under an auditable process.
- View issuer activity.

Cannot:
- Approve its own trusted status.
- Change historical verification events.
- Alter the content of a previously issued credential without creating a new version.

## 2.3 Recruiter / verifier

Can:
- Search public candidate profiles.
- Open a shared credential link or scan its QR code.
- Enter a credential ID manually.
- Check file integrity status, issuer status, expiry, and revocation status.
- View only the information the student has shared.
- Save candidates to a private shortlist.
- View their own verification history.

Cannot:
- Access private student documents without permission.
- Edit or revoke credentials.
- View private student profile fields.

## 2.4 Administrator

Can:
- View platform metrics.
- Manage student and recruiter accounts.
- Review issuer applications.
- Approve, reject, suspend, or reinstate issuers.
- View credentials and verification records.
- Revoke or flag credentials under a reasoned, auditable workflow.
- Review audit logs and reports.
- Manage categories and platform settings.

Admin actions must be recorded in an audit log.

---

# 3. Technology stack

The following stack is recommended. Keep the frontend JavaScript-only.

## 3.1 Frontend

| Technology | Purpose | Required? |
|---|---|---|
| React.js | Component-based user interface | Yes |
| JavaScript (ES6+) | Application language | Yes |
| JSX | React component markup | Yes |
| Vite | Development server and build tool | Yes |
| React Router DOM | Page routing | Yes |
| Tailwind CSS | Responsive styling | Recommended |
| Lucide React | Icons | Recommended |
| Recharts | Dashboard charts | Recommended |
| React Hot Toast | Toast notifications | Recommended |
| React Hook Form | Form state and validation | Optional |
| Zod | Schema validation in JavaScript | Optional |
| qrcode.react | QR code generation | Yes |
| html5-qrcode | Browser QR scanning | Optional |
| date-fns | Date formatting | Optional |

**Rules:** Use `.jsx` for React components and `.js` for utilities/services. Do not create `.ts`, `.tsx`, `interface`, `type`, or TypeScript generics.

## 3.2 Backend (for full-stack phase)

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API |
| MongoDB | Users, credential metadata, issuer profiles, logs |
| Mongoose | MongoDB object modelling |
| JWT or secure session cookies | Authentication |
| bcrypt | Password hashing |
| Multer | Upload handling |
| Zod or express-validator | Request validation |
| Helmet | HTTP security headers |
| CORS | Controlled frontend/backend access |
| Rate limiting | Protect sensitive endpoints |

Use secure, HTTP-only cookies for production authentication where practical. Do not store production authentication tokens or secrets in LocalStorage.

## 3.3 File storage

Choose one storage approach:

- **Development:** Local file storage outside the public web root.
- **Cloud option:** Supabase Storage, Cloudinary (for suitable files), or AWS S3-compatible object storage.
- **Decentralized option:** IPFS through a pinning provider.

Do not put private certificate files directly on a public IPFS gateway without an explicit privacy design. IPFS content can be publicly retrievable if the content identifier is known. For private evidence, use encrypted storage and controlled access. Store only the file hash and limited metadata on-chain, not the certificate PDF or personal information.

## 3.4 Blockchain

Recommended options:

- Solidity smart contracts.
- Hardhat for local development, compilation, tests, and deployment.
- OpenZeppelin contracts for established access-control and security patterns.
- Ethers.js for JavaScript frontend/backend blockchain interaction.
- Local Hardhat network for development.
- A test network such as Polygon Amoy or Ethereum Sepolia if a public testnet demonstration is required and currently supported.

Store only the minimum proof data on-chain:
- Credential ID or a non-identifying reference.
- File digest.
- Issuer reference or issuer wallet address, where appropriate.
- Creation timestamp.
- Status/revocation indicator or event.
- Contract event / transaction reference.

Never store:
- PDF or image files.
- Student email, phone number, address, or other personal data.
- Passwords.
- Private documents or confidential metadata.

The blockchain layer must be optional in local development. Provide a mock adapter for frontend demonstrations and a real adapter for a deployed contract.

## 3.5 AI integration

AI is an enhancement, not the authority that decides whether a credential is authentic.

Recommended provider options:
- Google Gemini API.
- OpenAI API.
- A locally hosted model if infrastructure permits.

Use one provider initially. Keep the provider behind a backend service. **Never place an AI API key in React code, browser environment variables, or a public repository.**

Potential AI features:
1. **Certificate information extraction:** Suggest certificate title, issuer, issue date, expiry date, and skill names from an uploaded document.
2. **Skill categorization:** Suggest categories such as Programming, Web Development, Data Science, AI/ML, Cybersecurity, Cloud, Communication, and Leadership.
3. **Portfolio summary:** Draft a short summary of a student's verified and unverified evidence, clearly labelling the source of each fact.
4. **Skill gap analysis:** Compare a student's selected skills with a job description and show missing or weakly evidenced skills.
5. **Job description matching:** Extract required skills from a job description and compare them with student portfolio skills and supporting credentials.
6. **Credential duplicate warning:** Suggest possible duplicates based on metadata and file hashes. Do not make a final fraud decision.
7. **Natural-language portfolio search:** Let a recruiter search public profiles using skill-related phrases, subject to privacy permissions.

AI requirements:
- AI output must be shown as a suggestion.
- Student or authorized user must review and confirm extracted information.
- Never let AI approve an issuer or certify authenticity.
- Never infer a skill as proven solely because an AI model sees it in a document.
- Do not send private documents to an AI provider without clear consent and an appropriate privacy notice.
- Minimize personal information sent to the provider.
- Log AI feature usage without storing unnecessary sensitive document contents.
- Provide graceful fallback when the AI provider is unavailable.
- In frontend-only mode, use mock AI responses and label them “AI demo” or “sample suggestion.”

## 3.6 Development and testing tools

| Tool | Use |
|---|---|
| Visual Studio Code | Code editor |
| Google Antigravity | AI-assisted project implementation |
| Git and GitHub | Version control and backup |
| Node.js and npm | Install and run JavaScript project |
| Postman or Bruno | API testing |
| MongoDB Compass | Inspect MongoDB data |
| MetaMask | Connect a wallet for testnet demo, if needed |
| Hardhat | Smart contract development |
| Chrome DevTools | Responsive and browser debugging |
| Figma (optional) | UI planning |
| Lighthouse | Performance and accessibility checks |

---

# 4. Main application modules

## 4.1 Public website

Pages:
- Landing page.
- About project.
- Features.
- How it works.
- Public credential verification.
- Public student portfolio.
- Login.
- Registration.
- Forgot password demo.

Landing page sections:
- Hero headline: “Your Skills. Your Proof. Your Future.”
- Short explanation.
- Get Started and Verify Credential actions.
- How it works.
- Platform features.
- Benefits for students and recruiters.
- Trust and privacy explanation.
- FAQ.
- Footer.

## 4.2 Authentication

- Role-aware login.
- Student registration.
- Recruiter registration.
- Issuer application / registration.
- Forgot password flow.
- Password visibility toggle.
- Validation and error states.
- Logout.
- Protected routes.
- Session expiry handling.

For frontend demo accounts:
- student@example.com / student123
- recruiter@example.com / recruiter123
- admin@example.com / admin123
- issuer@example.com / issuer123 (optional demo account)

These are demo credentials only. Production must use backend authentication.

## 4.3 Student dashboard

Navigation:
- Overview.
- My Credentials.
- Upload Evidence.
- Skill Portfolio.
- Shared Credentials.
- Verification History.
- AI Skill Assistant.
- Notifications.
- Profile.
- Settings.

Dashboard widgets:
- Total credentials.
- Verified credentials.
- Pending issuer review.
- Revoked / expired credentials.
- Skills count.
- Recent uploads.
- Recent verification events.
- Skill category chart.
- Quick actions.

## 4.4 Credential upload and registration

Upload fields:
- Credential title.
- Skill name.
- Category.
- Issuer.
- Issue date.
- Expiry date (optional).
- Description.
- Evidence file (PDF/JPG/PNG).
- Visibility setting.
- Issuer verification status.

Workflow:
1. Select a file.
2. Validate file type and size.
3. Enter metadata.
4. Preview the file.
5. Calculate SHA-256 from exact file bytes using Web Crypto API.
6. Display the hash.
7. Save draft or submit.
8. If an issuer is trusted, associate the issuer record.
9. Register a proof record through the blockchain adapter (mock or real).
10. Generate credential ID.
11. Generate QR verification URL.
12. Show confirmation and next actions.

Important:
- Hash the actual bytes; do not use a random hash.
- A changed file must produce a different digest.
- Editing metadata must not silently change the original evidence digest.
- If the evidence file is replaced, calculate a new hash and create a new credential version or registration record.
- Handle large files and storage limits.
- Clearly show whether registration is a mock or real blockchain operation.

## 4.5 Credential management

Credential list:
- Credential ID.
- Title.
- Skill category.
- Issuer.
- Issue date.
- Upload date.
- Integrity status.
- Issuer status.
- Expiry status.
- Visibility.
- Actions.

Actions:
- View.
- Edit permitted metadata.
- Download if authorized.
- Generate QR.
- Copy verification link.
- Share.
- Recheck integrity.
- Request issuer validation.
- Revoke / report through authorized process.

Filters:
- Search.
- Category.
- Issuer.
- Integrity status.
- Issuer trust status.
- Expired / active.
- Date range.

## 4.6 Skill portfolio

- Student profile and bio.
- College and department.
- Skill groups.
- Proficiency level selected by student.
- Evidence linked to each skill.
- Verified and unverified labels.
- Public/private visibility controls.
- Shareable portfolio URL.
- Downloadable portfolio summary (optional).

Do not imply that a student-selected proficiency level is independently verified. Clearly distinguish “self-reported” from “evidence-backed.”

## 4.7 QR code and sharing

- Create unique credential ID.
- Encode public verification URL in QR.
- Preview QR.
- Download QR as PNG.
- Copy link.
- Use Web Share API if available.
- Provide fallback copy link.
- Respect visibility and consent.
- Do not put personal data directly inside the QR payload.

## 4.8 Public verification

Verification page should show separate checks:

**A. Credential record**
- Credential found / not found.
- Credential ID.
- Registration timestamp.
- Current status.

**B. File integrity**
- Hash matches.
- Hash mismatch.
- Original file unavailable, so integrity could not be checked.

**C. Issuer status**
- Trusted issuer.
- Pending issuer review.
- Untrusted / unknown issuer.
- Suspended issuer.

**D. Credential status**
- Active.
- Expired.
- Revoked.
- Superseded.

Use an overall result carefully. Example:
- “Record found; file integrity matched; issuer trusted; credential active.”
- “Record found; file integrity could not be checked because the original file was unavailable.”
- “Hash mismatch: the checked file differs from the registered file.”

Never show a simple “Genuine” badge based only on hash matching.

## 4.9 Recruiter module

Navigation:
- Overview.
- Verify Credential.
- Candidate Search.
- Saved Candidates.
- Verification History.
- Profile.
- Settings.

Features:
- QR scan.
- Manual credential ID entry.
- Public link verification.
- Candidate search by skills.
- Filters by skill, department, college, and evidence status.
- View public portfolio.
- Save candidate.
- Verification history.
- Export permitted report.

## 4.10 Issuer module

Navigation:
- Issuer Dashboard.
- Organization Profile.
- Issued Credentials.
- Requests for Validation.
- Issue Credential.
- Revoke / Supersede.
- Activity History.
- Settings.

Features:
- Organization details.
- Trust application status.
- Upload organization proof for admin review.
- Verify student credential claims.
- Issue a credential directly (if enabled).
- Revoke or supersede with reason.
- Maintain auditable history.

## 4.11 Admin module

Navigation:
- Overview.
- Students.
- Recruiters.
- Issuers.
- Credentials.
- Verification Logs.
- Blockchain Records.
- AI Usage / Settings (if enabled).
- Reports.
- Audit Logs.
- Settings.

Features:
- Role and account management.
- Issuer approval workflow.
- Credential moderation.
- Revoke / flag with reason.
- Review suspicious activity.
- Audit logs.
- CSV reports.
- Dashboard analytics.

---

# 5. Data model and records

Use these logical entities. Exact database schema can be refined during backend development.

## 5.1 User

- id
- fullName
- email
- passwordHash (backend only)
- role: student / recruiter / issuer / admin
- profileImage
- college
- department
- bio
- accountStatus
- createdAt
- updatedAt

## 5.2 Credential

- id
- credentialId
- ownerUserId
- title
- skillName
- category
- description
- issuerId
- issueDate
- expiryDate
- fileName
- mimeType
- fileSize
- fileStorageKey
- fileHashAlgorithm: SHA-256
- fileHash
- integrityStatus
- issuerStatus
- credentialStatus
- visibility
- version
- createdAt
- updatedAt

## 5.3 Issuer

- id
- organizationName
- organizationType
- email
- website
- description
- proofDocumentStorageKey
- trustStatus
- reviewedBy
- reviewedAt
- reviewReason
- createdAt

## 5.4 BlockchainProof

- id
- credentialId
- network
- chainId
- contractAddress
- transactionHash
- blockNumber
- registeredDigest
- registrationStatus
- registeredAt
- isMock

## 5.5 VerificationLog

- id
- credentialId
- verifierUserId (nullable for public verification)
- verificationMethod: QR / manual / link
- recordFound
- hashStatus
- issuerStatus
- credentialStatus
- result
- createdAt

## 5.6 Skill

- id
- ownerUserId
- name
- category
- proficiency
- evidenceCredentialIds
- visibility
- isSelfReported
- createdAt

## 5.7 Notification

- id
- recipientUserId
- type
- title
- message
- readAt
- createdAt

## 5.8 AuditLog

- id
- actorUserId
- action
- entityType
- entityId
- reason
- metadata (avoid sensitive data)
- createdAt

## 5.9 AIAnalysis

- id
- ownerUserId
- credentialId (optional)
- analysisType
- suggestedFields
- confidence (only if provided meaningfully by provider)
- userConfirmed
- createdAt

---

# 6. AI feature specifications

Implement AI only after core credential and verification workflows are stable.

## 6.1 AI certificate data extraction

Input:
- User-selected certificate file.
- User consent.
- File content supplied to a protected backend AI/OCR workflow.

Suggested output:
- Suggested certificate title.
- Suggested issuer.
- Suggested issue date.
- Suggested expiry date.
- Suggested skills.
- Short description.

UI:
- “Extract details with AI” button.
- Loading state.
- Suggested values shown in editable form fields.
- Source/uncertainty notice.
- Confirm and edit button.
- Discard suggestions button.

Acceptance:
- AI never auto-submits a credential.
- User must confirm extracted fields.
- Failed AI request returns a useful error and manual entry remains available.

## 6.2 AI skill categorization

Input: student-confirmed credential title, description, and extracted skills.

Output: suggested skill names and categories.

Acceptance:
- Suggestions are editable.
- Do not add a skill to a public portfolio without user approval.

## 6.3 AI skill gap analysis

Input:
- Student's selected or public portfolio skills.
- Job description text supplied by recruiter or student.

Output:
- Required skills extracted from job description.
- Matching evidence-backed skills.
- Matching self-reported skills.
- Missing or weakly evidenced skills.
- Suggested learning areas.

Acceptance:
- Show matching explanation.
- Do not rank or reject a candidate automatically.
- Do not treat an AI match as proof of competence.

## 6.4 AI portfolio summary

Generate a short professional summary based only on confirmed profile and credential data.

Acceptance:
- User can edit before saving.
- Do not invent qualifications, dates, grades, employers, or achievements.

## 6.5 AI privacy and security

- Backend-only API key.
- Explicit consent before document processing.
- Data minimization.
- No sensitive document content in normal application logs.
- Clear retention policy.
- AI output labelled as generated suggestions.
- Manual workflow remains available if AI is disabled.

---

# 7. Frontend-only mode requirements

The first deliverable should work without a backend.

Use:
- React state and Context.
- LocalStorage for demo accounts and metadata.
- IndexedDB or carefully bounded browser storage for demo file persistence if needed.
- Web Crypto API for actual SHA-256 calculation.
- qrcode.react for QR display.
- html5-qrcode for scanning when browser permissions allow.
- Mock blockchain adapter.
- Mock AI adapter.
- Mock issuer review and notification services.

Create a clear “Demo Mode” indicator in the application.

Demo mode must:
- Use seeded sample data.
- Support CRUD operations.
- Persist demo state after refresh.
- Provide a reset-demo-data action.
- Clearly label simulated blockchain and AI results.
- Never claim to provide production security.

Suggested demo users:
- student@example.com / student123
- recruiter@example.com / recruiter123
- issuer@example.com / issuer123
- admin@example.com / admin123

---

# 8. Suggested frontend folder structure

```text
src/
  assets/
  components/
    common/
    layout/
    dashboard/
    charts/
    forms/
    modals/
    tables/
    credentials/
    verification/
    ai/
  pages/
    public/
    auth/
    student/
    recruiter/
    issuer/
    admin/
  context/
    AuthContext.jsx
    AppContext.jsx
  hooks/
  services/
    authService.js
    credentialService.js
    userService.js
    issuerService.js
    verificationService.js
    notificationService.js
    storageService.js
    blockchainService.js
    aiService.js
  adapters/
    blockchain/
      mockBlockchainAdapter.js
      realBlockchainAdapter.js
    ai/
      mockAIAdapter.js
      apiAIAdapter.js
  utils/
    hashUtils.js
    qrUtils.js
    validationUtils.js
    formatUtils.js
  data/
    mockUsers.js
    mockCredentials.js
    mockIssuers.js
    mockNotifications.js
  routes/
    AppRoutes.jsx
    ProtectedRoute.jsx
  App.jsx
  main.jsx
  index.css
```

Backend (if implemented):

```text
server/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
      ai/
      blockchain/
      storage/
    utils/
    app.js
    server.js
```

Smart contracts (if implemented):

```text
contracts/
  CredentialRegistry.sol
scripts/
test/
hardhat.config.js
```

---

# 9. Complete phase-by-phase task plan

The coding agent must finish each phase, run checks, and report completion before moving to the next phase. Do not skip phases. Do not replace working features with placeholders.

## Phase 0 — Project setup and planning

Tasks:
- Inspect the existing project directory before creating files.
- Preserve useful existing work.
- Create React + Vite JavaScript project if no project exists.
- Configure Tailwind CSS.
- Install dependencies.
- Set up ESLint if useful.
- Create folder structure.
- Create README and `.env.example` if integrations are planned.
- Add a global design system: colors, typography, spacing, buttons, inputs, cards, badges, modals.
- Confirm `npm run dev` works.

Acceptance:
- App starts without errors.
- No TypeScript files.
- Responsive base layout exists.

## Phase 1 — Public website and authentication

Tasks:
- Landing page.
- About page.
- Login.
- Student registration.
- Recruiter registration.
- Issuer registration/application.
- Forgot password demo.
- Demo account selector.
- Role-aware navigation.
- Protected routes.
- Logout.

Acceptance:
- Each demo role logs in and reaches the correct dashboard.
- Invalid credentials show useful errors.
- Refresh does not unexpectedly log out of demo mode.

## Phase 2 — Shared layout and design system

Tasks:
- Responsive sidebar.
- Top navigation.
- Profile menu.
- Notifications menu.
- Search component.
- Reusable cards, tables, forms, modals, badges.
- Loading, error, and empty states.
- Mobile navigation.

Acceptance:
- Layout is consistent across roles.
- No horizontal overflow at mobile width.
- All sidebar links navigate to real pages.

## Phase 3 — Student dashboard and profile

Tasks:
- Overview metrics.
- Recent credentials.
- Recent activity.
- Skill charts.
- Student profile.
- Settings.
- Notifications.
- Profile editing and persistence.

Acceptance:
- Metrics update from demo data.
- Profile edits persist after refresh.

## Phase 4 — Credential upload and hash generation

Tasks:
- Drag-and-drop upload.
- File type and size validation.
- Metadata form.
- File preview.
- Actual SHA-256 using Web Crypto API.
- Draft and submit states.
- Save metadata and bounded demo file data.
- Storage quota handling.
- Credential ID generation.
- Credential details page.

Acceptance:
- Same file bytes produce the same SHA-256 digest.
- A changed file produces a different digest.
- Upload errors are handled.
- No random hash is used to represent file integrity.

## Phase 5 — Credential management, portfolio, QR and sharing

Tasks:
- Credential list and details.
- Search, sort, filters, pagination.
- Edit metadata.
- Delete with confirmation.
- Skill portfolio.
- Link skills to credentials.
- Public/private visibility.
- QR generation and download.
- Copy/share verification link.
- Public portfolio page.

Acceptance:
- CRUD works and persists.
- QR contains the correct credential verification URL.
- Private items are not shown on public pages.

## Phase 6 — Recruiter and verification experience

Tasks:
- Recruiter dashboard.
- QR scanning.
- Manual credential ID lookup.
- Public verification page.
- File re-hash and comparison where original file is available.
- Separate issuer, integrity, expiry, and revocation results.
- Candidate search.
- Candidate profile.
- Saved candidates.
- Verification logs.

Acceptance:
- Correct file returns matching hash.
- Modified file returns mismatch.
- Missing original file returns “integrity not checked.”
- Revoked credential is never shown as active.
- Private student data is not exposed.

## Phase 7 — Admin and issuer management

Tasks:
- Admin dashboard.
- User management.
- Issuer application review.
- Approve/reject/suspend issuer.
- Credential administration.
- Revoke/restore demo record with reason.
- Blockchain record viewer.
- Audit logs.
- Reports and CSV export.

Acceptance:
- Role restrictions work.
- Issuer trust status affects verification display.
- Admin actions are recorded.
- Revocation is reflected throughout the UI.

## Phase 8 — Mock blockchain adapter

Tasks:
- Define a common blockchain adapter interface.
- Implement mock registration.
- Generate simulated transaction IDs and block references.
- Show demo transaction details.
- Support credential status events.
- Add prominent simulation labels.

Acceptance:
- Frontend can register and inspect demo proof records.
- No screen claims a real transaction occurred.
- UI is ready for a real adapter later.

## Phase 9 — Mock AI features

Tasks:
- Define an AI service interface.
- Implement sample certificate extraction results.
- Implement sample skill categorization.
- Implement job description skill matching.
- Implement portfolio summary suggestions.
- Add loading, error, empty, and review states.
- Add explicit “AI demo” label.

Acceptance:
- AI suggestions can be edited and discarded.
- User confirmation is required.
- Manual workflow works without AI.

## Phase 10 — Backend and database (full-stack option)

Tasks:
- Create Express backend in JavaScript.
- Connect MongoDB.
- Define models and indexes.
- Implement authentication and role middleware.
- Implement credential APIs.
- Implement issuer APIs.
- Implement file storage service.
- Implement verification APIs.
- Implement notification and audit APIs.
- Add validation, error handling, CORS, Helmet, and rate limiting.
- Replace mock services with API services using the same service interfaces.

Acceptance:
- Frontend uses real API data.
- Server validates all inputs.
- Private routes enforce role permissions.
- No secrets are committed.

## Phase 11 — Real blockchain integration (full-stack option)

Tasks:
- Write Solidity credential registry contract.
- Use access control for authorized issuers/admins.
- Register credential digest and minimal reference.
- Emit registration and revocation events.
- Write Hardhat tests.
- Deploy to local network first.
- Optionally deploy to a supported testnet.
- Integrate Ethers.js through the adapter.
- Show network, contract, and transaction details.

Acceptance:
- Contract tests pass.
- Registration event can be read.
- Revocation is reflected in verification.
- Only minimal non-personal proof data is stored on-chain.
- UI clearly identifies network and transaction status.

## Phase 12 — Real AI integration (full-stack option)

Tasks:
- Select one AI provider.
- Store provider key only on backend.
- Create backend AI endpoints.
- Add consent and privacy notice.
- Implement extraction, categorization, job matching, and summary.
- Validate model output on server.
- Add rate limits and error handling.
- Keep human confirmation.

Acceptance:
- No API key appears in browser bundle or network responses.
- AI failures do not block manual credential upload.
- AI output is labelled as a suggestion.
- User can edit and confirm all extracted fields.

## Phase 13 — Testing, security review and final polish

Tasks:
- Test all roles and routes.
- Test all forms and validation.
- Test upload limits and invalid files.
- Test hash generation and mismatch.
- Test QR generation and scan.
- Test private/public visibility.
- Test revocation.
- Test issuer trust states.
- Test AI failure fallback.
- Test responsive layouts.
- Run accessibility checks.
- Run production build.
- Fix console errors and broken navigation.
- Write user guide and project documentation.
- Prepare demo data and final presentation workflow.

Acceptance:
- `npm run build` succeeds.
- No critical console errors.
- All core acceptance scenarios pass.
- README explains setup, demo accounts, features, limitations, and integrations.

---

# 10. Route map

Public:
- `/`
- `/about`
- `/login`
- `/register`
- `/forgot-password`
- `/verify/:credentialId`
- `/portfolio/:studentId`

Student:
- `/student/dashboard`
- `/student/credentials`
- `/student/credentials/:id`
- `/student/upload`
- `/student/portfolio`
- `/student/shared`
- `/student/history`
- `/student/ai-assistant`
- `/student/notifications`
- `/student/profile`
- `/student/settings`

Recruiter:
- `/recruiter/dashboard`
- `/recruiter/verify`
- `/recruiter/candidates`
- `/recruiter/candidates/:id`
- `/recruiter/saved`
- `/recruiter/history`
- `/recruiter/profile`
- `/recruiter/settings`

Issuer:
- `/issuer/dashboard`
- `/issuer/profile`
- `/issuer/credentials`
- `/issuer/requests`
- `/issuer/issue`
- `/issuer/history`
- `/issuer/settings`

Admin:
- `/admin/dashboard`
- `/admin/users`
- `/admin/issuers`
- `/admin/credentials`
- `/admin/blockchain`
- `/admin/logs`
- `/admin/reports`
- `/admin/audit`
- `/admin/settings`

All protected routes must enforce role access.

---

# 11. Functional acceptance test scenarios

The agent must test these end-to-end scenarios.

## Scenario A — Student uploads a credential
1. Log in as student.
2. Open Upload Evidence.
3. Upload a sample PDF.
4. Enter certificate metadata.
5. Generate SHA-256.
6. Submit.
7. Confirm credential appears in My Credentials.
8. Refresh page and confirm metadata remains.

Expected: credential is saved and has a real file digest. Blockchain status is labelled mock unless a real network is connected.

## Scenario B — QR verification
1. Open a credential.
2. Generate QR.
3. Copy or scan QR.
4. Open public verification page.

Expected: correct credential details appear, subject to visibility settings.

## Scenario C — File integrity mismatch
1. Upload and register a sample file.
2. Use a different or modified file for re-check.
3. Compare the new digest with registered digest.

Expected: mismatch is shown. Original record is not silently overwritten.

## Scenario D — Issuer trust
1. Admin opens issuer applications.
2. Approves a demo issuer.
3. Verify a credential linked to that issuer.

Expected: issuer status changes to trusted. This is separate from hash status.

## Scenario E — Revocation
1. Admin or authorized issuer revokes a credential with a reason.
2. Open public verification page.

Expected: credential displays revoked, even if the hash still matches.

## Scenario F — AI suggestions
1. Student opens AI Assistant or upload page.
2. Requests extraction or skill suggestions.
3. Reviews suggestions.
4. Edits and confirms.

Expected: suggestions never become confirmed data without user approval. In mock mode, label them as demo output.

## Scenario G — Recruiter candidate search
1. Log in as recruiter.
2. Search for a skill.
3. Open a public candidate portfolio.
4. Verify a shared credential.
5. Save candidate.

Expected: only public information is shown and saved list persists in demo mode.

---

# 12. Security, privacy, and accuracy requirements

1. Never store production passwords in plain text.
2. Never expose API keys or private keys in frontend code.
3. Never store personal information on a public blockchain.
4. Do not publish private certificate files without consent.
5. Validate uploaded file type, size, and content on the backend in production.
6. Treat file extension and browser MIME type as insufficient proof of file safety.
7. Use secure authentication and authorization on the backend.
8. Rate-limit login, upload, verification, and AI endpoints.
9. Keep audit logs for sensitive admin and issuer actions.
10. Separate file integrity from issuer authenticity and skill proficiency.
11. Never allow AI to make final credential authenticity decisions.
12. Clearly label all frontend simulations.
13. Do not expose private candidate details to recruiters without permission.
14. Provide a process for credential correction, supersession, and revocation.
15. Avoid placing personal data in QR code contents or blockchain transactions.

---

# 13. UI and UX quality requirements

- Premium, consistent SaaS visual design.
- White / light neutral page backgrounds with deep navy navigation.
- Indigo or violet primary action color.
- Responsive sidebar and mobile navigation.
- Consistent typography and spacing.
- Clear labels for Verified, Pending, Mismatch, Expired, Revoked, Trusted Issuer, and Demo.
- Accessible contrast and keyboard focus.
- Useful empty states.
- Confirmation dialogs for destructive actions.
- Toasts for successful and failed actions.
- Loading indicators for async operations.
- No dead buttons.
- No blank pages.
- No horizontal overflow on mobile.
- Tables must have mobile-friendly behavior.
- All forms need validation and helpful errors.

---

# 14. Required documentation and final deliverables

The coding agent must maintain:

1. `README.md` — setup, commands, demo accounts, architecture, and features.
2. `PROJECT_DETAILS.md` — this project specification.
3. `.env.example` — variable names only, no real secrets.
4. `docs/ARCHITECTURE.md` — architecture and data flow.
5. `docs/API_SPECIFICATION.md` — backend endpoints if backend is built.
6. `docs/SMART_CONTRACT.md` — contract behavior if blockchain is built.
7. `docs/AI_INTEGRATION.md` — AI provider, privacy, endpoints, and limitations if AI is built.
8. `docs/TESTING.md` — test cases and results.
9. `docs/USER_GUIDE.md` — how student, recruiter, issuer, and admin use the app.

Final deliverables:
- Complete source code.
- Working local development setup.
- Responsive UI.
- Demo accounts and seed data.
- Working core workflows.
- Test results.
- Clear list of mock vs real integrations.
- Instructions for running and building the project.

---

# 15. Instructions to Google Antigravity / AI coding agent

Follow these instructions strictly:

1. Read this entire document before coding.
2. Inspect the current workspace and existing files first.
3. Do not overwrite existing work without checking it.
4. Use JavaScript and React JSX only. TypeScript is prohibited.
5. Work phase by phase in the order specified.
6. At the start of each phase, list the tasks you will complete.
7. Implement the phase completely, not just the visual design.
8. Run the application and relevant checks after each phase.
9. Fix errors before proceeding.
10. Keep reusable components and business logic separate.
11. Do not duplicate large blocks of code across pages.
12. Do not leave placeholder buttons or unfinished routes.
13. If an external integration is unavailable, create a clearly labelled adapter/mock implementation and document the limitation.
14. Never claim that mock blockchain, mock AI, or LocalStorage is production functionality.
15. Update README and relevant documentation as the project changes.
16. Maintain a checklist of completed, pending, and blocked tasks.
17. Do not stop after building the dashboard. Complete all required modules.
18. At the end of each phase, report files created/modified, features completed, commands run, test results, and remaining issues.
19. Continue to the next phase after the current phase passes its acceptance criteria, unless a decision or credential is genuinely required from the project owner.
20. Before final delivery, run a complete end-to-end review of every role and workflow.

## Definition of done

The project is complete only when:
- All required routes exist.
- Student, recruiter, issuer, and admin flows work.
- Credential upload and SHA-256 generation work.
- QR generation and verification work.
- Integrity, issuer, expiry, and revocation statuses are separate.
- Skill portfolio and privacy controls work.
- AI suggestions are reviewable and optional.
- Blockchain demo/real status is honestly represented.
- Data persistence works for the selected mode.
- Responsive layouts work.
- No critical errors remain.
- Documentation and setup instructions are complete.

**Start with Phase 0. Do not jump directly to Phase 8 or build only a landing page.**
