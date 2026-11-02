import { storageService } from './storageService.js';

/**
 * Institutional Accreditation Status Constants
 */
export const ISSUER_ACCREDITATION_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  DEMO_APPROVED: 'demo_approved',
  EXTERNALLY_VERIFIED: 'externally_verified',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
};

export const ISSUER_STATUS_LABELS = {
  submitted: 'Application Submitted',
  under_review: 'Documents Under Review',
  demo_approved: 'Demo Approval – External Institution Verification Pending',
  externally_verified: 'Externally Verified Institution',
  rejected: 'Application Rejected',
  suspended: 'Suspended',
  // legacy aliases:
  trusted: 'Demo Approval – External Institution Verification Pending',
  pending: 'Application Submitted',
  untrusted: 'Application Rejected'
};

/**
 * Issuer Service
 * Strictly separates:
 * 1. Issuer Accreditation (Platform administrator approves/rejects an institution)
 * 2. Credential Claim Validation (Authorized institutional issuer approves/rejects student claims)
 */
export const issuerService = {
  getIssuers() {
    return storageService.getIssuers();
  },

  getIssuerById(id) {
    const issuers = storageService.getIssuers();
    return issuers.find(i => i.id === id) || null;
  },

  getValidationRequests() {
    return storageService.getValidationRequests();
  },

  /**
   * Submits a new institution accreditation application.
   */
  submitInstitutionApplication(applicationData, actingUser = null) {
    const issuers = storageService.getIssuers();
    const timestamp = new Date().toISOString();
    const newIssuer = {
      id: `iss-${Date.now()}`,
      organizationName: applicationData.organizationName,
      organizationType: applicationData.organizationType || 'University / Higher Ed',
      email: applicationData.email,
      website: applicationData.website,
      description: applicationData.description || '',
      proofDocumentName: applicationData.proofDocumentName || 'Accreditation_Charter.pdf',
      trustStatus: ISSUER_ACCREDITATION_STATUS.SUBMITTED,
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: 'New institution accreditation application submitted.',
      createdAt: timestamp,
      credentialsIssuedCount: 0,
      history: [
        {
          action: 'APPLICATION_SUBMITTED',
          actor: actingUser?.fullName || 'Applicant Organization',
          timestamp,
          notes: 'Accreditation application charter submitted for review.'
        }
      ]
    };

    const updated = [newIssuer, ...issuers];
    storageService.setIssuers(updated);
    return newIssuer;
  },

  /**
   * Admin-Only: Modifies institutional accreditation status.
   * Enforces role authorization: only 'admin' role may perform this action.
   * Real-world rule: An admin click produces 'demo_approved' ("Demo Approval – External Institution Verification Pending"),
   * distinguishing demo approval from genuine external institutional verification.
   */
  updateTrustStatus(issuerId, status, reviewReason, actingUser = null) {
    const role = actingUser?.role || (typeof actingUser === 'string' ? 'admin' : null);
    if (role !== 'admin') {
      throw new Error('Unauthorized: Only platform administrators can modify institutional accreditation status.');
    }

    const issuers = storageService.getIssuers();
    const index = issuers.findIndex(i => i.id === issuerId);
    if (index === -1) throw new Error('Issuer not found.');

    const targetIssuer = issuers[index];
    const timestamp = new Date().toISOString();

    // Map 'trusted' to demo_approved to enforce real-world verification disclosure
    let normalizedStatus = status;
    if (status === 'trusted') {
      normalizedStatus = ISSUER_ACCREDITATION_STATUS.DEMO_APPROVED;
    }

    const newHistoryEntry = {
      action: `STATUS_CHANGE_TO_${normalizedStatus.toUpperCase()}`,
      actor: actingUser?.fullName || 'Platform Administrator',
      actorId: actingUser?.id || 'admin',
      timestamp,
      notes: reviewReason || `Accreditation status changed to ${normalizedStatus}.`
    };

    const updated = {
      ...targetIssuer,
      trustStatus: normalizedStatus,
      reviewReason: reviewReason || `Accreditation status set to ${normalizedStatus}.`,
      reviewedBy: actingUser?.id || 'admin',
      reviewedAt: timestamp,
      history: [...(targetIssuer.history || []), newHistoryEntry]
    };

    issuers[index] = updated;
    storageService.setIssuers(issuers);

    // Synchronize credentials that reference this issuer
    const creds = storageService.getCredentials();
    const updatedCreds = creds.map(c => {
      if (c.issuerId === issuerId) {
        return { 
          ...c, 
          issuerStatus: normalizedStatus, 
          updatedAt: timestamp 
        };
      }
      return c;
    });
    storageService.setCredentials(updatedCreds);

    // Audit log
    const auditLogs = storageService.getAuditLogs();
    const newAudit = {
      id: `audit-${Date.now()}`,
      actorUserId: actingUser?.id || 'admin',
      actorName: actingUser?.fullName || 'Platform Administrator',
      action: `ISSUER_ACCREDITATION_${normalizedStatus.toUpperCase()}`,
      entityType: 'Issuer',
      entityId: issuerId,
      reason: reviewReason || `Status updated to ${normalizedStatus}.`,
      createdAt: timestamp
    };
    storageService.setAuditLogs([newAudit, ...auditLogs]);

    return updated;
  },

  /**
   * Approves a student's validation claim.
   * Authorization check: Only user with role 'issuer' or 'admin' can approve.
   */
  approveValidationRequest(requestId, actingUser = null) {
    const role = actingUser?.role || (typeof actingUser === 'string' ? 'issuer' : null);
    if (role !== 'issuer' && role !== 'admin') {
      throw new Error('Unauthorized: Only authorized institutional issuers or administrators can approve student credential claims.');
    }

    const requests = storageService.getValidationRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Validation request not found.');

    const targetReq = requests[reqIndex];
    const timestamp = new Date().toISOString();
    const reviewerUserId = actingUser?.id || 'user-issuer-01';
    const reviewerName = actingUser?.fullName || targetReq.issuerName || 'Issuing Authority';

    const historyEntry = {
      action: 'CLAIM_APPROVED',
      actorId: reviewerUserId,
      actorName: reviewerName,
      timestamp,
      notes: 'Certificate evidence verified against registrar and approved.'
    };

    const updatedReq = {
      ...targetReq,
      status: 'approved',
      rejectionReason: null,
      reviewedBy: reviewerUserId,
      reviewedAt: timestamp,
      history: [...(targetReq.history || []), historyEntry]
    };
    requests[reqIndex] = updatedReq;
    storageService.setValidationRequests(requests);

    // Synchronize credential in storage
    const creds = storageService.getCredentials();
    const credIndex = creds.findIndex(c => 
      c.credentialId === targetReq.credentialId || 
      c.id === targetReq.credentialDbId ||
      c.fileHash === targetReq.fileHash
    );

    if (credIndex !== -1) {
      creds[credIndex] = {
        ...creds[credIndex],
        issuerStatus: 'trusted',
        claimStatus: 'approved',
        rejectionReason: null,
        issuerReviewedAt: timestamp,
        issuerReviewedBy: reviewerUserId,
        updatedAt: timestamp
      };
      storageService.setCredentials(creds);
    }

    // Add audit log
    const auditLogs = storageService.getAuditLogs();
    const newAudit = {
      id: `audit-${Date.now()}`,
      actorUserId: reviewerUserId,
      actorName: reviewerName,
      action: 'CLAIM_ATTESTATION_APPROVED',
      entityType: 'ValidationRequest',
      entityId: requestId,
      reason: 'Institutional verification confirmed based on submitted certificate evidence.',
      createdAt: timestamp
    };
    storageService.setAuditLogs([newAudit, ...auditLogs]);

    // Send notification to student
    const notifs = storageService.getNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      userId: targetReq.studentId,
      title: 'Credential Claim Approved!',
      message: `Your credential claim for "${targetReq.credentialTitle}" was officially verified and approved by ${reviewerName}.`,
      type: 'verification',
      readAt: null,
      createdAt: timestamp
    };
    storageService.setNotifications([newNotif, ...notifs]);

    return { request: updatedReq, credential: credIndex !== -1 ? creds[credIndex] : null };
  },

  /**
   * Rejects a student's validation claim with required reason.
   * Authorization check: Only user with role 'issuer' or 'admin' can reject.
   */
  rejectValidationRequest(requestId, reason, actingUser = null) {
    const role = actingUser?.role || (typeof actingUser === 'string' ? 'issuer' : null);
    if (role !== 'issuer' && role !== 'admin') {
      throw new Error('Unauthorized: Only authorized institutional issuers or administrators can reject student credential claims.');
    }

    if (!reason || !reason.trim()) {
      throw new Error('A rejection reason must be provided.');
    }

    const requests = storageService.getValidationRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Validation request not found.');

    const targetReq = requests[reqIndex];
    const timestamp = new Date().toISOString();
    const reviewerUserId = actingUser?.id || 'user-issuer-01';
    const reviewerName = actingUser?.fullName || targetReq.issuerName || 'Issuing Authority';

    const historyEntry = {
      action: 'CLAIM_REJECTED',
      actorId: reviewerUserId,
      actorName: reviewerName,
      timestamp,
      notes: reason.trim()
    };

    const updatedReq = {
      ...targetReq,
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedBy: reviewerUserId,
      reviewedAt: timestamp,
      history: [...(targetReq.history || []), historyEntry]
    };
    requests[reqIndex] = updatedReq;
    storageService.setValidationRequests(requests);

    // Synchronize credential in storage: set claimStatus as 'rejected'
    const creds = storageService.getCredentials();
    const credIndex = creds.findIndex(c => 
      c.credentialId === targetReq.credentialId || 
      c.id === targetReq.credentialDbId ||
      c.fileHash === targetReq.fileHash
    );

    if (credIndex !== -1) {
      creds[credIndex] = {
        ...creds[credIndex],
        claimStatus: 'rejected',
        issuerStatus: 'pending',
        rejectionReason: reason.trim(),
        issuerReviewedAt: timestamp,
        issuerReviewedBy: reviewerUserId,
        updatedAt: timestamp
      };
      storageService.setCredentials(creds);
    }

    // Add audit log
    const auditLogs = storageService.getAuditLogs();
    const newAudit = {
      id: `audit-${Date.now()}`,
      actorUserId: reviewerUserId,
      actorName: reviewerName,
      action: 'CLAIM_ATTESTATION_REJECTED',
      entityType: 'ValidationRequest',
      entityId: requestId,
      reason: reason.trim(),
      createdAt: timestamp
    };
    storageService.setAuditLogs([newAudit, ...auditLogs]);

    // Send notification to student explaining reason and inviting resubmission
    const notifs = storageService.getNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      userId: targetReq.studentId,
      title: 'Credential Claim Rejected — Resubmission Allowed',
      message: `Your claim for "${targetReq.credentialTitle}" was rejected: "${reason.trim()}". You may resubmit with updated or supplemental evidence.`,
      type: 'revocation',
      readAt: null,
      createdAt: timestamp
    };
    storageService.setNotifications([newNotif, ...notifs]);

    return { request: updatedReq, credential: credIndex !== -1 ? creds[credIndex] : null };
  },

  /**
   * Enqueues or updates a validation claim when student uploads or resubmits evidence
   */
  submitOrResubmitClaim(claimData, actingUser = null) {
    const requests = storageService.getValidationRequests();
    const existingIndex = requests.findIndex(r => 
      r.credentialId === claimData.credentialId || 
      (claimData.credentialDbId && r.credentialDbId === claimData.credentialDbId)
    );

    const timestamp = new Date().toISOString();
    const studentName = claimData.studentName || actingUser?.fullName || 'Student';
    const studentId = claimData.studentId || actingUser?.id || 'user-student-01';

    const historyEntry = {
      action: existingIndex !== -1 ? 'CLAIM_RESUBMITTED' : 'CLAIM_SUBMITTED',
      actorId: studentId,
      actorName: studentName,
      timestamp,
      notes: existingIndex !== -1 
        ? 'Amended evidence document resubmitted by student.' 
        : 'Initial credential evidence submitted for institutional validation.'
    };

    const previousHistory = existingIndex !== -1 ? (requests[existingIndex].history || []) : [];

    const newReq = {
      id: existingIndex !== -1 ? requests[existingIndex].id : `req-${Date.now()}`,
      credentialId: claimData.credentialId,
      credentialDbId: claimData.credentialDbId || null,
      studentId,
      studentName,
      credentialTitle: claimData.credentialTitle,
      issuerId: claimData.issuerId || 'iss-003',
      issuerName: claimData.issuerName || 'Issuing Authority',
      submittedDate: timestamp.split('T')[0],
      status: 'pending',
      evidenceFileName: claimData.evidenceFileName || 'credential_evidence.pdf',
      fileHash: claimData.fileHash,
      rejectionReason: null,
      reviewedAt: null,
      reviewedBy: null,
      history: [...previousHistory, historyEntry]
    };

    if (existingIndex !== -1) {
      requests[existingIndex] = newReq;
    } else {
      requests.unshift(newReq);
    }

    storageService.setValidationRequests(requests);
    return newReq;
  }
};
