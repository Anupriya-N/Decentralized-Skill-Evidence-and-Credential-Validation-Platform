import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { getVerificationUrl, downloadQRCodeAsPNG } from '../../utils/qrUtils';
import { Copy, Download, Share2, Check, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export const QRCodeModal = ({ isOpen, onClose, credential }) => {
  const [copied, setCopied] = useState(false);

  if (!credential) return null;

  const verificationUrl = getVerificationUrl(credential.credentialId);
  const canvasId = `qr-canvas-${credential.credentialId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    toast.success('Verification URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const success = downloadQRCodeAsPNG(canvasId, `${credential.credentialId}-qr.png`);
    if (success) toast.success('QR Code downloaded as PNG!');
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Verify ${credential.title}`,
          text: `Verify cryptographic proof for credential: ${credential.title}`,
          url: verificationUrl
        });
      } catch (err) {
        // user cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Credential Verification QR & Link">
      <div className="space-y-6 text-center">
        <div>
          <h4 className="text-base font-bold text-slate-900">{credential.title}</h4>
          <p className="text-xs text-slate-500 mt-1 font-mono">ID: {credential.credentialId}</p>
        </div>

        {/* QR Code Canvas */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner mx-auto">
          <QRCodeCanvas
            id={canvasId}
            value={verificationUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Scan with any mobile camera or QR reader to instantly open the cryptographic integrity verification screen.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" icon={Download} onClick={handleDownload}>
            Download PNG
          </Button>

          <Button variant="secondary" icon={copied ? Check : Copy} onClick={handleCopyLink}>
            {copied ? 'Link Copied' : 'Copy Link'}
          </Button>

          {typeof navigator !== 'undefined' && navigator.share && (
            <Button variant="ghost" icon={Share2} onClick={handleWebShare}>
              Share
            </Button>
          )}

          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold px-3 py-2"
          >
            Open Verifier <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </Modal>
  );
};
