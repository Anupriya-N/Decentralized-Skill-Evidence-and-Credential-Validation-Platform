import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { mockAIAdapter } from '../../adapters/ai/mockAIAdapter';
import { Card, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { 
  Sparkles, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight, 
  RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentAIAssistantPage = () => {
  const { user, updateProfile } = useAuth();
  const { skills, credentials } = useApp();

  const studentSkills = skills.filter(s => s.ownerUserId === user?.id);
  const studentCreds = credentials.filter(c => c.ownerUserId === user?.id);

  // Skill Gap State
  const [jobDescription, setJobDescription] = useState(
    'Seeking a Senior Cloud & Full-Stack Engineer with strong expertise in AWS Cloud Infrastructure, Microservices, React.js UI, Docker and Kubernetes container orchestration.'
  );
  const [gapLoading, setGapLoading] = useState(false);
  const [gapResult, setGapResult] = useState(null);

  // Portfolio Summary State
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  // Handle Gap Analysis
  const handleRunGapAnalysis = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) return;

    setGapLoading(true);
    try {
      const result = await mockAIAdapter.analyzeJobSkillGap(jobDescription, studentSkills);
      setGapResult(result);
      toast.success('Skill gap comparison complete!');
    } catch (err) {
      toast.error('AI demo error: ' + err.message);
    } finally {
      setGapLoading(false);
    }
  };

  // Handle Portfolio Summary
  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await mockAIAdapter.generatePortfolioSummary(user, studentCreds, studentSkills);
      setDraftSummary(res.draftSummary);
      setIsEditingSummary(true);
      toast.success('AI drafted a portfolio summary! Review and edit below.');
    } catch (err) {
      toast.error('AI demo error: ' + err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSaveSummaryToProfile = async () => {
    try {
      await updateProfile({ bio: draftSummary });
      setIsEditingSummary(false);
      toast.success('Confirmed AI summary saved to your public profile!');
    } catch (err) {
      toast.error('Failed to save profile: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Assistive Intelligence (AI Demo)
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mt-1">AI Career & Evidence Assistant</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluate skill match against employer job descriptions and generate evidence-grounded portfolio summaries.
        </p>
      </div>

      {/* Feature 1: Job Description Skill Gap Analysis */}
      <Card className="space-y-4">
        <CardHeader
          title="Job Description Skill Gap Analyzer"
          subtitle="Compare your evidenced competencies against prospective job requirements"
        />

        <form onSubmit={handleRunGapAnalysis} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Paste Target Job Description or Required Qualifications:
          </label>
          <textarea
            rows={4}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-sans"
            placeholder="Paste job posting text here..."
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={Sparkles}
            isLoading={gapLoading}
            className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
          >
            Analyze Job Fit & Skill Gaps
          </Button>
        </form>

        {gapResult && (
          <div className="pt-4 border-t border-slate-100 space-y-4 animate-in fade-in">
            {/* Score header */}
            <div className="flex items-center justify-between p-4 bg-purple-50/70 rounded-xl border border-purple-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">
                  Estimated Match Score
                </span>
                <p className="text-xs text-purple-700 mt-0.5">{gapResult.summaryAdvice}</p>
              </div>
              <div className="text-3xl font-extrabold text-purple-700 font-mono">
                {gapResult.matchScore}%
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Evidence Matched */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Evidence-Backed Matches
                </span>
                <div className="space-y-1.5">
                  {gapResult.matchedVerified.map((m, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-emerald-100 text-xs font-medium text-slate-800">
                      {m.name}
                      <span className="block text-[10px] text-emerald-700 font-mono mt-0.5">Verified on-chain</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Self-reported Matches */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  Self-Reported Matches
                </span>
                <div className="space-y-1.5">
                  {gapResult.matchedSelfReported.map((m, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-blue-100 text-xs font-medium text-slate-800">
                      {m.name}
                      <span className="block text-[10px] text-blue-600 mt-0.5">Declared (No proof file)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Identified Skill Gaps
                </span>
                <div className="space-y-1.5">
                  {gapResult.missingSkills.map((m, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-rose-100 text-xs font-medium text-slate-800">
                      {m.name}
                      <span className="block text-[10px] text-rose-600 mt-0.5">Recommended learning area</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Feature 2: Portfolio Summary Draft Generator */}
      <Card className="space-y-4">
        <CardHeader
          title="Evidence-Grounded Bio Generator"
          subtitle="Generate a truthful professional profile summary derived only from verified records"
        />

        <p className="text-xs text-slate-600 leading-relaxed">
          The generator uses strict factual synthesis: it only references skills and certificates you actually have registered, without inflating qualifications or fabricating experience.
        </p>

        {!isEditingSummary && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Sparkles}
            isLoading={summaryLoading}
            onClick={handleGenerateSummary}
          >
            Draft Portfolio Summary with AI
          </Button>
        )}

        {isEditingSummary && (
          <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Suggested Summary (Review, Edit & Confirm)
            </span>
            <textarea
              rows={4}
              value={draftSummary}
              onChange={(e) => setDraftSummary(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-purple-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-800 leading-relaxed font-sans"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={handleSaveSummaryToProfile}>
                Confirm & Save to Profile
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingSummary(false)}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
