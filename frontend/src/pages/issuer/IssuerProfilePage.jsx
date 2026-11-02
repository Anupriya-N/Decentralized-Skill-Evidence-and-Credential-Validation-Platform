import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatUtils';
import { issuerService } from '../../services/issuerService';
import { 
  Building2, 
  ShieldCheck, 
  Globe, 
  Mail, 
  FileText, 
  CheckCircle2, 
  UploadCloud, 
  Clock, 
  History 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const IssuerProfilePage = () => {
  const { user } = useAuth();
  const { issuers, refreshData } = useApp();

  const myIssuer = issuers.find(i => i.id === user?.issuerId || i.email === user?.email) || issuers[0];

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [orgName, setOrgName] = useState(myIssuer?.organizationName || '');
  const [orgType, setOrgType] = useState(myIssuer?.organizationType || 'University / Higher Ed');
  const [orgEmail, setOrgEmail] = useState(myIssuer?.email || '');
  const [orgWebsite, setOrgWebsite] = useState(myIssuer?.website || '');
  const [docName, setDocName] = useState('');

  const handleApplySubmit = (e) => {
    e.preventDefault();
    issuerService.submitInstitutionApplication({
      organizationName: orgName,
      organizationType: orgType,
      email: orgEmail,
      website: orgWebsite,
      proofDocumentName: docName || 'Charter_Accreditation_Proof.pdf'
    });
    refreshData();
    setShowApplyModal(false);
    toast.success('Institution accreditation application submitted for admin review!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Issuer Accreditation Profile & Charter</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Organizational identity, verification charter, and accreditation credentials.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-brand-600 flex items-center justify-center font-bold text-xl border border-indigo-100">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{myIssuer.organizationName}</h2>
              <p className="text-xs text-slate-500">{myIssuer.organizationType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={myIssuer.trustStatus} size="lg" />
            <Button variant="secondary" size="sm" onClick={() => setShowApplyModal(true)}>
              Update Application
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-slate-400 font-medium">Official Contact Email</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{myIssuer.email}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Accreditation Website</dt>
            <dd className="font-semibold text-brand-600 mt-0.5">{myIssuer.website}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Charter Proof File</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{myIssuer.proofDocumentName}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Accreditation Review Date</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{formatDate(myIssuer.reviewedAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400 font-medium">Accreditation Review Rationale</dt>
            <dd className="text-slate-700 mt-0.5 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
              {myIssuer.reviewReason || 'Under administrative review by platform operator.'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-400 font-medium">Scope & Mission</dt>
            <dd className="text-slate-700 mt-0.5">{myIssuer.description}</dd>
          </div>
        </dl>
      </Card>

      {/* Issuer Activity Timeline (Missing.md item 3.11) */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600" />
          Institution Governance & Activity Timeline
        </h3>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
          <div className="relative">
            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-white"></div>
            <p className="font-semibold text-slate-800">Institution Charter Attestation Verified</p>
            <p className="text-slate-500 text-[11px]">Reviewed and granted trusted issuer status by platform administrator.</p>
            <span className="text-[10px] text-slate-400 font-mono">{formatDate(myIssuer.reviewedAt || myIssuer.createdAt)}</span>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-brand-600 ring-4 ring-white"></div>
            <p className="font-semibold text-slate-800">Accreditation Application Submitted</p>
            <p className="text-slate-500 text-[11px]">Initial proof document "{myIssuer.proofDocumentName}" registered.</p>
            <span className="text-[10px] text-slate-400 font-mono">{formatDate(myIssuer.createdAt)}</span>
          </div>
        </div>
      </Card>

      {/* Institution Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Institution Verification Application</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Type</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="University / Higher Ed">University / Higher Ed</option>
                  <option value="Certification Organization">Certification Organization</option>
                  <option value="Training Provider">Training Provider</option>
                  <option value="Online Academy">Online Academy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Website</label>
                <input
                  type="url"
                  required
                  value={orgWebsite}
                  onChange={(e) => setOrgWebsite(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Upload Accreditation Charter Document</label>
                <input
                  type="file"
                  onChange={(e) => setDocName(e.target.files?.[0]?.name || '')}
                  className="w-full text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Submit Application
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
