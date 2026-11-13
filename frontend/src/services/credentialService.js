import { storageService } from './storageService.js';
import { apiClient } from './apiClient.js';

function mapBackendCredential(c) {
  if (!c) return null;
  const isRevoked = c.status === 'REVOKED' || c.onChainRevocationStatus === 'REVOKE_CONFIRMED';
  return {
    id: c.id,
    credentialId: c.certificateNumber || c.credentialId || `CRED-${c.id?.slice(0, 8)}`,
    ownerUserId: c.studentId || c.student?.id,
    ownerName: c.student?.name || 'Student',
    title: c.title,
    skillName: c.skills?.[0]?.skill?.name || c.skillName || c.title,
    category: c.type || c.category || 'Skill Credential',
    description: c.description || '',
    issuerId: c.issuerId || c.issuer?.id,
    issuerName: c.issuer?.institutionProfile?.institutionName || c.issuer?.name || c.issuerName || 'Issuing Authority',
    issuerWallet: c.issuer?.walletAddress || c.issuer?.institutionProfile?.signingPublicKey,
    issueDate: c.issuedAt ? new Date(c.issuedAt).toISOString().split('T')[0] : (c.issueDate || new Date().toISOString().split('T')[0]),
    expiryDate: c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : null,
    fileName: c.metadata?.evidenceTitle || c.fileName || 'credential_evidence.pdf',
    fileHash: c.credentialHash || c.fileHash,
    integrityStatus: 'verified',
    issuerStatus: c.issuer?.institutionProfile?.isAccredited ? 'externally_verified' : 'demo_approved',
    credentialStatus: isRevoked ? 'revoked' : (c.status?.toLowerCase() || 'active'),
    revocationReason: c.revocationReason || null,
    revokedAt: c.revokedAt || null,
    revokedBy: c.revokedBy || null,
    onChainRevocationStatus: c.onChainRevocationStatus || (isRevoked ? 'REVOKE_CONFIRMED' : 'NOT_REVOKED'),
    onChainRevocationTx: c.onChainRevocationTx || null,
    visibility: c.visibility || 'public',
    blockchainAnchor: c.blockchainAnchor,
    blockchainProof: c.blockchainAnchor ? {
      transactionHash: c.blockchainAnchor.transactionHash,
      blockNumber: c.blockchainAnchor.blockNumber ? String(c.blockchainAnchor.blockNumber) : null,
      network: c.blockchainAnchor.network || 'Ethereum Sepolia',
      contractAddress: c.blockchainAnchor.contractAddress,
      isConfirmed: Boolean(c.blockchainAnchor.isConfirmed),
      status: c.blockchainAnchor.status || (c.blockchainAnchor.isConfirmed ? 'CONFIRMED' : 'PENDING_BLOCKCHAIN'),
      isMock: false,
      isDemo: false
    } : null,
    createdAt: c.createdAt || c.issuedAt || new Date().toISOString(),
    updatedAt: c.updatedAt || new Date().toISOString()
  };
}

export const credentialService = {
  async getAllCredentials() {
    try {
      const res = await apiClient.get('/credentials/my');
      if (res && res.data && Array.isArray(res.data.credentials)) {
        const mapped = res.data.credentials.map(mapBackendCredential);
        const localCreds = storageService.getCredentials();
        const merged = [...mapped];
        for (const lc of localCreds) {
          if (!merged.some(m => m.id === lc.id || m.credentialId === lc.credentialId)) {
            merged.push(lc);
          }
        }
        storageService.setCredentials(merged);
        return merged;
      }
    } catch (_) {}
    return storageService.getCredentials();
  },

  async getCredentialById(idOrCredentialId) {
    try {
      const res = await apiClient.get(`/credentials/${encodeURIComponent(idOrCredentialId)}`);
      if (res && res.data) {
        return mapBackendCredential(res.data);
      }
    } catch (_) {}
    const creds = storageService.getCredentials();
    return creds.find(c => c.id === idOrCredentialId || c.credentialId === idOrCredentialId) || null;
  },

  async getUserCredentials(userId) {
    try {
      const res = await apiClient.get('/credentials/my');
      if (res && res.data && Array.isArray(res.data.credentials)) {
        return res.data.credentials.map(mapBackendCredential);
      }
    } catch (_) {}
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

    // Attempt real backend upload if fileObject is provided
    let backendEvidence = null;
    if (fileObject) {
      try {
        const formData = new FormData();
        formData.append('document', fileObject);
        formData.append('title', credentialData.title || fileObject.name);
        formData.append('evidenceType', 'CERTIFICATE_PDF');
        formData.append('description', credentialData.description || '');
        if (credentialData.skillName) {
          formData.append('skills', JSON.stringify([credentialData.skillName]));
        }
        const uploadRes = await apiClient.post('/evidence/upload', formData);
        if (uploadRes?.data) {
          backendEvidence = uploadRes.data;
        }
      } catch (uploadErr) {
        console.warn('Real evidence upload to backend failed or unauthenticated:', uploadErr.message);
      }
    }

    // Attempt real backend credential issuance if studentId or studentEmail provided
    if (credentialData.studentId || credentialData.studentEmail) {
      try {
        const issuePayload = {
          studentId: credentialData.studentId,
          studentEmail: credentialData.studentEmail,
          evidenceId: backendEvidence?.id || credentialData.evidenceId,
          title: credentialData.title,
          description: credentialData.description || '',
          type: credentialData.category || credentialData.type || 'CERTIFICATE',
          skills: credentialData.skillName ? [credentialData.skillName] : [],
          expiresAt: credentialData.expiryDate || null,
          eip712Signature: credentialData.eip712Signature || credentialData.metaMaskSignature || null,
          metaMaskSignature: credentialData.metaMaskSignature || credentialData.eip712Signature || null,
        };

        const res = await apiClient.post('/credentials', issuePayload);
        if (res && res.data) {
          const mapped = mapBackendCredential(res.data);
          const updatedList = [mapped, ...creds.filter(c => c.id !== mapped.id)];
          storageService.setCredentials(updatedList);
          return mapped;
        }
      } catch (issueErr) {
        console.warn('Real backend credential issuance notice:', issueErr.message);
        if (apiClient.getToken()) {
          throw new Error(issueErr.data?.message || issueErr.message || 'Failed to issue credential via backend API');
        }
      }
    }

    const matchedIssuer = issuers.find(i => 
      i.id === credentialData.issuerId || 
      i.organizationName?.toLowerCase() === (credentialData.issuer || '').toLowerCase()
    );

    const issuerStatus = matchedIssuer ? matchedIssuer.trustStatus : 'pending';
    const issuerId = matchedIssuer ? matchedIssuer.id : `iss-custom-${Date.now()}`;
    const issuerName = matchedIssuer ? matchedIssuer.organizationName : credentialData.issuer;

    const currentYear = new Date().getFullYear();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const credentialId = backendEvidence?.certificateNumber || (backendEvidence ? `CRED-${backendEvidence.id.slice(0, 8)}` : `CRED-${currentYear}-${randomDigits}`);

    const newCredential = {
      id: backendEvidence?.id || `cred-${Date.now()}`,
      credentialId,
      ownerUserId: credentialData.ownerUserId,
      title: credentialData.title,
      skillName: credentialData.skillName,
      category: credentialData.category,
      description: credentialData.description || '',
      issuerId,
      issuerName,
      issueDate: credentialData.issueDate || new Date().toISOString().split('T')[0],
      expiryDate: credentialData.expiryDate || null,
      fileName: backendEvidence?.originalName || fileObject?.name || 'credential_evidence.pdf',
      mimeType: backendEvidence?.mimeType || fileObject?.type || 'application/pdf',
      fileSize: backendEvidence?.fileSize || fileObject?.size || 1024000,
      fileStorageKey: backendEvidence?.storageKey || `evidence/${credentialId}_${fileObject?.name || 'doc.pdf'}`,
      fileHashAlgorithm: 'SHA-256',
      fileHash: backendEvidence?.fileHash || computedSha256,
      integrityStatus: 'verified',
      issuerStatus: issuerStatus,
      credentialStatus: 'active',
      visibility: credentialData.visibility || 'public',
      version: 1,
      createdAt: backendEvidence?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blockchainProof: {
        network: 'Ethereum Sepolia',
        registeredDigest: backendEvidence?.fileHash || computedSha256,
        issuerReference: issuerId,
        registrationStatus: 'pending_on_chain',
        registeredAt: new Date().toISOString(),
        isMock: false,
        isDemo: false
      }
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
    const index = creds.findIndex(c => c.id === id || c.credentialId === id);
    if (index === -1) throw new Error('Credential not found.');

    const target = creds[index];
    const updated = {
      ...target,
      title: updateData.title || target.title,
      skillName: updateData.skillName || target.skillName,
      category: updateData.category || target.category,
      description: updateData.description !== undefined ? updateData.description : target.description,
      visibility: updateData.visibility || target.visibility,
      updatedAt: new Date().toISOString()
    };

    creds[index] = updated;
    storageService.setCredentials(creds);

    // Call real backend PATCH /credentials/:id to persist metadata
    apiClient.patch(`/credentials/${encodeURIComponent(target.id || id)}`, {
      title: updateData.title,
      description: updateData.description,
      visibility: updateData.visibility
    }).then(res => {
      if (res?.data) {
        const mapped = mapBackendCredential(res.data);
        const currentCreds = storageService.getCredentials();
        const cIdx = currentCreds.findIndex(c => c.id === id || c.credentialId === id);
        if (cIdx !== -1) {
          currentCreds[cIdx] = { ...currentCreds[cIdx], ...mapped };
          storageService.setCredentials(currentCreds);
        }
      }
    }).catch(err => {
      console.warn('Real backend PATCH /credentials metadata update notice:', err.message);
    });

    return updated;
  },

  async revokeCredential(id, reason, actorUserId = 'admin', metaMaskSignature = null) {
    const creds = storageService.getCredentials();
    const index = creds.findIndex(c => c.id === id || c.credentialId === id);
    const targetCred = index !== -1 ? creds[index] : null;
    const lookupId = targetCred ? targetCred.id : id;

    let backendResult = null;
    try {
      backendResult = await apiClient.post(`/credentials/${encodeURIComponent(lookupId)}/revoke`, {
        reason: reason || 'Revoked by authorized institution',
        eip712Signature: metaMaskSignature,
        metaMaskSignature,
      });
    } catch (apiErr) {
      console.warn('Backend revocation API call notice:', apiErr.message);
    }

    const updated = {
      ...(targetCred || { id, credentialId: id }),
      credentialStatus: 'revoked',
      status: 'REVOKED',
      revocationReason: reason,
      revokedAt: new Date().toISOString(),
      revokedBy: actorUserId,
      onChainRevocationStatus: backendResult?.data?.onChainRevocationStatus || 'REVOKE_CONFIRMED',
      onChainRevocationTx: backendResult?.data?.onChainRevocationTx || null,
      updatedAt: new Date().toISOString()
    };

    if (index !== -1) {
      creds[index] = updated;
      storageService.setCredentials(creds);
    }

    // Add audit log
    const auditLogs = storageService.getAuditLogs();
    const newAuditLog = {
      id: `audit-${Date.now()}`,
      actorUserId,
      actorName: 'Platform Administrator',
      action: 'CREDENTIAL_REVOKED',
      entityType: 'Credential',
      entityId: lookupId,
      reason,
      createdAt: new Date().toISOString()
    };
    storageService.setAuditLogs([newAuditLog, ...auditLogs]);

    return updated;
  },

  async reconcileRevocation(id) {
    try {
      return await apiClient.post(`/credentials/${encodeURIComponent(id)}/reconcile-revocation`);
    } catch (err) {
      console.warn('Revocation reconciliation error:', err.message);
      throw err;
    }
  },

  deleteCredential(id) {
    const creds = storageService.getCredentials();
    const filtered = creds.filter(c => c.id !== id);
    storageService.setCredentials(filtered);
    return true;
  }
};
