import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Bookmark, GraduationCap, Building, ExternalLink, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SavedCandidates = () => {
  const { user, updateProfile } = useAuth();
  const { users, credentials } = useApp();

  const savedIds = user?.savedCandidateIds || [];
  const savedCandidates = users.filter(u => savedIds.includes(u.id));

  const handleRemove = async (studentId) => {
    const updated = savedIds.filter(id => id !== studentId);
    await updateProfile({ savedCandidateIds: updated });
    toast.success('Candidate removed from saved shortlist.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Saved Candidate Shortlist</h1>
        <p className="text-xs text-slate-500 mt-0.5">Quickly access verified candidates you bookmarked for open opportunities.</p>
      </div>

      {savedCandidates.length === 0 ? (
        <Card className="text-center py-12 text-xs text-slate-400">
          <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          No candidates saved yet. Discover candidates in Candidate Search.
          <div className="mt-3">
            <Link to="/recruiter/candidates">
              <Button variant="primary" size="sm">Search Candidates</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedCandidates.map(student => {
            const studentCreds = credentials.filter(c => c.ownerUserId === student.id && c.visibility === 'public');
            return (
              <Card key={student.id} className="p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.profileImage}
                        alt={student.fullName}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-500/20"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{student.fullName}</h3>
                        <p className="text-[11px] text-slate-500">{student.department}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(student.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {student.bio || 'Verified Student Candidate'}
                  </p>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>{student.college}</span>
                    <strong className="text-brand-600">{studentCreds.length} Proofs</strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link to={`/recruiter/candidates/${student.id}`}>
                    <Button variant="secondary" size="sm">View Dossier</Button>
                  </Link>
                  <Link to={`/portfolio/${student.id}`} target="_blank">
                    <Button variant="ghost" size="sm" icon={ExternalLink}>Portfolio</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
