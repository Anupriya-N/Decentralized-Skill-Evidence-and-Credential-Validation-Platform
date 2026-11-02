import { storageService } from './storageService';
import { compareHashes } from '../utils/hashUtils';

export const verificationService = {
  /**
   * Evaluates a credential by ID, with optional uploaded file hash comparison
   * @param {string} credentialId 
   * @param {string|null} uploadedFileHash 
   * @param {object|null} verifierUser 
   * @param {string} method ('QR' | 'manual' | 'link')
   */
  verifyCredential(credentialId, uploadedFileHash = null, verifierUser = null, method = 'link') {
    const creds = storageService.getCredentials();
    const issuers = storageService.getIssuers();

    const cleanId = (credentialId || '').trim();
    const credential = creds.find(c => 
      c.credentialId.toLowerCase() === cleanId.toLowerCase() || 
      c.id.toLowerCase() === cleanId.toLowerCase()
    );

    if (!credential) {
      return {
        recordFound: false,
        credential: null,
        issuer: null,
        checks: {
          record: { status: 'NOT_FOUND', message: `No credential record found for ID: ${cleanId}` },
          integrity: { status: 'UNKNOWN', message: 'Record not found, cannot verify file digest.' },
          issuer: { status: 'UNKNOWN', message: 'Issuer unknown.' },
          lifecycle: { status: 'UNKNOWN', message: 'Status unavailable.' }
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

    // 1. Record Check
    const recordCheck = {
      status: 'FOUND',
      credentialId: credential.credentialId,
      title: credential.title,
      registeredAt: credential.createdAt,
      network: credential.blockchainProof?.network || 'Ethereum Sepolia (Simulated)',
      message: 'Cryptographic proof record located on registry.'
    };

    // 2. File Integrity Check
    let integrityCheck = {
      status: 'NOT_CHECKED',
      registeredHash: credential.fileHash,
      checkedHash: uploadedFileHash,
      message: 'Original file not provided for byte-by-byte comparison.'
    };

    if (uploadedFileHash) {
      const isMatch = compareHashes(credential.fileHash, uploadedFileHash);
      if (isMatch) {
        integrityCheck = {
          status: 'MATCH',
          registeredHash: credential.fileHash,
          checkedHash: uploadedFileHash,
          message: 'SHA-256 digest identical to originally registered file bytes.'
        };
      } else {
        integrityCheck = {
          status: 'MISMATCH',
          registeredHash: credential.fileHash,
          checkedHash: uploadedFileHash,
          message: 'CRITICAL: Uploaded file digest does NOT match registered proof. Content has been altered or replaced.'
        };
      }
    }

    // 3. Issuer Authenticity Check
    const issuerStatus = issuer.trustStatus || credential.issuerStatus;
    const issuerCheck = {
      status: issuerStatus.toUpperCase(),
      issuerName: issuer.organizationName,
      organizationType: issuer.organizationType || 'Organization',
      message: issuerStatus === 'trusted' 
        ? 'Verified accredited issuer with verified credentials and active charter.'
        : issuerStatus === 'pending'
        ? 'Issuer accreditation application is currently pending administrative review.'
        : 'Issuer has been suspended or untrusted by platform administrator.'
    };

    // 4. Lifecycle / Revocation Check
    const isExpired = credential.expiryDate && new Date(credential.expiryDate) < new Date();
    let lifecycleStatus = credential.credentialStatus || 'active';
    if (lifecycleStatus === 'active' && isExpired) {
      lifecycleStatus = 'expired';
    }

    const lifecycleCheck = {
      status: lifecycleStatus.toUpperCase(),
      expiryDate: credential.expiryDate,
      revocationReason: credential.revocationReason || null,
      revokedAt: credential.revokedAt || null,
      message: lifecycleStatus === 'active'
        ? 'Credential is active and valid according to recorded lifecycle rules.'
        : lifecycleStatus === 'revoked'
        ? `Credential has been revoked: "${credential.revocationReason || 'No reason provided'}"`
        : 'Credential has expired based on its recorded validity period.'
    };

    // Calculate clear summary
    let overallResult = 'VALID';
    if (lifecycleStatus === 'revoked') {
      overallResult = 'REVOKED';
    } else if (integrityCheck.status === 'MISMATCH') {
      overallResult = 'HASH_MISMATCH';
    } else if (issuerStatus === 'suspended') {
      overallResult = 'ISSUER_SUSPENDED';
    } else if (lifecycleStatus === 'expired') {
      overallResult = 'EXPIRED';
    } else if (issuerStatus === 'pending') {
      overallResult = 'ISSUER_PENDING';
    }

    // Log the verification
    const verificationLogs = storageService.getVerificationLogs();
    const newLog = {
      id: `vlog-${Date.now()}`,
      credentialId: credential.credentialId,
      credentialTitle: credential.title,
      verifierUserId: verifierUser?.id || null,
      verifierName: verifierUser?.fullName || 'Public Verifier',
      verificationMethod: method,
      recordFound: true,
      hashStatus: integrityCheck.status,
      issuerStatus: issuerCheck.status,
      credentialStatus: lifecycleCheck.status,
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
        integrity: integrityCheck,
        issuer: issuerCheck,
        lifecycle: lifecycleCheck
      },
      overallResult
    };
  }
};
