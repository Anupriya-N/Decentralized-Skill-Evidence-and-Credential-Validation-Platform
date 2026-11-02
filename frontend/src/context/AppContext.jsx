import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { credentialService } from '../services/credentialService';
import toast from 'react-hot-toast';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [credentials, setCredentials] = useState(() => storageService.getCredentials());
  const [issuers, setIssuers] = useState(() => storageService.getIssuers());
  const [skills, setSkills] = useState(() => storageService.getSkills());
  const [notifications, setNotifications] = useState(() => storageService.getNotifications());
  const [auditLogs, setAuditLogs] = useState(() => storageService.getAuditLogs());
  const [verificationLogs, setVerificationLogs] = useState(() => storageService.getVerificationLogs());
  const [users, setUsers] = useState(() => storageService.getUsers());

  const refreshData = useCallback(() => {
    setCredentials([...storageService.getCredentials()]);
    setIssuers([...storageService.getIssuers()]);
    setSkills([...storageService.getSkills()]);
    setNotifications([...storageService.getNotifications()]);
    setAuditLogs([...storageService.getAuditLogs()]);
    setVerificationLogs([...storageService.getVerificationLogs()]);
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
      refreshData();
      toast.success(`Credential "${newCred.title}" registered with SHA-256 digest!`);
      return newCred;
    } catch (err) {
      toast.error(err.message || 'Failed to register credential.');
      throw err;
    }
  };

  const updateIssuerTrustStatus = (issuerId, newStatus, reason = '') => {
    const allIssuers = storageService.getIssuers();
    const index = allIssuers.findIndex(i => i.id === issuerId);
    if (index === -1) return;

    allIssuers[index] = {
      ...allIssuers[index],
      trustStatus: newStatus,
      reviewReason: reason || `Updated to ${newStatus} by administrator.`,
      reviewedAt: new Date().toISOString()
    };
    storageService.setIssuers(allIssuers);

    // Also update credentials that depend on this issuer
    const allCreds = storageService.getCredentials();
    const updatedCreds = allCreds.map(c => {
      if (c.issuerId === issuerId) {
        return { ...c, issuerStatus: newStatus };
      }
      return c;
    });
    storageService.setCredentials(updatedCreds);

    // Record audit log
    const currentAudit = storageService.getAuditLogs();
    const newAudit = {
      id: `audit-${Date.now()}`,
      actorUserId: 'user-admin-01',
      actorName: 'Administrator',
      action: `ISSUER_${newStatus.toUpperCase()}`,
      entityType: 'Issuer',
      entityId: issuerId,
      reason: reason || `Issuer trust status changed to ${newStatus}.`,
      createdAt: new Date().toISOString()
    };
    storageService.setAuditLogs([newAudit, ...currentAudit]);

    refreshData();
    toast.success(`Issuer status updated to: ${newStatus.toUpperCase()}`);
  };

  const revokeCredentialAction = async (credId, reason) => {
    try {
      const revoked = await credentialService.revokeCredential(credId, reason);
      refreshData();
      toast.error(`Credential ${revoked.credentialId} has been revoked.`);
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
      users,
      refreshData,
      resetAllDemoData,
      addCredential,
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
