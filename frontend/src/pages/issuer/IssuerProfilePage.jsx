import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatUtils';
import { Building2, ShieldCheck, Globe, Mail, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const IssuerProfilePage = () => {
  const { user } = useAuth();
  const { issuers } = useApp();

  const myIssuer = issuers.find(i => i.id === user?.issuerId || i.email === user?.email) || issuers[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Issuer Accreditation Profile</h1>
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
          <Badge status={myIssuer.trustStatus} size="lg" />
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
    </div>
  );
};
