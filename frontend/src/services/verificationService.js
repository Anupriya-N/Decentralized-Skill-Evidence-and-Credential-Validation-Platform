import { storageService } from './storageService';
import { compareHashes } from '../utils/hashUtils';
import { blockchainService } from './blockchainService';

export const verificationService = {
  /**
   * Evaluates a credential by ID, with optional uploaded file hash comparison
   * and multi-vector verification checks:
   * 1. Record Found
   * 2. File Hash (matched / not checked / mismatch)
   * 3. Issuer Status (trusted / pending / suspended)
   * 4. Lifecycle Status (active / expired / revoked)
   * 5. Blockchain Proof (verified / unavailable / not connected)
   * 
   * @param {string} credentialId 
   * @param {string|null} uploadedFileHash 
   * @param {object|null} verifierUser 
   * @param {string} method ('QR' | 'manual' | 'link' | 'Recruiter Portal')
   */
  verifyCredential(credentialId, uploadedFileHash = null, verifierUser = null, method = 'link') {
    const creds = storageService.getCredentials();
    const issuers = storageService.getIssuers();
    const isLiveConnected = blockchainService.isConnected();
    const networkConfig = blockchainService.getNetworkConfig();

    const cleanId = (credentialId || '').trim();
    const credential = creds.find(c => 
      c.credentialId?.toLowerCase() === cleanId.toLowerCase() || 
      c.id?.toLowerCase() === cleanId.toLowerCase()
    );

    if (!credential) {
      return {
        recordFound: false,
        credential: null,
        issuer: null,
        checks: {
          record: { status: 'NOT_FOUND', message: `No credential record found for ID: ${cleanId}` },
          fileHash: { status: 'NOT_CHECKED', message: 'Record not found, cannot verify file digest.' },
          integrity: { status: 'NOT_CHECKED', message: 'Record not found, cannot verify file digest.' },
          issuer: { status: 'UNKNOWN', message: 'Issuer unknown.' },
          lifecycle: { status: 'UNKNOWN', message: 'Status unavailable.' },
          blockchain: { status: isLiveConnected ? 'UNAVAILABLE' : 'NOT_CONNECTED', message: 'Blockchain proof lookup unavailable.' }
        },
        overallResult: 'RECORD_NOT_FOUND'
      };
    }

    // Lookup Issuer
    const issuer = issuers.find(i => i.id === credential.issuerId) || {
      id: credential.issuerId,
      organizationName: credential.issuerName,
      trustStatus: credential.issuerStatus || 'pending'
    };

    // 1. Record Check (Explicit State: Record found)
    const recordCheck = {
      status: 'FOUND',
      credentialId: credential.credentialId,
      title: credential.title,
      registeredAt: credential.createdAt,
      message: 'Cryptographic proof record located on platform registry.'
    };

    // 2. File Hash Check (Explicit States: matched / not checked / mismatch)
    let fileHashCheck = {
      status: 'NOT_CHECKED', // 'MATCH' | 'NOT_CHECKED' | 'MISMATCH'
      registeredHash: credential.fileHash,
      checkedHash: uploadedFileHash,
      message: 'Original document file not submitted for byte-by-byte SHA-256 comparison.'
    };

    if (uploadedFileHash) {
      const isMatch = compareHashes(credential.fileHash, uploadedFileHash);
      if (isMatch) {
        fileHashCheck = {
          status: 'MATCH',
          registeredHash: credential.fileHash,
          checkedHash: uploadedFileHash,
          message: 'SHA-256 digest identical to registered proof.'
        };
      } else {
        fileHashCheck = {
          status: 'MISMATCH',
          registeredHash: credential.fileHash,
          checkedHash: uploadedFileHash,
          message: 'CRITICAL: Uploaded file digest does NOT match registered proof. Content has been altered or replaced.'
        };
      }
    }

    // 3. Issuer Authenticity Check (Explicit States: trusted / pending / suspended)
    const rawIssuerStatus = (issuer.trustStatus || credential.issuerStatus || 'pending').toLowerCase();
    let issuerStatus = 'pending';
    if (rawIssuerStatus === 'trusted') issuerStatus = 'trusted';
    else if (rawIssuerStatus === 'suspended' || rawIssuerStatus === 'untrusted') issuerStatus = 'suspended';

    const issuerCheck = {
      status: issuerStatus.toUpperCase(), // 'TRUSTED' | 'PENDING' | 'SUSPENDED'
      issuerName: issuer.organizationName || credential.issuerName,
      organizationType: issuer.organizationType || 'Educational Institution / Authority',
      message: issuerStatus === 'trusted' 
        ? 'Verified accredited issuer with active educational or industry charter.'
        : issuerStatus === 'pending'
        ? 'Issuer accreditation application is currently pending administrative review.'
        : 'Issuer has been suspended or untrusted by platform administration.'
    };

    // 4. Lifecycle / Revocation Check (Explicit States: active / expired / revoked)
    const isExpired = credential.expiryDate && new Date(credential.expiryDate) < new Date();
    let lifecycleStatus = credential.credentialStatus || 'active';
    if (lifecycleStatus === 'active' && isExpired) {
      lifecycleStatus = 'expired';
    }

    const lifecycleCheck = {
      status: lifecycleStatus.toUpperCase(), // 'ACTIVE' | 'EXPIRED' | 'REVOKED'
      expiryDate: credential.expiryDate,
      revocationReason: credential.revocationReason || null,
      revokedAt: credential.revokedAt || null,
      message: lifecycleStatus === 'active'
        ? 'Credential is active and within valid lifespan.'
        : lifecycleStatus === 'revoked'
        ? `Credential has been revoked: "${credential.revocationReason || 'No reason specified'}"`
        : `Credential validity expired on ${credential.expiryDate}.`
    };

    // 5. Blockchain Check (Explicit States: verified / unavailable / not connected)
    const proof = credential.blockchainProof;
    let blockchainStatus = 'NOT_CONNECTED';
    let blockchainMessage = 'Blockchain integration not connected to live network.';

    if (isLiveConnected) {
      if (proof?.transactionHash && !proof?.isMock) {
        blockchainStatus = 'VERIFIED';
        blockchainMessage = `Proof anchored on live ${networkConfig.networkName}.`;
      } else {
        blockchainStatus = 'UNAVAILABLE';
        blockchainMessage = 'Smart contract proof not found on connected network.';
      }
    } else {
      blockchainStatus = 'NOT_CONNECTED';
      blockchainMessage = 'Blockchain integration not connected (No live Web3 provider configured).';
    }

    const blockchainCheck = {
      status: blockchainStatus, // 'VERIFIED' | 'UNAVAILABLE' | 'NOT_CONNECTED'
      network: networkConfig.networkName,
      transactionHash: isLiveConnected && !proof?.isMock ? proof?.transactionHash : null,
      message: blockchainMessage
    };

    // Determine overall verification result
    // Core rules:
    // 1. Do NOT return VALID when required checks have not completed (e.g. fileHash is NOT_CHECKED)
    // 2. Keep pending and incomplete verification states separate
    // 3. Only show fully verified when all required checks succeed (recordFound, fileHash MATCH, issuer TRUSTED, lifecycle ACTIVE)
    let overallResult = 'INCOMPLETE_FILE_NOT_CHECKED';

    if (lifecycleStatus === 'revoked') {
      overallResult = 'REVOKED';
    } else if (fileHashCheck.status === 'MISMATCH') {
      overallResult = 'HASH_MISMATCH';
    } else if (issuerStatus === 'suspended') {
      overallResult = 'ISSUER_SUSPENDED';
    } else if (lifecycleStatus === 'expired') {
      overallResult = 'EXPIRED';
    } else if (issuerStatus === 'pending') {
      overallResult = 'ISSUER_PENDING';
    } else if (fileHashCheck.status === 'NOT_CHECKED') {
      // Record found, but physical file integrity has not been verified
      overallResult = 'INCOMPLETE_FILE_NOT_CHECKED';
    } else if (
      fileHashCheck.status === 'MATCH' &&
      issuerStatus === 'trusted' &&
      lifecycleStatus === 'active'
    ) {
      overallResult = 'FULLY_VERIFIED';
    } else {
      overallResult = 'INCOMPLETE';
    }

    // Log the verification attempt in audit trail
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
        blockchain: blockchainCheck
      },
      overallResult
    };
  }
};
