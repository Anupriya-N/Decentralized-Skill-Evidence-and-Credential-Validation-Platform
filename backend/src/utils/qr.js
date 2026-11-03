import QRCode from 'qrcode';

/**
 * Generates QR Code as a base64 Data URL (image/png)
 */
export async function generateQrDataUrl(text) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Failed to generate QR data URL:', error);
    throw error;
  }
}

/**
 * Generates QR Code as an SVG string
 */
export async function generateQrSvg(text) {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Failed to generate QR SVG:', error);
    throw error;
  }
}
