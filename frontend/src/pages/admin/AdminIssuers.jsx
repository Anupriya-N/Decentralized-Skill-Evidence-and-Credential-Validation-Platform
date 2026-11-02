import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DocumentPreview } from '../../components/common/DocumentPreview';
import { formatDate } from '../../utils/formatUtils';
import { ISSUER_STATUS_LABELS, ISSUER_ACCREDITATION_STATUS } from '../../services/issuerService';
import { ShieldCheck, Check, X, Ban, RefreshCw, FileText, Globe, Eye, AlertTriangle, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminIssuers = () => {
  const { user } = useAuth();
  const { issuers, updateIssuerTrustStatus } = useApp();

  const [activeModalIssuer, setActiveModalIssuer] = useState(null);
  const [modalAction, setModalAction] = useState('demo_approve'); // 'demo_approve' | 'externally_verify' | 'under_review' | 'reject' | 'suspend'
  const [reasonInput, setReasonInput] = useState('');
  const [previewDocIssuer, setPreviewDocIssuer] = useState(null);

  const openActionModal = (issuer, action) => {
    if (user?.role !== 'admin') {
      toast.error('Unauthorized: Only platform administrators can modify institutional accreditation.');
      return;
    }
    setActiveModalIssuer(issuer);
    setModalAction(action);
    setReasonInput('');
  };

  const handleConfirmAction = (e) => {
    e.preventDefault();
    if (!activeModalIssuer) return;

    if (user?.role !== 'admin') {
      toast.error('Unauthorized: Administrative role required.');
      return;
    }

    let newStatus = ISSUER_ACCREDITATION_STATUS.SUBMITTED;
    if (modalAction === 'demo_approve') newStatus = ISSUER_ACCREDITATION_STATUS.DEMO_APPROVED;
    else if (modalAction === 'externally_verify') newStatus = ISSUER_ACCREDITATION_STATUS.EXTERNALLY_VERIFIED;
    else if (modalAction === 'under_review') newStatus = ISSUER_ACCREDITATION_STATUS.UNDER_REVIEW;
    else if (modalAction === 'reject') newStatus = ISSUER_ACCREDITATION_STATUS.REJECTED;
    else if (modalAction === 'suspend') newStatus = ISSUER_ACCREDITATION_STATUS.SUSPENDED;

    try {
      updateIssuerTrustStatus(
        activeModalIssuer.id, 
        newStatus, 
        reasonInput.trim() || `Administrative governance: status set to ${newStatus}`,
        user
      );
      setActiveModalIssuer(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Issuer Governance & Accreditation</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluate institutional charter documentation, grant demo or external approvals, and enforce compliance suspensions.
        </p>
      </div>

      {/* Real-World Institutional Validation Rule Notice */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3 text-xs text-purple-900">
        <ShieldAlert className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Real-World Institutional Accreditation Rule</p>
          <p className="text-purple-800 leading-relaxed">
            An institution cannot be claimed as genuinely verified merely because an administrator clicked Approve in the prototype. In compliance with academic trust standards, administrative decisions are marked as <strong>"Demo Approval – External Institution Verification Pending"</strong> until validated against external registrar APIs or national accreditation databases.
          </p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Organization & Domain</th>
                <th className="py-3 px-4">Charter Evidence</th>
                <th className="py-3 px-4">Accreditation Tier</th>
                <th className="py-3 px-4">Reviewed Date & Notes</th>
                <th className="py-3 px-4 text-right">Governance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issuers.map(iss => {
                const displayLabel = ISSUER_STATUS_LABELS[iss.trustStatus] || iss.trustStatus;
                return (
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
                      <Badge status={displayLabel} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs">
                      <span className="text-[10px] font-mono block text-slate-400">{formatDate(iss.reviewedAt)}</span>
                      <span className="text-[11px] line-clamp-2">{iss.reviewReason || 'No review notes recorded'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {iss.trustStatus !== 'demo_approved' && iss.trustStatus !== 'externally_verified' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Check}
                          onClick={() => openActionModal(iss, 'demo_approve')}
                        >
                          Demo Approve
                        </Button>
                      )}
                      {iss.trustStatus !== 'externally_verified' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={ShieldCheck}
                          onClick={() => openActionModal(iss, 'externally_verify')}
                        >
                          External Verify
                        </Button>
                      )}
                      {iss.trustStatus !== 'suspended' && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Ban}
                          onClick={() => openActionModal(iss, 'suspend')}
                        >
                          Suspend
                        </Button>
                      )}
                      {(iss.trustStatus === 'submitted' || iss.trustStatus === 'pending') && (
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
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Charter Document Preview Modal */}
      {previewDocIssuer && (
        <DocumentPreview
          isOpen={!!previewDocIssuer}
          onClose={() => setPreviewDocIssuer(null)}
          fileName={previewDocIssuer.proofDocumentName || 'Institutional_Charter.pdf'}
          mimeType="application/pdf"
        />
      )}

      {/* Governance Action Modal */}
      {activeModalIssuer && (
        <Modal
          isOpen={!!activeModalIssuer}
          onClose={() => setActiveModalIssuer(null)}
          title={`Accreditation Governance: ${activeModalIssuer.organizationName}`}
        >
          <form onSubmit={handleConfirmAction} className="space-y-4 text-left">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
              Target Organization: <strong>{activeModalIssuer.organizationName}</strong>
              <div className="mt-1">
                Action: <strong className="text-brand-600 uppercase">{modalAction.replace('_', ' ')}</strong>
              </div>
              {modalAction === 'demo_approve' && (
                <p className="mt-1 text-purple-700 font-semibold">
                  Status will be recorded as "Demo Approval – External Institution Verification Pending".
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administrative Audit Justification / Review Note <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Institutional documentation evaluated; demo verification approved pending registrar API link."
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
                Confirm Governance Action
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
