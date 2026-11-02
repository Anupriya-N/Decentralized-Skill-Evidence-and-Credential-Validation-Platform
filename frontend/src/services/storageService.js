import { INITIAL_USERS } from '../data/mockUsers';
import { INITIAL_ISSUERS } from '../data/mockIssuers';
import { INITIAL_CREDENTIALS, INITIAL_SKILLS } from '../data/mockCredentials';
import { INITIAL_NOTIFICATIONS, INITIAL_AUDIT_LOGS, INITIAL_VERIFICATION_LOGS } from '../data/mockNotifications';

const STORAGE_KEYS = {
  USERS: 'certitrust_users_v1',
  CURRENT_USER: 'certitrust_current_user_v1',
  CREDENTIALS: 'certitrust_credentials_v1',
  ISSUERS: 'certitrust_issuers_v1',
  SKILLS: 'certitrust_skills_v1',
  NOTIFICATIONS: 'certitrust_notifications_v1',
  AUDIT_LOGS: 'certitrust_audit_logs_v1',
  VERIFICATION_LOGS: 'certitrust_verification_logs_v1',
  DEMO_MODE: 'certitrust_demo_mode_v1'
};

function getStorageItem(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

export const storageService = {
  // Initialize and get all collections
  getUsers: () => getStorageItem(STORAGE_KEYS.USERS, INITIAL_USERS),
  setUsers: (users) => setStorageItem(STORAGE_KEYS.USERS, users),

  getCurrentUser: () => getStorageItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]), // Default to Alex Chen (student)
  setCurrentUser: (user) => setStorageItem(STORAGE_KEYS.CURRENT_USER, user),

  getCredentials: () => getStorageItem(STORAGE_KEYS.CREDENTIALS, INITIAL_CREDENTIALS),
  setCredentials: (creds) => setStorageItem(STORAGE_KEYS.CREDENTIALS, creds),

  getIssuers: () => getStorageItem(STORAGE_KEYS.ISSUERS, INITIAL_ISSUERS),
  setIssuers: (issuers) => setStorageItem(STORAGE_KEYS.ISSUERS, issuers),

  getSkills: () => getStorageItem(STORAGE_KEYS.SKILLS, INITIAL_SKILLS),
  setSkills: (skills) => setStorageItem(STORAGE_KEYS.SKILLS, skills),

  getNotifications: () => getStorageItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
  setNotifications: (notifs) => setStorageItem(STORAGE_KEYS.NOTIFICATIONS, notifs),

  getAuditLogs: () => getStorageItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
  setAuditLogs: (logs) => setStorageItem(STORAGE_KEYS.AUDIT_LOGS, logs),

  getVerificationLogs: () => getStorageItem(STORAGE_KEYS.VERIFICATION_LOGS, INITIAL_VERIFICATION_LOGS),
  setVerificationLogs: (logs) => setStorageItem(STORAGE_KEYS.VERIFICATION_LOGS, logs),

  // Reset demo state back to pristine seed
  resetDemoData: () => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(INITIAL_CREDENTIALS));
    localStorage.setItem(STORAGE_KEYS.ISSUERS, JSON.stringify(INITIAL_ISSUERS));
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(INITIAL_SKILLS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.VERIFICATION_LOGS, JSON.stringify(INITIAL_VERIFICATION_LOGS));
  }
};
