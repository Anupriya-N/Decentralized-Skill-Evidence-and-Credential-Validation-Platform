import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatDateTime } from '../../utils/formatUtils';

export const IssuerHistoryPage = () => {
  const { user } = useAuth();
  const { auditLogs } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Issuer Activity Log</h1>
        <p className="text-xs text-slate-500 mt-0.5">Audit log of all issuances, status updates, and revocations.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                  <td className="py-3 px-4 text-slate-600">{log.entityType} ({log.entityId})</td>
                  <td className="py-3 px-4 text-slate-500">{log.reason}</td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const IssuerSettingsPage = () => {
  const { resetAllDemoData } = useApp();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Issuer Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Institution configurations.</p>
      </div>

      <Card className="p-6 border-amber-200 bg-amber-50/20 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Reset Demo Data</h3>
        <p className="text-xs text-slate-600">Reverts all state to the default mock database.</p>
        <button
          onClick={resetAllDemoData}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset Environment
        </button>
      </Card>
    </div>
  );
};
