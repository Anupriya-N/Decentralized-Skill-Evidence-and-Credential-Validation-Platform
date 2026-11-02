import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, RotateCcw, UserCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DemoBanner = () => {
  const { user, role, switchDemoUser } = useAuth();
  const { resetAllDemoData } = useApp();
  const navigate = useNavigate();

  const handleRoleSwitch = (targetRole) => {
    switchDemoUser(targetRole);
    // Navigate to role-specific dashboard
    if (targetRole === 'student') navigate('/student/dashboard');
    else if (targetRole === 'recruiter') navigate('/recruiter/dashboard');
    else if (targetRole === 'issuer') navigate('/issuer/dashboard');
    else if (targetRole === 'admin') navigate('/admin/dashboard');
  };

  return (
    <div className="bg-navy-950 text-slate-200 text-xs border-b border-navy-800 px-4 py-2 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-semibold text-[11px] border border-amber-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            ACADEMIC PROTOTYPE (DEMO MODE)
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Blockchain ledger & AI inference are running in test simulation mode.
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 text-[11px]">Switch Role:</span>
          <div className="inline-flex rounded-md shadow-sm bg-navy-900 p-0.5 border border-navy-700">
            {[
              { id: 'student', label: 'Student' },
              { id: 'recruiter', label: 'Recruiter' },
              { id: 'issuer', label: 'Issuer' },
              { id: 'admin', label: 'Admin' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => handleRoleSwitch(r.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  role === r.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={resetAllDemoData}
            title="Reset all demo data back to seed state"
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-navy-900 hover:bg-navy-800 text-slate-300 hover:text-white border border-navy-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Data
          </button>
        </div>
      </div>
    </div>
  );
};
