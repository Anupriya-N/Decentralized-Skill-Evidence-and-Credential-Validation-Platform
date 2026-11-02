import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Search, Bookmark, BookmarkCheck, ExternalLink, GraduationCap, Building, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const CandidateSearch = () => {
  const { user, updateProfile } = useAuth();
  const { users, credentials, skills } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');

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

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const studentSkills = skills.filter(s => s.ownerUserId === student.id);
      const studentSkillNames = studentSkills.map(s => s.name.toLowerCase()).join(' ');

      const matchesSearch = 
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        studentSkillNames.includes(searchQuery.toLowerCase());

      const matchesDomain = selectedDomain === 'ALL' || studentSkills.some(s => s.category === selectedDomain);

      return matchesSearch && matchesDomain;
    });
  }, [students, skills, searchQuery, selectedDomain]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Candidate Search & Talent Discovery</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Find candidates by cryptographic evidence, verified competencies, and academic background.
        </p>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
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
        </div>
      </Card>

      {/* Candidates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredStudents.map(student => {
          const studentCreds = credentials.filter(c => c.ownerUserId === student.id && c.visibility === 'public');
          const studentSkillsList = skills.filter(s => s.ownerUserId === student.id);
          const isSaved = savedIds.includes(student.id);

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

                  <button
                    onClick={() => handleToggleSaveCandidate(student.id)}
                    className={`p-2 rounded-lg border transition-colors ${
                      isSaved
                        ? 'bg-brand-50 text-brand-600 border-brand-200'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                    }`}
                    title={isSaved ? 'Remove from shortlist' : 'Save candidate'}
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
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

                {/* Evidence count badge */}
                <div className="flex items-center gap-2 pt-1">
                  <Badge status={`${studentCreds.length} Verified Proof(s)`} variant="verified" size="sm" />
                </div>

                {/* Skills tags */}
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
                    Public Portfolio
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
