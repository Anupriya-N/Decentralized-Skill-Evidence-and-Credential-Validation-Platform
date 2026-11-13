import { apiClient } from './apiClient.js';
import { storageService } from './storageService.js';

// Role mappings between backend and frontend
export const ROLE_MAP_TO_FRONTEND = {
  STUDENT: 'student',
  INSTITUTION: 'issuer',
  EMPLOYER: 'recruiter',
  ADMIN: 'admin',
};

export const ROLE_MAP_TO_BACKEND = {
  student: 'STUDENT',
  issuer: 'INSTITUTION',
  recruiter: 'EMPLOYER',
  admin: 'ADMIN',
};

function normalizeBackendUser(user) {
  if (!user) return null;
  const frontendRole = ROLE_MAP_TO_FRONTEND[user.role] || user.role?.toLowerCase() || 'student';
  return {
    id: user.id,
    fullName: user.name || user.fullName || user.email?.split('@')[0] || 'User',
    email: user.email,
    role: frontendRole,
    rawRole: user.role,
    college: user.studentProfile?.enrollmentNumber || user.college || '',
    department: user.department || '',
    bio: user.bio || '',
    profileImage: user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    accountStatus: user.isActive !== false ? 'active' : 'suspended',
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString(),
    isPortfolioPublic: true
  };
}

export const authService = {
  getCurrentUser() {
    return storageService.getCurrentUser();
  },

  /**
   * Production-grade authentication against the real backend API.
   * Never silently falls back to prototype accounts.
   */
  async login(email, password) {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      if (res && res.data && res.data.accessToken) {
        apiClient.setToken(res.data.accessToken);
        if (res.data.refreshToken && typeof localStorage !== 'undefined') {
          localStorage.setItem('certitrust_refresh_token', res.data.refreshToken);
        }
        const normalized = normalizeBackendUser(res.data.user);
        storageService.setCurrentUser(normalized);
        return normalized;
      }
      throw new Error('Authentication response did not contain access token.');
    } catch (apiErr) {
      if (apiErr.status) {
        throw new Error(apiErr.data?.message || apiErr.data?.error || apiErr.message || 'Invalid credentials.');
      }
      throw new Error(`Unable to reach CertiTrust authentication server: ${apiErr.message || 'Connection refused'}`);
    }
  },

  /**
   * User registration via the real backend API.
   */
  async register(userData) {
    const backendRole = ROLE_MAP_TO_BACKEND[userData.role] || 'STUDENT';
    const payload = {
      email: userData.email,
      password: userData.password,
      name: userData.fullName,
      role: backendRole,
      institutionName: userData.organizationName || userData.fullName,
      companyName: userData.companyName || userData.fullName,
    };

    try {
      const res = await apiClient.post('/auth/register', payload);
      if (res && res.data && res.data.accessToken) {
        apiClient.setToken(res.data.accessToken);
        if (res.data.refreshToken && typeof localStorage !== 'undefined') {
          localStorage.setItem('certitrust_refresh_token', res.data.refreshToken);
        }
        const normalized = normalizeBackendUser(res.data.user);
        storageService.setCurrentUser(normalized);
        return normalized;
      }
      throw new Error('Registration did not return valid session tokens.');
    } catch (apiErr) {
      if (apiErr.status) {
        throw new Error(apiErr.data?.message || apiErr.data?.error || apiErr.message || 'Registration failed.');
      }
      throw new Error(`Unable to reach CertiTrust server during registration: ${apiErr.message || 'Connection refused'}`);
    }
  },

  /**
   * Clears tokens and session state.
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (_) {}
    apiClient.clearSession();
    return true;
  },

  /**
   * Dedicated Demo switcher for offline academic defense only.
   */
  switchDemoUser(role) {
    const users = storageService.getUsers();
    const target = users.find(u => u.role === role) || users[0];
    storageService.setCurrentUser(target);
    return target;
  },

  updateProfile(userId, updateData) {
    const users = storageService.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    const updated = {
      ...users[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    users[index] = updated;
    storageService.setUsers(users);
    storageService.setCurrentUser(updated);
    return updated;
  }
};
