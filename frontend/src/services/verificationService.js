import { storageService } from './storageService.js';
import { compareHashes } from '../utils/hashUtils.js';
import { blockchainService } from './blockchainService.js';

/**
 * Verification Service
 * Evaluates credentials against 6 independent verification checks:
 * 1. Credential record exists
 * 2. Uploaded evidence SHA-256 hash matches the registered hash
 * 3. Issuer is authorized and trusted
 * 4. Credential is active and not revoked
 * 5. Credential has not expired
 * 6. Blockchain proof is successfully verified on-chain
 * 
 * Strict Verification States:
 * - FULLY_VERIFIED
 * - PENDING_VERIFICATION
 * - HASH_MISMATCH
 * - ISSUER_NOT_TRUSTED
 * - CREDENTIAL_REVOKED
 * - CREDENTIAL_EXPIRED
 * - BLOCKCHAIN_UNAVAILABLE
 * - CREDENTIAL_NOT_FOUND
 * - VERIFICATION_INCOMPLETE
 */

export const VERIFICATION_STATES = {
  FULLY_VERIFIED: 'FULLY_VERIFIED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  HASH_MISMATCH: 'HASH_MISMATCH',
  ISSUER_NOT_TRUSTED: 'ISSUER_NOT_TRUSTED',
  CREDENTIAL_REVOKED: 'CREDENTIAL_REVOKED',
  CREDENTIAL_EXPIRED: 'CREDENTIAL_EXPIRED',
  BLOCKCHAIN_UNAVAILABLE: 'BLOCKCHAIN_UNAVAILABLE',
  CREDENTIAL_NOT_FOUND: 'CREDENTIAL_NOT_FOUND',
  VERIFICATION_INCOMPLETE: 'VERIFICATION_INCOMPLETE'
};

export const verificationService = {
  /**
   * Performs complete asynchronous verification across all 6 checks
   * @param {string} credentialId 
   * @param {string|null} uploadedFileHash 
   * @param {object|null} verifierUser 
   * @param {string} method ('Public Link' | 'Recruiter Portal' | 'QR')
   * @param {object} options Optional parameters for test harnesses (e.g. mockBlockchainSuccess)
   * @returns {Promise<object>} Complete verification result with all 6 checks and overallResult
   */
  async verifyCredential(credentialId, uploadedFileHash = null, verifierUser = null, method = 'link', options = {}) {
    const creds = storageService.getCredentials();
    const issuers = storageService.getIssuers();

    const cleanId = (credentialId || '').trim();
    const credential = creds.find(c => 
      c.credentialId?.toLowerCase() === cleanId.toLowerCase() || 
      c.id?.toLowerCase() === cleanId.toLowerCase()
    );

    // 1. CHECK 1: Credential record exists
    if (!credential) {
      return {
        recordFound: false,
        credential: null,
        issuer: null,
        checks: {
          record: { id: 'record_exists', label: 'Credential record exists', status: 'NOT_FOUND', passed: false, pending: false, message: `No credential record found for ID: ${cleanId}` },
          fileHash: { id: 'hash_match', label: 'Uploaded evidence SHA-256 hash matches', status: 'NOT_CHECKED', passed: false, pending: true, message: 'Record not found; file digest comparison cannot be performed.' },
          issuer: { id: 'issuer_trusted', label: 'Issuer is authorized and trusted', status: 'UNKNOWN', passed: false, pending: false, message: 'Issuing organization unknown.' },
          lifecycle: { id: 'credential_not_revoked', label: 'Credential is active and not revoked', status: 'UNKNOWN', passed: false, pending: false, message: 'Lifecycle status unavailable.' },
          expiration: { id: 'credential_not_expired', label: 'Credential has not expired', status: 'UNKNOWN', passed: false, pending: false, message: 'Validity period unavailable.' },
          blockchain: { id: 'blockchain_proof', label: 'Blockchain proof is successfully verified', status: 'UNAVAILABLE', passed: false, pending: false, message: 'Blockchain proof query unavailable.' }
        },
        overallResult: VERIFICATION_STATES.CREDENTIAL_NOT_FOUND
      };
    }

    const recordCheck = {
      id: 'record_exists',
      label: 'Credential record exists',
      status: 'FOUND',
      passed: true,
      pending: false,
      credentialId: credential.credentialId,
      title: credential.title,
      registeredAt: credential.createdAt,
      message: 'Cryptographic proof record located on platform registry.'
    };

    // Lookup Issuer
    const issuer = issuers.find(i => i.id === credential.issuerId) || {
      id: credential.issuerId,
      organizationName: credential.issuerName,
      trustStatus: credential.issuerStatus || 'pending'
    };

    // 2. CHECK 2: Uploaded evidence SHA-256 hash matches
    let fileHashCheck = {
      id: 'hash_match',
      label: 'Uploaded evidence SHA-256 hash matches',
      status: 'NOT_CHECKED', // 'MATCH' | 'NOT_CHECKED' | 'MISMATCH'
      passed: false,
      pending: true,
      registeredHash: credential.fileHash,
      checkedHash: uploadedFileHash,
      message: 'Original certificate document not submitted for byte-by-byte SHA-256 hash comparison.'
    };

    if (uploadedFileHash) {
      const isMatch = compareHashes(credential.fileHash, uploadedFileHash);
      if (isMatch) {
        fileHashCheck = {
          id: 'hash_match',
          label: 'Uploaded evidence SHA-256 hash matches',
          status: 'MATCH',
          passed: true,
          pending: false,
          registeredHash: credential.fileHash,
          checkedHash: uploadedFileHash,
          message: 'Exact binary match: SHA-256 digest is identical to originally registered proof.'
        };
      } else {
        fileHashCheck = {
          id: 'hash_match',
          label: 'Uploaded evidence SHA-256 hash matches',
          status: 'MISMATCH',
          passed: false,
          pending: false,
          registeredHash: credential.fileHash,
          checkedHash: uploadedFileHash,
          message: 'CRITICAL: Uploaded file digest does NOT match registered proof. Content has been altered or replaced.'
        };
      }
    }

    // 3. CHECK 3: Issuer is authorized and trusted
    const rawIssuerStatus = (issuer.trustStatus || credential.issuerStatus || 'pending').toLowerCase();
    let issuerCheckStatus = 'PENDING';
    let issuerPassed = false;
    let issuerPending = true;
    let issuerMessage = 'Issuer accreditation application is currently pending review.';

    if (rawIssuerStatus === 'externally_verified' || rawIssuerStatus === 'trusted') {
      issuerCheckStatus = 'TRUSTED';
      issuerPassed = true;
      issuerPending = false;
      issuerMessage = 'Accredited issuing authority verified against official education or industry charter.';
    } else if (rawIssuerStatus === 'demo_approved') {
      issuerCheckStatus = 'DEMO_APPROVED';
      issuerPassed = false;
      issuerPending = true;
      issuerMessage = 'Demo Approval – External Institution Verification Pending.';
    } else if (rawIssuerStatus === 'suspended') {
      issuerCheckStatus = 'SUSPENDED';
      issuerPassed = false;
      issuerPending = false;
      issuerMessage = 'Issuing organization has been suspended by platform administration.';
    } else if (rawIssuerStatus === 'untrusted' || rawIssuerStatus === 'rejected') {
      issuerCheckStatus = 'UNTRUSTED';
      issuerPassed = false;
      issuerPending = false;
      issuerMessage = 'Issuing organization application was rejected or untrusted.';
    }

    const issuerCheck = {
      id: 'issuer_trusted',
      label: 'Issuer is authorized and trusted',
      status: issuerCheckStatus,
      passed: issuerPassed,
      pending: issuerPending,
      issuerName: issuer.organizationName || credential.issuerName,
      organizationType: issuer.organizationType || 'Educational Institution',
      message: issuerMessage
    };

    // 4. CHECK 4: Credential is active and not revoked
    const isRevoked = credential.credentialStatus === 'revoked';
    const lifecycleCheck = {
      id: 'credential_not_revoked',
      label: 'Credential is active and not revoked',
      status: isRevoked ? 'REVOKED' : 'ACTIVE',
      passed: !isRevoked,
      pending: false,
      revocationReason: credential.revocationReason || null,
      revokedAt: credential.revokedAt || null,
      message: isRevoked
        ? `Credential has been revoked: "${credential.revocationReason || 'No reason specified'}"`
        : 'Credential record is active and unrevoked.'
    };

    // 5. CHECK 5: Credential has not expired
    const isExpired = Boolean(credential.expiryDate && new Date(credential.expiryDate) < new Date());
    const expirationCheck = {
      id: 'credential_not_expired',
      label: 'Credential has not expired',
      status: isExpired ? 'EXPIRED' : 'ACTIVE_PERIOD',
      passed: !isExpired,
      pending: false,
      expiryDate: credential.expiryDate,
      message: isExpired
        ? `Credential validity expired on ${credential.expiryDate}.`
        : credential.expiryDate
        ? `Valid until ${credential.expiryDate}.`
        : 'Lifetime validity (does not expire).'
    };

    // 6. CHECK 6: Blockchain proof is successfully verified
    let blockchainCheck;
    if (options.mockBlockchainVerified) {
      blockchainCheck = {
        id: 'blockchain_proof',
        label: 'Blockchain proof is successfully verified',
        status: 'VERIFIED',
        passed: true,
        pending: false,
        network: 'Ethereum Sepolia Testnet (Test Environment)',
        transactionHash: credential.blockchainProof?.transactionHash || '0xSimulatedProofTx',
        blockNumber: credential.blockchainProof?.blockNumber || 7500000,
        message: 'Proof confirmed on test network.'
      };
    } else {
      const chainRes = await blockchainService.verifyProofOnChain(credential.credentialId, credential.fileHash);
      const isVerified = chainRes.status === 'VERIFIED';
      const isUnavailable = chainRes.status === 'UNAVAILABLE';
      const isNotConnected = chainRes.status === 'NOT_CONNECTED';

      blockchainCheck = {
        id: 'blockchain_proof',
        label: 'Blockchain proof is successfully verified',
        status: chainRes.status, // 'VERIFIED' | 'UNAVAILABLE' | 'NOT_CONNECTED' | 'FAILED'
        passed: isVerified,
        pending: isNotConnected,
        network: chainRes.network,
        transactionHash: chainRes.transactionHash || null,
        blockNumber: chainRes.blockNumber || null,
        message: chainRes.message || (isVerified ? 'Proof confirmed on-chain.' : 'Blockchain integration not connected.')
      };
    }

    // ==========================================
    // CRITICAL BUSINESS LOGIC: Determine State
    // ==========================================
    // Never return FULLY_VERIFIED when:
    // - The file hash has not been checked.
    // - The issuer is not trusted.
    // - The credential is expired or revoked.
    // - Required blockchain verification has not succeeded.
    // - Any mandatory verification check is incomplete.
    let overallResult;

    if (lifecycleCheck.status === 'REVOKED') {
      overallResult = VERIFICATION_STATES.CREDENTIAL_REVOKED;
    } else if (fileHashCheck.status === 'MISMATCH') {
      overallResult = VERIFICATION_STATES.HASH_MISMATCH;
    } else if (expirationCheck.status === 'EXPIRED') {
      overallResult = VERIFICATION_STATES.CREDENTIAL_EXPIRED;
    } else if (issuerCheck.status === 'SUSPENDED' || issuerCheck.status === 'UNTRUSTED') {
      overallResult = VERIFICATION_STATES.ISSUER_NOT_TRUSTED;
    } else if (issuerCheck.status === 'PENDING' || credential.claimStatus === 'pending') {
      overallResult = VERIFICATION_STATES.PENDING_VERIFICATION;
    } else if (blockchainCheck.status === 'UNAVAILABLE') {
      overallResult = VERIFICATION_STATES.BLOCKCHAIN_UNAVAILABLE;
    } else if (fileHashCheck.status === 'NOT_CHECKED') {
      overallResult = VERIFICATION_STATES.VERIFICATION_INCOMPLETE;
    } else if (blockchainCheck.status === 'NOT_CONNECTED') {
      // Blockchain is not connected to a live network
      overallResult = VERIFICATION_STATES.VERIFICATION_INCOMPLETE;
    } else if (issuerCheck.status === 'DEMO_APPROVED') {
      overallResult = VERIFICATION_STATES.PENDING_VERIFICATION;
    } else if (
      recordCheck.passed &&
      fileHashCheck.passed &&
      issuerCheck.passed &&
      lifecycleCheck.passed &&
      expirationCheck.passed &&
      blockchainCheck.passed
    ) {
      overallResult = VERIFICATION_STATES.FULLY_VERIFIED;
    } else {
      overallResult = VERIFICATION_STATES.VERIFICATION_INCOMPLETE;
    }

    // Log the verification attempt in audit logs
    const verificationLogs = storageService.getVerificationLogs();
    const newLog = {
      id: `vlog-${Date.now()}`,
      credentialId: credential.credentialId,
      credentialTitle: credential.title,
      verifierUserId: verifierUser?.id || null,
      verifierName: verifierUser?.fullName || 'Public Verifier',
      verificationMethod: method,
      recordFound: true,
      hashStatus: fileHashCheck.status,
      issuerStatus: issuerCheck.status,
      credentialStatus: lifecycleCheck.status,
      blockchainStatus: blockchainCheck.status,
      result: overallResult,
      createdAt: new Date().toISOString()
    };
    storageService.setVerificationLogs([newLog, ...verificationLogs]);

    return {
      recordFound: true,
      credential,
      issuer,
      checks: {
        record: recordCheck,
        fileHash: fileHashCheck,
        integrity: fileHashCheck, // backwards compatibility alias
        issuer: issuerCheck,
        lifecycle: lifecycleCheck,
        expiration: expirationCheck,
        blockchain: blockchainCheck
      },
      overallResult
    };
  }
};
