import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { calculateSHA256 } from '../../utils/hashUtils';
import { validateEvidenceFile, validateCredentialForm } from '../../utils/validationUtils';
import { aiService } from '../../services/aiService';
import { evidenceService } from '../../services/evidenceService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DocumentPreview } from '../../components/common/DocumentPreview';
import { DuplicateWarningBanner } from '../../components/credentials/DuplicateWarningBanner';
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
  Boxes,
  Eye,
  RotateCcw,
  User,
  Building,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const UploadEvidencePage = () => {
  const { user } = useAuth();
  const { addCredential, issuers, credentials } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resubmitId = searchParams.get('resubmit');

  // Multi-step processing tracker: 1 (Upload), 2 (AI Review), 3 (Confirm & Anchor)
  const [currentStep, setCurrentStep] = useState(1);

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [computedHash, setComputedHash] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // AI Assistive state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState(null);
  const [hasUserConfirmedAI, setHasUserConfirmedAI] = useState(false);

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

  // Pre-fill if in resubmission mode
  useEffect(() => {
    if (resubmitId) {
      const target = credentials.find(c => c.id === resubmitId || c.credentialId === resubmitId);
      if (target) {
        setTitle(target.title);
        setSkillName(target.skillName);
        setCategory(target.category);
        setIssuer(target.issuerName);
        setIssueDate(target.issueDate);
        setExpiryDate(target.expiryDate || '');
        setDescription(target.description || '');
        toast('Loaded previous metadata for evidence resubmission.', { icon: 'ℹ️' });
      }
    }
  }, [resubmitId, credentials]);

  // Handle File Selection & Duplicate Detection
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
      // Calculate real SHA-256 via Web Crypto API
      const hash = await calculateSHA256(file);
      setComputedHash(hash);

      // Check for duplicates
      const dup = credentials.find(c => 
        c.fileHash?.toLowerCase() === hash.toLowerCase() &&
        c.id !== resubmitId
      );

      if (dup) {
        setDuplicateWarning({
          found: true,
          credentialId: dup.credentialId,
          title: dup.title,
          message: `Warning: A certificate with identical SHA-256 bytes "${dup.title}" (${dup.credentialId}) was previously registered.`
        });
      } else {
        setDuplicateWarning(null);
      }

      toast.success('SHA-256 binary digest calculated successfully!');
    } catch (err) {
      toast.error('Cryptographic calculation failed: ' + err.message);
    } finally {
      setIsHashing(false);
    }
  };

  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  // AI Extraction Handler
  const handleExtractWithAI = async () => {
    if (!selectedFile) {
      toast.error('Please select an evidence file first.');
      return;
    }
    setAiLoading(true);
    try {
      const suggestion = await aiService.extractCertificateDetails(
        selectedFile,
        user?.fullName || user?.name || 'Student',
        credentials
      );
      setAiExtractedData(suggestion);
      setCurrentStep(2); // Advance to AI Review Step
      toast.success('AI extraction complete! Review and correct fields.');
    } catch (err) {
      toast.error('AI extraction error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirmAISuggestions = () => {
    if (!aiExtractedData) return;
    setTitle(aiExtractedData.suggestedTitle || title);
    setIssuer(aiExtractedData.suggestedIssuer || issuer);
    setIssueDate(aiExtractedData.suggestedIssueDate || issueDate);
    if (aiExtractedData.suggestedExpiryDate) setExpiryDate(aiExtractedData.suggestedExpiryDate);
    setSkillName(aiExtractedData.suggestedSkillName || skillName);
    setCategory(aiExtractedData.suggestedCategory || category);
    setDescription(aiExtractedData.suggestedDescription || description);
    setHasUserConfirmedAI(true);
    setCurrentStep(3); // Advance to metadata confirmation
    toast.success('AI suggestions verified & applied to submission form.');
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
        studentName: user?.fullName || user?.name || 'Student',
        resubmitCredentialId: resubmitId,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {resubmitId ? 'Resubmit Credential Evidence' : 'Upload Skill Evidence & Anchor Proof'}
            </h1>
            {resubmitId && (
              <Badge status="Resubmission Mode" variant="pending" size="sm" />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate an immutable SHA-256 digest from your certificate bytes and anchor it to the registry.
          </p>
        </div>
      </div>

      {/* Evidence Processing Status Tracker (Missing.md item 1.5) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pb-2">
          <span>Processing Tracker</span>
          <span className="font-mono text-[11px] text-brand-600">Step {currentStep} of 3</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className={`p-2.5 rounded-lg border text-center transition-colors ${
            currentStep === 1 ? 'bg-brand-50 border-brand-500 text-brand-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            1. File Upload & SHA-256
          </div>
          <div className={`p-2.5 rounded-lg border text-center transition-colors ${
            currentStep === 2 ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            2. AI Extraction Review
          </div>
          <div className={`p-2.5 rounded-lg border text-center transition-colors ${
            currentStep === 3 ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            3. Confirmation & Proof
          </div>
        </div>
      </div>

      {/* Duplicate Warning Banner (Missing.md item 1.7) */}
      {duplicateWarning && (
        <DuplicateWarningBanner
          duplicateInfo={duplicateWarning}
          onDismiss={() => setDuplicateWarning(null)}
        />
      )}

      {/* Step 1: Upload & File Preview */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 1: Evidence Document Upload & Hashing
          </span>
          <span className="text-xs text-brand-600 font-semibold font-mono">Web Crypto API</span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 cursor-pointer"
        >
          <input
            data-testid="evidence-upload-input"
            type="file"
            id="evidence-file-input"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />
          <label htmlFor="evidence-file-input" className="cursor-pointer block">
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

        {/* File Preview Trigger & Details (Missing.md item 1.1 & 1.2) */}
        {selectedFile && (
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">{selectedFile.name}</span>
              <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={Eye}
                onClick={() => setShowDocPreview(true)}
              >
                Preview Document
              </Button>
            </div>
          </div>
        )}

        {/* Computed Hash Display */}
        {computedHash && (
          <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Computed SHA-256 Digest
              </span>
              <span className="text-[10px] text-slate-400 font-mono">64 hex chars</span>
            </div>
            <code className="text-xs font-mono text-slate-200 break-all block select-all">
              {computedHash}
            </code>
          </div>
        )}

        {/* AI Extraction Button */}
        {selectedFile && currentStep === 1 && (
          <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-900">Run AI Assistive Metadata Extraction</p>
                <p className="text-[11px] text-purple-700">Extract student name, issuer, issue date, and skills for verification review.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={Sparkles}
              isLoading={aiLoading}
              onClick={handleExtractWithAI}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Analyze with AI
            </Button>
          </div>
        )}
      </Card>

      {/* Step 2: AI-Extracted Certificate Information Review Screen (Missing.md item 1.3, 1.4 & Section 2) */}
      {aiExtractedData && (
        <Card className="space-y-4 border-purple-200 bg-purple-50/20 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                AI Extraction Review & Student Confirmation
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              Confidence: {Math.round(aiExtractedData.confidence * 100)}%
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Review the extracted values below. As required by CertiTrust guidelines, <strong>AI output is an assistive suggestion only</strong> and must be confirmed or corrected by you before submission.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-purple-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Extracted Student Name</span>
              <p className="font-semibold text-slate-800 mt-0.5">{aiExtractedData.extractedStudentName}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Suggested Certificate Title</span>
              <p className="font-semibold text-slate-800 mt-0.5">{aiExtractedData.suggestedTitle}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Suggested Issuing Authority</span>
              <p className="font-semibold text-slate-800 mt-0.5">{aiExtractedData.suggestedIssuer}</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Issue Date / Expiry Date</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {aiExtractedData.suggestedIssueDate} • {aiExtractedData.suggestedExpiryDate || 'Not specified (Lifetime)'}
              </p>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Identified Competencies & Skills</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {aiExtractedData.evidenceToSkillMatching?.map((sm, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-medium">
                    {sm.skillName} ({Math.round(sm.confidence * 100)}% match)
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Missing Information Notice */}
          {aiExtractedData.missingInformation?.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Information Flags:
              </span>
              <ul className="list-disc list-inside text-[11px] space-y-0.5">
                {aiExtractedData.missingInformation.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 italic">
              Status: AI extraction completed. Issuer verification pending.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAiExtractedData(null)}
              >
                Discard AI Output
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                onClick={handleConfirmAISuggestions}
              >
                Confirm & Fill Form
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Credential Metadata Form & Student Corrections */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Step 3: Credential Metadata & Verification Details
            </span>
            {hasUserConfirmedAI && (
              <Badge status="AI Verified by Student" variant="verified" size="sm" />
            )}
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

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/student/credentials')}
          >
            Cancel
          </Button>

          <Button
            data-testid="evidence-submit"
            type="submit"
            variant="primary"
            size="lg"
            icon={Boxes}
            isLoading={submitting}
            disabled={!selectedFile || !computedHash}
          >
            {resubmitId ? 'Update & Anchor Resubmitted Evidence' : 'Compute Proof & Register Credential'}
          </Button>
        </div>
      </form>

      {/* Document Preview Modal */}
      <DocumentPreview
        isOpen={showDocPreview}
        onClose={() => setShowDocPreview(false)}
        file={selectedFile}
        fileName={selectedFile?.name}
        fileSize={selectedFile?.size}
        mimeType={selectedFile?.type}
        fileHash={computedHash}
      />
    </div>
  );
};
