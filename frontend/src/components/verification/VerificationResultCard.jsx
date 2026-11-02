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
  Boxes,
  ExternalLink 
} from 'lucide-react';
import { formatDate, truncateHash } from '../../utils/formatUtils';
import { Link } from 'react-router-dom';
import { VERIFICATION_STATES } from '../../services/verificationService';

export const VerificationResultCard = ({ result }) => {
  if (!result) return null;

  const { recordFound, credential, checks, overallResult } = result;

  if (!recordFound || overallResult === VERIFICATION_STATES.CREDENTIAL_NOT_FOUND) {
    return (
      <Card className="border-rose-200 bg-rose-50/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-rose-100 text-rose-600 shrink-0">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-rose-900">Credential Record Not Found</h3>
              <Badge status="CREDENTIAL_NOT_FOUND" size="sm" />
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              No matching proof record exists on the registry. Please verify the credential ID or QR verification link.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Exact 9 Verification States
  let normalizedResultState = overallResult;
  let bannerColor = 'bg-amber-50 border-amber-300 text-amber-950';
  let bannerIcon = <AlertTriangle className="w-8 h-8 text-amber-600" />;
  let bannerHeadline = 'Verification Incomplete — Additional Verification Required';
  let bannerMessage = 'Credential record was located, but verification is incomplete pending evaluation of all mandatory controls.';

  switch (overallResult) {
    case VERIFICATION_STATES.FULLY_VERIFIED:
      normalizedResultState = 'Fully Verified';
      bannerColor = 'bg-emerald-50 border-emerald-300 text-emerald-950';
      bannerIcon = <CheckCircle2 className="w-8 h-8 text-emerald-600" />;
      bannerHeadline = 'Verification Successful — Authentic & Valid';
      bannerMessage = 'All 6 independent verification controls passed: Record exists, SHA-256 document hash matched, issuer is authorized & trusted, credential is active, unexpired, and cryptographic blockchain proof is verified.';
      break;

    case VERIFICATION_STATES.CREDENTIAL_REVOKED:
      normalizedResultState = 'Credential Revoked';
      bannerColor = 'bg-rose-50 border-rose-300 text-rose-950';
      bannerIcon = <XCircle className="w-8 h-8 text-rose-600" />;
      bannerHeadline = 'Revoked Credential — Not Valid';
      bannerMessage = `This credential was officially revoked on ${formatDate(checks?.lifecycle?.revokedAt)}. Reason: "${checks?.lifecycle?.revocationReason || 'Revoked by authority'}".`;
      break;

    case VERIFICATION_STATES.HASH_MISMATCH:
      normalizedResultState = 'Hash Mismatch';
      bannerColor = 'bg-rose-50 border-rose-300 text-rose-950';
      bannerIcon = <XCircle className="w-8 h-8 text-rose-600" />;
      bannerHeadline = 'Tampered / Mismatched Document File';
      bannerMessage = 'CRITICAL: The uploaded file produces a different cryptographic SHA-256 digest than what was originally registered. The physical file content has been altered or replaced.';
      break;

    case VERIFICATION_STATES.CREDENTIAL_EXPIRED:
      normalizedResultState = 'Credential Expired';
      bannerColor = 'bg-slate-100 border-slate-300 text-slate-800';
      bannerIcon = <Clock className="w-8 h-8 text-slate-500" />;
      bannerHeadline = 'Expired Credential';
      bannerMessage = `This credential has passed its validity expiration date (${formatDate(checks?.expiration?.expiryDate)}).`;
      break;

    case VERIFICATION_STATES.ISSUER_NOT_TRUSTED:
      normalizedResultState = 'Issuer Not Trusted';
      bannerColor = 'bg-rose-50 border-rose-300 text-rose-950';
      bannerIcon = <XCircle className="w-8 h-8 text-rose-600" />;
      bannerHeadline = 'Issuer Not Trusted / Suspended';
      bannerMessage = 'The issuing organization is suspended, unverified, or does not possess an active accredited charter on this platform.';
      break;

    case VERIFICATION_STATES.PENDING_VERIFICATION:
      normalizedResultState = 'Pending Verification';
      bannerColor = 'bg-amber-50 border-amber-300 text-amber-950';
      bannerIcon = <AlertTriangle className="w-8 h-8 text-amber-600" />;
      bannerHeadline = 'Pending Issuer Attestation Review';
      bannerMessage = 'The cryptographic record exists, but institutional issuer accreditation or student claim review is currently in progress.';
      break;

    case VERIFICATION_STATES.BLOCKCHAIN_UNAVAILABLE:
      normalizedResultState = 'Blockchain Unavailable';
      bannerColor = 'bg-amber-50 border-amber-300 text-amber-950';
      bannerIcon = <AlertTriangle className="w-8 h-8 text-amber-600" />;
      bannerHeadline = 'Blockchain Network Unavailable';
      bannerMessage = 'Live distributed ledger network node is unreachable or RPC connection timed out. On-chain proof verification cannot be confirmed.';
      break;

    case VERIFICATION_STATES.VERIFICATION_INCOMPLETE:
    default:
      normalizedResultState = 'Verification Incomplete';
      bannerColor = 'bg-amber-50 border-amber-300 text-amber-950';
      bannerIcon = <AlertTriangle className="w-8 h-8 text-amber-600" />;
      bannerHeadline = 'Verification Incomplete — File Unchecked or Blockchain Offline';
      bannerMessage = checks?.fileHash?.status === 'NOT_CHECKED'
        ? 'A matching credential record was located on the registry. However, the physical certificate file has not been submitted for SHA-256 hash comparison. Upload the certificate document below to complete verification.'
        : 'Credential record located and verified locally, but live blockchain network verification has not been completed.';
      break;
  }

  // 6 Independent Verification Controls Checklist
  const verificationChecks = [
    {
      id: 'record_exists',
      label: '1. Credential record exists on registry',
      status: checks?.record?.status || 'FOUND',
      passed: Boolean(checks?.record?.passed),
      pending: false,
      details: checks?.record?.message || 'Proof record registered on credential registry.'
    },
    {
      id: 'hash_match',
      label: '2. Uploaded evidence SHA-256 hash matches',
      status: checks?.fileHash?.status || 'NOT_CHECKED',
      passed: Boolean(checks?.fileHash?.passed),
      pending: checks?.fileHash?.status === 'NOT_CHECKED',
      details: checks?.fileHash?.message || 'Pending physical file comparison.'
    },
    {
      id: 'issuer_trusted',
      label: '3. Issuer is authorized and trusted',
      status: checks?.issuer?.status || 'PENDING',
      passed: Boolean(checks?.issuer?.passed),
      pending: checks?.issuer?.pending || checks?.issuer?.status === 'PENDING',
      details: checks?.issuer?.message || 'Issuer review status evaluated.'
    },
    {
      id: 'credential_not_revoked',
      label: '4. Credential is active and not revoked',
      status: checks?.lifecycle?.status || 'ACTIVE',
      passed: Boolean(checks?.lifecycle?.passed),
      pending: false,
      details: checks?.lifecycle?.message || 'Lifecycle status active.'
    },
    {
      id: 'credential_not_expired',
      label: '5. Credential has not expired',
      status: checks?.expiration?.status || 'ACTIVE_PERIOD',
      passed: Boolean(checks?.expiration?.passed),
      pending: false,
      details: checks?.expiration?.message || 'Within validity period.'
    },
    {
      id: 'blockchain_proof',
      label: '6. Blockchain proof is successfully verified',
      status: checks?.blockchain?.status || 'NOT_CONNECTED',
      passed: Boolean(checks?.blockchain?.passed),
      pending: checks?.blockchain?.status === 'NOT_CONNECTED',
      details: checks?.blockchain?.message || 'Distributed ledger proof verification.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overall Result Banner */}
      <div className={`p-5 rounded-2xl border ${bannerColor}`}>
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-xl bg-white shadow-sm shrink-0">
            {bannerIcon}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold tracking-tight">
                {bannerHeadline}
              </h2>
              <Badge status={normalizedResultState} size="lg" />
            </div>
            <p className="text-xs mt-1.5 opacity-90 leading-relaxed">
              {bannerMessage}
            </p>
          </div>
        </div>
      </div>

      {/* 6 Independent Verification Controls Checklist */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Multi-Factor Verification Audit</h3>
            <p className="text-[11px] text-slate-500">6 independent cryptographic, institutional, and ledger controls</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {verificationChecks.filter(c => c.passed).length} of 6 Controls Passed
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {verificationChecks.map((item) => (
            <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : item.pending ? (
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={`font-semibold ${item.passed ? 'text-slate-800' : item.pending ? 'text-amber-800' : 'text-rose-800'}`}>
                    {item.label}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.details}</p>
                </div>
              </div>

              <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                item.passed 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : item.pending 
                  ? 'bg-amber-50 text-amber-700' 
                  : 'bg-rose-50 text-rose-700'
              }`}>
                {item.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Metadata Payload Card */}
      <Card className="bg-slate-50/50 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Registry Metadata Payload</h4>
          <Link
            to={`/blockchain-proof/${credential.credentialId}`}
            className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1 font-mono"
          >
            <Boxes className="w-3.5 h-3.5" /> Dedicated Blockchain Proof Details
          </Link>
        </div>

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
            <dt className="text-slate-400 font-medium">Issuing Body</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{credential.issuerName}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Issue Date</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{formatDate(credential.issueDate)}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium">Expiry</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">
              {credential.expiryDate ? formatDate(credential.expiryDate) : 'Lifetime Validity'}
            </dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-slate-400 font-medium">SHA-256 Digest</dt>
            <dd className="font-mono text-slate-700 mt-0.5 break-all select-all text-[11px] bg-white p-2 rounded border border-slate-200">
              {credential.fileHash}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
};
