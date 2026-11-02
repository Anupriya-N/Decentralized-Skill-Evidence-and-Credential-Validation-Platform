import { storageService } from './storageService';

/**
 * Issuer Service
 * Manages institutional verification applications, document uploads,
 * pending claim queues, attestations, and approval/rejection workflows.
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

  submitInstitutionApplication(applicationData) {
    const issuers = storageService.getIssuers();
    const newIssuer = {
      id: `iss-${Date.now()}`,
      organizationName: applicationData.organizationName,
      organizationType: applicationData.organizationType || 'University / Higher Ed',
      email: applicationData.email,
      website: applicationData.website,
      description: applicationData.description || '',
      proofDocumentName: applicationData.proofDocumentName || 'Accreditation_Charter.pdf',
      trustStatus: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: 'New institution accreditation application submitted.',
      createdAt: new Date().toISOString(),
      credentialsIssuedCount: 0
    };

    const updated = [newIssuer, ...issuers];
    storageService.setIssuers(updated);
    return newIssuer;
  },

  updateTrustStatus(issuerId, status, reviewReason, reviewerId = 'user-admin-01') {
    const issuers = storageService.getIssuers();
    const index = issuers.findIndex(i => i.id === issuerId);
    if (index === -1) throw new Error('Issuer not found.');

    const updated = {
      ...issuers[index],
      trustStatus: status,
      reviewReason,
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString()
    };

    issuers[index] = updated;
    storageService.setIssuers(issuers);

    // Synchronize credentials with updated issuer trust status
    const creds = storageService.getCredentials();
    const updatedCreds = creds.map(c => {
      if (c.issuerId === issuerId) {
        return { ...c, issuerStatus: status, updatedAt: new Date().toISOString() };
      }
      return c;
    });
    storageService.setCredentials(updatedCreds);

    return updated;
  },

  /**
   * Approves a student's validation claim.
   * Persists approval, updates credential to 'trusted', logs audit, and notifies student.
   */
  approveValidationRequest(requestId, reviewerUserId = 'user-issuer-01') {
    const requests = storageService.getValidationRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Validation request not found.');

    const targetReq = requests[reqIndex];
    const timestamp = new Date().toISOString();

    const updatedReq = {
      ...targetReq,
      status: 'approved',
      rejectionReason: null,
      reviewedBy: reviewerUserId,
      reviewedAt: timestamp
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
      actorName: targetReq.issuerName || 'Issuing Authority',
      action: 'CLAIM_ATTESTATION_APPROVED',
      entityType: 'ValidationRequest',
      entityId: requestId,
      reason: 'Institutional verification confirmed based on academic credentials.',
      createdAt: timestamp
    };
    storageService.setAuditLogs([newAudit, ...auditLogs]);

    // Send notification to student
    const notifs = storageService.getNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      userId: targetReq.studentId || 'user-student-01',
      title: 'Credential Attestation Approved!',
      message: `Your credential claim for "${targetReq.credentialTitle}" was officially verified and approved by ${targetReq.issuerName || 'the issuing authority'}.`,
      type: 'verification',
      readAt: null,
      createdAt: timestamp
    };
    storageService.setNotifications([newNotif, ...notifs]);

    return { request: updatedReq, credential: credIndex !== -1 ? creds[credIndex] : null };
  },

  /**
   * Rejects a student's validation claim with required reason.
   * Persists rejection reason and timestamp, updates credential, and enables resubmission.
   */
  rejectValidationRequest(requestId, reason, reviewerUserId = 'user-issuer-01') {
    if (!reason || !reason.trim()) {
      throw new Error('A rejection reason must be provided.');
    }

    const requests = storageService.getValidationRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error('Validation request not found.');

    const targetReq = requests[reqIndex];
    const timestamp = new Date().toISOString();

    const updatedReq = {
      ...targetReq,
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedBy: reviewerUserId,
      reviewedAt: timestamp
    };
    requests[reqIndex] = updatedReq;
    storageService.setValidationRequests(requests);

    // Synchronize credential in storage: keep or set claimStatus as 'rejected'
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
        issuerStatus: 'pending', // Pending resubmission
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
      actorName: targetReq.issuerName || 'Issuing Authority',
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
      userId: targetReq.studentId || 'user-student-01',
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
  submitOrResubmitClaim(claimData) {
    const requests = storageService.getValidationRequests();
    const existingIndex = requests.findIndex(r => 
      r.credentialId === claimData.credentialId || 
      (claimData.credentialDbId && r.credentialDbId === claimData.credentialDbId)
    );

    const timestamp = new Date().toISOString();
    const newReq = {
      id: existingIndex !== -1 ? requests[existingIndex].id : `req-${Date.now()}`,
      credentialId: claimData.credentialId,
      credentialDbId: claimData.credentialDbId || null,
      studentId: claimData.studentId || 'user-student-01',
      studentName: claimData.studentName || 'Alex Chen',
      credentialTitle: claimData.credentialTitle,
      issuerId: claimData.issuerId || 'iss-003',
      issuerName: claimData.issuerName || 'Issuing Authority',
      submittedDate: timestamp.split('T')[0],
      status: 'pending',
      evidenceFileName: claimData.evidenceFileName || 'credential_evidence.pdf',
      fileHash: claimData.fileHash,
      rejectionReason: null,
      reviewedAt: null,
      reviewedBy: null
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
