import { storageService } from './storageService';

/**
 * Issuer Service
 * Manages institutional verification applications, document uploads,
 * pending claim queues, and attestations.
 */

export const issuerService = {
  getIssuers() {
    return storageService.getIssuers();
  },

  getIssuerById(id) {
    const issuers = storageService.getIssuers();
    return issuers.find(i => i.id === id) || null;
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
    return updated;
  }
};
