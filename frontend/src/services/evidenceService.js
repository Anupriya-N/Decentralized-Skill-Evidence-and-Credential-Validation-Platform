import { calculateSHA256 } from '../utils/hashUtils';
import { validateEvidenceFile } from '../utils/validationUtils';
import { storageService } from './storageService';

/**
 * Evidence Service
 * Handles client-side file reading, preview generation, SHA-256 calculation,
 * and duplicate file detection.
 */

export const evidenceService = {
  /**
   * Generates a temporary blob URL for instant previewing of images or PDFs
   * @param {File | Blob} file 
   * @returns {string} URL string
   */
  createPreviewUrl(file) {
    if (!file) return null;
    return URL.createObjectURL(file);
  },

  /**
   * Releases an allocated object URL to prevent memory leaks
   * @param {string} url 
   */
  revokePreviewUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  },

  /**
   * Calculates SHA-256 and checks for duplicate evidence across stored credentials
   * @param {File} file 
   * @param {string} currentCredentialId Optional (when resubmitting/editing)
   */
  async processAndCheckEvidence(file, currentCredentialId = null) {
    const validation = validateEvidenceFile(file);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors, fileHash: null, duplicate: null };
    }

    const fileHash = await calculateSHA256(file);
    const existingCreds = storageService.getCredentials();

    const duplicate = existingCreds.find(c => 
      c.id !== currentCredentialId &&
      c.credentialId !== currentCredentialId &&
      c.fileHash?.toLowerCase() === fileHash.toLowerCase()
    );

    return {
      valid: true,
      errors: [],
      fileHash,
      fileSize: file.size,
      mimeType: file.type,
      fileName: file.name,
      duplicateWarning: duplicate ? {
        found: true,
        credentialId: duplicate.credentialId,
        title: duplicate.title,
        registeredAt: duplicate.createdAt
      } : null
    };
  }
};
