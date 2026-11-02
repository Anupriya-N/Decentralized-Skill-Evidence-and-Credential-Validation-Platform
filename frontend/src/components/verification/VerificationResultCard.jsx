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

export const VerificationResultCard = ({ result }) => {
  if (!result) return null;

  const { recordFound, credential, checks, overallResult } = result;

  if (!recordFound) {
    return (
      <Card className="border-rose-200 bg-rose-50/50 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-rose-100 text-rose-600 shrink-0">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-rose-900">Credential Record Not Found</h3>
              <Badge status="Credential Not Found" size="sm" />
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              No matching proof record exists on the registry. Please check the credential ID or QR verification link.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const fileHashStatus = checks.fileHash?.status || checks.integrity?.status || 'NOT_CHECKED';
  const isHashMismatch = fileHashStatus === 'MISMATCH';
  const isHashNotChecked = fileHashStatus === 'NOT_CHECKED';
  const isHashMatch = fileHashStatus === 'MATCH';

  const issuerStatus = checks.issuer?.status || 'PENDING';
  const isIssuerPending = issuerStatus === 'PENDING';
  const isIssuerSuspended = issuerStatus === 'SUSPENDED' || issuerStatus === 'UNTRUSTED';
  const isIssuerTrusted = issuerStatus === 'TRUSTED';

  const lifecycleStatus = checks.lifecycle?.status || 'ACTIVE';
  const isRevoked = lifecycleStatus === 'REVOKED';
  const isExpired = lifecycleStatus === 'EXPIRED';
  const isActive = lifecycleStatus === 'ACTIVE';

  const blockchainStatus = checks.blockchain?.status || 'NOT_CONNECTED';
  const isBlockchainUnavailable = blockchainStatus === 'UNAVAILABLE';

  // Rule: Only show fully verified when all required checks succeed
  const isFullyVerified = isHashMatch && isIssuerTrusted && isActive && !isBlockchainUnavailable;

  let normalizedResultState = 'Verified';
  let bannerColor = 'bg-emerald-50 border-emerald-200 text-emerald-950';
  let bannerIcon = <CheckCircle2 className="w-8 h-8 text-emerald-600" />;
  let bannerHeadline = 'Verification Successful — Authentic & Valid';
  let bannerMessage = 'All required checks passed: SHA-256 file hash matched, issuing institution is verified & accredited, and the credential lifecycle is active.';

  if (isRevoked) {
    normalizedResultState = 'Revoked';
    bannerColor = 'bg-rose-50 border-rose-200 text-rose-950';
    bannerIcon = <XCircle className="w-8 h-8 text-rose-600" />;
    bannerHeadline = 'Revoked Credential — Not Valid';
    bannerMessage = `This credential was officially revoked on ${formatDate(checks.lifecycle?.revokedAt)}. Reason: "${checks.lifecycle?.revocationReason || 'Revoked by authority'}".`;
  } else if (isHashMismatch) {
    normalizedResultState = 'Hash Mismatch';
    bannerColor = 'bg-rose-50 border-rose-200 text-rose-950';
    bannerIcon = <XCircle className="w-8 h-8 text-rose-600" />;
    bannerHeadline = 'Tampered / Mismatched Document File';
    bannerMessage = 'The file provided produces a different cryptographic SHA-256 hash than what was originally registered on the registry. The document has been modified or replaced.';
  } else if (isIssuerSuspended) {
    normalizedResultState = 'Issuer Not Trusted';
    bannerColor = 'bg-rose-50 border-rose-200 text-rose-950';
    bannerIcon = <XCircle className="w-8 h-8 text-rose-600" />;
    bannerHeadline = 'Issuer Suspended / Not Trusted';
    bannerMessage = 'The issuing organization has been suspended or unverified by platform administration.';
  } else if (isExpired) {
    normalizedResultState = 'Expired';
    bannerColor = 'bg-slate-100 border-slate-300 text-slate-800';
    bannerIcon = <Clock className="w-8 h-8 text-slate-500" />;
    bannerHeadline = 'Expired Credential';
    bannerMessage = `This credential has passed its validity expiration date (${formatDate(checks.lifecycle?.expiryDate)}).`;
  } else if (isPendingIssuer) {
    normalizedResultState = 'Pending Issuer Verification';
    bannerColor = 'bg-amber-50 border-amber-200 text-amber-950';
    bannerIcon = <AlertTriangle className="w-8 h-8 text-amber-600" />;
    bannerHeadline = 'Pending Issuer Verification';
    bannerMessage = 'The cryptographic record exists, but the issuing authority accreditation or claim validation is currently awaiting review.';
  } else if (isHashNotChecked) {
    // Crucial fix: Do not return or display VALID when file hash has not been evaluated
    normalizedResultState = 'Incomplete — File Not Checked';
    bannerColor = 'bg-amber-50 border-amber-200 text-amber-950';
    bannerIcon = <AlertTriangle className="w-8 h-8 text-amber-600" />;
    bannerHeadline = 'Registry Record Located — File Verification Pending';
    bannerMessage = 'A matching credential record was located in the registry. However, complete verification requires testing the physical document file. Upload the certificate file below for SHA-256 byte comparison.';
  } else if (isBlockchainUnavailable) {
    normalizedResultState = 'Blockchain Unavailable';
    bannerColor = 'bg-amber-50 border-amber-200 text-amber-950';
    bannerIcon = <AlertTriangle className="w-8 h-8 text-amber-600" />;
    bannerHeadline = 'Blockchain Verification Unavailable';
    bannerMessage = 'Distributed ledger network node connection is currently offline or unreachable.';
  }

  // Explicit verification states corresponding to Section 2 of the prompt:
  // 1. Record found
  // 2. File hash matched / not checked / mismatch
  // 3. Issuer trusted / pending / suspended
  // 4. Credential active / expired / revoked
  // 5. Blockchain verified / unavailable / not connected
  const verificationChecks = [
    {
      id: 'record_found',
      label: 'Record found on registry',
      status: checks.record?.status || 'FOUND',
      passed: checks.record?.status === 'FOUND',
      pending: false,
      failed: checks.record?.status !== 'FOUND',
      statusLabel: checks.record?.status || 'FOUND',
      details: checks.record?.message || 'Proof record registered on credential registry.'
    },
    {
      id: 'file_hash',
      label: 'File hash integrity check',
      status: fileHashStatus,
      passed: isHashMatch,
      pending: isHashNotChecked,
      failed: isHashMismatch,
      statusLabel: isHashMatch ? 'MATCH' : isHashNotChecked ? 'NOT CHECKED' : 'MISMATCH',
      details: isHashMatch
        ? 'SHA-256 binary digest identical to registered proof.'
        : isHashNotChecked
        ? 'Original document not submitted for byte-by-byte hash comparison (Incomplete).'
        : 'CRITICAL: Uploaded file digest does NOT match registered proof.'
    },
    {
      id: 'issuer_status',
      label: 'Issuer authority accreditation',
      status: issuerStatus,
      passed: isIssuerTrusted,
      pending: isIssuerPending,
      failed: isIssuerSuspended,
      statusLabel: issuerStatus,
      details: isIssuerTrusted
        ? `Accredited issuer (${checks.issuer?.issuerName}) verified.`
        : isIssuerPending
        ? 'Issuer accreditation or claim validation pending review.'
        : 'Issuing authority suspended or untrusted.'
    },
    {
      id: 'credential_lifecycle',
      label: 'Credential lifecycle status',
      status: lifecycleStatus,
      passed: isActive,
      pending: false,
      failed: isRevoked || isExpired,
      statusLabel: lifecycleStatus,
      details: isActive
        ? 'Credential is valid and active.'
        : isRevoked
        ? `Credential revoked: "${checks.lifecycle?.revocationReason || 'No reason specified'}"`
        : `Credential expired on ${formatDate(checks.lifecycle?.expiryDate)}.`
    },
    {
      id: 'blockchain_status',
      label: 'Blockchain ledger connection',
      status: blockchainStatus,
      passed: blockchainStatus === 'VERIFIED',
      pending: blockchainStatus === 'NOT_CONNECTED',
      failed: blockchainStatus === 'UNAVAILABLE',
      statusLabel: blockchainStatus.replace('_', ' '),
      details: blockchainStatus === 'VERIFIED'
        ? `Proof confirmed on-chain (${checks.blockchain?.network}).`
        : blockchainStatus === 'NOT_CONNECTED'
        ? 'Blockchain integration not connected to live network (Prototype mode).'
        : 'Blockchain ledger node unreachable or proof unavailable.'
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

      {/* 5-Vector Verification Audit Checklist */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Multi-Factor Verification Audit</h3>
            <p className="text-[11px] text-slate-500">Explicit status for record, file hash, issuer, lifecycle, and blockchain</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {verificationChecks.filter(c => c.passed).length} of {verificationChecks.length} Passed
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
                {item.statusLabel}
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
