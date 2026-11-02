import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Download, FileText, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminReports = () => {
  const { credentials, verificationLogs, issuers } = useApp();

  const exportCredentialsCSV = () => {
    const headers = ['Credential ID', 'Title', 'Skill', 'Category', 'Issuer', 'Issue Date', 'Status', 'SHA-256 Digest'];
    const rows = credentials.map(c => [
      `"${c.credentialId}"`,
      `"${c.title}"`,
      `"${c.skillName}"`,
      `"${c.category}"`,
      `"${c.issuerName}"`,
      `"${c.issueDate}"`,
      `"${c.credentialStatus}"`,
      `"${c.fileHash}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CertiTrust_Credentials_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Credentials CSV Report downloaded!');
  };

  const exportVerificationLogsCSV = () => {
    const headers = ['Log ID', 'Credential ID', 'Title', 'Verifier', 'Method', 'Result', 'Timestamp'];
    const rows = verificationLogs.map(v => [
      `"${v.id}"`,
      `"${v.credentialId}"`,
      `"${v.credentialTitle}"`,
      `"${v.verifierName}"`,
      `"${v.verificationMethod}"`,
      `"${v.result}"`,
      `"${v.createdAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CertiTrust_Verification_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Verification Logs CSV downloaded!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics & Governance Reports</h1>
        <p className="text-xs text-slate-500 mt-0.5">Generate and download audit reports in CSV format.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Credentials Registry Audit Report</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete registry export including cryptographic SHA-256 hashes, issuing institutions, and status records.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">{credentials.length} records</span>
            <Button variant="primary" size="sm" icon={Download} onClick={exportCredentialsCSV}>
              Download CSV
            </Button>
          </div>
        </Card>

        <Card className="p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Verification Access Log Export</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export all verification queries, QR access hits, hash comparison checks, and timestamp history.
            </p>
          </div>
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">{verificationLogs.length} events</span>
            <Button variant="secondary" size="sm" icon={Download} onClick={exportVerificationLogsCSV}>
              Download CSV
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
