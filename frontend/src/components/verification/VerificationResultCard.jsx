import React from 'react';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  FileText, 
  Building, 
  Hash, 
  ExternalLink 
} from 'lucide-react';
import { formatDate, truncateHash } from '../../utils/formatUtils';

export const VerificationResultCard = ({ result }) => {
  if (!result) return null;

  const { recordFound, credential, checks, overallResult } = result;

  if (!recordFound) {
    return (
      <Card className="border-rose-200 bg-rose-50/50">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-rose-100 text-rose-600">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-rose-900">Credential Record Not Found</h3>
            <p className="text-sm text-rose-700 mt-1">
              No matching proof record exists on the registry. Please check the credential ID or QR link.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Determine overall banner styling
  const isAllValid = overallResult === 'VALID';
  const isRevoked = overallResult === 'REVOKED';
  const isHashMismatch = overallResult === 'HASH_MISMATCH';

  return (
    <div className="space-y-6">
      {/* Top Overall Result Banner */}
      <div className={`p-5 rounded-2xl border ${
        isAllValid 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
          : isRevoked
          ? 'bg-rose-50 border-rose-200 text-rose-950'
          : isHashMismatch
          ? 'bg-rose-50 border-rose-200 text-rose-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
            {isAllValid ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            ) : isRevoked || isHashMismatch ? (
              <XCircle className="w-8 h-8 text-rose-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold tracking-tight">
                {isAllValid && 'Verification Successful — Authentic & Valid'}
                {isRevoked && 'Revoked Credential — Not Valid'}
                {isHashMismatch && 'Tampered / Mismatched Document File'}
                {overallResult === 'EXPIRED' && 'Expired Credential'}
                {overallResult === 'ISSUER_PENDING' && 'Issuer Review Pending'}
                {overallResult === 'ISSUER_SUSPENDED' && 'Issuer Suspended — Unverified'}
              </h2>
              <Badge status={overallResult} size="lg" />
            </div>
            <p className="text-xs mt-1.5 opacity-90 leading-relaxed">
              {isAllValid && 'The registered proof matches the original document hash, the issuing organization is accredited, and the credential record is currently active.'}
              {isRevoked && `This credential was officially revoked on ${formatDate(checks.lifecycle.revokedAt)}. Reason: "${checks.lifecycle.revocationReason}"`}
              {isHashMismatch && 'The file provided produces a different cryptographic SHA-256 hash than what was originally registered on the blockchain ledger.'}
              {overallResult === 'ISSUER_PENDING' && 'The file hash is authentic, but the issuing authority is awaiting full accreditation approval from platform administration.'}
              {overallResult === 'EXPIRED' && 'This credential has passed its validity expiration date.'}
            </p>
          </div>
        </div>
      </div>

      {/* Four Distinct Independent Checks (Section 4.8) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check A: Credential Record */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Check A</span>
            <Badge status="Confirmed" />
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-brand-600 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Credential Registry Record</h4>
              <p className="text-xs text-slate-500 mt-0.5">{checks.record.message}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] font-mono space-y-1 text-slate-600 border border-slate-100">
            <div><span className="text-slate-400">ID:</span> {checks.record.credentialId}</div>
            <div><span className="text-slate-400">Ledger:</span> {checks.record.network}</div>
            <div><span className="text-slate-400">Registered:</span> {formatDate(checks.record.registeredAt)}</div>
          </div>
        </Card>

        {/* Check B: File Integrity */}
        <Card className={`space-y-3 ${
          checks.integrity.status === 'MISMATCH' ? 'border-rose-300 bg-rose-50/20' : ''
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Check B</span>
            <Badge status={checks.integrity.status} />
          </div>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${
              checks.integrity.status === 'MATCH' 
                ? 'bg-emerald-50 text-emerald-600'
                : checks.integrity.status === 'MISMATCH'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-slate-100 text-slate-500'
            }`}>
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Cryptographic File Integrity</h4>
              <p className="text-xs text-slate-500 mt-0.5">{checks.integrity.message}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] font-mono space-y-1 text-slate-600 border border-slate-100 overflow-x-auto">
            <div><span className="text-slate-400">Algorithm:</span> SHA-256 (Web Crypto API)</div>
            <div><span className="text-slate-400">Registered:</span> {truncateHash(checks.integrity.registeredHash, 10, 10)}</div>
            {checks.integrity.checkedHash && (
              <div><span className="text-slate-400">Evaluated:</span> {truncateHash(checks.integrity.checkedHash, 10, 10)}</div>
            )}
          </div>
        </Card>

        {/* Check C: Issuer Authenticity */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Check C</span>
            <Badge status={checks.issuer.status} />
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Issuer Accreditation Status</h4>
              <p className="text-xs text-slate-500 mt-0.5">{checks.issuer.message}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] font-mono space-y-1 text-slate-600 border border-slate-100">
            <div><span className="text-slate-400">Organization:</span> {checks.issuer.issuerName}</div>
            <div><span className="text-slate-400">Accreditation:</span> {checks.issuer.status}</div>
          </div>
        </Card>

        {/* Check D: Credential Status & Lifecycle */}
        <Card className={`space-y-3 ${
          checks.lifecycle.status === 'REVOKED' ? 'border-rose-300 bg-rose-50/20' : ''
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Check D</span>
            <Badge status={checks.lifecycle.status} />
          </div>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${
              checks.lifecycle.status === 'ACTIVE' 
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Lifecycle & Validity</h4>
              <p className="text-xs text-slate-500 mt-0.5">{checks.lifecycle.message}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] font-mono space-y-1 text-slate-600 border border-slate-100">
            <div><span className="text-slate-400">Status:</span> {checks.lifecycle.status}</div>
            <div><span className="text-slate-400">Expiry:</span> {formatDate(checks.lifecycle.expiryDate)}</div>
            {checks.lifecycle.revocationReason && (
              <div className="text-rose-600 font-sans"><span className="font-semibold">Reason:</span> {checks.lifecycle.revocationReason}</div>
            )}
          </div>
        </Card>
      </div>

      {/* Credential Details Accordion / Information */}
      <Card className="bg-slate-50/50">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Metadata Payload</h4>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <dt className="text-slate-400 font-medium">Title</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{credential.title}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Competency / Skill</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{credential.skillName}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Category</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{credential.category}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Issue Date</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{formatDate(credential.issueDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Evidence File</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{credential.fileName}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Smart Contract</dt>
            <dd className="font-mono text-slate-700 mt-0.5 truncate">{credential.blockchainProof?.contractAddress}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
};
