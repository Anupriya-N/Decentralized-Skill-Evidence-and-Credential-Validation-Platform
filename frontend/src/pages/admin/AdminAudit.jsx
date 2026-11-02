import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { formatDateTime } from '../../utils/formatUtils';
import { ShieldCheck, History } from 'lucide-react';

export const AdminAudit = () => {
  const { auditLogs } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Governance Audit Trail</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable historical log of all administrative actions, issuer approvals, and credential revocations.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Justification / Reason</th>
                <th className="py-3 px-4 font-mono">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{log.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{log.action}</td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{log.actorName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{log.entityType} ({log.entityId})</td>
                  <td className="py-3.5 px-4 text-slate-500 leading-relaxed max-w-sm">{log.reason}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
