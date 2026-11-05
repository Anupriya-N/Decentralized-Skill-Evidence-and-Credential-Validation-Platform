import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from './app.js';
import { connectDatabase, prisma } from './config/database.js';
import {
  normalizeCredentialPayload,
  verifyCredentialSignature,
  verifyMerkleProof,
  buildMerkleTree,
} from './utils/crypto.js';
import { decryptPrivateKey } from './utils/encryption.js';
import { jobsService } from './services/jobs.service.js';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Starting CertiTrust Backend_05 Comprehensive Test Suite');
  console.log('================================================================');

  await connectDatabase();

  const server = http.createServer(app);
  const port = 5003;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Test server running at http://localhost:${port}\n`);

  let passed = 0;
  let failed = 0;

  async function request(path, options = {}) {
    const url = `http://localhost:${port}${path}`;
    const method = options.method || 'GET';
    const headers = options.isFormData
      ? (options.headers || {})
      : { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const body = options.isFormData
      ? options.body
      : (options.body ? JSON.stringify(options.body) : undefined);

    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = { raw: text };
    }
    return { status: res.status, data: json };
  }

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health Check with Multi-Subsystem Status
    console.log('--- 1. Subsystem Health Check ---');
    const health = await request('/health');
    assert(health.status === 200, 'GET /health returns 200');
    assert(health.data.subsystems?.database?.status === 'connected', 'Database reports connected');
    assert(Boolean(health.data.subsystems?.ai?.provider), 'AI reports provider');
    assert(Boolean(health.data.subsystems?.blockchain?.network), 'Blockchain reports network');

    // 2. Security: Admin Public Registration Prevention
    console.log('\n--- 2. Security: Role Provisioning ---');
    const adminReg = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { email: `hacker.${Date.now()}@test.com`, password: 'Password123!', name: 'Attacker', role: 'ADMIN' },
    });
    assert(adminReg.status === 403, 'Public registration attempting role ADMIN is blocked (403 Forbidden)');

    // 3. Authentication & Profile
    console.log('\n--- 3. Authentication & Profile ---');
    const studentLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'alex.chen@student.edu', password: 'Password123!' },
    });
    assert(studentLogin.status === 200, 'Student login succeeds');
    const studentToken = studentLogin.data.data?.accessToken;
    const refreshToken = studentLogin.data.data?.refreshToken;
    const alexChenUserId = studentLogin.data.data?.user?.id;
    assert(Boolean(studentToken), 'JWT access token received');

    // 4. Atomic Refresh Token Rotation
    console.log('\n--- 4. Atomic Refresh Token Rotation ---');
    const refreshRes = await request('/api/v1/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken },
    });
    assert(refreshRes.status === 200 && Boolean(refreshRes.data.data?.accessToken), 'Refresh token rotated atomically');
    const newRefreshToken = refreshRes.data.data?.refreshToken;

    // Reuse of old refresh token must be rejected
    const reuseAttempt = await request('/api/v1/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken },
    });
    assert(reuseAttempt.status === 401, 'Reused old refresh token is strictly rejected (401 Unauthorized)');

    // 5. Authorization: Student Cannot Access Admin
    console.log('\n--- 5. Authorization RBAC Checks ---');
    const studentAdminAttempt = await request('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAdminAttempt.status === 403, 'Student blocked from admin dashboard (403 Forbidden)');

    // 6. Admin Login & Dashboard
    const adminLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@certitrust.io', password: 'AdminSecure2026!' },
    });
    assert(adminLogin.status === 200, 'Admin login succeeds');
    const adminToken = adminLogin.data.data?.accessToken;

    const adminDash = await request('/api/v1/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDash.status === 200 && adminDash.data.data.users.total > 0, 'Admin dashboard accessible to ADMIN');

    // 7. Unapproved Institution Cannot Issue Credentials
    console.log('\n--- 7. Institutional Approval Workflow ---');
    const unapprovedEmail = `unapproved.inst.${Date.now()}@edu.com`;
    const regInst = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { email: unapprovedEmail, password: 'Password123!', name: 'Unverified Academy', role: 'INSTITUTION' },
    });
    assert(regInst.status === 201 && regInst.data.data.pendingApproval === true, 'New institution registered with pendingApproval=true');
    const unapprovedToken = regInst.data.data.accessToken;

    const issueAttempt = await request('/api/v1/credentials', {
      method: 'POST',
      headers: { Authorization: `Bearer ${unapprovedToken}` },
      body: { studentEmail: 'alex.chen@student.edu', title: 'Unauthorized Credential' },
    });
    assert(issueAttempt.status === 403, 'Unapproved institution blocked from issuing credentials (403 Forbidden)');

    // 8. Credentials Can Only Be Assigned to STUDENT Accounts
    console.log('\n--- 8. Credential Target Validation ---');
    const oxfordLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'oxford@institution.edu', password: 'Password123!' },
    });
    assert(oxfordLogin.status === 200, 'Oxford login succeeds');
    const oxfordToken = oxfordLogin.data.data?.accessToken;
    const oxfordUserId = oxfordLogin.data.data?.user?.id;
    const oxfordWalletAddress =
      oxfordLogin.data.data?.user?.walletAddress ||
      oxfordLogin.data.data?.user?.institutionProfile?.signingPublicKey;

    const nonStudentIssue = await request('/api/v1/credentials', {
      method: 'POST',
      headers: { Authorization: `Bearer ${oxfordToken}` },
      body: { studentEmail: 'recruiter@techcorp.com', title: 'Invalid Student Role Credential' },
    });
    assert(nonStudentIssue.status === 400, 'Issuing credential to non-STUDENT account rejected (400 Bad Request)');

    // 9. Accredited Institution Issues Credential with Genuine ECDSA Signature
    console.log('\n--- 9. Accredited Institution Issuance ---');
    const validIssue = await request('/api/v1/credentials', {
      method: 'POST',
      headers: { Authorization: `Bearer ${oxfordToken}` },
      body: {
        studentEmail: 'alex.chen@student.edu',
        title: 'Distributed Systems & Blockchain Capstone',
        type: 'DEGREE',
        badgeLevel: 'GOLD',
        grade: 'Distinction',
        courseCode: 'CS-901',
        skills: ['Solidity', 'Distributed Systems'],
      },
    });
    assert(validIssue.status === 201 && Boolean(validIssue.data.data?.digitalSignature), 'Accredited institution issues and cryptographically signs credential');
    const newCertNum = validIssue.data.data?.certificateNumber;

    // 10. 6-Point Cryptographic & Verification Audit
    console.log('\n--- 10. 6-Point Cryptographic Verification Audit ---');
    const verifyNew = await request(`/api/v1/verification/verify/${newCertNum}`);
    assert(verifyNew.status === 200, 'GET /api/v1/verification/verify returns 200');
    assert(verifyNew.data.data.checks.signatureValid === true, 'Check: signatureValid is true (ECDSA recovered)');
    assert(verifyNew.data.data.checks.merkleRootMatch === true, 'Check: merkleRootMatch is true (Mathematically verified)');
    assert(verifyNew.data.data.checks.issuerAccredited === true, 'Check: issuerAccredited is true');
    assert(verifyNew.data.data.checks.notRevoked === true, 'Check: notRevoked is true');
    assert(verifyNew.data.data.credential.studentEmail === undefined, 'Data Privacy: studentEmail is omitted from public verification');

    // 11. Credential Revocation Lifecycle
    console.log('\n--- 11. Credential Revocation Lifecycle ---');
    // Non-issuer cannot revoke
    const recruiterLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'recruiter@techcorp.com', password: 'Password123!' },
    });
    const recruiterToken = recruiterLogin.data.data?.accessToken;

    const unauthRevoke = await request(`/api/v1/credentials/${newCertNum}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: { reason: 'Unauthorized revocation attempt' },
    });
    assert(unauthRevoke.status === 403, 'Non-issuer blocked from revoking credential (403 Forbidden)');

    // Authorized issuer revokes
    const validRevoke = await request(`/api/v1/credentials/${newCertNum}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${oxfordToken}` },
      body: { reason: 'Academic curriculum update' },
    });
    assert(validRevoke.status === 200, 'Authorized issuer successfully revokes credential');

    const verifyAfterRevoke = await request(`/api/v1/verification/verify/${newCertNum}`);
    assert(verifyAfterRevoke.data.data.overallStatus === 'REVOKED', 'Verification flags credential as REVOKED');
    assert(verifyAfterRevoke.data.data.checks.notRevoked === false, 'Check: notRevoked is false');

    // 12. File Upload Magic Bytes Validation
    console.log('\n--- 12. File Upload Magic Bytes Security ---');
    // Create valid PDF file with %PDF- header and unique nonce to prevent duplicate detection
    const validPdfPath = path.resolve('test_valid.pdf');
    fs.writeFileSync(validPdfPath, Buffer.from(`%PDF-1.4\nTest PDF content with genuine header ${Date.now()}\n%%EOF`));

    // Create fake PDF file (executable / text with wrong header)
    const fakePdfPath = path.resolve('test_fake.pdf');
    fs.writeFileSync(fakePdfPath, Buffer.from('MZ\x90\x00\x03\x00\x00\x00Fake executable content'));

    const formDataValid = new FormData();
    formDataValid.append('file', new Blob([fs.readFileSync(validPdfPath)], { type: 'application/pdf' }), 'test_valid.pdf');
    formDataValid.append('title', 'Valid PDF Evidence');

    const uploadValid = await request('/api/v1/evidence/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formDataValid,
      isFormData: true,
    });
    assert(uploadValid.status === 201, 'Upload of document with valid magic bytes succeeds (201 Created)');

    const formDataFake = new FormData();
    formDataFake.append('file', new Blob([fs.readFileSync(fakePdfPath)], { type: 'application/pdf' }), 'test_fake.pdf');
    formDataFake.append('title', 'Fake Executable Evidence');

    const uploadFake = await request('/api/v1/evidence/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: formDataFake,
      isFormData: true,
    });
    assert(uploadFake.status === 400, 'Upload of file with invalid magic bytes is rejected (400 Bad Request)');

    // Clean temp test files
    if (fs.existsSync(validPdfPath)) fs.unlinkSync(validPdfPath);
    if (fs.existsSync(fakePdfPath)) fs.unlinkSync(fakePdfPath);

    // 13. Groq AI Integration
    console.log('\n--- 13. Groq AI Real Integration ---');
    const aiExtract = await request('/api/v1/ai/extract-skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        text: 'Engineered ERC-20 staking contracts in Solidity, audited reentrancy vectors, and deployed on Sepolia.',
      },
    });
    assert(aiExtract.status === 200, 'POST /api/v1/ai/extract-skills returns 200');
    assert(Array.isArray(aiExtract.data.data?.skills), 'AI extracted skills list returned');
    console.log(`  Extracted skills: ${aiExtract.data.data?.skills?.map((s) => s.name).join(', ')}`);

    const aiChat = await request('/api/v1/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        messages: [{ role: 'user', content: 'How does cryptographic signature verification work in CertiTrust?' }],
      },
    });
    assert(aiChat.status === 200 && aiChat.data.data?.content?.length > 20, 'Groq AI Advisor conversational chat responds with meaningful advice');

    // 14. Tampered Credential Rejection Test
    console.log('\n--- 14. Tampered Credential Rejection ---');
    const tamperedPayload = normalizeCredentialPayload({
      certificateNumber: newCertNum,
      studentId: alexChenUserId,
      issuerId: oxfordUserId,
      title: 'TAMPERED: Master of Science in Distributed Computing',
      type: 'DEGREE',
      badgeLevel: 'GOLD',
      grade: 'First Class Honours (Hacked)',
      courseCode: 'CS-901',
      issuedAt: validIssue.data.data.issuedAt,
    });
    const isTamperedSigValid = verifyCredentialSignature(
      tamperedPayload,
      validIssue.data.data.digitalSignature,
      oxfordWalletAddress
    );
    assert(isTamperedSigValid.isValid === false, 'Tampered credential payload is strictly rejected by ECDSA signature check');

    // 15. Credential Revocation Reconciliation Test
    console.log('\n--- 15. Revocation Reconciliation ---');
    const reconcileRes = await request(`/api/v1/credentials/${validIssue.data.data.id}/reconcile-revocation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${oxfordToken}` },
    });
    assert(reconcileRes.status === 200 || reconcileRes.status === 503, 'POST /reconcile-revocation responds with structured status');
    assert(reconcileRes.data.success !== undefined, 'Reconciliation returns structured success indicator');

    // 16. Merkle Tree Batch Credential Issuance & Sibling Proof Verification
    console.log('\n--- 16. Merkle Tree Batch Issuance & Sibling Proofs ---');
    const batchRes = await request('/api/v1/institutions/batch-issue', {
      method: 'POST',
      headers: { Authorization: `Bearer ${oxfordToken}` },
      body: {
        items: [
          {
            studentEmail: 'alex.chen@student.edu',
            title: 'Advanced Zero-Knowledge Proofs',
            type: 'CERTIFICATE',
            badgeLevel: 'SILVER',
            grade: 'Pass',
            courseCode: 'ZK-101',
          },
          {
            studentEmail: `batch.student.${Date.now()}@student.edu`,
            studentName: 'Batch Candidate 2',
            title: 'Decentralized Consensus Protocols',
            type: 'CERTIFICATE',
            badgeLevel: 'GOLD',
            grade: 'Distinction',
            courseCode: 'CONS-201',
          },
        ],
      },
    });
    assert(batchRes.status === 201, 'POST /institutions/batch-issue returns 201 Created');
    assert(batchRes.data.data?.count === 2, 'Batch issue created 2 credentials');
    const batchRoot = batchRes.data.data?.batchMerkleRoot;
    assert(Boolean(batchRoot), 'Batch Merkle root is calculated and returned');

    for (const cred of batchRes.data.data?.credentials || []) {
      const proof = cred.blockchainAnchor?.merkleProof || [];
      const proofValid = verifyMerkleProof(cred.credentialHash, proof, batchRoot);
      assert(proofValid === true, `Merkle sibling proof path mathematically verifies for ${cred.certificateNumber}`);

      // Verify tampered proof fails
      const tamperedProof = ['0x' + '00'.repeat(32), ...proof.slice(1)];
      const tamperedProofValid = verifyMerkleProof(cred.credentialHash, tamperedProof, batchRoot);
      assert(tamperedProofValid === false, `Tampered Merkle proof is correctly rejected for ${cred.certificateNumber}`);
    }

    // 17. QR Code Verification Endpoint
    console.log('\n--- 17. QR Code Generation & Verification ---');
    const qrRes = await request(`/api/v1/credentials/qr/${newCertNum}`);
    assert(qrRes.status === 200, 'GET /credentials/qr/:id returns 200');
    assert(qrRes.data.success === true, 'QR endpoint reports success=true');

    // 18. Groq AI Error Handling Test
    console.log('\n--- 18. Groq AI Error Handling ---');
    const aiInvalid = await request('/api/v1/ai/extract-skills', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {}, // Missing text
    });
    assert(aiInvalid.status === 400, 'POST /ai/extract-skills with empty text returns 400 Bad Request');

    // 19. Institutional Key Encryption at Rest Test
    console.log('\n--- 19. Institutional Key Encryption at Rest ---');
    const instRecord = await prisma.institutionProfile.findFirst({
      where: { user: { email: 'oxford@institution.edu' } },
    });
    assert(Boolean(instRecord.encryptedSigningKey), 'Institutional signing key is stored encrypted in database');
    assert(!instRecord.signingPrivateKey, 'Plaintext signingPrivateKey column does not exist on institution record');
    const decryptedKey = decryptPrivateKey(instRecord.encryptedSigningKey);
    assert(Boolean(decryptedKey && decryptedKey.length >= 64), 'Institutional signing key successfully decrypts with dedicated master secret');

    // 20. Password Reset & Rotation Lifecycle
    console.log('\n--- 20. Password Reset Lifecycle ---');
    const forgotRes = await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: 'alex.chen@student.edu' },
    });
    assert(forgotRes.status === 200, 'POST /auth/forgot-password returns 200');
    assert(Boolean(forgotRes.data.resetToken), 'Password reset token is generated');

    const resetRes = await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        resetToken: forgotRes.data.resetToken,
        newPassword: 'NewAlexPassword2026!',
      },
    });
    assert(resetRes.status === 200, 'POST /auth/reset-password returns 200');

    // Old password fails
    const oldLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'alex.chen@student.edu', password: 'Password123!' },
    });
    assert(oldLoginRes.status === 401, 'Login with old password fails after reset (401)');

    // New password succeeds
    const newLoginRes = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'alex.chen@student.edu', password: 'NewAlexPassword2026!' },
    });
    assert(newLoginRes.status === 200, 'Login with new password succeeds (200)');

    // Restore original test password so future runs remain deterministic
    const restoreForgot = await request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: { email: 'alex.chen@student.edu' },
    });
    await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        resetToken: restoreForgot.data.resetToken,
        newPassword: 'Password123!',
      },
    });

    // 21. Notification Lifecycle & IDOR Protection
    console.log('\n--- 21. Notifications & IDOR Protection ---');
    const notifRes = await request('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(notifRes.status === 200, 'GET /notifications returns 200');
    assert(Array.isArray(notifRes.data.data), 'Notifications list is returned as array');

    const unreadRes = await request('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unreadRes.status === 200, 'GET /notifications/unread-count returns 200');
    assert(typeof unreadRes.data.count === 'number', 'Unread count is a numeric value');

    // Create a temporary notification for Oxford to test IDOR
    const oxfordUser = await prisma.user.findUnique({ where: { email: 'oxford@institution.edu' } });
    const oxfordNotif = await prisma.notification.create({
      data: {
        userId: oxfordUser.id,
        type: 'SYSTEM_NOTICE',
        title: 'Confidential Oxford Notice',
        message: 'Restricted institutional advisory.',
      },
    });

    // Student tries to mark Oxford's notification as read -> IDOR attempt blocked
    const idorAttempt = await request(`/api/v1/notifications/${oxfordNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(idorAttempt.status === 404, 'IDOR attack: student cannot modify another user notification (404 Not Found)');

    // 22. Background Jobs & Reconciliation Runner
    console.log('\n--- 22. Background Jobs & Reconciliation Runner ---');
    const jobStats = await jobsService.runReconciliationCycle();
    assert(jobStats && typeof jobStats === 'object', 'jobsService.runReconciliationCycle executes cleanly');
    assert(jobStats.tokens?.cleanedCount !== undefined, 'Expired token cleanup reports execution stats');
    assert(jobStats.credentials?.expiredCount !== undefined, 'Expired credentials check reports execution stats');
    assert(jobStats.anchors?.reconciledCount !== undefined, 'Pending blockchain anchor reconciliation reports execution stats');

    console.log('\n================================================================');
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log('================================================================');
  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
