import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { blockchainService } from '../../services/blockchainService';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Footer } from '../../components/layout/Footer';
import { DemoBanner } from '../../components/common/DemoBanner';
import { formatDate } from '../../utils/formatUtils';
import { 
  Boxes, 
  ArrowLeft, 
  ShieldAlert, 
  ExternalLink, 
  Hash, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText
} from 'lucide-react';

export const BlockchainProofPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { credentials } = useApp();

  const credential = credentials.find(c => c.id === id || c.credentialId === id);
  const isLiveConnected = blockchainService.isConnected();
  const networkConfig = blockchainService.getNetworkConfig();

  if (!credential) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">Proof Record Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">No credential found for identifier: {id}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const proof = credential.blockchainProof;
  const isRevoked = credential.credentialStatus === 'revoked';
  // Actual live proof exists only if an active live network is connected and has a non-mock tx hash
  const hasLiveProof = Boolean(isLiveConnected && proof?.transactionHash && !proof?.isMock);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DemoBanner />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Credential
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">{credential.credentialId}</span>
            <Badge status={credential.credentialStatus} size="sm" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-6 w-full">
        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              On-Chain Cryptographic Registry
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{credential.title}</h1>
          <p className="text-xs text-slate-500 font-mono">Proof Reference: {credential.credentialId}</p>
        </div>

        {/* Live Blockchain Connection State Banner */}
        {!hasLiveProof ? (
          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Blockchain integration not connected
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-400">
                PROTOTYPE MODE
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              No live blockchain network is currently configured. To maintain cryptographic integrity and prevent false claims, real transaction hashes, block numbers, and smart contract addresses will only appear when connected to an active Web3 provider or live RPC network. Simulated values are never displayed as real blockchain proof.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 text-emerald-950 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold">Connected to Live Network: {networkConfig.networkName}</p>
                <p className="text-[11px] text-emerald-800 font-mono">Smart Contract: {networkConfig.contractAddress}</p>
              </div>
            </div>
            <Badge status="Live Network Active" variant="verified" />
          </div>
        )}

        {/* Proof Specifications Card */}
        <Card className="space-y-5">
          <CardHeader
            title="Cryptographic Proof Parameters"
            subtitle="Parameters anchored to the decentralized credential registry"
          />

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Credential Identifier</dt>
              <dd className="text-slate-900 font-bold mt-0.5 text-sm">{credential.credentialId}</dd>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Registration Status</dt>
              <dd className={`mt-0.5 font-bold flex items-center gap-1 ${hasLiveProof ? 'text-emerald-700' : 'text-amber-700'}`}>
                {hasLiveProof ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    REGISTERED ON-CHAIN
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-600" />
                    REGISTRY RECORD CONFIRMED (PENDING ON-CHAIN ANCHOR)
                  </>
                )}
              </dd>
            </div>

            <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">SHA-256 Document Digest (Client-Hashed)</dt>
              <dd className="text-slate-800 font-bold mt-0.5 break-all select-all text-[11px]">
                {credential.fileHash}
              </dd>
            </div>

            <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Transaction Hash</dt>
              <dd className={`mt-0.5 break-all select-all text-[11px] ${hasLiveProof ? 'text-brand-700 font-bold' : 'text-slate-400 italic font-sans'}`}>
                {hasLiveProof ? proof.transactionHash : 'Blockchain integration not connected (No live transaction recorded)'}
              </dd>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Blockchain Network</dt>
              <dd className={`mt-0.5 font-medium font-sans ${hasLiveProof ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                {hasLiveProof ? proof.network : 'Blockchain integration not connected'}
              </dd>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Block Height</dt>
              <dd className={`mt-0.5 font-bold ${hasLiveProof ? 'text-slate-800' : 'text-slate-400 italic font-sans font-normal'}`}>
                {hasLiveProof ? `#${proof.blockNumber}` : 'Not anchored'}
              </dd>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Smart Contract Address</dt>
              <dd className={`mt-0.5 truncate text-[11px] ${hasLiveProof ? 'text-slate-800 font-semibold' : 'text-slate-400 italic font-sans'}`}>
                {hasLiveProof ? proof.contractAddress : 'No smart contract connected'}
              </dd>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Issuer Authority Identifier</dt>
              <dd className="text-slate-800 font-semibold mt-0.5 truncate text-[11px]">
                {proof?.issuerReference || credential.issuerId}
              </dd>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Record Created Timestamp</dt>
              <dd className="text-slate-800 font-medium mt-0.5 font-sans">
                {formatDate(credential.createdAt)}
              </dd>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <dt className="text-slate-400 uppercase text-[10px] font-bold">Revocation Status</dt>
              <dd className={`mt-0.5 font-bold font-sans ${isRevoked ? 'text-rose-600' : 'text-emerald-600'}`}>
                {isRevoked ? 'REVOKED ON REGISTRY' : 'ACTIVE / UNREVOKED'}
              </dd>
            </div>
          </dl>

          {/* Explorer Link */}
          <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
            <span className="text-slate-500 font-sans">Public Testnet Block Explorer:</span>
            {hasLiveProof ? (
              <a
                href={`${networkConfig.explorerBaseUrl}/tx/${proof.transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-600 font-semibold hover:underline"
              >
                View on Etherscan <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-slate-400 italic font-sans">
                Explorer links available upon live contract deployment.
              </span>
            )}
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};
