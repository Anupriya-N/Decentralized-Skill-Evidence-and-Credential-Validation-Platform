import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { storageService } from '../../services/storageService';
import { CATEGORIES } from '../../utils/formatUtils';
import { 
  ShieldCheck, 
  Layers, 
  Plus, 
  ExternalLink, 
  Share2, 
  Award, 
  CheckCircle2, 
  UserCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SkillPortfolioPage = () => {
  const { user } = useAuth();
  const { skills, credentials, refreshData } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newProficiency, setNewProficiency] = useState('Intermediate');
  const [selectedCredId, setSelectedCredId] = useState('');

  const studentSkills = skills.filter(s => s.ownerUserId === user?.id);
  const studentCreds = credentials.filter(c => c.ownerUserId === user?.id);

  const verifiedSkills = studentSkills.filter(s => !s.isSelfReported && s.evidenceCredentialIds?.length > 0);
  const selfReportedSkills = studentSkills.filter(s => s.isSelfReported || !s.evidenceCredentialIds?.length);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const allSkills = storageService.getSkills();
    const hasEvidence = !!selectedCredId;

    const newSkill = {
      id: `skill-${Date.now()}`,
      ownerUserId: user?.id,
      name: newSkillName.trim(),
      category: newCategory,
      proficiency: newProficiency,
      isSelfReported: !hasEvidence,
      evidenceCredentialIds: hasEvidence ? [selectedCredId] : [],
      visibility: 'public'
    };

    storageService.setSkills([...allSkills, newSkill]);
    refreshData();
    setShowAddModal(false);
    setNewSkillName('');
    setSelectedCredId('');
    toast.success('Skill added to portfolio!');
  };

  const handleSharePortfolio = () => {
    const url = `${window.location.origin}/portfolio/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Public portfolio URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Skill Evidence Portfolio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize skills by verified credentials versus self-reported declarations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Share2} onClick={handleSharePortfolio}>
            Share Portfolio
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
            Add New Skill
          </Button>
        </div>
      </div>

      {/* Distinction Explainer Banner (Section 4.6 requirement) */}
      <div className="p-4 rounded-xl bg-indigo-50/70 border border-brand-200 text-xs text-indigo-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">Academic Distinction: Evidence-Backed vs. Self-Reported</span>
          <p className="text-slate-600 leading-relaxed">
            CertiTrust explicitly distinguishes between competencies anchored to registered cryptographic certificates and candidate-declared self-reported skills. Recruiters see verified proof badges only when linked to an active on-chain record.
          </p>
        </div>
      </div>

      {/* Evidence-Backed Competencies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Evidence-Backed Competencies ({verifiedSkills.length})
          </h2>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
            Cryptographically Anchored
          </span>
        </div>

        {verifiedSkills.length === 0 ? (
          <Card className="text-center py-8 text-xs text-slate-400">
            No evidence-backed skills yet. Upload a certificate to link proof to your skills.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedSkills.map(skill => {
              const linkedCred = credentials.find(c => skill.evidenceCredentialIds?.includes(c.id));
              return (
                <Card key={skill.id} className="p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{skill.name}</h3>
                        <span className="text-xs text-slate-500">{skill.category}</span>
                      </div>
                      <Badge status="Evidence Verified" size="sm" />
                    </div>

                    <div className="pt-2 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Assessed Level:</span>
                        <strong className="text-slate-800">{skill.proficiency}</strong>
                      </div>
                      {linkedCred && (
                        <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                          <span className="text-slate-500 truncate max-w-[200px] flex items-center gap-1 font-medium">
                            <Award className="w-3.5 h-3.5 text-brand-600" />
                            {linkedCred.title}
                          </span>
                          <span className="text-[10px] font-mono text-brand-600">{linkedCred.credentialId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Self-Reported Skills */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-slate-500" />
            Self-Reported Declared Skills ({selfReportedSkills.length})
          </h2>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            Candidate Claim
          </span>
        </div>

        {selfReportedSkills.length === 0 ? (
          <Card className="text-center py-8 text-xs text-slate-400">
            No self-reported skills added yet.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {selfReportedSkills.map(skill => (
              <Card key={skill.id} className="p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{skill.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{skill.category}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Level: <strong className="text-slate-700">{skill.proficiency}</strong></span>
                  <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Unverified</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Competency / Skill">
        <form onSubmit={handleAddSkill} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Skill Name</label>
            <input
              type="text"
              required
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. Distributed Systems & Kafka"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Proficiency Level</label>
            <select
              value={newProficiency}
              onChange={(e) => setNewProficiency(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Link Existing Credential Proof (Optional)
            </label>
            <select
              value={selectedCredId}
              onChange={(e) => setSelectedCredId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              <option value="">-- No linked credential (Self-Reported) --</option>
              {studentCreds.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.credentialId})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="sm" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Add Skill
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
