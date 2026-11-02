import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatDateTime } from '../../utils/formatUtils';
import { History, ShieldCheck } from 'lucide-react';

export const RecruiterHistory = () => {
  const { user } = useAuth();
  const { verificationLogs } = useApp();

  const recruiterLogs = verificationLogs.filter(v => v.verifierUserId === user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Recruiter Audit & Verification History</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Complete log of candidate credential verifications performed under your organization account.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {recruiterLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            No verification queries conducted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Credential ID & Title</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Hash Integrity</th>
                  <th className="py-3 px-4">Issuer Status</th>
                  <th className="py-3 px-4">Audit Result</th>
                  <th className="py-3 px-4">Audit Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recruiterLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{log.credentialTitle}</p>
                      <span className="font-mono text-[11px] text-brand-600 font-medium">{log.credentialId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{log.verificationMethod}</td>
                    <td className="py-3.5 px-4"><Badge status={log.hashStatus} size="sm" /></td>
                    <td className="py-3.5 px-4"><Badge status={log.issuerStatus} size="sm" /></td>
                    <td className="py-3.5 px-4"><Badge status={log.result} size="sm" /></td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
