import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DocumentPreview } from '../../components/common/DocumentPreview';
import { formatDate } from '../../utils/formatUtils';
import { ShieldCheck, Check, X, Ban, RefreshCw, FileText, Globe, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminIssuers = () => {
  const { issuers, updateIssuerTrustStatus } = useApp();

  const [activeModalIssuer, setActiveModalIssuer] = useState(null);
  const [modalAction, setModalAction] = useState('approve'); // 'approve' | 'reject' | 'suspend'
  const [reasonInput, setReasonInput] = useState('');
  const [previewDocIssuer, setPreviewDocIssuer] = useState(null);

  const openActionModal = (issuer, action) => {
    setActiveModalIssuer(issuer);
    setModalAction(action);
    setReasonInput('');
  };

  const handleConfirmAction = (e) => {
    e.preventDefault();
    if (!activeModalIssuer) return;

    let newStatus = 'pending';
    if (modalAction === 'approve') newStatus = 'trusted';
    else if (modalAction === 'reject') newStatus = 'untrusted';
    else if (modalAction === 'suspend') newStatus = 'suspended';

    updateIssuerTrustStatus(activeModalIssuer.id, newStatus, reasonInput.trim() || `Administrative action: ${modalAction}`);
    setActiveModalIssuer(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Issuer Governance & Accreditation</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Approve, suspend, or reject issuing organizations. Preview institutional charter evidence before rendering decisions.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Organization & Type</th>
                <th className="py-3 px-4">Charter Evidence</th>
                <th className="py-3 px-4">Accreditation Status</th>
                <th className="py-3 px-4">Reviewed Date & Reason</th>
                <th className="py-3 px-4 text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issuers.map(iss => (
                <tr key={iss.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{iss.organizationName}</p>
                    <p className="text-[11px] text-slate-500">{iss.organizationType} • {iss.email}</p>
                    {iss.website && (
                      <a href={iss.website} target="_blank" rel="noreferrer" className="text-[10px] text-brand-600 hover:underline">
                        {iss.website}
                      </a>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">
                    <button
                      type="button"
                      onClick={() => setPreviewDocIssuer(iss)}
                      className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-800 font-medium hover:underline"
                      title="Preview charter evidence document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {iss.proofDocumentName || 'Accreditation_Proof.pdf'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={iss.trustStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 max-w-xs">
                    <span className="text-[10px] font-mono block text-slate-400">{formatDate(iss.reviewedAt)}</span>
                    <span className="text-[11px] line-clamp-2">{iss.reviewReason || 'No review reason recorded'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {iss.trustStatus !== 'trusted' && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Check}
                        onClick={() => openActionModal(iss, 'approve')}
                      >
                        Approve
                      </Button>
                    )}
                    {iss.trustStatus === 'trusted' && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Ban}
                        onClick={() => openActionModal(iss, 'suspend')}
                      >
                        Suspend
                      </Button>
                    )}
                    {iss.trustStatus === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={X}
                        onClick={() => openActionModal(iss, 'reject')}
                      >
                        Reject
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Charter Document Preview Modal (Missing.md item 6.2) */}
      {previewDocIssuer && (
        <DocumentPreview
          isOpen={!!previewDocIssuer}
          onClose={() => setPreviewDocIssuer(null)}
          fileName={previewDocIssuer.proofDocumentName || 'Institutional_Charter.pdf'}
          mimeType="application/pdf"
        />
      )}

      {/* Action Modal */}
      {activeModalIssuer && (
        <Modal
          isOpen={!!activeModalIssuer}
          onClose={() => setActiveModalIssuer(null)}
          title={`Accreditation Governance: ${modalAction.toUpperCase()} ${activeModalIssuer.organizationName}`}
        >
          <form onSubmit={handleConfirmAction} className="space-y-4 text-left">
            <p className="text-xs text-slate-600 leading-relaxed">
              You are updating the platform accreditation status for <strong>{activeModalIssuer.organizationName}</strong> to <strong className="uppercase">{modalAction}</strong>. This status is evaluated during all public verifications.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Review Rationale / Audit Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Higher education accreditation verified via national charter portal."
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setActiveModalIssuer(null)}>
                Cancel
              </Button>
              <Button
                variant={modalAction === 'suspend' || modalAction === 'reject' ? 'danger' : 'primary'}
                size="sm"
                type="submit"
              >
                Confirm {modalAction.toUpperCase()}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
