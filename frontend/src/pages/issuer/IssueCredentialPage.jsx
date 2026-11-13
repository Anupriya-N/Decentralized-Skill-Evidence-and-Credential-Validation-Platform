import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { calculateSHA256 } from '../../utils/hashUtils';
import { validateEvidenceFile } from '../../utils/validationUtils';
import { CATEGORIES } from '../../utils/formatUtils';
import { UploadCloud, FileCheck, Hash, Boxes, Wallet, CheckCircle2 } from 'lucide-react';
import { walletService } from '../../services/walletService';
import toast from 'react-hot-toast';

export const IssueCredentialPage = () => {
  const { user } = useAuth();
  const { users, addCredential, issuers } = useApp();
  const navigate = useNavigate();

  const myIssuer = issuers.find(i => i.id === user?.issuerId || i.email === user?.email) || issuers[0];
  const students = users.filter(u => u.role === 'student');

  const [recipientStudentId, setRecipientStudentId] = useState(students[0]?.id || '');
  const [title, setTitle] = useState('');
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [computedHash, setComputedHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [walletAccount, setWalletAccount] = useState(walletService.getConnectedAccount());
  const [signWithMetaMask, setSignWithMetaMask] = useState(Boolean(walletService.getConnectedAccount()));

  useEffect(() => {
    const unsub = walletService.subscribe(st => {
      setWalletAccount(st.account);
      if (st.account) setSignWithMetaMask(true);
    });
    return () => unsub();
  }, []);

  const handleFileChange = async (file) => {
    if (!file) return;
    const v = validateEvidenceFile(file);
    if (!v.valid) {
      toast.error(v.errors.join(' '));
      return;
    }
    setSelectedFile(file);
    try {
      const hash = await calculateSHA256(file);
      setComputedHash(hash);
      toast.success('Certificate binary SHA-256 computed!');
    } catch (err) {
      toast.error('Hash calculation error: ' + err.message);
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !computedHash) {
      toast.error('Please upload the certificate file to compute SHA-256.');
      return;
    }
    setSubmitting(true);
    try {
      let metaMaskSignature = null;
      if (signWithMetaMask && walletAccount) {
        toast.loading('Please sign EIP-712 IssueAuthorization in MetaMask...', { id: 'mm-sign' });
        try {
          const signed = await walletService.signIssueAuthorization(computedHash);
          metaMaskSignature = signed.signature;
          toast.success('MetaMask EIP-712 signature approved!', { id: 'mm-sign' });
        } catch (signErr) {
          toast.dismiss('mm-sign');
          toast.error(signErr.message || 'Signature rejected in MetaMask');
          setSubmitting(false);
          return;
        }
      }

      const newCred = await addCredential({
        ownerUserId: recipientStudentId,
        studentId: recipientStudentId,
        title,
        skillName,
        category,
        issuerId: myIssuer.id,
        issuer: myIssuer.organizationName,
        issueDate,
        visibility: 'public',
        eip712Signature: metaMaskSignature,
        metaMaskSignature
      }, selectedFile, computedHash);

      toast.success(`Successfully issued "${newCred.title}"!`);
      navigate('/issuer/credentials');
    } catch (err) {
      toast.error('Issuance failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Direct Credential Issuance</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Issue a verified, blockchain-anchored credential directly to an enrolled student.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Student Account
            </label>
            <select
              value={recipientStudentId}
              onChange={(e) => setRecipientStudentId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Certified Cloud Architecture Specialist"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Evidenced Competency</label>
              <input
                type="text"
                required
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. Cloud Security Architecture"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category Domain</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Certificate File Drop */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate PDF / Document</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
              <input
                type="file"
                id="issuer-cert-file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              <label htmlFor="issuer-cert-file" className="cursor-pointer block">
                <UploadCloud className="w-8 h-8 text-brand-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Select or drop official certificate document'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Calculates SHA-256 for proof anchor</p>
              </label>
            </div>
          </div>

          {computedHash && (
            <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] break-all">
              <span className="text-[10px] text-emerald-400 block font-bold">Computed SHA-256 Digest:</span>
              {computedHash}
            </div>
          )}

          {/* MetaMask EIP-712 Signing Option */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Institutional Blockchain Authorization
                </p>
                <p className="text-[11px] text-slate-500">
                  {walletAccount ? (
                    <span className="text-emerald-700 font-medium">MetaMask Connected: {walletAccount.slice(0, 6)}...{walletAccount.slice(-4)}</span>
                  ) : (
                    'MetaMask not connected. Will use server-side authorized institutional key.'
                  )}
                </p>
              </div>
            </div>

            {walletAccount && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={signWithMetaMask}
                  onChange={(e) => setSignWithMetaMask(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                Sign with MetaMask (EIP-712)
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => navigate('/issuer/credentials')}>
              Cancel
            </Button>
            <Button data-testid="credential-issue" type="submit" variant="primary" icon={Boxes} isLoading={submitting}>
              Issue & Register Proof
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
