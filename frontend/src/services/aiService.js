import { mockAIAdapter } from '../adapters/ai/mockAIAdapter';
import { apiClient } from './apiClient';

/**
 * AI Service
 * Centralized interface for certificate OCR extraction, skill categorization,
 * portfolio summary generation, and job description skill gap analysis.
 * Prepared for Google Gemini API integration through protected backend endpoints.
 */

export const aiService = {
  isConfiguredWithBackend() {
    return Boolean(import.meta.env.VITE_ENABLE_REAL_AI === 'true');
  },

  async extractCertificateDetails(file, studentName = 'Student', existingCredentials = []) {
    if (this.isConfiguredWithBackend()) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('studentName', studentName);
        return await apiClient.request('/ai/extract', {
          method: 'POST',
          body: formData,
          headers: {} // let browser set boundary
        });
      } catch (err) {
        console.warn('Backend AI unavailable. Falling back to local assistive adapter.', err);
      }
    }
    return await mockAIAdapter.extractCertificateDetails(file, studentName, existingCredentials);
  },

  async categorizeSkill(skillName) {
    if (this.isConfiguredWithBackend()) {
      try {
        return await apiClient.post('/ai/categorize', { skillName });
      } catch (err) {
        // fallback
      }
    }
    return await mockAIAdapter.categorizeSkill(skillName);
  },

  async analyzeJobSkillGap(jobDescription, studentSkills) {
    if (this.isConfiguredWithBackend()) {
      try {
        return await apiClient.post('/ai/gap-analysis', { jobDescription, studentSkills });
      } catch (err) {
        // fallback
      }
    }
    return await mockAIAdapter.analyzeJobSkillGap(jobDescription, studentSkills);
  },

  async generatePortfolioSummary(profile, credentials, skills) {
    if (this.isConfiguredWithBackend()) {
      try {
        return await apiClient.post('/ai/portfolio-summary', { profile, credentials, skills });
      } catch (err) {
        // fallback
      }
    }
    return await mockAIAdapter.generatePortfolioSummary(profile, credentials, skills);
  }
};
