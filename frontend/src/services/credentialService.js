import { storageService } from './storageService.js';
import { mockBlockchainAdapter } from '../adapters/blockchain/mockBlockchainAdapter.js';

export const credentialService = {
  getAllCredentials() {
    return storageService.getCredentials();
  },

  getCredentialById(idOrCredentialId) {
    const creds = storageService.getCredentials();
    return creds.find(c => c.id === idOrCredentialId || c.credentialId === idOrCredentialId) || null;
  },

  getUserCredentials(userId) {
    const creds = storageService.getCredentials();
    return creds.filter(c => c.ownerUserId === userId);
  },

  async createCredential(credentialData, fileObject, computedSha256) {
    const creds = storageService.getCredentials();
    const issuers = storageService.getIssuers();

    // Check if this is a resubmission for an existing credential
    if (credentialData.resubmitCredentialId) {
      const existingIdx = creds.findIndex(c => 
        c.id === credentialData.resubmitCredentialId || 
        c.credentialId === credentialData.resubmitCredentialId
      );
      if (existingIdx !== -1) {
        const existing = creds[existingIdx];
        const updated = {
          ...existing,
          title: credentialData.title || existing.title,
          skillName: credentialData.skillName || existing.skillName,
          category: credentialData.category || existing.category,
          description: credentialData.description !== undefined ? credentialData.description : existing.description,
          issueDate: credentialData.issueDate || existing.issueDate,
          expiryDate: credentialData.expiryDate || existing.expiryDate,
          fileName: fileObject?.name || existing.fileName,
          fileSize: fileObject?.size || existing.fileSize,
          mimeType: fileObject?.type || existing.mimeType,
          fileHash: computedSha256,
          claimStatus: 'pending',
          issuerStatus: 'pending',
          rejectionReason: null,
          version: (existing.version || 1) + 1,
          updatedAt: new Date().toISOString()
        };
        creds[existingIdx] = updated;
        storageService.setCredentials(creds);
        return updated;
      }
    }

    // Check issuer trust status
    const matchedIssuer = issuers.find(i => 
      i.id === credentialData.issuerId || 
      i.organizationName.toLowerCase() === (credentialData.issuer || '').toLowerCase()
    );

    const issuerStatus = matchedIssuer ? matchedIssuer.trustStatus : 'pending';
    const issuerId = matchedIssuer ? matchedIssuer.id : `iss-custom-${Date.now()}`;
    const issuerName = matchedIssuer ? matchedIssuer.organizationName : credentialData.issuer;

    const currentYear = new Date().getFullYear();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const credentialId = `CRED-${currentYear}-${randomDigits}`;

    // Register simulated blockchain proof record
    const blockchainProof = await mockBlockchainAdapter.registerProof(
      credentialId,
      computedSha256,
      matchedIssuer?.id || '0xSimulatedIssuer'
    );

    const newCredential = {
      id: `cred-${Date.now()}`,
      credentialId,
      ownerUserId: credentialData.ownerUserId,
      title: credentialData.title,
      skillName: credentialData.skillName,
      category: credentialData.category,
      description: credentialData.description || '',
      issuerId,
      issuerName,
      issueDate: credentialData.issueDate,
      expiryDate: credentialData.expiryDate || null,
      fileName: fileObject?.name || 'credential_evidence.pdf',
      mimeType: fileObject?.type || 'application/pdf',
      fileSize: fileObject?.size || 1024000,
      fileStorageKey: `evidence/${credentialId}_${fileObject?.name || 'doc.pdf'}`,
      fileHashAlgorithm: 'SHA-256',
      fileHash: computedSha256,
      integrityStatus: 'verified',
      issuerStatus: issuerStatus,
      credentialStatus: 'active',
      visibility: credentialData.visibility || 'public',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blockchainProof
    };

    const updatedCreds = [newCredential, ...creds];
    storageService.setCredentials(updatedCreds);

    // Auto link or create skill in student skill portfolio
    const skills = storageService.getSkills();
    const existingSkill = skills.find(s => 
      s.ownerUserId === credentialData.ownerUserId && 
      s.name.toLowerCase() === credentialData.skillName.toLowerCase()
    );

    if (existingSkill) {
      existingSkill.evidenceCredentialIds = [...new Set([...(existingSkill.evidenceCredentialIds || []), newCredential.id])];
      existingSkill.isSelfReported = false;
      storageService.setSkills([...skills]);
    } else {
      const newSkill = {
        id: `skill-${Date.now()}`,
        ownerUserId: credentialData.ownerUserId,
        name: credentialData.skillName,
        category: credentialData.category,
        proficiency: 'Advanced',
        isSelfReported: false,
        evidenceCredentialIds: [newCredential.id],
        visibility: 'public'
      };
      storageService.setSkills([...skills, newSkill]);
    }

    return newCredential;
  },

  updateCredentialMetadata(id, updateData) {
    const creds = storageService.getCredentials();
    const index = creds.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Credential not found.');

    // Important requirement: editing metadata must NOT alter original fileHash
    const updated = {
      ...creds[index],
      title: updateData.title || creds[index].title,
      skillName: updateData.skillName || creds[index].skillName,
      category: updateData.category || creds[index].category,
      description: updateData.description !== undefined ? updateData.description : creds[index].description,
      visibility: updateData.visibility || creds[index].visibility,
      updatedAt: new Date().toISOString()
    };

    creds[index] = updated;
    storageService.setCredentials(creds);
    return updated;
  },

  async revokeCredential(id, reason, actorUserId = 'admin') {
    const creds = storageService.getCredentials();
    const index = creds.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Credential not found.');

    const cred = creds[index];
    await mockBlockchainAdapter.recordRevocation(cred.credentialId, reason);

    cred.credentialStatus = 'revoked';
    cred.revocationReason = reason;
    cred.revokedAt = new Date().toISOString();
    cred.revokedBy = actorUserId;
    cred.updatedAt = new Date().toISOString();

    creds[index] = cred;
    storageService.setCredentials(creds);

    // Add audit log
    const auditLogs = storageService.getAuditLogs();
    const newAuditLog = {
      id: `audit-${Date.now()}`,
      actorUserId,
      actorName: 'Platform Administrator',
      action: 'CREDENTIAL_REVOKED',
      entityType: 'Credential',
      entityId: cred.id,
      reason,
      createdAt: new Date().toISOString()
    };
    storageService.setAuditLogs([newAuditLog, ...auditLogs]);

    return cred;
  },

  deleteCredential(id) {
    const creds = storageService.getCredentials();
    const filtered = creds.filter(c => c.id !== id);
    storageService.setCredentials(filtered);
    return true;
  }
};
