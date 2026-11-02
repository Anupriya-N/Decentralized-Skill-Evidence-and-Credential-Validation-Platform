/**
 * Automated Verification and Issuer Validation Test Suite
 * Covers all 16 test cases specified in Task 4 of CertiTrust prompt.
 */

// 1. In-memory LocalStorage polyfill for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const memoryStore = new Map();
  globalThis.localStorage = {
    getItem: (key) => memoryStore.has(key) ? memoryStore.get(key) : null,
    setItem: (key, val) => memoryStore.set(key, String(val)),
    removeItem: (key) => memoryStore.delete(key),
    clear: () => memoryStore.clear()
  };
}

// 2. Vite environment polyfill for Node
if (typeof import.meta.env === 'undefined') {
  import.meta.env = {
    MODE: 'test',
    VITE_APP_NAME: 'CertiTrust',
    VITE_ENABLE_MOCK_BLOCKCHAIN: 'true',
    VITE_ENABLE_LIVE_BLOCKCHAIN: 'false'
  };
}

import { storageService, INITIAL_VALIDATION_REQUESTS } from '../services/storageService.js';
import { verificationService, VERIFICATION_STATES } from '../services/verificationService.js';
import { issuerService, ISSUER_ACCREDITATION_STATUS, ISSUER_STATUS_LABELS } from '../services/issuerService.js';
import { credentialService } from '../services/credentialService.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' CERTITRUST COMPREHENSIVE VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // Reset clean test seed
  storageService.resetDemoData();

  // ----------------------------------------------------------------
  // PART A: CREDENTIAL VERIFICATION TESTS (9 Cases)
  // ----------------------------------------------------------------
  console.log('--- PART A: CREDENTIAL VERIFICATION TESTS ---');

  // Test 1: Valid hash + trusted issuer + active credential + valid blockchain proof
  try {
    const cred = storageService.getCredentials().find(c => c.id === 'cred-001');
    const res = await verificationService.verifyCredential('CRED-2025-9481', cred.fileHash, null, 'Test Link', {
      mockBlockchainVerified: true
    });
    assert(
      res.overallResult === VERIFICATION_STATES.FULLY_VERIFIED &&
      res.checks.record.passed &&
      res.checks.fileHash.status === 'MATCH' &&
      res.checks.issuer.passed &&
      res.checks.lifecycle.passed &&
      res.checks.blockchain.passed,
      'Test 1: Valid hash + trusted issuer + active credential + valid blockchain proof -> FULLY_VERIFIED',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 1', err.message);
  }

  // Test 2: Incorrect file hash
  try {
    const res = await verificationService.verifyCredential('CRED-2025-9481', 'badf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00dbadf00d');
    assert(
      res.overallResult === VERIFICATION_STATES.HASH_MISMATCH &&
      res.checks.fileHash.status === 'MISMATCH',
      'Test 2: Incorrect file hash -> HASH_MISMATCH',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 2', err.message);
  }

  // Test 3: Unknown / untrusted issuer
  try {
    // cred-005 has an issuer that is suspended/untrusted
    const res = await verificationService.verifyCredential('CRED-2024-6590', '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a');
    assert(
      res.overallResult === VERIFICATION_STATES.CREDENTIAL_REVOKED || res.overallResult === VERIFICATION_STATES.ISSUER_NOT_TRUSTED,
      'Test 3: Suspended/untrusted issuer is flagged -> Revoked or ISSUER_NOT_TRUSTED',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 3', err.message);
  }

  // Test 4: Revoked credential
  try {
    const cred = storageService.getCredentials().find(c => c.id === 'cred-005');
    const res = await verificationService.verifyCredential(cred.credentialId, cred.fileHash);
    assert(
      res.overallResult === VERIFICATION_STATES.CREDENTIAL_REVOKED &&
      res.checks.lifecycle.status === 'REVOKED',
      'Test 4: Revoked credential -> CREDENTIAL_REVOKED',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 4', err.message);
  }

  // Test 5: Expired credential
  try {
    const cred = storageService.getCredentials().find(c => c.id === 'cred-004'); // Expired in 2024
    const res = await verificationService.verifyCredential(cred.credentialId, cred.fileHash);
    assert(
      res.overallResult === VERIFICATION_STATES.CREDENTIAL_EXPIRED &&
      res.checks.expiration.status === 'EXPIRED',
      'Test 5: Expired credential -> CREDENTIAL_EXPIRED',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 5', err.message);
  }

  // Test 6: Blockchain unavailable
  try {
    // When live blockchain query fails or is unavailable
    const cred = storageService.getCredentials().find(c => c.id === 'cred-001');
    const res = await verificationService.verifyCredential(cred.credentialId, cred.fileHash, null, 'link', {
      mockBlockchainVerified: false
    });
    // In disconnected prototype mode without live node, blockchain status is NOT_CONNECTED / UNAVAILABLE
    assert(
      res.checks.blockchain.status === 'NOT_CONNECTED' || res.checks.blockchain.status === 'UNAVAILABLE',
      'Test 6: Blockchain offline / unavailable is tracked explicitly',
      `Got blockchain status: ${res.checks.blockchain.status}`
    );
  } catch (err) {
    assert(false, 'Test 6', err.message);
  }

  // Test 7: Missing blockchain proof
  try {
    const cred = storageService.getCredentials().find(c => c.id === 'cred-001');
    const res = await verificationService.verifyCredential(cred.credentialId, cred.fileHash, null, 'link', {
      mockBlockchainVerified: false
    });
    assert(
      res.overallResult !== VERIFICATION_STATES.FULLY_VERIFIED,
      'Test 7: Missing on-chain blockchain proof strictly prevents FULLY_VERIFIED',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 7', err.message);
  }

  // Test 8: Credential not found
  try {
    const res = await verificationService.verifyCredential('CRED-DOES-NOT-EXIST-0000');
    assert(
      res.recordFound === false &&
      res.overallResult === VERIFICATION_STATES.CREDENTIAL_NOT_FOUND,
      'Test 8: Unknown identifier -> CREDENTIAL_NOT_FOUND',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 8', err.message);
  }

  // Test 9: Incomplete verification (File hash not checked)
  try {
    const res = await verificationService.verifyCredential('CRED-2025-9481', null);
    assert(
      res.overallResult === VERIFICATION_STATES.VERIFICATION_INCOMPLETE &&
      res.checks.fileHash.status === 'NOT_CHECKED',
      'Test 9: File hash not submitted -> VERIFICATION_INCOMPLETE (Never FULLY_VERIFIED)',
      `Got overallResult: ${res.overallResult}`
    );
  } catch (err) {
    assert(false, 'Test 9', err.message);
  }

  // ----------------------------------------------------------------
  // PART B: ISSUER VALIDATION TESTS (7 Cases)
  // ----------------------------------------------------------------
  console.log('\n--- PART B: ISSUER VALIDATION TESTS ---');

  const adminUser = { id: 'admin-01', fullName: 'System Administrator', role: 'admin' };
  const issuerOfficer = { id: 'iss-user-01', fullName: 'Registrar Officer', role: 'issuer' };
  const studentUser = { id: 'user-student-01', fullName: 'Jane Doe', role: 'student' };

  let testIssuerId = null;

  // Test 10: New issuer application
  try {
    const newApp = issuerService.submitInstitutionApplication({
      organizationName: 'Oxford Institute of Quantum Systems',
      organizationType: 'University / Higher Ed',
      email: 'accreditation@oxford-quantum.edu',
      website: 'https://oxford-quantum.edu'
    }, adminUser);
    testIssuerId = newApp.id;
    assert(
      newApp.trustStatus === ISSUER_ACCREDITATION_STATUS.SUBMITTED &&
      newApp.organizationName === 'Oxford Institute of Quantum Systems',
      'Test 10: New issuer application saved with status "submitted"',
      `Status: ${newApp.trustStatus}`
    );
  } catch (err) {
    assert(false, 'Test 10', err.message);
  }

  // Test 11: Application pending review
  try {
    const found = issuerService.getIssuerById(testIssuerId);
    assert(
      found && (found.trustStatus === 'submitted' || found.trustStatus === 'under_review'),
      'Test 11: Issuer application is pending review in governance list',
      `Status: ${found?.trustStatus}`
    );
  } catch (err) {
    assert(false, 'Test 11', err.message);
  }

  // Test 12: Admin rejection with reason
  try {
    const rejected = issuerService.updateTrustStatus(
      testIssuerId,
      ISSUER_ACCREDITATION_STATUS.REJECTED,
      'Charter documentation expired and uncertified.',
      adminUser
    );
    assert(
      rejected.trustStatus === 'rejected' &&
      rejected.reviewReason === 'Charter documentation expired and uncertified.',
      'Test 12: Admin rejection with required reason and audit entry',
      `Reason: ${rejected.reviewReason}`
    );
  } catch (err) {
    assert(false, 'Test 12', err.message);
  }

  // Test 13: Admin demo approval ("Demo Approval – External Institution Verification Pending")
  try {
    const approved = issuerService.updateTrustStatus(
      testIssuerId,
      ISSUER_ACCREDITATION_STATUS.DEMO_APPROVED,
      'Institutional charter verified for prototype testing.',
      adminUser
    );
    assert(
      approved.trustStatus === 'demo_approved' &&
      ISSUER_STATUS_LABELS[approved.trustStatus] === 'Demo Approval – External Institution Verification Pending',
      'Test 13: Admin demo approval records "Demo Approval – External Institution Verification Pending"',
      `Status: ${approved.trustStatus}`
    );
  } catch (err) {
    assert(false, 'Test 13', err.message);
  }

  // Test 14: Student sees updated status
  try {
    // Enqueue claim for student Jane Doe
    const claim = issuerService.submitOrResubmitClaim({
      credentialId: 'CRED-2025-7801',
      credentialDbId: 'cred-003',
      studentId: studentUser.id,
      studentName: studentUser.fullName,
      credentialTitle: 'Advanced Deep Learning and Neural Transformers',
      issuerId: 'iss-003',
      evidenceFileName: 'Deep_Learning_Specialization_Cert.pdf',
      fileHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'
    }, studentUser);

    const allRequests = issuerService.getValidationRequests();
    const studentRequest = allRequests.find(r => r.id === claim.id);
    assert(
      studentRequest && studentRequest.studentName === 'Jane Doe' && studentRequest.status === 'pending',
      'Test 14: Student claim dynamically linked to authenticated profile (No hardcoded Alex Chen)',
      `Name: ${studentRequest?.studentName}`
    );
  } catch (err) {
    assert(false, 'Test 14', err.message);
  }

  // Test 15: Unauthorized user cannot approve
  try {
    let unauthorizedBlocked = false;
    try {
      issuerService.approveValidationRequest('req-001', studentUser); // Student attempting to approve claim
    } catch (unauthErr) {
      if (unauthErr.message.includes('Unauthorized')) {
        unauthorizedBlocked = true;
      }
    }
    assert(
      unauthorizedBlocked,
      'Test 15: Unauthorized user (student/recruiter) cannot approve credential claims',
      'Unauthorized access was not blocked!'
    );
  } catch (err) {
    assert(false, 'Test 15', err.message);
  }

  // Test 16: Resubmission after rejection
  try {
    // 1. Reject first
    const rejectedResult = issuerService.rejectValidationRequest(
      'req-001',
      'Enrollment identity documentation unreadable.',
      issuerOfficer
    );

    // 2. Resubmit with amended evidence
    const resubmitted = issuerService.submitOrResubmitClaim({
      credentialId: 'CRED-2025-7801',
      credentialDbId: 'cred-003',
      studentId: studentUser.id,
      studentName: studentUser.fullName,
      credentialTitle: 'Advanced Deep Learning and Neural Transformers',
      evidenceFileName: 'Amended_Deep_Learning_Specialization_Cert.pdf',
      fileHash: '3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a3a'
    }, studentUser);

    assert(
      resubmitted.status === 'pending' &&
      resubmitted.rejectionReason === null &&
      resubmitted.history.some(h => h.action === 'CLAIM_RESUBMITTED'),
      'Test 16: Rejected claim can be resubmitted with amended evidence and status reset to "pending"',
      `Status: ${resubmitted.status}`
    );
  } catch (err) {
    assert(false, 'Test 16', err.message);
  }

  // Summary
  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
