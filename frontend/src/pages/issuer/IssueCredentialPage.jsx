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
import { credentialService } from '../../services/credentialService';
import { apiClient } from '../../services/apiClient';
import toast from 'react-hot-toast';

export const IssueCredentialPage = () => {
  const { user } = useAuth();
  const { users, addCredential, issuers } = useApp();
  const navigate = useNavigate();

  const myIssuer = issuers.find(i => i.id === user?.issuerId || i.email === user?.email) || issuers[0];
  const fallbackStudents = users.filter(u => u.role === 'student');

  const [realStudents, setRealStudents] = useState([]);
  const activeStudents = realStudents.length > 0 ? realStudents : fallbackStudents;

  const [recipientStudentId, setRecipientStudentId] = useState('');
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
    let isMounted = true;
    async function loadStudents() {
      try {
        const res = await apiClient.get('/institutions/students');
        if (isMounted && res?.data?.students && Array.isArray(res.data.students)) {
          const list = res.data.students.map(s => ({
            id: s.id,
            fullName: s.name,
            email: s.email,
            role: 'student'
          }));
          setRealStudents(list);
          if (list.length > 0) {
            setRecipientStudentId(prev => prev || list[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch institutional students list:', err.message);
      }
    }
    loadStudents();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!recipientStudentId && activeStudents.length > 0) {
      setRecipientStudentId(activeStudents[0].id);
    }
  }, [activeStudents, recipientStudentId]);

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
    if (!selectedFile) {
      toast.error('Please upload the certificate evidence file.');
      return;
    }
    if (!recipientStudentId) {
      toast.error('Please select an enrolled recipient student.');
      return;
    }

    const isMock = import.meta.env?.VITE_ENABLE_MOCK_BLOCKCHAIN === 'true';
    if (!isMock && !walletAccount) {
      toast.error('MetaMask wallet must be connected to sign the institutional authorization.');
      return;
    }

    setSubmitting(true);
    try {
      // Step 0: Upload evidence file first to obtain verified backend evidence ID
      toast.loading('Uploading certificate evidence...', { id: 'upload-evidence' });
      let uploadedEvidenceId = null;
      try {
        const formData = new FormData();
        formData.append('document', selectedFile);
        formData.append('title', title || selectedFile.name);
        formData.append('evidenceType', 'CERTIFICATE_PDF');
        formData.append('description', `Certificate evidence for ${title}`);
        formData.append('studentId', recipientStudentId);
        if (skillName) {
          formData.append('skills', JSON.stringify([skillName]));
        }
        const uploadRes = await apiClient.post('/evidence/upload', formData);
        if (uploadRes?.data?.id) {
          uploadedEvidenceId = uploadRes.data.id;
        } else {
          throw new Error('Evidence upload did not return an evidence ID');
        }
        toast.success('Evidence uploaded and approved!', { id: 'upload-evidence' });
      } catch (uploadErr) {
        toast.dismiss('upload-evidence');
        toast.error('Evidence upload failed: ' + (uploadErr.data?.message || uploadErr.message));
        setSubmitting(false);
        return;
      }

      // Step 1: Two-Step Preparation Flow - prepare canonical credential payload and hash via backend
      toast.loading('Preparing canonical credential payload...', { id: 'prep-cred' });
      let preparedData;
      try {
        preparedData = await credentialService.prepareIssuance({
          studentId: recipientStudentId,
          title,
          courseCode: skillName,
          type: category,
          issuedAt: issueDate,
          evidenceId: uploadedEvidenceId,
        });
        toast.success('Canonical payload prepared and hash computed!', { id: 'prep-cred' });
      } catch (prepErr) {
        toast.dismiss('prep-cred');
        toast.error('Preparation failed: ' + (prepErr.message || 'Error communicating with backend'));
        setSubmitting(false);
        return;
      }

      // Step 2: Sign exact backend canonical hash via MetaMask
      let signedAuth = null;
      let metaMaskSignature = null;
      if (walletAccount) {
        toast.loading('Please sign EIP-712 IssueAuthorization in MetaMask...', { id: 'mm-sign' });
        try {
          signedAuth = await walletService.signIssueAuthorization(preparedData);
          metaMaskSignature = signedAuth.signature;
          toast.success('MetaMask EIP-712 signature approved!', { id: 'mm-sign' });
        } catch (signErr) {
          toast.dismiss('mm-sign');
          toast.error(signErr.message || 'Signature rejected in MetaMask');
          setSubmitting(false);
          return;
        }
      }

      // Step 3: Submit complete issuance request to backend
      const newCred = await addCredential({
        ownerUserId: recipientStudentId,
        studentId: recipientStudentId,
        title,
        skillName,
        courseCode: skillName,
        category,
        issuerId: myIssuer.id,
        issuer: myIssuer.organizationName,
        issueDate: preparedData.issuedAt || issueDate,
        visibility: 'public',
        certificateNumber: preparedData.certificateNumber,
        issuedAt: preparedData.issuedAt,
        evidenceId: uploadedEvidenceId,
        normalizedPayload: preparedData.normalizedPayload,
        credentialHash: preparedData.credentialHash,
        eip712Auth: signedAuth,
        eip712Signature: metaMaskSignature,
        metaMaskSignature
      }, selectedFile, preparedData.credentialHash || computedHash);

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
              {activeStudents.map(s => (
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
                    <span className="text-rose-600 font-medium">MetaMask not connected. Wallet required for production issuance.</span>
                  )}
                </p>
              </div>
            </div>

            {walletAccount && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to Sign (EIP-712)
              </span>
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
