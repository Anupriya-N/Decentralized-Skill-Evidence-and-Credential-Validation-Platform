import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { 
  Building2, 
  Award, 
  FileCheck2, 
  ShieldCheck, 
  Clock, 
  UploadCloud, 
  ExternalLink 
} from 'lucide-react';

export const IssuerDashboard = () => {
  const { user } = useAuth();
  const { issuers, credentials } = useApp();

  const myIssuer = issuers.find(i => i.id === user?.issuerId || i.email === user?.email) || issuers[0];
  const issuedCreds = credentials.filter(c => c.issuerId === myIssuer?.id || c.issuerName === myIssuer?.organizationName);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-brand-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              Accredited Issuing Authority Portal
            </span>
            <Badge status={myIssuer?.trustStatus || 'trusted'} size="sm" />
          </div>
          <h1 className="text-2xl font-extrabold mt-1">{myIssuer?.organizationName}</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            {myIssuer?.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/issuer/issue">
            <Button variant="primary" icon={UploadCloud}>
              Issue Credential
            </Button>
          </Link>
          <Link to="/issuer/requests">
            <Button variant="secondary" icon={FileCheck2}>
              Review Claims
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Issued Credentials</span>
            <Award className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{issuedCreds.length}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Attested & registered</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Accreditation Trust</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-2 capitalize">{myIssuer?.trustStatus}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Platform verified charter</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Validation Claims</span>
            <FileCheck2 className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">1</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Student claims pending review</span>
        </Card>
      </div>

      {/* Issued Credentials Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recently Attested Credentials</h3>
            <p className="text-xs text-slate-500">Credentials backed by {myIssuer?.organizationName}</p>
          </div>
          <Link to="/issuer/credentials">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Credential ID & Title</th>
                <th className="py-3 px-4">Skill Domain</th>
                <th className="py-3 px-4">Hash Algorithm</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issuedCreds.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{c.title}</p>
                    <span className="font-mono text-[11px] text-brand-600 font-medium">{c.credentialId}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{c.skillName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{c.fileHashAlgorithm}</td>
                  <td className="py-3.5 px-4"><Badge status={c.credentialStatus} size="sm" /></td>
                  <td className="py-3.5 px-4 text-right">
                    <Link to={`/verify/${c.credentialId}`} target="_blank">
                      <Button variant="ghost" size="sm" icon={ExternalLink}>Verify</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
