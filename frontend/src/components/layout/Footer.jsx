import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-navy-950 text-slate-300 border-t border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-white">
                Certi<span className="text-brand-400">Trust</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decentralized Skill Evidence and Credential Validation Platform. Built as an academic engineering prototype.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 + Smart Contract Ledger</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/" className="hover:text-white transition-colors">Home Landing</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Project</Link></li>
              <li><Link to="/verify/CRED-2025-9481" className="hover:text-white transition-colors">Public Credential Verifier</Link></li>
              <li><Link to="/portfolio/user-student-01" className="hover:text-white transition-colors">Sample Student Portfolio</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Demo Portals</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/student/dashboard" className="hover:text-white transition-colors">Student Portfolio Portal</Link></li>
              <li><Link to="/recruiter/dashboard" className="hover:text-white transition-colors">Recruiter Verification Portal</Link></li>
              <li><Link to="/issuer/dashboard" className="hover:text-white transition-colors">Accredited Issuer Portal</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">Platform Administration</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Architecture Note</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hash matching proves byte integrity against the registered digest. Issuer trust is evaluated independently. AI outputs are assistive suggestions only.
            </p>
            <div className="mt-4 pt-4 border-t border-navy-800 text-[11px] text-slate-500">
              <span>Final Year Engineering Project</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-navy-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} CertiTrust Platform. All rights reserved.</p>
          <p className="text-[11px]">JavaScript + React JSX + Web Crypto API + Smart Contract Adapter</p>
        </div>
      </div>
    </footer>
  );
};
