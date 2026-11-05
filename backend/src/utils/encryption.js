import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const SALT = 'certitrust-institutional-key-salt-v1';

function getMasterKey() {
  const secret = process.env.INSTITUTION_KEY_ENCRYPTION_SECRET || env.JWT_SECRET;
  return crypto.scryptSync(secret, SALT, 32);
}

/**
 * Encrypts sensitive institutional private keys at rest using AES-256-GCM
 */
export function encryptPrivateKey(plaintextKey) {
  if (!plaintextKey) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  
  let encrypted = cipher.update(plaintextKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts encrypted institutional private key in memory for signing operations
 */
export function decryptPrivateKey(ciphertext) {
  if (!ciphertext) return null;
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // If not in encrypted format (e.g. legacy plain key in dev), return null to enforce encryption
    return null;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
