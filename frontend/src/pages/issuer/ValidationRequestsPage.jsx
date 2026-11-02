import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { FileCheck2, Check, X, Clock, ExternalLink } from 'lucide-react';
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
      credentialId: 'CRED-2025-7801'
    }
  ]);

  const handleApprove = (reqId) => {
    setRequests(requests.map(r => r.id === reqId ? { ...r, status: 'approved' } : r));
    toast.success('Student claim approved! Credential attested as trusted.');
  };

  const handleReject = (reqId) => {
    setRequests(requests.map(r => r.id === reqId ? { ...r, status: 'rejected' } : r));
    toast.error('Student claim rejected.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Claim Validation Requests</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review credentials uploaded by students who listed your organization as the issuing authority.
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
            </div>

            <div className="flex items-center gap-2">
              {req.status === 'pending' ? (
                <>
                  <Button variant="primary" size="sm" icon={Check} onClick={() => handleApprove(req.id)}>
                    Approve Claim
                  </Button>
                  <Button variant="danger" size="sm" icon={X} onClick={() => handleReject(req.id)}>
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
    </div>
  );
};
