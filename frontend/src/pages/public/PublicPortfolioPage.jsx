import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Footer } from '../../components/layout/Footer';
import { DemoBanner } from '../../components/common/DemoBanner';
import { 
  GraduationCap, 
  Building, 
  Award, 
  ShieldCheck, 
  ExternalLink, 
  Share2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { formatDate } from '../../utils/formatUtils';
import toast from 'react-hot-toast';

export const PublicPortfolioPage = () => {
  const { studentId } = useParams();
  const { users, credentials, skills } = useApp();

  const student = users.find(u => u.id === studentId || u.role === 'student');

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Portfolio Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">The requested public candidate profile does not exist.</p>
          <Link to="/" className="mt-4 inline-block">
            <Button variant="secondary" size="sm">Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Filter public items
  const studentCredentials = credentials.filter(c => c.ownerUserId === student.id && c.visibility === 'public');
  const studentSkills = skills.filter(s => s.ownerUserId === student.id && s.visibility === 'public');

  const verifiedSkills = studentSkills.filter(s => !s.isSelfReported && s.evidenceCredentialIds?.length > 0);
  const selfReportedSkills = studentSkills.filter(s => s.isSelfReported || !s.evidenceCredentialIds?.length);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Public portfolio link copied!');
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
            Certi<span className="text-brand-600">Trust</span> <span className="text-xs font-semibold text-slate-400">Public Portfolio</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={Share2} onClick={handleShare}>
            Share Profile
          </Button>
          <Link to="/login">
            <Button size="sm" variant="primary">Login</Button>
          </Link>
        </div>
      </header>

      {/* Portfolio Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-8 w-full">
        {/* Candidate Profile Card */}
        <Card className="p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <img
              src={student.profileImage}
              alt={student.fullName}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-brand-500/20 shadow-md"
            />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{student.fullName}</h1>
                <Badge status="Public Profile" variant="verified" />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building className="w-4 h-4 text-slate-400" />
                  {student.college}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  {student.department} • Class of {student.graduationYear || '2026'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {student.bio}
              </p>
            </div>
          </div>
        </Card>

        {/* Evidenced Skills */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Evidence-Backed Competencies
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Skills directly linked to cryptographic on-chain proofs and accredited certificates.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              {verifiedSkills.length} Evidenced
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedSkills.map(skill => (
              <Card key={skill.id} className="p-4 border-l-4 border-l-emerald-500">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{skill.name}</h3>
                    <span className="text-[11px] text-slate-500">{skill.category}</span>
                  </div>
                  <Badge status="Evidence Verified" size="sm" />
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Proficiency: <strong className="text-slate-700">{skill.proficiency}</strong></span>
                  <span className="text-emerald-700 font-medium">Linked to Credential</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Self-Reported Skills */}
        {selfReportedSkills.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Self-Reported Skills
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Candidate-declared proficiencies pending formal credential attestation.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {selfReportedSkills.map(skill => (
                <div key={skill.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <p className="font-semibold text-slate-800">{skill.name}</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                    <span>{skill.category}</span>
                    <span className="italic">{skill.proficiency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Credentials Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-600" />
              Public Verified Credentials ({studentCredentials.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentCredentials.map(cred => (
              <Card key={cred.id} className="p-5 flex flex-col justify-between">
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
                    {cred.fileHashAlgorithm}: {cred.fileHash?.slice(0, 8)}...
                  </span>
                  <Link to={`/verify/${cred.credentialId}`} target="_blank">
                    <Button variant="ghost" size="sm" icon={ExternalLink}>
                      Verify Proof
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
