import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Award, Check, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { storageService } from '../../services/storageService';
import toast from 'react-hot-toast';

export const SkillEvidenceMapper = ({ isOpen, onClose, credential, studentSkills, onSkillsUpdated }) => {
  if (!credential) return null;

  const [skillsList, setSkillsList] = useState(() => studentSkills || []);
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedProficiency, setSelectedProficiency] = useState('Intermediate');

  // Find skills linked to this specific credential
  const linkedSkillIds = skillsList
    .filter(s => s.evidenceCredentialIds?.includes(credential.id))
    .map(s => s.id);

  const toggleSkillLink = (skillId) => {
    const updated = skillsList.map(skill => {
      if (skill.id === skillId) {
        const currentlyLinked = skill.evidenceCredentialIds?.includes(credential.id);
        const newEvidenceIds = currentlyLinked
          ? (skill.evidenceCredentialIds || []).filter(id => id !== credential.id)
          : [...(skill.evidenceCredentialIds || []), credential.id];

        return {
          ...skill,
          evidenceCredentialIds: newEvidenceIds,
          isSelfReported: newEvidenceIds.length === 0
        };
      }
      return skill;
    });

    setSkillsList(updated);
    storageService.setSkills(updated);
    if (onSkillsUpdated) onSkillsUpdated(updated);
    toast.success('Skill evidence mapping updated!');
  };

  const handleAddNewSkillAndMap = (e) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const newSkill = {
      id: `skill-${Date.now()}`,
      ownerUserId: credential.ownerUserId,
      name: newSkillName.trim(),
      category: credential.category || 'Programming',
      proficiency: selectedProficiency,
      isSelfReported: false,
      evidenceCredentialIds: [credential.id],
      visibility: 'public'
    };

    const updated = [...skillsList, newSkill];
    setSkillsList(updated);
    storageService.setSkills(updated);
    if (onSkillsUpdated) onSkillsUpdated(updated);
    setNewSkillName('');
    toast.success(`Mapped new skill "${newSkill.name}" to credential!`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Skill-Evidence Mapping Interface" maxWidth="max-w-xl">
      <div className="space-y-5">
        <div className="p-3 bg-brand-50 rounded-xl border border-brand-200 text-xs text-brand-900 flex items-start gap-2.5">
          <Award className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Mapping Evidence for: {credential.title}</span>
            Link this proof record to your competencies. Evidence-backed skills receive verification badges on candidate portfolios.
          </div>
        </div>

        {/* Existing Skills Checklist */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Available Skills in Your Portfolio
          </label>
          <div className="max-h-56 overflow-y-auto space-y-1.5 divide-y divide-slate-100 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            {skillsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No skills created yet.</p>
            ) : (
              skillsList.map(skill => {
                const isLinked = linkedSkillIds.includes(skill.id);
                return (
                  <div key={skill.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{skill.name}</p>
                      <span className="text-[10px] text-slate-400">{skill.category} • {skill.proficiency}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSkillLink(skill.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        isLinked
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isLinked && <Check className="w-3.5 h-3.5" />}
                      {isLinked ? 'Linked' : 'Link Skill'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Add and Map New Skill */}
        <form onSubmit={handleAddNewSkillAndMap} className="pt-3 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            Or Add & Map a New Skill Directly
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g. Distributed Consensus Algorithms..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <select
              value={selectedProficiency}
              onChange={(e) => setSelectedProficiency(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
            <Button type="submit" variant="primary" size="sm" icon={Plus}>
              Map
            </Button>
          </div>
        </form>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
