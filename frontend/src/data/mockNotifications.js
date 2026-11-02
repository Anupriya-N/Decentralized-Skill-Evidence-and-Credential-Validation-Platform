export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-001',
    recipientUserId: 'user-student-01',
    type: 'verification',
    title: 'Credential Verified by Recruiter',
    message: 'Sarah Jenkins (Apex Talent Global) verified your "Certified Solutions Architect" credential via QR link.',
    readAt: null,
    createdAt: '2025-02-14T11:20:00Z'
  },
  {
    id: 'notif-002',
    recipientUserId: 'user-student-01',
    type: 'issuer_status',
    title: 'Issuer Review in Progress',
    message: 'DeepLearning Intelligence Labs application is under administrative review.',
    readAt: '2025-02-12T09:00:00Z',
    createdAt: '2025-02-10T12:00:00Z'
  },
  {
    id: 'notif-003',
    recipientUserId: 'user-issuer-01',
    type: 'claim_request',
    title: 'New Credential Validation Request',
    message: 'Student Alex Chen submitted a claim for "Certified Solutions Architect - Cloud Infrastructure".',
    readAt: '2025-01-21T10:00:00Z',
    createdAt: '2025-01-20T18:00:00Z'
  },
  {
    id: 'notif-004',
    recipientUserId: 'user-admin-01',
    type: 'issuer_application',
    title: 'New Issuer Application Received',
    message: 'DeepLearning Intelligence Labs submitted institutional accreditation for review.',
    readAt: null,
    createdAt: '2025-02-10T11:45:00Z'
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'audit-001',
    actorUserId: 'user-admin-01',
    actorName: 'Elena Rostova (Admin)',
    action: 'ISSUER_APPROVED',
    entityType: 'Issuer',
    entityId: 'iss-001',
    reason: 'Charter verified with Higher Education Commission records.',
    createdAt: '2024-12-01T10:00:00Z'
  },
  {
    id: 'audit-002',
    actorUserId: 'user-admin-01',
    actorName: 'Elena Rostova (Admin)',
    action: 'CREDENTIAL_REVOKED',
    entityType: 'Credential',
    entityId: 'cred-005',
    reason: 'Issuing organization suspended following fraudulent duplicate certificate findings.',
    createdAt: '2025-01-21T14:30:00Z'
  },
  {
    id: 'audit-003',
    actorUserId: 'user-admin-01',
    actorName: 'Elena Rostova (Admin)',
    action: 'ISSUER_SUSPENDED',
    entityType: 'Issuer',
    entityId: 'iss-004',
    reason: 'Suspended pending investigation of unauthorized certificate batches.',
    createdAt: '2025-01-21T14:35:00Z'
  }
];

export const INITIAL_VERIFICATION_LOGS = [
  {
    id: 'vlog-001',
    credentialId: 'CRED-2025-9481',
    credentialTitle: 'Certified Solutions Architect - Cloud Infrastructure',
    verifierUserId: 'user-recruiter-01',
    verifierName: 'Sarah Jenkins (Apex Talent Global)',
    verificationMethod: 'QR Code',
    recordFound: true,
    hashStatus: 'MATCH',
    issuerStatus: 'TRUSTED',
    credentialStatus: 'ACTIVE',
    result: 'VALID',
    createdAt: '2025-02-14T11:20:00Z'
  },
  {
    id: 'vlog-002',
    credentialId: 'CRED-2025-3312',
    credentialTitle: 'Bachelor of Science in Computer Science - Honors Capstone',
    verifierUserId: null,
    verifierName: 'Anonymous Verifier (Public Link)',
    verificationMethod: 'Public Link',
    recordFound: true,
    hashStatus: 'MATCH',
    issuerStatus: 'TRUSTED',
    credentialStatus: 'ACTIVE',
    result: 'VALID',
    createdAt: '2025-02-12T15:45:00Z'
  },
  {
    id: 'vlog-003',
    credentialId: 'CRED-2024-6590',
    credentialTitle: 'Smart Contract Security & Auditing Foundations',
    verifierUserId: 'user-recruiter-01',
    verifierName: 'Sarah Jenkins (Apex Talent Global)',
    verificationMethod: 'Manual ID',
    recordFound: true,
    hashStatus: 'MATCH',
    issuerStatus: 'SUSPENDED',
    credentialStatus: 'REVOKED',
    result: 'REVOKED_FLAGGED',
    createdAt: '2025-02-05T09:10:00Z'
  }
];
