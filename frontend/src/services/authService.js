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

  async login(email, password) {
    try {
      // First attempt real live API login
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
    } catch (apiErr) {
      if (apiErr.status && apiErr.status < 500) {
        throw new Error(apiErr.data?.message || apiErr.data?.error || apiErr.message || 'Invalid credentials.');
      }
      console.warn('[authService] Backend API not reachable. Checking local prototype store:', apiErr.message);
    }

    // Local prototype fallback
    const users = storageService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      throw new Error('Account not found with this email.');
    }
    if (user.password !== password) {
      throw new Error('Invalid password. Please check your credentials.');
    }
    if (user.accountStatus === 'suspended') {
      throw new Error('Account has been suspended. Please contact platform administration.');
    }
    storageService.setCurrentUser(user);
    return user;
  },

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
    } catch (apiErr) {
      if (apiErr.status && apiErr.status < 500) {
        throw new Error(apiErr.data?.message || apiErr.data?.error || apiErr.message || 'Registration failed.');
      }
      console.warn('[authService] Backend API not reachable during register. Utilizing local fallback:', apiErr.message);
    }

    // Local prototype fallback
    const users = storageService.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === userData.email.trim().toLowerCase());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser = {
      id: `user-${Date.now()}`,
      fullName: userData.fullName,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'student',
      college: userData.college || '',
      department: userData.department || '',
      bio: userData.bio || '',
      profileImage: userData.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      accountStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPortfolioPublic: true
    };

    const updatedUsers = [...users, newUser];
    storageService.setUsers(updatedUsers);
    storageService.setCurrentUser(newUser);

    if (newUser.role === 'issuer') {
      const issuers = storageService.getIssuers();
      const newIssuer = {
        id: `iss-${Date.now()}`,
        organizationName: userData.organizationName || userData.fullName,
        organizationType: userData.organizationType || 'Educational Institution',
        email: userData.email,
        website: userData.website || '',
        description: userData.description || '',
        proofDocumentName: 'Accreditation_Proof.pdf',
        trustStatus: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: 'New self-service registration pending review.',
        createdAt: new Date().toISOString(),
        credentialsIssuedCount: 0
      };
      storageService.setIssuers([...issuers, newIssuer]);
    }

    return newUser;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (_) {}
    apiClient.setToken(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('certitrust_refresh_token');
      localStorage.removeItem('certitrust_current_user_v1');
    }
    return true;
  },

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
