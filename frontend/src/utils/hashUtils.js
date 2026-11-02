/**
 * Web Crypto API SHA-256 Digest Calculator
 * Strictly computes cryptographic digest from the exact uploaded binary bytes.
 */

/**
 * Calculates SHA-256 hexadecimal hash from an ArrayBuffer or File object.
 * @param {File | Blob | ArrayBuffer} fileOrBuffer 
 * @returns {Promise<string>} 64-character lowercase hexadecimal hash
 */
export async function calculateSHA256(fileOrBuffer) {
  let arrayBuffer;

  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Blob || fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    throw new Error('Unsupported input type for SHA-256 calculation.');
  }

  // Use native Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  
  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Compares two hashes in constant-time-like manner
 * @param {string} registeredHash 
 * @param {string} currentHash 
 * @returns {boolean}
 */
export function compareHashes(registeredHash, currentHash) {
  if (!registeredHash || !currentHash) return false;
  return registeredHash.trim().toLowerCase() === currentHash.trim().toLowerCase();
}
