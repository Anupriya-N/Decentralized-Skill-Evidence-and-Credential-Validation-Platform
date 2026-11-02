/**
 * QR Code & Share Utilities
 */

/**
 * Builds the canonical public verification URL for a given credential ID.
 * @param {string} credentialId 
 * @returns {string} Absolute URL
 */
export function getVerificationUrl(credentialId) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/verify/${credentialId}`;
  }
  return `/verify/${credentialId}`;
}

/**
 * Builds the canonical public portfolio URL for a given student ID.
 * @param {string} studentId 
 * @returns {string} Absolute URL
 */
export function getPortfolioUrl(studentId) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/portfolio/${studentId}`;
  }
  return `/portfolio/${studentId}`;
}

/**
 * Downloads a rendered canvas QR code as a PNG file.
 * @param {string} canvasId 
 * @param {string} filename 
 */
export function downloadQRCodeAsPNG(canvasId, filename = 'credential-qr.png') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`Canvas with id ${canvasId} not found.`);
    return false;
  }
  
  const pngUrl = canvas.toDataURL('image/png');
  const downloadLink = document.createElement('a');
  downloadLink.href = pngUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  return true;
}
