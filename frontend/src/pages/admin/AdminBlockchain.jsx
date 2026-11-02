import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Boxes, Lock, Link as LinkIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatDate, truncateHash } from '../../utils/formatUtils';

export const AdminBlockchain = () => {
  const { credentials } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Blockchain Ledger Proof Explorer</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold uppercase">
              Simulated Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic proof anchors recorded on the CredentialRegistry smart contract.
          </p>
        </div>
      </div>

      {/* Contract & Network Meta */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-navy-950 text-white border-navy-800">
          <span className="text-[10px] font-mono uppercase text-slate-400">Target Network</span>
          <p className="text-base font-extrabold text-brand-300 mt-1">Ethereum Sepolia (Simulated)</p>
          <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">Chain ID: 11155111</span>
        </Card>

        <Card className="p-4 bg-navy-950 text-white border-navy-800">
          <span className="text-[10px] font-mono uppercase text-slate-400">Registry Smart Contract</span>
          <p className="text-xs font-mono font-bold text-emerald-400 mt-1 truncate">
            0x32A6f4B3bC430b2c1C6809E18a2872323c21C28e
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
          <h3 className="text-sm font-bold text-slate-900">Registered Cryptographic Proof Transactions</h3>
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
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 text-brand-600 font-medium">
                      {truncateHash(proof?.transactionHash || '0x4f8e6c43b9d0e2a1b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0', 8, 8)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">
                      #{proof?.blockNumber || 7492104}
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
