import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { 
  Users, 
  ShieldCheck, 
  Award, 
  ScrollText, 
  Boxes, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2 
} from 'lucide-react';
import { formatDate } from '../../utils/formatUtils';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { users, credentials, issuers, verificationLogs, auditLogs } = useApp();

  const pendingIssuers = issuers.filter(i => i.trustStatus === 'pending');
  const activeCreds = credentials.filter(c => c.credentialStatus === 'active');
  const revokedCreds = credentials.filter(c => c.credentialStatus === 'revoked');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">
            Platform System Administration
          </span>
          <h1 className="text-2xl font-extrabold mt-1">Platform Operations Control</h1>
          <p className="text-xs text-slate-300 mt-1">
            Logged in as {user?.fullName} • Moderate accounts, review issuer charters, and supervise blockchain proof anchors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/issuers">
            <Button variant="primary" icon={ShieldCheck}>
              Issuer Reviews ({pendingIssuers.length})
            </Button>
          </Link>
          <Link to="/admin/blockchain">
            <Button variant="secondary" icon={Boxes}>
              Ledger Explorer
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Users</span>
            <Users className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{users.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across all 4 roles</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Issuers</span>
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{pendingIssuers.length}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block font-medium">Requires charter check</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Proofs</span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{activeCreds.length}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Valid on registry</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Verifications</span>
            <ScrollText className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{verificationLogs.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Total audit evaluations</span>
        </Card>
      </div>

      {/* Grid: Pending Issuers & Recent Platform Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Issuers Review Box */}
        <Card className="space-y-4">
          <CardHeader
            title="Issuer Accreditation Applications"
            subtitle="Institutions awaiting verification approval"
            action={
              <Link to="/admin/issuers" className="text-xs text-brand-600 hover:underline">
                Manage Issuers
              </Link>
            }
          />
          <div className="space-y-3">
            {pendingIssuers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No pending issuer applications.</p>
            ) : (
              pendingIssuers.map(iss => (
                <div key={iss.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{iss.organizationName}</h4>
                    <p className="text-[11px] text-slate-500">{iss.organizationType} • {iss.email}</p>
                  </div>
                  <Link to="/admin/issuers">
                    <Button variant="primary" size="sm">Review Charter</Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Audit Trail */}
        <Card className="space-y-4">
          <CardHeader
            title="Recent Governance Audit Trail"
            subtitle="Administrative actions and state transitions"
            action={
              <Link to="/admin/audit" className="text-xs text-brand-600 hover:underline">
                Full Audit Trail
              </Link>
            }
          />
          <div className="space-y-3">
            {auditLogs.slice(0, 4).map(log => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{log.action}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{formatDate(log.createdAt)}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">{log.reason}</p>
                <span className="text-[10px] text-slate-400 block pt-0.5 font-mono">Actor: {log.actorName}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
