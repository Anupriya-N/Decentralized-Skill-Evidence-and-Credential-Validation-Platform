import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { 
  Search, 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink, 
  GraduationCap, 
  Building, 
  ShieldCheck, 
  Scale, 
  Check, 
  X 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CandidateSearch = () => {
  const { user, updateProfile } = useAuth();
  const { users, credentials, skills } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Comparison State (Missing.md item 5.3)
  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const students = useMemo(() => {
    return users.filter(u => u.role === 'student' && u.isPortfolioPublic !== false);
  }, [users]);

  const savedIds = user?.savedCandidateIds || [];

  const handleToggleSaveCandidate = async (studentId) => {
    const isSaved = savedIds.includes(studentId);
    let updated;
    if (isSaved) {
      updated = savedIds.filter(id => id !== studentId);
      toast.success('Candidate removed from your shortlist.');
    } else {
      updated = [...savedIds, studentId];
      toast.success('Candidate saved to your shortlist!');
    }
    await updateProfile({ savedCandidateIds: updated });
  };

  const toggleCompare = (student) => {
    if (compareList.some(c => c.id === student.id)) {
      setCompareList(compareList.filter(c => c.id !== student.id));
    } else {
      if (compareList.length >= 2) {
        toast.error('You can compare up to 2 candidates simultaneously.');
        return;
      }
      setCompareList([...compareList, student]);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const studentCreds = credentials.filter(c => c.ownerUserId === student.id && c.visibility === 'public');
      const studentSkills = skills.filter(s => s.ownerUserId === student.id);
      const studentSkillNames = studentSkills.map(s => s.name.toLowerCase()).join(' ');

      const matchesSearch = 
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        studentSkillNames.includes(searchQuery.toLowerCase());

      const matchesDomain = selectedDomain === 'ALL' || studentSkills.some(s => s.category === selectedDomain);
      const matchesVerified = !verifiedOnly || studentCreds.some(c => c.integrityStatus === 'verified' && c.issuerStatus === 'trusted');

      return matchesSearch && matchesDomain && matchesVerified;
    });
  }, [students, credentials, skills, searchQuery, selectedDomain, verifiedOnly]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Candidate Search & Talent Discovery</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover verified talent filtered by cryptographic proof status and evidenced proficiencies.
          </p>
        </div>
        {compareList.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            icon={Scale}
            onClick={() => setShowCompareModal(true)}
          >
            Compare Candidates ({compareList.length}/2)
          </Button>
        )}
      </div>

      {/* Advanced Search & Filtering Bar (Missing.md item 5.1 & 5.2) */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by candidate name, skill (e.g. AWS, PyTorch, React), or university..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none whitespace-nowrap bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded text-brand-600 focus:ring-brand-500"
            />
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Proofs Only
          </label>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Found {filteredStudents.length} candidate portfolios</span>
          {(searchQuery || verifiedOnly) && (
            <button
              onClick={() => { setSearchQuery(''); setVerifiedOnly(false); }}
              className="text-brand-600 hover:underline font-medium text-xs"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredStudents.map(student => {
          const studentCreds = credentials.filter(c => c.ownerUserId === student.id && c.visibility === 'public');
          const studentSkillsList = skills.filter(s => s.ownerUserId === student.id);
          const isSaved = savedIds.includes(student.id);
          const isSelectedForCompare = compareList.some(c => c.id === student.id);

          return (
            <Card key={student.id} hoverEffect className="p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={student.profileImage}
                      alt={student.fullName}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-brand-500/20"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{student.fullName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        {student.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleCompare(student)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        isSelectedForCompare
                          ? 'bg-purple-100 text-purple-700 border-purple-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={isSelectedForCompare ? 'Remove from compare' : 'Compare candidate'}
                    >
                      <Scale className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleSaveCandidate(student.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isSaved
                          ? 'bg-brand-50 text-brand-600 border-brand-200'
                          : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                      }`}
                      title={isSaved ? 'Remove from shortlist' : 'Save candidate'}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {student.college}
                </div>

                {student.bio && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {student.bio}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Badge status={`${studentCreds.length} Verified Proof(s)`} variant="verified" size="sm" />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  {studentSkillsList.slice(0, 4).map(s => (
                    <span
                      key={s.id}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                        !s.isSelfReported && s.evidenceCredentialIds?.length
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {s.name}
                    </span>
                  ))}
                  {studentSkillsList.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 rounded text-slate-400">
                      +{studentSkillsList.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link to={`/recruiter/candidates/${student.id}`}>
                  <Button variant="secondary" size="sm">
                    View Dossier
                  </Button>
                </Link>
                <Link to={`/portfolio/${student.id}`} target="_blank">
                  <Button variant="ghost" size="sm" icon={ExternalLink}>
                    Portfolio
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Candidate Skill Comparison Modal (Missing.md item 5.3) */}
      {showCompareModal && compareList.length === 2 && (
        <Modal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          title="Candidate Competency & Evidence Comparison"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              {compareList.map(cand => (
                <div key={cand.id} className="text-center space-y-2">
                  <img src={cand.profileImage} alt={cand.fullName} className="w-16 h-16 rounded-xl mx-auto object-cover ring-2 ring-brand-500/20" />
                  <h4 className="font-bold text-sm text-slate-900">{cand.fullName}</h4>
                  <p className="text-slate-500 text-[11px]">{cand.college} • {cand.department}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {compareList.map(cand => {
                const candCreds = credentials.filter(c => c.ownerUserId === cand.id && c.visibility === 'public');
                const candSkills = skills.filter(s => s.ownerUserId === cand.id);
                return (
                  <div key={cand.id} className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-800">Verified Evidence Count:</span>
                      <p className="text-lg font-extrabold text-emerald-600">{candCreds.length} Blockchain Proofs</p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-700 block">Competencies:</span>
                      {candSkills.map(s => (
                        <div key={s.id} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-800">{s.name}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                            !s.isSelfReported ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {!s.isSelfReported ? 'Verified' : 'Self-Reported'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setShowCompareModal(false)}>
                Close Comparison
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
