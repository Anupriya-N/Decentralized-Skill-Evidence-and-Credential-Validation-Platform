import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { verificationService } from '../../services/verificationService';
import { VerificationResultCard } from '../../components/verification/VerificationResultCard';
import { FileRehashCheck } from '../../components/verification/FileRehashCheck';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Footer } from '../../components/layout/Footer';
import { DemoBanner } from '../../components/common/DemoBanner';
import { ShieldCheck, Search, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const PublicVerifyPage = () => {
  const { credentialId } = useParams();
  const navigate = useNavigate();

  const [inputCredId, setInputCredId] = useState(credentialId || 'CRED-2025-9481');
  const [activeCredentialId, setActiveCredentialId] = useState(credentialId || 'CRED-2025-9481');
  const [uploadedFileHash, setUploadedFileHash] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const performVerification = async (credId, hash = null) => {
    setLoading(true);
    try {
      const res = await verificationService.verifyCredential(credId, hash, null, 'Public Link');
      setVerificationResult(res);
    } catch (err) {
      toast.error('Verification error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (credentialId) {
      setInputCredId(credentialId);
      setActiveCredentialId(credentialId);
      performVerification(credentialId, uploadedFileHash);
    } else {
      performVerification(activeCredentialId, uploadedFileHash);
    }
  }, [credentialId]);

  const handleManualLookup = (e) => {
    e.preventDefault();
    if (!inputCredId.trim()) return;
    setActiveCredentialId(inputCredId.trim());
    navigate(`/verify/${inputCredId.trim()}`);
    performVerification(inputCredId.trim(), uploadedFileHash);
  };

  const handleFileHashed = (hash) => {
    setUploadedFileHash(hash);
    performVerification(activeCredentialId, hash);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DemoBanner />
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight">
            Certi<span className="text-brand-600">Trust</span> <span className="text-xs font-semibold text-slate-400">Public Verifier</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button size="sm" variant="secondary">Demo Login</Button>
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-8 w-full">
        {/* Verification Lookup Input */}
        <Card className="p-6">
          <form onSubmit={handleManualLookup} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Lookup by Credential Identifier
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inputCredId}
                  onChange={(e) => setInputCredId(e.target.value)}
                  placeholder="e.g. CRED-2025-9481, CRED-2024-6590..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </div>
              <Button type="submit" variant="primary" icon={Search} isLoading={loading}>
                Run Verification
              </Button>
            </div>
            {/* Quick demo links */}
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 flex-wrap">
              <span>Try sample records:</span>
              <button
                type="button"
                onClick={() => { setInputCredId('CRED-2025-9481'); navigate('/verify/CRED-2025-9481'); }}
                className="text-brand-600 hover:underline font-mono"
              >
                CRED-2025-9481 (Valid)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setInputCredId('CRED-2025-7801'); navigate('/verify/CRED-2025-7801'); }}
                className="text-amber-600 hover:underline font-mono"
              >
                CRED-2025-7801 (Issuer Pending)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setInputCredId('CRED-2024-6590'); navigate('/verify/CRED-2024-6590'); }}
                className="text-rose-600 hover:underline font-mono"
              >
                CRED-2024-6590 (Revoked)
              </button>
            </div>
          </form>
        </Card>

        {/* Verification Result */}
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Querying registry and evaluating proofs...</p>
          </div>
        ) : (
          verificationResult && (
            <div className="space-y-8">
              <VerificationResultCard result={verificationResult} />

              {/* Optional File Re-Hash Comparison */}
              {verificationResult.recordFound && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      Step 2: Compare Original File Bytes (Optional)
                    </h3>
                    <span className="text-xs text-slate-400">Web Crypto API</span>
                  </div>
                  <FileRehashCheck onFileHashed={handleFileHashed} />
                </div>
              )}
            </div>
          )
        )}
      </main>

      <Footer />
    </div>
  );
};
