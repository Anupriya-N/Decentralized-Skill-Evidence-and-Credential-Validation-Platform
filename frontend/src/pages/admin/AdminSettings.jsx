import React from 'react';
import { useApp } from '../../context/AppContext';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { RotateCcw, Shield, Sliders } from 'lucide-react';

export const AdminSettings = () => {
  const { resetAllDemoData } = useApp();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Settings & Simulation Control</h1>
        <p className="text-xs text-slate-500 mt-0.5">Control sandbox flags, mock adapters, and data retention.</p>
      </div>

      <Card className="space-y-4">
        <CardHeader
          title="Simulation Parameters"
          subtitle="Configure how frontend demonstration adapters behave"
        />

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <p className="font-semibold text-slate-800">Simulated Blockchain Proofs</p>
              <p className="text-slate-500 text-[11px]">Generate simulated Sepolia testnet txHashes and block heights.</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full border border-emerald-200">
              Active (Simulated)
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <div>
              <p className="font-semibold text-slate-800">Assistive AI Intelligence</p>
              <p className="text-slate-500 text-[11px]">Enable OCR metadata suggestion and skill gap analysis demo.</p>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-semibold rounded-full border border-purple-200">
              Active (Assistive Demo)
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-amber-200 bg-amber-50/20 space-y-3">
        <CardHeader
          title="Reset Prototype Data to Clean State"
          subtitle="Restores all collections to pristine seed data"
        />
        <p className="text-xs text-slate-600">
          This will purge all dynamically added credentials, custom skills, and user changes, reloading the initial benchmark demo scenario.
        </p>
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={resetAllDemoData}>
          Reset Prototype Environment
        </Button>
      </Card>
    </div>
  );
};
