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
  ExternalLink 
} from 'lucide-react';
import { formatDate } from '../../utils/formatUtils';
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back to Candidates
        </Button>
        <div className="flex items-center gap-2">
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
            <h1 className="text-2xl font-extrabold text-slate-900">{candidate.fullName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-400" />
                {candidate.college}
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                {candidate.department}
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

      {/* Public Verified Credentials */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-brand-600" />
          Verified Credentials & Proofs ({candidateCreds.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidateCreds.map(cred => (
            <Card key={cred.id} className="p-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">{cred.credentialId}</span>
                  <Badge status={cred.credentialStatus} size="sm" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{cred.title}</h3>
                <p className="text-xs text-slate-500">{cred.issuerName}</p>
                <p className="text-[11px] text-slate-400">Issued: {formatDate(cred.issueDate)}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Digest: {cred.fileHash?.slice(0, 8)}...
                </span>
                <Link to={`/verify/${cred.credentialId}`}>
                  <Button variant="ghost" size="sm" icon={ShieldCheck}>
                    Verify Cryptographic Proof
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
