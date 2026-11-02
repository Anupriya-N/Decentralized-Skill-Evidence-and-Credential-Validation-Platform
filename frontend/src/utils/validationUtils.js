/**
 * Validation utilities
 */

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateEvidenceFile(file) {
  const errors = [];
  if (!file) {
    errors.push('No file selected.');
    return { valid: false, errors };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    errors.push('Invalid file format. Allowed formats: PDF, JPEG, PNG, WEBP.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push('File size exceeds the 10 MB limit.');
  }

  if (file.size === 0) {
    errors.push('Selected file is empty.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function validateCredentialForm(data) {
  const errors = {};
  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters.';
  }
  if (!data.skillName || data.skillName.trim().length < 2) {
    errors.skillName = 'Skill name is required.';
  }
  if (!data.category) {
    errors.category = 'Category is required.';
  }
  if (!data.issuer) {
    errors.issuer = 'Issuer name is required.';
  }
  if (!data.issueDate) {
    errors.issueDate = 'Issue date is required.';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
