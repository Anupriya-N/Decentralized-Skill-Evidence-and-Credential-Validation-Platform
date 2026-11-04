import crypto from 'crypto';
import fs from 'fs';
import { ethers } from 'ethers';

/**
 * Normalizes credential payload deterministically before hashing
 */
export function normalizeCredentialPayload(data) {
  const normalized = {
    certificateNumber: String(data.certificateNumber || '').trim(),
    studentId: String(data.studentId || '').trim(),
    issuerId: String(data.issuerId || '').trim(),
    title: String(data.title || '').trim(),
    type: String(data.type || 'CERTIFICATE'),
    badgeLevel: String(data.badgeLevel || 'BRONZE'),
    grade: data.grade ? String(data.grade).trim() : null,
    courseCode: data.courseCode ? String(data.courseCode).trim() : null,
    issuedAt: data.issuedAt ? new Date(data.issuedAt).toISOString() : new Date().toISOString(),
  };

  const sortedKeys = Object.keys(normalized).sort();
  const sortedObj = {};
  for (const k of sortedKeys) {
    sortedObj[k] = normalized[k];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Computes SHA-256 hash of a string or buffer
 */
export function computeSha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes Keccak-256 (Ethereum native) hash
 */
export function computeKeccak256(data) {
  const bytes = typeof data === 'string' ? ethers.toUtf8Bytes(data) : data;
  return ethers.keccak256(bytes);
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
    return '0x' + computeSha256('');
  }
  let currentLevel = hashes.map((h) => (h.startsWith('0x') ? h.slice(2) : h));

  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        const combined = left < right ? left + right : right + left;
        nextLevel.push(computeSha256(combined));
      } else {
        const left = currentLevel[i];
        const combined = left + left;
        nextLevel.push(computeSha256(combined));
      }
    }
    currentLevel = nextLevel;
  }

  return '0x' + currentLevel[0];
}

/**
 * Validates Merkle Root against leaf hash
 */
export function verifyMerkleRootMatch(leafHash, expectedRoot) {
  if (!leafHash || !expectedRoot) return false;
  const calculatedRoot = computeMerkleRoot([leafHash]);
  return calculatedRoot.toLowerCase() === expectedRoot.toLowerCase();
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
 * Generates a genuine institutional digital signature using an Ethereum ECDSA private key.
 * REJECTS mock keys or fallback strings.
 */
export async function signCredentialPayload(normalizedPayload, institutionalPrivateKey) {
  if (!institutionalPrivateKey) {
    throw new Error('Institutional private signing key is missing or not configured');
  }

  const cleanKey = institutionalPrivateKey.startsWith('0x')
    ? institutionalPrivateKey
    : `0x${institutionalPrivateKey}`;

  if (cleanKey.length !== 66) {
    throw new Error('Invalid institutional private signing key: must be a 32-byte hex string (64 characters or 66 with 0x)');
  }

  const wallet = new ethers.Wallet(cleanKey);
  const hash = computeKeccak256(normalizedPayload);
  const signature = await wallet.signMessage(ethers.getBytes(hash));

  return {
    signature,
    signerAddress: wallet.address,
    algorithm: 'ECDSA_SECP256K1',
  };
}

/**
 * Cryptographically verifies digital signature against payload and expected issuer Ethereum address.
 * No mock verification or fake string checks.
 */
export function verifyCredentialSignature(normalizedPayload, signature, expectedSignerAddress) {
  if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
    return { isValid: false, reason: 'Malformed or missing digital signature format' };
  }

  if (!expectedSignerAddress || !ethers.isAddress(expectedSignerAddress)) {
    return { isValid: false, reason: 'Expected issuer address is invalid or not registered' };
  }

  try {
    const hash = computeKeccak256(normalizedPayload);
    const recoveredAddress = ethers.verifyMessage(ethers.getBytes(hash), signature);
    const isMatch = recoveredAddress.toLowerCase() === expectedSignerAddress.toLowerCase();

    if (isMatch) {
      return { isValid: true, recoveredAddress, algorithm: 'ECDSA_SECP256K1' };
    }

    return {
      isValid: false,
      reason: `Recovered signer address ${recoveredAddress} does not match authorized issuer address ${expectedSignerAddress}`,
      recoveredAddress,
    };
  } catch (err) {
    return { isValid: false, reason: `Cryptographic signature verification failed: ${err.message}` };
  }
}

/**
 * Validates actual file signature using magic bytes (header inspection)
 */
export function validateFileMagicBytes(filePath) {
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return { isValid: true, detectedType: 'application/pdf' };
    }

    // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { isValid: true, detectedType: 'image/png' };
    }

    // JPEG magic bytes: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true, detectedType: 'image/jpeg' };
    }

    // WEBP magic bytes: RIFF....WEBP (0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50)
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { isValid: true, detectedType: 'image/webp' };
    }

    return { isValid: false, detectedType: 'unknown', reason: 'File magic bytes do not match permitted document types' };
  } catch (error) {
    return { isValid: false, detectedType: 'error', reason: error.message };
  }
}
