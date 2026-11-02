import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { 
  CheckCircle2, 
  Search, 
  Bookmark, 
  History, 
  ShieldCheck, 
  Award, 
  ExternalLink,
  Users,
  QrCode
} from 'lucide-react';
import { formatDate } from '../../utils/formatUtils';

export const RecruiterDashboard = () => {
  const { user } = useAuth();
  const { verificationLogs, users, credentials } = useApp();

  const recruiterLogs = verificationLogs.filter(v => v.verifierUserId === user?.id);
  const students = users.filter(u => u.role === 'student');
  const savedCandidateIds = user?.savedCandidateIds || [];
  const savedCount = savedCandidateIds.length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">
            Recruiter & Employer Portal
          </span>
          <h1 className="text-2xl font-extrabold mt-1">Welcome, {user?.fullName}!</h1>
          <p className="text-xs text-slate-300 mt-1">
            {user?.company || 'Apex Talent Global'} • Perform instant cryptographic credential verifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/recruiter/verify">
            <Button variant="primary" icon={QrCode}>
              Verify Credential
            </Button>
          </Link>
          <Link to="/recruiter/candidates">
            <Button variant="secondary" icon={Search}>
              Search Candidates
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Verifications Run</span>
            <ShieldCheck className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{recruiterLogs.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Audit checks conducted</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Saved Shortlist</span>
            <Bookmark className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{savedCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Bookmarked candidate portfolios</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Public Candidates</span>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{students.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Searchable certified students</span>
        </Card>
      </div>

      {/* Grid: Quick Actions & Recent Verification History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <CardHeader
            title="My Recent Verifications"
            subtitle="Recent checks performed across candidates"
            action={
              <Link to="/recruiter/history" className="text-xs text-brand-600 hover:underline">
                View All
              </Link>
            }
          />

          <div className="space-y-3">
            {recruiterLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No verifications conducted yet.</p>
            ) : (
              recruiterLogs.slice(0, 5).map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800">{log.credentialTitle}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono text-brand-600 font-medium">{log.credentialId}</span>
                      <span>•</span>
                      <span>Channel: {log.verificationMethod}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge status={log.result} size="sm" />
                    <span className="text-[10px] text-slate-400 block font-mono">{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Verify box */}
        <Card className="space-y-4 bg-indigo-50/40 border-brand-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-600 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Instant Lookup</h3>
              <p className="text-[11px] text-slate-500">Query registry directly</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Have a credential ID or student QR scan? Open the validator to confirm SHA-256 byte integrity and accreditation status.
          </p>
          <Link to="/recruiter/verify" className="block">
            <Button variant="primary" size="sm" className="w-full">
              Open Recruiter Validator
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};
