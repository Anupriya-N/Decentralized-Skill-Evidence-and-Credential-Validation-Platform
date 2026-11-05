import crypto from 'crypto';
import fs from 'fs';
import { ethers } from 'ethers';

/**
 * Normalizes credential payload deterministically before hashing.
 * Sorts all object keys alphabetically and trims whitespace.
 */
export function normalizeCredentialPayload(data) {
  const normalized = {
    badgeLevel: String(data.badgeLevel || 'BRONZE'),
    certificateNumber: String(data.certificateNumber || '').trim(),
    courseCode: data.courseCode ? String(data.courseCode).trim() : null,
    grade: data.grade ? String(data.grade).trim() : null,
    issuedAt: data.issuedAt ? new Date(data.issuedAt).toISOString() : new Date().toISOString(),
    issuerId: String(data.issuerId || '').trim(),
    studentId: String(data.studentId || '').trim(),
    title: String(data.title || '').trim(),
    type: String(data.type || 'CERTIFICATE'),
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
 * Canonical binary pair hashing for Merkle Trees.
 * Uses lexicographical sorting of child hashes to guarantee deterministic pairing.
 */
function hashPair(a, b) {
  const cleanA = a.startsWith('0x') ? a.slice(2) : a;
  const cleanB = b.startsWith('0x') ? b.slice(2) : b;
  const combined = cleanA < cleanB ? cleanA + cleanB : cleanB + cleanA;
  return computeSha256(combined);
}

/**
 * Computes Merkle Root from an array of leaf hashes
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
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Duplicate odd element to balance tree
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i]));
      }
    }
    currentLevel = nextLevel;
  }

  return '0x' + currentLevel[0];
}

/**
 * Generates a complete Merkle Tree with genuine proof arrays for each leaf hash.
 * Supports multi-credential batch anchoring.
 */
export function buildMerkleTree(leafHashes) {
  if (!leafHashes || leafHashes.length === 0) {
    const emptyRoot = '0x' + computeSha256('');
    return { root: emptyRoot, proofs: {}, leavesCount: 0 };
  }

  const cleanLeaves = leafHashes.map((h) => (h.startsWith('0x') ? h.slice(2) : h));
  
  // Single leaf case: direct anchoring, proof is empty array
  if (cleanLeaves.length === 1) {
    const root = '0x' + cleanLeaves[0];
    const originalLeaf = leafHashes[0];
    return {
      root,
      proofs: { [originalLeaf]: [] },
      leavesCount: 1,
      isBatch: false,
    };
  }

  // Multi-leaf tree: store levels for proof extraction
  const treeLevels = [cleanLeaves];
  let currentLevel = cleanLeaves;

  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i + 1]));
      } else {
        nextLevel.push(hashPair(currentLevel[i], currentLevel[i]));
      }
    }
    treeLevels.push(nextLevel);
    currentLevel = nextLevel;
  }

  const root = '0x' + treeLevels[treeLevels.length - 1][0];
  const proofs = {};

  // Generate proof path for each original leaf
  for (let i = 0; i < cleanLeaves.length; i++) {
    const originalKey = leafHashes[i];
    const proofPath = [];
    let index = i;

    for (let level = 0; level < treeLevels.length - 1; level++) {
      const levelNodes = treeLevels[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      if (siblingIndex < levelNodes.length) {
        proofPath.push('0x' + levelNodes[siblingIndex]);
      } else {
        // Balanced duplicate
        proofPath.push('0x' + levelNodes[index]);
      }
      index = Math.floor(index / 2);
    }
    proofs[originalKey] = proofPath;
  }

  return {
    root,
    proofs,
    leavesCount: cleanLeaves.length,
    isBatch: true,
  };
}

/**
 * Validates a Merkle Proof against expected root.
 * Evaluates empty proof for single-leaf anchoring and multi-sibling proof for batches.
 */
export function verifyMerkleProof(leafHash, proof, expectedRoot) {
  if (!leafHash || !expectedRoot) return false;

  const cleanLeaf = leafHash.startsWith('0x') ? leafHash.slice(2) : leafHash;
  const cleanExpectedRoot = expectedRoot.startsWith('0x') ? expectedRoot.slice(2) : expectedRoot;

  // Single-leaf anchoring: proof is empty, leaf must equal root
  if (!proof || proof.length === 0) {
    return cleanLeaf.toLowerCase() === cleanExpectedRoot.toLowerCase();
  }

  let current = cleanLeaf;
  for (const sibling of proof) {
    const cleanSibling = sibling.startsWith('0x') ? sibling.slice(2) : sibling;
    current = hashPair(current, cleanSibling);
  }

  return current.toLowerCase() === cleanExpectedRoot.toLowerCase();
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
 * Validates 32-byte hex hash format (strict rejection of malformed hashes)
 */
export function validateBytes32Hash(hash) {
  if (!hash || typeof hash !== 'string') return false;
  return /^0x[0-9a-fA-F]{64}$/.test(hash) || /^[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * Generates an institutional digital signature using an Ethereum ECDSA private key.
 * REJECTS mock keys, non-hex keys, and fallbacks.
 */
export async function signCredentialPayload(normalizedPayload, institutionalPrivateKey) {
  if (!institutionalPrivateKey) {
    throw new Error('Institutional private signing key is missing or not configured');
  }

  const cleanKey = institutionalPrivateKey.startsWith('0x')
    ? institutionalPrivateKey
    : `0x${institutionalPrivateKey}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error('Invalid institutional private signing key: must be a 32-byte hex string');
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
