import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { calculateSHA256 } from '../../utils/hashUtils';
import { validateEvidenceFile, validateCredentialForm } from '../../utils/validationUtils';
import { mockAIAdapter } from '../../adapters/ai/mockAIAdapter';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { CATEGORIES } from '../../utils/formatUtils';
import { 
  UploadCloud, 
  FileCheck, 
  Hash, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Boxes 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const UploadEvidencePage = () => {
  const { user } = useAuth();
  const { addCredential, issuers } = useApp();
  const navigate = useNavigate();

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [computedHash, setComputedHash] = useState('');
  const [isHashing, setIsHashing] = useState(false);

  // AI Assistive state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // Form metadata
  const [title, setTitle] = useState('');
  const [skillName, setSkillName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Handle File Selection
  const handleFileChange = async (file) => {
    if (!file) return;

    const validation = validateEvidenceFile(file);
    if (!validation.valid) {
      toast.error(validation.errors.join(' '));
      return;
    }

    setSelectedFile(file);
    setIsHashing(true);

    try {
      // Execute genuine Web Crypto API SHA-256 calculation
      const hash = await calculateSHA256(file);
      setComputedHash(hash);
      toast.success('SHA-256 binary digest calculated successfully!');
    } catch (err) {
      toast.error('Cryptographic calculation failed: ' + err.message);
    } finally {
      setIsHashing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  // AI OCR / Extraction Helper (Phase 9 & Section 6.1)
  const handleExtractWithAI = async () => {
    if (!selectedFile) {
      toast.error('Please select an evidence file first.');
      return;
    }
    setAiLoading(true);
    try {
      const suggestion = await mockAIAdapter.extractCertificateDetails(selectedFile);
      setAiSuggestion(suggestion);
      toast.success('AI extraction complete! Review suggestions below.');
    } catch (err) {
      toast.error('AI extraction demo error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestions = () => {
    if (!aiSuggestion) return;
    setTitle(aiSuggestion.suggestedTitle || title);
    setIssuer(aiSuggestion.suggestedIssuer || issuer);
    setIssueDate(aiSuggestion.suggestedIssueDate || issueDate);
    if (aiSuggestion.suggestedExpiryDate) setExpiryDate(aiSuggestion.suggestedExpiryDate);
    setSkillName(aiSuggestion.suggestedSkillName || skillName);
    setCategory(aiSuggestion.suggestedCategory || category);
    setDescription(aiSuggestion.suggestedDescription || description);
    toast.success('AI suggestions applied to form. You may edit them before saving.');
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile || !computedHash) {
      toast.error('Please upload an evidence file to compute its cryptographic hash.');
      return;
    }

    const validation = validateCredentialForm({
      title,
      skillName,
      category,
      issuer,
      issueDate
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      toast.error('Please resolve validation errors in the form.');
      return;
    }

    setSubmitting(true);
    try {
      const newCred = await addCredential({
        ownerUserId: user?.id,
        title,
        skillName,
        category,
        issuer,
        issueDate,
        expiryDate: expiryDate || null,
        description,
        visibility
      }, selectedFile, computedHash);

      navigate(`/student/credentials/${newCred.id}`);
    } catch (err) {
      toast.error('Registration failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Upload Skill Evidence & Register Proof</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate an immutable SHA-256 digest from your certificate bytes and anchor it to the registry.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: File Upload & Cryptographic Hashing */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Step 1: Certificate File & Cryptographic Hashing
            </span>
            <span className="text-xs text-brand-600 font-semibold font-mono">Web Crypto API</span>
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50 cursor-pointer"
          >
            <input
              type="file"
              id="evidence-file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <label htmlFor="evidence-file" className="cursor-pointer block">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                {isHashing ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : selectedFile ? (
                  <FileCheck className="w-6 h-6 text-emerald-600" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedFile ? selectedFile.name : 'Click to select or drag & drop certificate'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supported formats: PDF, PNG, JPG, WEBP (Maximum size: 10 MB)
              </p>
            </label>
          </div>

          {/* Computed Hash Display */}
          {computedHash && (
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-800 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Exact SHA-256 Digest Computed from Bytes
                </span>
                <span className="text-[10px] text-slate-400 font-mono">64 characters</span>
              </div>
              <code className="text-xs font-mono text-slate-200 break-all block select-all">
                {computedHash}
              </code>
            </div>
          )}

          {/* AI Extraction Assist (Phase 9 & Section 6.1) */}
          {selectedFile && (
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-purple-50/60 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs text-purple-900 font-medium">
                  Let AI suggest certificate metadata from your uploaded document
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Sparkles}
                isLoading={aiLoading}
                onClick={handleExtractWithAI}
              >
                Extract Details with AI
              </Button>
            </div>
          )}

          {/* AI Suggestions Review Box */}
          {aiSuggestion && (
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  AI Assistive Extraction (Review & Confirm)
                </span>
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-purple-700 text-[11px] leading-relaxed">
                Notice: AI output is generated as a draft suggestion and must be verified by you before submitting.
              </p>
              <div className="grid grid-cols-2 gap-2 bg-white/80 p-3 rounded-lg border border-purple-100 font-medium text-slate-800">
                <div>Title: <span className="text-purple-900">{aiSuggestion.suggestedTitle}</span></div>
                <div>Issuer: <span className="text-purple-900">{aiSuggestion.suggestedIssuer}</span></div>
                <div>Skill: <span className="text-purple-900">{aiSuggestion.suggestedSkillName}</span></div>
                <div>Category: <span className="text-purple-900">{aiSuggestion.suggestedCategory}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="primary" onClick={applyAiSuggestions}>
                  Accept Suggestions into Form
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAiSuggestion(null)}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Step 2: Credential Metadata */}
        <Card className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Step 2: Certificate Details & Metadata
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Credential Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Certified Solutions Architect - Cloud Infrastructure"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {formErrors.title && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Competency / Skill Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. AWS Cloud Architecture"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {formErrors.skillName && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.skillName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Skill Domain / Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuing Organization <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                list="issuers-list"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. Global Cloud & Tech Certification Authority"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <datalist id="issuers-list">
                {issuers.map(i => (
                  <option key={i.id} value={i.organizationName} />
                ))}
              </datalist>
              {formErrors.issuer && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.issuer}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
              {formErrors.issueDate && <p className="text-[11px] text-rose-500 mt-0.5">{formErrors.issueDate}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiration Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Portfolio Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                <option value="public">Public (Searchable by verified recruiters)</option>
                <option value="private">Private (Only accessed via direct QR link)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Syllabus Scope
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summarize course modules, capstone scope, or certification achievements..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </Card>

        {/* Submit Action */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/student/credentials')}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={Boxes}
            isLoading={submitting}
            disabled={!selectedFile || !computedHash}
          >
            Compute Proof & Register Credential
          </Button>
        </div>
      </form>
    </div>
  );
};
