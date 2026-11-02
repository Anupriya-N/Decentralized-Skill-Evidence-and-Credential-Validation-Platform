import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { CredentialCard } from '../../components/credentials/CredentialCard';
import { 
  Award, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  UploadCloud, 
  ExternalLink, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { formatDate } from '../../utils/formatUtils';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const { credentials, skills, verificationLogs } = useApp();

  const studentCreds = credentials.filter(c => c.ownerUserId === user?.id);
  const studentSkills = skills.filter(s => s.ownerUserId === user?.id);
  const myVerificationLogs = verificationLogs.filter(v => 
    studentCreds.some(c => c.credentialId === v.credentialId)
  );

  const verifiedCount = studentCreds.filter(c => c.integrityStatus === 'verified' && c.issuerStatus === 'trusted' && c.credentialStatus === 'active').length;
  const pendingCount = studentCreds.filter(c => c.issuerStatus === 'pending').length;
  const revokedExpiredCount = studentCreds.filter(c => c.credentialStatus === 'revoked' || c.credentialStatus === 'expired').length;

  // Chart data: skills by category
  const categoryCounts = studentSkills.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    count: categoryCounts[cat]
  }));

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-brand-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-brand-300 text-xs font-semibold uppercase tracking-wider">
            Student Credential Portfolio
          </span>
          <h1 className="text-2xl font-extrabold mt-1">Welcome back, {user?.fullName}!</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {user?.department} • {user?.college}. Manage your cryptographic proof records and skill evidence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/student/upload">
            <Button variant="primary" icon={UploadCloud}>
              Upload Evidence
            </Button>
          </Link>
          <Link to={`/portfolio/${user?.id}`} target="_blank">
            <Button variant="secondary" icon={ExternalLink}>
              Public Portfolio
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Uploads</span>
            <Award className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{studentCreds.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Stored evidence files</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Fully Verified</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{verifiedCount}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block font-medium">Hash & Issuer Trusted</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Review</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{pendingCount}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Awaiting issuer approval</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Competencies</span>
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{studentSkills.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Portfolio skills</span>
        </Card>
      </div>

      {/* Grid: Charts & Verification Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skill Category Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Skill Competencies by Category"
            subtitle="Evidenced and declared skills across academic domains"
          />
          <div className="h-64 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No skill data available.
              </div>
            )}
          </div>
        </Card>

        {/* Recent Verifications on Student's Records */}
        <Card>
          <CardHeader
            title="Recent Verifier Activity"
            subtitle="Recruiter lookups on your proofs"
            action={
              <Link to="/student/history" className="text-xs text-brand-600 hover:underline">
                View All
              </Link>
            }
          />
          <div className="space-y-3">
            {myVerificationLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No verification events logged yet.</p>
            ) : (
              myVerificationLogs.slice(0, 4).map(log => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{log.verifierName}</span>
                    <Badge status={log.result} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{log.credentialTitle}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Method: {log.verificationMethod}</span>
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Credentials Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Credentials & Certificates</h2>
            <p className="text-xs text-slate-500">Stored SHA-256 evidence records</p>
          </div>
          <Link to="/student/credentials">
            <Button variant="ghost" size="sm">View All ({studentCreds.length})</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studentCreds.slice(0, 3).map(cred => (
            <CredentialCard
              key={cred.id}
              credential={cred}
              isStudentOwner={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
