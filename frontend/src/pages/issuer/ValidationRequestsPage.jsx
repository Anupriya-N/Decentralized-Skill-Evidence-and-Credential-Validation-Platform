import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DocumentPreview } from '../../components/common/DocumentPreview';
import { FileCheck2, Check, X, Clock, ExternalLink, Eye, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export const ValidationRequestsPage = () => {
  const { user } = useAuth();
  const { credentials, refreshData } = useApp();

  const [requests, setRequests] = useState([
    {
      id: 'req-001',
      studentName: 'Alex Chen',
      credentialTitle: 'Advanced Deep Learning and Neural Transformers',
      submittedDate: '2025-02-08',
      status: 'pending',
      evidenceFileName: 'Deep_Learning_Specialization_Cert.pdf',
      credentialId: 'CRED-2025-7801',
      fileHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      rejectionReason: null
    }
  ]);

  const [previewReq, setPreviewReq] = useState(null);
  const [rejectingReq, setRejectingReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Enrollment record not found in institutional registrar.');

  const handleApprove = (reqId) => {
    setRequests(requests.map(r => r.id === reqId ? { ...r, status: 'approved' } : r));
    toast.success('Student claim approved! Credential attested as trusted.');
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!rejectingReq) return;

    setRequests(requests.map(r => 
      r.id === rejectingReq.id 
        ? { ...r, status: 'rejected', rejectionReason } 
        : r
    ));
    setRejectingReq(null);
    toast.error(`Student claim rejected: "${rejectionReason}"`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Claim Validation Queue</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Inspect student certificates, preview evidence documents, and approve or reject claims with auditable reasons.
        </p>
      </div>

      <div className="space-y-4">
        {requests.map(req => (
          <Card key={req.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{req.credentialTitle}</span>
                <Badge status={req.status} size="sm" />
              </div>
              <p className="text-xs text-slate-600">
                Claimant: <strong className="text-slate-800">{req.studentName}</strong> • Submitted: {req.submittedDate}
              </p>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <span>File: {req.evidenceFileName}</span>
                <span>•</span>
                <span>ID: {req.credentialId}</span>
              </div>
              {req.rejectionReason && (
                <p className="text-[11px] text-rose-600 font-sans mt-1">
                  <strong>Rejection Note:</strong> {req.rejectionReason}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                icon={Eye}
                onClick={() => setPreviewReq(req)}
              >
                Preview Document
              </Button>

              {req.status === 'pending' ? (
                <>
                  <Button variant="primary" size="sm" icon={Check} onClick={() => handleApprove(req.id)}>
                    Approve Claim
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={X}
                    onClick={() => {
                      setRejectingReq(req);
                      setRejectionReason('Enrollment record not found in institutional registrar.');
                    }}
                  >
                    Reject
                  </Button>
                </>
              ) : (
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Claim {req.status}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Document Preview Modal */}
      {previewReq && (
        <DocumentPreview
          isOpen={!!previewReq}
          onClose={() => setPreviewReq(null)}
          fileName={previewReq.evidenceFileName}
          fileHash={previewReq.fileHash}
          mimeType="application/pdf"
        />
      )}

      {/* Rejection Reason Form Modal (Missing.md item 3.7) */}
      {rejectingReq && (
        <Modal
          isOpen={!!rejectingReq}
          onClose={() => setRejectingReq(null)}
          title={`Reject Student Claim: ${rejectingReq.credentialId}`}
        >
          <form onSubmit={handleConfirmReject} className="space-y-4 text-left text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Document Evidence Rejection</span>
                State the official administrative reason. The student will be notified and given the option to resubmit their evidence.
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Rejection Category</label>
              <select
                onChange={(e) => setRejectionReason(e.target.value)}
                value={rejectionReason}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <option value="Enrollment record not found in institutional registrar.">Enrollment record not found in registrar</option>
                <option value="Course completion requirements not satisfied.">Course requirements not satisfied</option>
                <option value="Candidate legal name does not match institutional student record.">Student name mismatch</option>
                <option value="Certificate document format is unreadable or corrupted.">Corrupted / unreadable document</option>
                <option value="Other / Custom Reason">Other / Custom</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Detailed Explanation</label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" type="button" onClick={() => setRejectingReq(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit">
                Confirm Claim Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
