import React from 'react';
import { useApp } from '../../context/AppContext';
import { blockchainService } from '../../services/blockchainService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Boxes, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { formatDate, truncateHash } from '../../utils/formatUtils';

export const AdminBlockchain = () => {
  const { credentials } = useApp();
  const isLiveConnected = blockchainService.isConnected();
  const networkConfig = blockchainService.getNetworkConfig();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Blockchain Ledger Proof Explorer</h1>
            <Badge 
              status={isLiveConnected ? "Live Network Active" : "Blockchain Not Connected"} 
              variant={isLiveConnected ? "verified" : "warning"}
              size="sm" 
            />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic proof anchors and ledger interaction audit for credentials.
          </p>
        </div>
      </div>

      {/* Network Connection Banner */}
      {!isLiveConnected && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-400 font-mono">
              Blockchain integration not connected to live network
            </p>
            <p className="text-xs text-slate-300">
              Live smart contract transactions, confirmed block numbers, and explorer links are enabled when an active Web3 provider or RPC endpoint is configured. Simulated values are never reported as real on-chain proofs.
            </p>
          </div>
        </div>
      )}

      {/* Contract & Network Meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-navy-950 text-white border-navy-800">
          <span className="text-[10px] font-mono uppercase text-slate-400">Target Network</span>
          <p className="text-base font-extrabold text-brand-300 mt-1">
            {isLiveConnected ? networkConfig.networkName : 'Blockchain integration not connected'}
          </p>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
            {isLiveConnected ? 'Live Network Connected' : 'Status: Disconnected / Prototype'}
          </span>
        </Card>

        <Card className="p-4 bg-navy-950 text-white border-navy-800">
          <span className="text-[10px] font-mono uppercase text-slate-400">Registry Smart Contract</span>
          <p className="text-xs font-mono font-bold text-emerald-400 mt-1 truncate">
            {isLiveConnected && networkConfig.contractAddress ? networkConfig.contractAddress : 'No contract deployed / connected'}
          </p>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">CredentialRegistry.sol</span>
        </Card>

        <Card className="p-4 bg-navy-950 text-white border-navy-800">
          <span className="text-[10px] font-mono uppercase text-slate-400">Privacy Guarantee</span>
          <p className="text-sm font-bold text-white mt-1">Zero PII Stored On-Chain</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Only SHA-256 byte digests & IDs</span>
        </Card>
      </div>

      {/* Proof Transactions Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Registered Cryptographic Proof Records</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Tx Hash</th>
                <th className="py-3 px-4">Block Height</th>
                <th className="py-3 px-4">Credential ID</th>
                <th className="py-3 px-4">Anchored SHA-256 Digest</th>
                <th className="py-3 px-4">Registration Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {credentials.map(c => {
                const proof = c.blockchainProof;
                const hasLive = Boolean(isLiveConnected && proof?.transactionHash && !proof?.isMock);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-medium">
                      {hasLive ? (
                        <span className="text-brand-600 font-mono">{truncateHash(proof.transactionHash, 8, 8)}</span>
                      ) : (
                        <span className="text-slate-400 italic font-sans">Pending live connection</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                      {hasLive ? `#${proof.blockNumber}` : <span className="text-slate-400 italic font-sans font-normal">Unanchored</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold font-sans">
                      {c.credentialId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {truncateHash(c.fileHash, 10, 10)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-sans">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
