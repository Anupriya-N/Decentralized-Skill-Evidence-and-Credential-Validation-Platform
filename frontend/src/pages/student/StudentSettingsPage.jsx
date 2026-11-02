import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RotateCcw, Shield, Eye, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export const StudentSettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const { resetAllDemoData } = useApp();

  const [isPortfolioPublic, setIsPortfolioPublic] = useState(user?.isPortfolioPublic ?? true);

  const handleTogglePortfolioPublic = async () => {
    const nextVal = !isPortfolioPublic;
    setIsPortfolioPublic(nextVal);
    await updateProfile({ isPortfolioPublic: nextVal });
    toast.success(`Public portfolio visibility set to: ${nextVal ? 'Public' : 'Private'}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Student Account Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage privacy, simulation defaults, and data preferences.</p>
      </div>

      <Card className="space-y-4">
        <CardHeader
          title="Privacy & Public Portfolio"
          subtitle="Control visibility to external search and recruiters"
        />

        <div className="flex items-center justify-between py-2">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">Public Portfolio Page</h4>
            <p className="text-[11px] text-slate-500">Allow recruiters to discover your evidence via candidate search.</p>
          </div>
          <button
            type="button"
            onClick={handleTogglePortfolioPublic}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPortfolioPublic ? 'bg-brand-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                isPortfolioPublic ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Demo Controls */}
      <Card className="space-y-4 border-amber-200 bg-amber-50/20">
        <CardHeader
          title="Prototype Environment Maintenance"
          subtitle="Reset LocalStorage demo data to pristine state"
        />
        <p className="text-xs text-slate-600 leading-relaxed">
          Resetting will restore all mock users, active credentials, issuer applications, and audit logs to the seed configuration.
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={RotateCcw}
          onClick={resetAllDemoData}
        >
          Reset Environment Data
        </Button>
      </Card>
    </div>
  );
};
