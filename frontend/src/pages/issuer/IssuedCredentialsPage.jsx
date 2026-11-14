import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatUtils';
import { Award, AlertTriangle, ExternalLink, ShieldAlert, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletService } from '../../services/walletService';

export const IssuedCredentialsPage = () => {
  const { user } = useAuth();
  const { issuers, credentials, revokeCredentialAction } = useApp();

  const myIssuer = issuers.find(i => i.id === user?.issuerId || i.email === user?.email) || issuers[0];
  const issuedCreds = credentials.filter(c => c.issuerId === myIssuer?.id || c.issuerName === myIssuer?.organizationName);

  const [revokingCred, setRevokingCred] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingLoading, setRevokingLoading] = useState(false);

  const handleConfirmRevoke = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim()) return;

    setRevokingLoading(true);
    try {
      let signedRevokeAuth = null;
      const account = walletService.getConnectedAccount();
      const targetHash = revokingCred.fileHash || revokingCred.credentialHash || revokingCred.blockchainProof?.registeredDigest;

      if (account && targetHash) {
        toast.loading('Please sign EIP-712 RevokeAuthorization in MetaMask...', { id: 'mm-revoke' });
        try {
          signedRevokeAuth = await walletService.signRevokeAuthorization(targetHash);
          toast.success('MetaMask EIP-712 revocation signed!', { id: 'mm-revoke' });
        } catch (signErr) {
          toast.dismiss('mm-revoke');
          toast.error(signErr.message || 'Signature rejected in MetaMask');
          setRevokingLoading(false);
          return;
        }
      }

      await revokeCredentialAction(revokingCred.id, revokeReason.trim(), user, signedRevokeAuth);
      setRevokingCred(null);
      setRevokeReason('');
    } catch (err) {
      // error handled in context
    } finally {
      setRevokingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Issued & Attested Credentials</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage lifecycle and revocation for certificates issued under your authority.</p>
        </div>
        <Link to="/issuer/issue">
          <Button variant="primary" size="sm">Issue New Credential</Button>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Credential ID & Title</th>
                <th className="py-3 px-4">Competency</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issuedCreds.map(cred => (
                <tr key={cred.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{cred.title}</p>
                    <span className="font-mono text-[11px] text-brand-600 font-medium">{cred.credentialId}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{cred.skillName}</td>
                  <td className="py-3.5 px-4 text-slate-500">{formatDate(cred.issueDate)}</td>
                  <td className="py-3.5 px-4"><Badge status={cred.credentialStatus} size="sm" /></td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <Link to={`/verify/${cred.credentialId}`} target="_blank">
                      <Button variant="ghost" size="sm" icon={ExternalLink}>Verify</Button>
                    </Link>
                    {cred.credentialStatus === 'active' && (
                      <Button
                        data-testid="revocation-button"
                        variant="danger"
                        size="sm"
                        onClick={() => setRevokingCred(cred)}
                      >
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Revocation Modal */}
      {revokingCred && (
        <Modal
          isOpen={!!revokingCred}
          onClose={() => setRevokingCred(null)}
          title={`Revoke Credential: ${revokingCred.credentialId}`}
        >
          <form onSubmit={handleConfirmRevoke} className="space-y-4 text-left">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Permanent Auditable Action</span>
                Revoking this credential cryptographically submits an on-chain EIP-712 RevokeAuthorization transaction, permanently recording the revocation on Ethereum Sepolia.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Reason for Revocation <span className="text-rose-500">*</span>
              </label>
              <textarea
                data-testid="revocation-reason"
                required
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Credential superseded by upgraded specialization; academic violation; issuing error..."
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setRevokingCred(null)}>
                Cancel
              </Button>
              <Button data-testid="revocation-confirm" variant="danger" size="sm" type="submit" isLoading={revokingLoading}>
                Confirm Revocation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
