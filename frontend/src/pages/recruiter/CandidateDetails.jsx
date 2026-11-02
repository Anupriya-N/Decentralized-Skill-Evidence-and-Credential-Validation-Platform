import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { 
  ArrowLeft, 
  Building, 
  GraduationCap, 
  Award, 
  ShieldCheck, 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink,
  Download,
  FileCheck,
  Boxes,
  Clock,
  XCircle
} from 'lucide-react';
import { formatDate, truncateHash } from '../../utils/formatUtils';
import toast from 'react-hot-toast';

export const CandidateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { users, credentials, skills } = useApp();

  const candidate = users.find(u => u.id === id);

  if (!candidate) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-slate-600">Candidate not found.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  // Only public credentials authorized for recruiter view
  const candidateCreds = credentials.filter(c => c.ownerUserId === candidate.id && c.visibility === 'public');
  const candidateSkills = skills.filter(s => s.ownerUserId === candidate.id);
  const savedIds = user?.savedCandidateIds || [];
  const isSaved = savedIds.includes(candidate.id);

  const handleToggleSave = async () => {
    let updated;
    if (isSaved) {
      updated = savedIds.filter(i => i !== candidate.id);
      toast.success('Candidate removed from your shortlist.');
    } else {
      updated = [...savedIds, candidate.id];
      toast.success('Candidate added to shortlist.');
    }
    await updateProfile({ savedCandidateIds: updated });
  };

  // Download Recruiter Verification Dossier / Report (Missing.md item 5.9)
  const handleDownloadVerificationReport = () => {
    const reportData = {
      candidateName: candidate.fullName,
      institution: candidate.college,
      department: candidate.department,
      reportGeneratedBy: user?.company || 'Recruiter Portal',
      generatedDate: new Date().toISOString(),
      verifiedCredentialsCount: candidateCreds.length,
      credentials: candidateCreds.map(c => ({
        credentialId: c.credentialId,
        title: c.title,
        skill: c.skillName,
        category: c.category,
        issuer: c.issuerName,
        issuerTrustStatus: c.issuerStatus,
        fileHash: c.fileHash,
        hashAlgorithm: c.fileHashAlgorithm,
        blockchainNetwork: c.blockchainProof?.network || 'Sepolia (Simulated)',
        contractAddress: c.blockchainProof?.contractAddress,
        credentialStatus: c.credentialStatus,
        expiryDate: c.expiryDate || 'No expiration',
        isRevoked: c.credentialStatus === 'revoked'
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Candidate_Verification_Report_${candidate.fullName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Recruiter Candidate Verification Report downloaded!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back to Candidates
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleDownloadVerificationReport}
          >
            Download Verification Report
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={isSaved ? BookmarkCheck : Bookmark}
            onClick={handleToggleSave}
          >
            {isSaved ? 'Bookmarked' : 'Bookmark Candidate'}
          </Button>
          <Link to={`/portfolio/${candidate.id}`} target="_blank">
            <Button variant="primary" size="sm" icon={ExternalLink}>
              View Live Portfolio
            </Button>
          </Link>
        </div>
      </div>

      {/* Candidate Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <img
            src={candidate.profileImage}
            alt={candidate.fullName}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-brand-500/20 shadow-md"
          />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold text-slate-900">{candidate.fullName}</h1>
              <Badge status="Authorized Recruiter View" variant="verified" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400" />
                {candidate.college}
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                {candidate.department} • Class of {candidate.graduationYear || '2026'}
              </span>
            </div>
            {candidate.bio && (
              <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                {candidate.bio}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Verified Credentials with Full Issuer, Proof & Expiry Information */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-600" />
          Public Verified Credentials & Blockchain Proofs ({candidateCreds.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidateCreds.map(cred => {
            const isRevoked = cred.credentialStatus === 'revoked';
            const isExpired = cred.credentialStatus === 'expired';

            return (
              <Card key={cred.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-500 font-bold">{cred.credentialId}</span>
                    <Badge status={cred.credentialStatus} size="sm" />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{cred.title}</h3>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {cred.issuerName}
                    <Badge status={cred.issuerStatus} size="sm" />
                  </p>
                  
                  {/* Metadata Specs */}
                  <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                    <p>Issue Date: <strong className="text-slate-700">{formatDate(cred.issueDate)}</strong></p>
                    <p>Expiration: <strong className="text-slate-700">{cred.expiryDate ? formatDate(cred.expiryDate) : 'Lifetime validity'}</strong></p>
                    <p className="font-mono text-[10px] truncate">SHA-256: {truncateHash(cred.fileHash, 10, 10)}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link to={`/blockchain-proof/${cred.credentialId}`}>
                    <Button variant="ghost" size="sm" icon={Boxes}>
                      Proof Record
                    </Button>
                  </Link>
                  <Link to={`/verify/${cred.credentialId}`} target="_blank">
                    <Button variant="primary" size="sm" icon={ShieldCheck}>
                      Verify Hash
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
