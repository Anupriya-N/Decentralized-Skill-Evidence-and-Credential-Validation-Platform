import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { credentialService } from '../services/credentialService';
import { issuerService } from '../services/issuerService';
import toast from 'react-hot-toast';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [credentials, setCredentials] = useState(() => storageService.getCredentials());
  const [issuers, setIssuers] = useState(() => storageService.getIssuers());
  const [skills, setSkills] = useState(() => storageService.getSkills());
  const [notifications, setNotifications] = useState(() => storageService.getNotifications());
  const [auditLogs, setAuditLogs] = useState(() => storageService.getAuditLogs());
  const [verificationLogs, setVerificationLogs] = useState(() => storageService.getVerificationLogs());
  const [validationRequests, setValidationRequests] = useState(() => storageService.getValidationRequests());
  const [users, setUsers] = useState(() => storageService.getUsers());

  const refreshData = useCallback(() => {
    setCredentials([...storageService.getCredentials()]);
    setIssuers([...storageService.getIssuers()]);
    setSkills([...storageService.getSkills()]);
    setNotifications([...storageService.getNotifications()]);
    setAuditLogs([...storageService.getAuditLogs()]);
    setVerificationLogs([...storageService.getVerificationLogs()]);
    setValidationRequests([...storageService.getValidationRequests()]);
    setUsers([...storageService.getUsers()]);
  }, []);

  const resetAllDemoData = () => {
    storageService.resetDemoData();
    refreshData();
    toast.success('Demo environment reset to initial state.');
  };

  const addCredential = async (credentialData, fileObject, computedSha256) => {
    try {
      const newCred = await credentialService.createCredential(credentialData, fileObject, computedSha256);
      
      // If credential requires issuer verification, enqueue validation claim
      if (newCred.issuerStatus === 'pending') {
        issuerService.submitOrResubmitClaim({
          credentialId: newCred.credentialId,
          credentialDbId: newCred.id,
          studentId: newCred.ownerUserId,
          studentName: credentialData.studentName || 'Student',
          credentialTitle: newCred.title,
          issuerId: newCred.issuerId,
          issuerName: newCred.issuerName,
          evidenceFileName: newCred.fileName,
          fileHash: newCred.fileHash
        });
      }

      refreshData();
      toast.success(`Credential "${newCred.title}" registered with SHA-256 digest!`);
      return newCred;
    } catch (err) {
      toast.error(err.message || 'Failed to register credential.');
      throw err;
    }
  };

  const approveValidationRequestAction = async (requestId, actingUser = null) => {
    try {
      const result = await issuerService.approveValidationRequest(requestId, actingUser);
      refreshData();
      toast.success('Student claim verified and approved! Credential attested as trusted.');
      return result;
    } catch (err) {
      toast.error('Approval failed: ' + err.message);
      throw err;
    }
  };

  const rejectValidationRequestAction = async (requestId, reason, actingUser = null) => {
    try {
      const result = await issuerService.rejectValidationRequest(requestId, reason, actingUser);
      refreshData();
      toast.error(`Student claim rejected: "${reason}"`);
      return result;
    } catch (err) {
      toast.error('Rejection failed: ' + err.message);
      throw err;
    }
  };

  const updateIssuerTrustStatus = async (issuerId, newStatus, reason = '', actingUser = null) => {
    try {
      const updated = await issuerService.updateTrustStatus(issuerId, newStatus, reason, actingUser);
      refreshData();
      toast.success(`Issuer accreditation updated to: ${newStatus.toUpperCase()}`);
      return updated;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const revokeCredentialAction = async (credId, reason, actingUser = null, metaMaskSignature = null) => {
    try {
      const actorId = actingUser?.id || 'admin';
      const revoked = await credentialService.revokeCredential(credId, reason, actorId, metaMaskSignature);
      refreshData();
      toast.success(`Credential ${revoked.credentialId || credId} has been revoked.`);
      return revoked;
    } catch (err) {
      toast.error(err.message || 'Revocation failed.');
      throw err;
    }
  };

  const markNotificationRead = (notifId) => {
    const notifs = storageService.getNotifications();
    const updated = notifs.map(n => n.id === notifId ? { ...n, readAt: new Date().toISOString() } : n);
    storageService.setNotifications(updated);
    setNotifications(updated);
  };

  return (
    <AppContext.Provider value={{
      credentials,
      issuers,
      skills,
      notifications,
      auditLogs,
      verificationLogs,
      validationRequests,
      users,
      refreshData,
      resetAllDemoData,
      addCredential,
      approveValidationRequestAction,
      rejectValidationRequestAction,
      updateIssuerTrustStatus,
      revokeCredentialAction,
      markNotificationRead
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
