import { storageService } from './storageService';

export const authService = {
  getCurrentUser() {
    return storageService.getCurrentUser();
  },

  login(email, password) {
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

  register(userData) {
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

    // If an issuer registers, create an issuer application entry
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

  logout() {
    // For demo purposes, we can clear current user or default to null
    // But to keep demo smooth, let's keep session clean
    localStorage.removeItem('certitrust_current_user_v1');
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
