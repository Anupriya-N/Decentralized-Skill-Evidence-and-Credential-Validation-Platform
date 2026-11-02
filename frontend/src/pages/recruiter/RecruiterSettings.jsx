import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RotateCcw } from 'lucide-react';

export const RecruiterSettings = () => {
  const { resetAllDemoData } = useApp();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Recruiter Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configuration and demo maintenance.</p>
      </div>

      <Card className="p-6 border-amber-200 bg-amber-50/20 space-y-3">
        <CardHeader
          title="Reset Prototype Data"
          subtitle="Clear all LocalStorage cache and reset candidates and verification logs"
        />
        <p className="text-xs text-slate-600">
          Restore seed users, saved lists, and verification records to initial project defaults.
        </p>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={resetAllDemoData}>
          Reset Demo Data
        </Button>
      </Card>
    </div>
  );
};
