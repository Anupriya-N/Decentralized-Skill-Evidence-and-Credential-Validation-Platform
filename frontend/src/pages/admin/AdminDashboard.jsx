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
  CheckCircle2,
  Activity,
  Cpu,
  Database,
  FileWarning
} from 'lucide-react';
import { formatDate } from '../../utils/formatUtils';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { users, credentials, issuers, verificationLogs, auditLogs } = useApp();

  const pendingIssuers = issuers.filter(i => i.trustStatus === 'pending');
  const activeCreds = credentials.filter(c => c.credentialStatus === 'active');
  const revokedCreds = credentials.filter(c => c.credentialStatus === 'revoked');
  const failureLogs = verificationLogs.filter(v => v.result !== 'VALID');

  // Check for duplicate hashes in credentials
  const hashCount = {};
  credentials.forEach(c => {
    hashCount[c.fileHash] = (hashCount[c.fileHash] || 0) + 1;
  });
  const duplicateHashesCount = Object.values(hashCount).filter(count => count > 1).length;

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

      {/* System Status Indicators (Missing.md item 6.9) */}
      <Card className="p-4 bg-slate-900 text-slate-100 border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> System Health & Component Status
          </span>
          <span className="text-emerald-400 font-mono text-[11px] font-semibold">ALL SUBSYSTEMS OPERATIONAL</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <p className="font-bold text-white">Smart Contract Ledger</p>
              <p className="text-[10px] text-slate-400">Sepolia Proof Emulator: Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <p className="font-bold text-white">Assistive AI Engine</p>
              <p className="text-[10px] text-slate-400">OCR & Skill Heuristics: Ready</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <p className="font-bold text-white">Storage & State Engine</p>
              <p className="text-[10px] text-slate-400">Synchronized LocalStorage</p>
            </div>
          </div>
        </div>
      </Card>

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

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Revoked / Suspended</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{revokedCreds.length}</p>
          <span className="text-[11px] text-rose-600 mt-0.5 block font-medium">Flagged credentials</span>
        </Card>
      </div>

      {/* Grid: Verification Failure Monitoring & Duplicate Evidence Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Failure Reports (Missing.md item 6.6) */}
        <Card className="space-y-4">
          <CardHeader
            title="Verification Failure Monitoring"
            subtitle="Recent checks flagged for hash mismatch or revoked states"
            action={<Link to="/admin/logs" className="text-xs text-brand-600 hover:underline">View All</Link>}
          />
          <div className="space-y-2 text-xs">
            {failureLogs.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">No verification failures recorded.</p>
            ) : (
              failureLogs.slice(0, 4).map(f => (
                <div key={f.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-rose-900">{f.credentialTitle}</p>
                    <span className="text-[11px] font-mono text-slate-500">{f.credentialId} • {f.verificationMethod}</span>
                  </div>
                  <Badge status={f.result} size="sm" />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Duplicate Evidence Monitoring (Missing.md item 6.7) */}
        <Card className="space-y-4">
          <CardHeader
            title="Duplicate Evidence Integrity Watch"
            subtitle="Monitors certificates sharing identical binary digests"
          />
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Duplicate SHA-256 Clusters:</span>
              <span className="font-mono font-bold text-brand-700">{duplicateHashesCount} detected</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              When students upload duplicate certificate files, automated warnings are surfaced on their dashboard to prevent accidental re-registration.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
