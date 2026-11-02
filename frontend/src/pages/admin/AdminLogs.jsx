import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatDateTime } from '../../utils/formatUtils';
import { ScrollText } from 'lucide-react';

export const AdminLogs = () => {
  const { verificationLogs } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Verification Event Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time global log of credential lookups, QR scans, and cryptographic hash verifications.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Credential ID & Title</th>
                <th className="py-3 px-4">Verifier Account</th>
                <th className="py-3 px-4">Access Method</th>
                <th className="py-3 px-4">Hash Result</th>
                <th className="py-3 px-4">Issuer Result</th>
                <th className="py-3 px-4">Overall Audit</th>
                <th className="py-3 px-4 font-mono">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verificationLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{log.credentialTitle}</p>
                    <span className="font-mono text-brand-600 font-medium text-[11px]">{log.credentialId}</span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{log.verifierName}</td>
                  <td className="py-3.5 px-4 text-slate-500">{log.verificationMethod}</td>
                  <td className="py-3.5 px-4"><Badge status={log.hashStatus} size="sm" /></td>
                  <td className="py-3.5 px-4"><Badge status={log.issuerStatus} size="sm" /></td>
                  <td className="py-3.5 px-4"><Badge status={log.result} size="sm" /></td>
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
