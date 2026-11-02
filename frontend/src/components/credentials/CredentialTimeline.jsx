import React from 'react';
import { formatDate } from '../../utils/formatUtils';
import { blockchainService } from '../../services/blockchainService';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  Boxes, 
  FileCheck, 
  Sparkles, 
  RotateCcw 
} from 'lucide-react';
import { Button } from '../common/Button';

export const CredentialTimeline = ({ credential, onResubmitEvidence }) => {
  if (!credential) return null;

  const isRevoked = credential.credentialStatus === 'revoked';
  const isRejected = credential.claimStatus === 'rejected' || credential.issuerStatus === 'suspended';
  const isTrustedIssuer = credential.issuerStatus === 'trusted';
  const isPendingIssuer = credential.issuerStatus === 'pending';
  const hasLiveBlockchainProof = Boolean(
    blockchainService.isConnected() && 
    credential.blockchainProof?.transactionHash && 
    !credential.blockchainProof?.isMock
  );

  const steps = [
    {
      id: 'upload',
      title: 'Evidence Uploaded & SHA-256 Digest Computed',
      description: `Exact binary hash generated: ${credential.fileHashAlgorithm} algorithm via Web Crypto API.`,
      date: credential.createdAt,
      status: 'completed',
      icon: FileCheck
    },
    {
      id: 'ai',
      title: 'AI Attribute Analysis & Confirmation',
      description: 'Extracted competency title, issuer metadata, and scope reviewed by student.',
      date: credential.createdAt,
      status: 'completed',
      icon: Sparkles
    },
    {
      id: 'issuer',
      title: isRejected 
        ? 'Issuer Attestation Rejected' 
        : isTrustedIssuer 
        ? 'Accredited Issuer Attestation Confirmed' 
        : 'Issuer Accreditation Review Pending',
      description: isRejected
        ? `Rejection notice: "${credential.rejectionReason || 'Charter documentation or institutional enrollment mismatch'}"`
        : isTrustedIssuer
        ? `Attested by accredited authority: ${credential.issuerName}.`
        : `Claim submitted to ${credential.issuerName} awaiting review.`,
      date: credential.issuerReviewedAt || credential.updatedAt,
      status: isRejected ? 'failed' : isTrustedIssuer ? 'completed' : 'pending',
      icon: isRejected ? XCircle : isTrustedIssuer ? CheckCircle2 : Clock
    },
    {
      id: 'blockchain',
      title: hasLiveBlockchainProof ? 'Proof Anchored on Smart Contract' : 'Blockchain Integration Status',
      description: hasLiveBlockchainProof
        ? `Confirmed on ${credential.blockchainProof.network} (Block #${credential.blockchainProof.blockNumber || 'Confirmed'})`
        : 'Blockchain integration not connected to live network. Cryptographic SHA-256 digest preserved on platform registry.',
      date: credential.blockchainProof?.registeredAt || credential.createdAt,
      status: hasLiveBlockchainProof ? 'completed' : 'pending',
      icon: Boxes
    },
    {
      id: 'lifecycle',
      title: isRevoked
        ? `Credential Revoked (${formatDate(credential.revokedAt)})`
        : credential.credentialStatus === 'expired'
        ? `Validity Expired (${formatDate(credential.expiryDate)})`
        : 'Active & Searchable on Platform Registry',
      description: isRevoked
        ? `Revocation reason: "${credential.revocationReason || 'Revoked by authority'}"`
        : credential.credentialStatus === 'expired'
        ? 'Recorded expiration threshold passed.'
        : 'Proof is active, verified, and accessible via public QR verification links.',
      date: credential.revokedAt || credential.expiryDate || credential.createdAt,
      status: isRevoked ? 'failed' : credential.credentialStatus === 'expired' ? 'warning' : 'completed',
      icon: isRevoked ? XCircle : credential.credentialStatus === 'expired' ? AlertTriangle : CheckCircle2
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">Credential Lifecycle & Processing History</h4>
        <span className="text-[11px] font-mono text-slate-400">Audit Trail</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {steps.map((step) => {
          const Icon = step.icon;
          const isFailed = step.status === 'failed';
          const isPending = step.status === 'pending';
          const isCompleted = step.status === 'completed';

          return (
            <div key={step.id} className="relative group">
              {/* Timeline marker icon */}
              <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                isFailed 
                  ? 'bg-rose-600 text-white' 
                  : isPending 
                  ? 'bg-amber-400 text-white' 
                  : 'bg-emerald-600 text-white'
              }`}>
                <Icon className="w-3 h-3" />
              </div>

              {/* Event Content */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${isFailed ? 'text-rose-700' : 'text-slate-900'}`}>
                    {step.title}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{formatDate(step.date)}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejection / Resubmission Box */}
      {isRejected && onResubmitEvidence && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900">Evidence Requires Resubmission</p>
              <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                The issuing authority flagged an issue with your submitted document. You can upload an amended certificate document to start a new verification cycle.
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" icon={RotateCcw} onClick={onResubmitEvidence}>
            Resubmit Evidence File
          </Button>
        </div>
      )}
    </div>
  );
};
