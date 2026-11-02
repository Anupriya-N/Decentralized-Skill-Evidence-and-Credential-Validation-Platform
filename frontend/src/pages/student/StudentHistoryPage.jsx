import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatDate, formatDateTime } from '../../utils/formatUtils';
import { History, ShieldCheck, UserCheck, Clock } from 'lucide-react';

export const StudentHistoryPage = () => {
  const { user } = useAuth();
  const { credentials, verificationLogs } = useApp();

  const studentCreds = credentials.filter(c => c.ownerUserId === user?.id);
  const myLogs = verificationLogs.filter(v => 
    studentCreds.some(c => c.credentialId === v.credentialId)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Verification Access History</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audit trail of external recruiters, institutions, and public verifiers who evaluated your credentials.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {myLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No verification events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Credential ID & Title</th>
                  <th className="py-3 px-4">Verifier Identity</th>
                  <th className="py-3 px-4">Access Channel</th>
                  <th className="py-3 px-4">Audit Outcome</th>
                  <th className="py-3 px-4">Verification Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{log.credentialTitle}</p>
                      <span className="font-mono text-[11px] text-brand-600 font-medium">{log.credentialId}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {log.verifierName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {log.verificationMethod}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge status={log.result} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDateTime(log.createdAt)}
                    </td>
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
