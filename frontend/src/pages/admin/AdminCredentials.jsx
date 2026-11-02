import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDate, truncateHash } from '../../utils/formatUtils';
import { Award, ExternalLink, ShieldAlert, Hash } from 'lucide-react';

export const AdminCredentials = () => {
  const { credentials, revokeCredentialAction } = useApp();

  const [revokingCred, setRevokingCred] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim() || !revokingCred) return;

    setLoading(true);
    try {
      await revokeCredentialAction(revokingCred.id, revokeReason.trim());
      setRevokingCred(null);
      setRevokeReason('');
    } catch (err) {
      // handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Credentials Moderation</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Supervise registered cryptographic proofs, audit digests, and issue administrative revocations.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Credential ID & Title</th>
                <th className="py-3 px-4">Issuer Organization</th>
                <th className="py-3 px-4">SHA-256 Digest</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {credentials.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{c.title}</p>
                    <span className="font-mono text-[11px] text-brand-600 font-medium">{c.credentialId}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-slate-700 font-medium">{c.issuerName}</span>
                    <span className="block text-[10px] text-slate-400 capitalize">Issuer status: {c.issuerStatus}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    {truncateHash(c.fileHash, 8, 8)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={c.credentialStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                    <Link to={`/verify/${c.credentialId}`} target="_blank">
                      <Button variant="ghost" size="sm" icon={ExternalLink}>Verify</Button>
                    </Link>
                    {c.credentialStatus === 'active' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { setRevokingCred(c); setRevokeReason(''); }}
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

      {/* Revocation Dialog */}
      {revokingCred && (
        <Modal
          isOpen={!!revokingCred}
          onClose={() => setRevokingCred(null)}
          title={`Administrative Revocation: ${revokingCred.credentialId}`}
        >
          <form onSubmit={handleRevokeSubmit} className="space-y-4 text-left">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Administrative Override</span>
                Revoking this credential will flag it as revoked across all recruiter and public verifications, regardless of whether the file hash still matches.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Trail Reason for Revocation <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="State administrative reason (e.g. fraudulent certificate batch, issuer suspension)..."
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setRevokingCred(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit" isLoading={loading}>
                Confirm Administrative Revocation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
