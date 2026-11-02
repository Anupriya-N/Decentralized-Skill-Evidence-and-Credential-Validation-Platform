import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const loggedIn = authService.login(email, password);
      setUser(loggedIn);
      toast.success(`Welcome back, ${loggedIn.fullName}!`);
      return loggedIn;
    } catch (err) {
      toast.error(err.message || 'Login failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const newUser = authService.register(userData);
      setUser(newUser);
      toast.success(`Account created successfully as ${newUser.role}!`);
      return newUser;
    } catch (err) {
      toast.error(err.message || 'Registration failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.success('Logged out successfully.');
  };

  const switchDemoUser = (role) => {
    const target = authService.switchDemoUser(role);
    setUser({ ...target });
    toast.success(`Switched active demo account to: ${target.fullName} (${target.role.toUpperCase()})`);
  };

  const updateProfile = async (updateData) => {
    if (!user) return;
    try {
      const updated = authService.updateProfile(user.id, updateData);
      setUser(updated);
      toast.success('Profile updated successfully.');
      return updated;
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role || 'guest',
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      switchDemoUser,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
