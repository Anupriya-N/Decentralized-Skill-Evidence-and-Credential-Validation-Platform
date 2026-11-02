import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Public pages
import { LandingPage } from '../pages/public/LandingPage';
import { AboutPage } from '../pages/public/AboutPage';
import { PublicVerifyPage } from '../pages/public/PublicVerifyPage';
import { PublicPortfolioPage } from '../pages/public/PublicPortfolioPage';
import { BlockchainProofPage } from '../pages/public/BlockchainProofPage';

// Auth pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

// Student pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { MyCredentials } from '../pages/student/MyCredentials';
import { CredentialDetailsPage } from '../pages/student/CredentialDetailsPage';
import { UploadEvidencePage } from '../pages/student/UploadEvidencePage';
import { SkillPortfolioPage } from '../pages/student/SkillPortfolioPage';
import { SharedCredentialsPage } from '../pages/student/SharedCredentialsPage';
import { StudentHistoryPage } from '../pages/student/StudentHistoryPage';
import { StudentAIAssistantPage } from '../pages/student/StudentAIAssistantPage';
import { StudentNotificationsPage } from '../pages/student/StudentNotificationsPage';
import { StudentProfilePage } from '../pages/student/StudentProfilePage';
import { StudentSettingsPage } from '../pages/student/StudentSettingsPage';

// Recruiter pages
import { RecruiterDashboard } from '../pages/recruiter/RecruiterDashboard';
import { RecruiterVerify } from '../pages/recruiter/RecruiterVerify';
import { CandidateSearch } from '../pages/recruiter/CandidateSearch';
import { CandidateDetails } from '../pages/recruiter/CandidateDetails';
import { SavedCandidates } from '../pages/recruiter/SavedCandidates';
import { RecruiterHistory } from '../pages/recruiter/RecruiterHistory';
import { RecruiterProfile } from '../pages/recruiter/RecruiterProfile';
import { RecruiterSettings } from '../pages/recruiter/RecruiterSettings';

// Issuer pages
import { IssuerDashboard } from '../pages/issuer/IssuerDashboard';
import { IssuerProfilePage } from '../pages/issuer/IssuerProfilePage';
import { IssuedCredentialsPage } from '../pages/issuer/IssuedCredentialsPage';
import { ValidationRequestsPage } from '../pages/issuer/ValidationRequestsPage';
import { IssueCredentialPage } from '../pages/issuer/IssueCredentialPage';
import { IssuerHistoryPage, IssuerSettingsPage } from '../pages/issuer/IssuerHistoryPage';

// Admin pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminUsers } from '../pages/admin/AdminUsers';
import { AdminIssuers } from '../pages/admin/AdminIssuers';
import { AdminCredentials } from '../pages/admin/AdminCredentials';
import { AdminBlockchain } from '../pages/admin/AdminBlockchain';
import { AdminLogs } from '../pages/admin/AdminLogs';
import { AdminReports } from '../pages/admin/AdminReports';
import { AdminAudit } from '../pages/admin/AdminAudit';
import { AdminSettings } from '../pages/admin/AdminSettings';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify/:credentialId" element={<PublicVerifyPage />} />
      <Route path="/verify" element={<PublicVerifyPage />} />
      <Route path="/portfolio/:studentId" element={<PublicPortfolioPage />} />
      <Route path="/blockchain-proof/:id" element={<BlockchainProofPage />} />

      {/* Student Portal */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="credentials" element={<MyCredentials />} />
        <Route path="credentials/:id" element={<CredentialDetailsPage />} />
        <Route path="upload" element={<UploadEvidencePage />} />
        <Route path="portfolio" element={<SkillPortfolioPage />} />
        <Route path="shared" element={<SharedCredentialsPage />} />
        <Route path="history" element={<StudentHistoryPage />} />
        <Route path="ai-assistant" element={<StudentAIAssistantPage />} />
        <Route path="notifications" element={<StudentNotificationsPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="settings" element={<StudentSettingsPage />} />
      </Route>

      {/* Recruiter Portal */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={['recruiter']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
        <Route path="dashboard" element={<RecruiterDashboard />} />
        <Route path="verify" element={<RecruiterVerify />} />
        <Route path="candidates" element={<CandidateSearch />} />
        <Route path="candidates/:id" element={<CandidateDetails />} />
        <Route path="saved" element={<SavedCandidates />} />
        <Route path="history" element={<RecruiterHistory />} />
        <Route path="profile" element={<RecruiterProfile />} />
        <Route path="settings" element={<RecruiterSettings />} />
      </Route>

      {/* Issuer Portal */}
      <Route
        path="/issuer"
        element={
          <ProtectedRoute allowedRoles={['issuer']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/issuer/dashboard" replace />} />
        <Route path="dashboard" element={<IssuerDashboard />} />
        <Route path="profile" element={<IssuerProfilePage />} />
        <Route path="credentials" element={<IssuedCredentialsPage />} />
        <Route path="requests" element={<ValidationRequestsPage />} />
        <Route path="issue" element={<IssueCredentialPage />} />
        <Route path="history" element={<IssuerHistoryPage />} />
        <Route path="settings" element={<IssuerSettingsPage />} />
      </Route>

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="issuers" element={<AdminIssuers />} />
        <Route path="credentials" element={<AdminCredentials />} />
        <Route path="blockchain" element={<AdminBlockchain />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
