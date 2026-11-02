import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { verificationService } from '../../services/verificationService';
import { VerificationResultCard } from '../../components/verification/VerificationResultCard';
import { FileRehashCheck } from '../../components/verification/FileRehashCheck';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Search, ShieldCheck, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

export const RecruiterVerify = () => {
  const { user } = useAuth();
  const [credentialId, setCredentialId] = useState('CRED-2025-9481');
  const [uploadedHash, setUploadedHash] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRunVerify = (e) => {
    if (e) e.preventDefault();
    if (!credentialId.trim()) return;

    setLoading(true);
    try {
      const res = verificationService.verifyCredential(
        credentialId.trim(),
        uploadedHash,
        user,
        'Recruiter Portal'
      );
      setResult(res);
      toast.success('Verification evaluation completed.');
    } catch (err) {
      toast.error('Verification failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileHashed = (hash) => {
    setUploadedHash(hash);
    if (credentialId.trim()) {
      const res = verificationService.verifyCredential(
        credentialId.trim(),
        hash,
        user,
        'Recruiter Re-Hash'
      );
      setResult(res);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Recruiter Credential Validator</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Authenticate student credentials against registered SHA-256 binary proofs and institutional trust lists.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleRunVerify} className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Enter Credential ID or Scanned QR String
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="e.g. CRED-2025-9481"
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
              />
            </div>
            <Button type="submit" variant="primary" icon={ShieldCheck} isLoading={loading}>
              Run Full Audit
            </Button>
          </div>
        </form>
      </Card>

      {/* Verification Result Card */}
      {result && (
        <div className="space-y-6">
          <VerificationResultCard result={result} />

          {/* Optional File Re-Hash */}
          {result.recordFound && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Step 2: Drop Candidate's PDF for Exact Byte Comparison
                </h3>
                <span className="text-xs text-slate-400">Web Crypto API</span>
              </div>
              <FileRehashCheck onFileHashed={handleFileHashed} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
