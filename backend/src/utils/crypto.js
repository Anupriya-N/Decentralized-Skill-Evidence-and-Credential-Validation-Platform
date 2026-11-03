import crypto from 'crypto';
import fs from 'fs';

/**
 * Computes SHA-256 hash of a string or buffer
 */
export function computeSha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes SHA-256 hash of a file on disk via streaming
 */
export function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Calculates Merkle Root from an array of leaf hashes
 */
export function computeMerkleRoot(hashes) {
  if (!hashes || hashes.length === 0) {
    return computeSha256('');
  }
  let currentLevel = hashes.map((h) => (h.startsWith('0x') ? h.slice(2) : h));

  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        const combined = currentLevel[i] + currentLevel[i + 1];
        nextLevel.push(computeSha256(combined));
      } else {
        const combined = currentLevel[i] + currentLevel[i];
        nextLevel.push(computeSha256(combined));
      }
    }
    currentLevel = nextLevel;
  }

  return '0x' + currentLevel[0];
}

/**
 * Generates an institutional certificate serial number
 * e.g., "CERT-2026-CS-4928"
 */
export function generateCertificateNumber(prefix = 'CERT', department = 'CS') {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix.toUpperCase()}-${year}-${department.toUpperCase()}-${randomSuffix}`;
}

/**
 * Generates an institutional cryptographic digital signature
 */
export function generateDigitalSignature(payload, issuerPrivateKey = 'mock-private-key') {
  const hmac = crypto.createHmac('sha256', issuerPrivateKey);
  hmac.update(payload);
  return '0x' + hmac.digest('hex');
}
