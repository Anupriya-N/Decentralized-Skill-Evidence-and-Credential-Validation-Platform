import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { credentialService } from '../../services/credentialService';
import { blockchainService } from '../../services/blockchainService';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { QRCodeModal } from '../../components/credentials/QRCodeModal';
import { FileRehashCheck } from '../../components/verification/FileRehashCheck';
import { DocumentPreview } from '../../components/common/DocumentPreview';
import { CredentialTimeline } from '../../components/credentials/CredentialTimeline';
import { SkillEvidenceMapper } from '../../components/credentials/SkillEvidenceMapper';
import { formatDate, formatBytes, truncateHash, CATEGORIES } from '../../utils/formatUtils';
import { 
  Award, 
  ArrowLeft, 
  Building, 
  Calendar, 
  FileText, 
  Hash, 
  Boxes, 
  QrCode, 
  ExternalLink, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  Share2,
  Download,
  Eye,
  Layers,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CredentialDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { credentials, skills, refreshData } = useApp();

  const credential = credentials.find(c => c.id === id || c.credentialId === id);

  const [showQRModal, setShowQRModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecheckSection, setShowRecheckSection] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showSkillMapper, setShowSkillMapper] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(credential?.title || '');
  const [editSkill, setEditSkill] = useState(credential?.skillName || '');
  const [editCategory, setEditCategory] = useState(credential?.category || '');
  const [editDescription, setEditDescription] = useState(credential?.description || '');
  const [editVisibility, setEditVisibility] = useState(credential?.visibility || 'public');

  if (!credential) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-slate-600">Credential not found.</p>
        <Link to="/student/credentials">
          <Button variant="secondary" size="sm" icon={ArrowLeft}>Back to Credentials</Button>
        </Link>
      </div>
    );
  }

  const handleSaveMetadata = (e) => {
    e.preventDefault();
    try {
      credentialService.updateCredentialMetadata(credential.id, {
        title: editTitle,
        skillName: editSkill,
        category: editCategory,
        description: editDescription,
        visibility: editVisibility
      });
      refreshData();
      setShowEditModal(false);
      toast.success('Metadata updated successfully! (Original SHA-256 hash unchanged)');
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  const handleRecheckHashed = (computedHash) => {
    if (computedHash.toLowerCase() === credential.fileHash.toLowerCase()) {
      toast.success('Integrity verified! File hash matches registered blockchain proof.');
    } else {
      toast.error('Hash mismatch! Evaluated file does NOT match the registered digest.');
    }
  };

  // Download Credential Details (Missing.md item 1.9)
  const handleDownloadDetails = () => {
    const reportData = {
      credentialId: credential.credentialId,
      title: credential.title,
      skill: credential.skillName,
      category: credential.category,
      issuer: credential.issuerName,
      issueDate: credential.issueDate,
      expiryDate: credential.expiryDate || 'Does not expire',
      sha256Digest: credential.fileHash,
      blockchainNetwork: credential.blockchainProof?.network || 'Sepolia (Simulated)',
      smartContract: credential.blockchainProof?.contractAddress || '0x32A6f4B3bC430b2c1C6809E18a2872323c21C28e',
      transactionHash: credential.blockchainProof?.transactionHash || 'N/A',
      verificationUrl: `${window.location.origin}/verify/${credential.credentialId}`,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${credential.credentialId}_Audit_Summary.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Credential audit details downloaded.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500 font-bold">{credential.credentialId}</span>
              <Badge status={credential.credentialStatus} size="sm" />
              <Badge status={credential.issuerStatus === 'trusted' ? 'Trusted Issuer' : credential.issuerStatus} size="sm" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">{credential.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={Eye} onClick={() => setShowDocPreview(true)}>
            Preview Document
          </Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={handleDownloadDetails}>
            Download Summary
          </Button>
          <Button variant="secondary" size="sm" icon={Layers} onClick={() => setShowSkillMapper(true)}>
            Map Skills
          </Button>
          <Button variant="secondary" size="sm" icon={QrCode} onClick={() => setShowQRModal(true)}>
            QR Code
          </Button>
          <Button variant="secondary" size="sm" icon={Edit3} onClick={() => setShowEditModal(true)}>
            Edit
          </Button>
          <Link to={`/verify/${credential.credentialId}`} target="_blank">
            <Button variant="primary" size="sm" icon={ExternalLink}>
              Verify
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Evidence File */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              Credential Specifications
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-400">Competency / Skill</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">{credential.skillName}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Category</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">{credential.category}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Issuing Organization</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">{credential.issuerName}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Issue Date</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">{formatDate(credential.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Expiration Date</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {credential.expiryDate ? formatDate(credential.expiryDate) : 'Does Not Expire'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Portfolio Visibility</dt>
                <dd className="font-semibold text-slate-800 mt-0.5 capitalize">{credential.visibility}</dd>
              </div>
            </dl>

            {credential.description && (
              <div className="pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block mb-1">Description & Scope</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {credential.description}
                </p>
              </div>
            )}
          </Card>

          {/* Cryptographic SHA-256 Digest Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Hash className="w-4 h-4 text-brand-600" />
                Cryptographic File Digest
              </h3>
              <Badge status="Exact Binary Match" variant="verified" size="sm" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This SHA-256 digest was generated directly from the uploaded file bytes in the browser via the Web Crypto API. If any character or pixel in the file is modified, the computed digest will not match.
            </p>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs break-all select-all space-y-2 border border-slate-800">
              <span className="text-brand-300 text-[10px] uppercase font-bold block">
                SHA-256 Hex Hash (64 characters)
              </span>
              <code>{credential.fileHash}</code>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>File Name: <strong>{credential.fileName}</strong></span>
              <span>Size: {formatBytes(credential.fileSize)}</span>
            </div>

            {/* Toggle Recheck */}
            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRecheckSection(!showRecheckSection)}
              >
                {showRecheckSection ? 'Hide Re-Hash Tool' : 'Test File Re-Hash Comparison'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={Eye}
                onClick={() => setShowDocPreview(true)}
              >
                Preview File
              </Button>
            </div>

            {showRecheckSection && (
              <div className="pt-2">
                <FileRehashCheck onFileHashed={handleRecheckHashed} />
              </div>
            )}
          </Card>

          {/* Credential Lifecycle Timeline (Missing.md item 1.6 & 1.10 & 1.11) */}
          <Card className="p-6">
            <CredentialTimeline
              credential={credential}
              onResubmitEvidence={() => navigate(`/student/upload?resubmit=${credential.id}`)}
            />
          </Card>
        </div>

        {/* Right Column: Ledger Record & Dedicated Proof Link */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-b from-slate-900 to-navy-950 text-white space-y-4 border-navy-800">
            {(() => {
              const isLiveConnected = blockchainService.isConnected();
              const hasLiveProof = Boolean(isLiveConnected && credential.blockchainProof?.transactionHash && !credential.blockchainProof?.isMock);

              return (
                <>
                  <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-5 h-5 text-brand-400" />
                      <h3 className="text-sm font-bold">Ledger Proof Anchor</h3>
                    </div>
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold border ${
                      hasLiveProof 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {hasLiveProof ? 'ON-CHAIN' : 'BLOCKCHAIN NOT CONNECTED'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {hasLiveProof
                      ? 'Immutable reference confirmed on live CredentialRegistry smart contract. No personally identifiable information (PII) is stored on-chain.'
                      : 'Cryptographic digest is preserved off-chain. Live smart contract anchoring requires a configured Web3 network connection.'}
                  </p>

                  <div className="space-y-3 text-xs font-mono">
                    <div className="p-2.5 rounded bg-navy-900/80 border border-navy-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Network</span>
                      <span className="text-brand-300 font-semibold">
                        {hasLiveProof ? credential.blockchainProof?.network : 'Blockchain integration not connected'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-navy-900/80 border border-navy-800">
                      <span className="text-[10px] text-slate-400 uppercase block">Transaction Hash</span>
                      <span className={`text-[11px] break-all ${hasLiveProof ? 'text-slate-200' : 'text-slate-400 italic font-sans'}`}>
                        {hasLiveProof ? credential.blockchainProof?.transactionHash : 'No live transaction recorded'}
                      </span>
                    </div>
                  </div>

                  {/* Link to Dedicated Blockchain Proof Page */}
                  <div className="pt-2">
                    <Link to={`/blockchain-proof/${credential.credentialId}`} className="block">
                      <Button variant="primary" size="sm" className="w-full" icon={ExternalLink}>
                        View Blockchain Proof Details
                      </Button>
                    </Link>
                  </div>
                </>
              );
            })()}
          </Card>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        credential={credential}
      />

      {/* Document Preview Modal */}
      <DocumentPreview
        isOpen={showDocPreview}
        onClose={() => setShowDocPreview(false)}
        fileName={credential.fileName}
        fileSize={credential.fileSize}
        mimeType={credential.mimeType}
        fileHash={credential.fileHash}
      />

      {/* Skill Evidence Mapper Modal */}
      <SkillEvidenceMapper
        isOpen={showSkillMapper}
        onClose={() => setShowSkillMapper(false)}
        credential={credential}
        studentSkills={skills.filter(s => s.ownerUserId === credential.ownerUserId)}
        onSkillsUpdated={() => refreshData()}
      />

      {/* Edit Metadata Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Credential Metadata"
      >
        <form onSubmit={handleSaveMetadata} className="space-y-4 text-left">
          <p className="text-xs text-slate-500">
            Modifying title or description updates display metadata only. The registered SHA-256 binary hash remains unaltered.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Competency / Skill</label>
            <input
              type="text"
              required
              value={editSkill}
              onChange={(e) => setEditSkill(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Visibility</label>
            <select
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              <option value="public">Public (Visible in search and portfolio)</option>
              <option value="private">Private (Restricted to direct QR / link)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
