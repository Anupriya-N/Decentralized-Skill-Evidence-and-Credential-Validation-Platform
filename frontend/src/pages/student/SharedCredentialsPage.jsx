import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { QRCodeModal } from '../../components/credentials/QRCodeModal';
import { credentialService } from '../../services/credentialService';
import { getVerificationUrl, getPortfolioUrl } from '../../utils/qrUtils';
import { Share2, QrCode, Copy, Eye, EyeOff, ExternalLink, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const SharedCredentialsPage = () => {
  const { user } = useAuth();
  const { credentials, refreshData } = useApp();

  const [activeQRModalCred, setActiveQRModalCred] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const studentCreds = credentials.filter(c => c.ownerUserId === user?.id);

  const toggleVisibility = (cred) => {
    const newVis = cred.visibility === 'public' ? 'private' : 'public';
    credentialService.updateCredentialMetadata(cred.id, { visibility: newVis });
    refreshData();
    toast.success(`Credential "${cred.title}" visibility changed to ${newVis}.`);
  };

  const handleCopyLink = (credId) => {
    const url = getVerificationUrl(credId);
    navigator.clipboard.writeText(url);
    setCopiedId(credId);
    toast.success('Verification link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyPortfolio = () => {
    const url = getPortfolioUrl(user?.id);
    navigator.clipboard.writeText(url);
    toast.success('Public portfolio link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Shared Credentials & Access Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure privacy boundaries, generate QR codes, and export public verification links.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Share2} onClick={handleCopyPortfolio}>
          Copy Full Portfolio Link
        </Button>
      </div>

      {/* Sharing controls card */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Credential</th>
                <th className="py-3 px-4">Visibility Setting</th>
                <th className="py-3 px-4">Integrity / Issuer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentCreds.map(cred => (
                <tr key={cred.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{cred.title}</p>
                    <span className="font-mono text-[11px] text-slate-400">{cred.credentialId}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => toggleVisibility(cred)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        cred.visibility === 'public'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {cred.visibility === 'public' ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          Public
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          Private
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Badge status={cred.credentialStatus} size="sm" />
                      <Badge status={cred.issuerStatus} size="sm" />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={QrCode}
                      onClick={() => setActiveQRModalCred(cred)}
                    >
                      QR
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={copiedId === cred.credentialId ? Check : Copy}
                      onClick={() => handleCopyLink(cred.credentialId)}
                    >
                      {copiedId === cred.credentialId ? 'Copied' : 'Link'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* QR Code Modal */}
      {activeQRModalCred && (
        <QRCodeModal
          isOpen={!!activeQRModalCred}
          onClose={() => setActiveQRModalCred(null)}
          credential={activeQRModalCred}
        />
      )}
    </div>
  );
};
