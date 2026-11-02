import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  FileCheck, 
  QrCode, 
  Search, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  GraduationCap, 
  Briefcase 
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Footer } from '../../components/layout/Footer';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:24px_24px] opacity-15"></div>
        
        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-400/20 text-brand-300 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-4 h-4 text-brand-400" />
            Blockchain-Backed Credential Verification Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Your Skills. Your Proof. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-300">
              Your Future.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Unify certificate PDFs, workshop projects, and degree credentials into one verifiable digital portfolio. Protect your achievements with cryptographic SHA-256 hashing, instant QR verification, and accredited issuer registries.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/register">
              <Button size="lg" variant="primary" icon={ArrowRight}>
                Get Started Free
              </Button>
            </Link>
            <Link to="/verify/CRED-2025-9481">
              <Button size="lg" variant="secondary" icon={ShieldCheck}>
                Verify a Credential
              </Button>
            </Link>
          </div>

          {/* Quick Stats / Highlights */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            {[
              { label: 'SHA-256 Hashing', value: 'Byte-Exact', desc: 'Tampering instantly detected' },
              { label: 'Issuer Trust', value: 'Independent', desc: 'Accreditation verified separately' },
              { label: 'Instant Access', value: 'QR Enabled', desc: 'One-click verification links' },
              { label: 'Ledger Proof', value: 'Zero PII', desc: 'Privacy-first architecture' }
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <span className="text-xs text-brand-300 font-mono font-medium">{stat.label}</span>
                <p className="text-xl font-bold text-white mt-1">{stat.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">The Validation Workflow</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
            How CertiTrust Protects Academic & Professional Proof
          </h2>
          <p className="text-sm text-slate-600 mt-3">
            Every step is mathematically verifiable. A hash match proves file integrity, while our issuer trust registry validates institutional authority.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Upload Evidence & Hash',
              desc: 'The student uploads a certificate. Web Crypto API computes a 64-character SHA-256 digest from the exact file bytes in the browser.',
              icon: FileCheck
            },
            {
              step: '02',
              title: 'Register Proof Record',
              desc: 'The digest and credential ID are registered on the smart contract ledger. Private personal data is never stored on the public blockchain.',
              icon: Lock
            },
            {
              step: '03',
              title: 'Instant QR & Verification',
              desc: 'Recruiters scan the QR code to view four separate checks: Record Existence, File Integrity, Issuer Status, and Lifecycle Validity.',
              icon: QrCode
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="relative p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-extrabold text-slate-100 absolute top-4 right-6 font-mono">
                  {item.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Role Benefits */}
      <section className="py-20 bg-slate-100/70 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Built For Key Stakeholders</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
              Empowering Students, Employers & Issuers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-brand-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">For Students</h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Centralized portfolio for certificates, degrees & projects.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Permanent cryptographic proof resistant to tampering.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Shareable public portfolio and downloadable QR codes.</span>
                </li>
              </ul>
            </div>

            {/* Recruiter */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">For Recruiters</h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Verify credentials in seconds without creating a student account.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Clear separation between file hash and issuer accreditation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Skill-based candidate search and private talent bookmarks.</span>
                </li>
              </ul>
            </div>

            {/* Issuer */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">For Issuing Institutions</h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Accreditation review process ensures institution legitimacy.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Approve student claims or issue verifiable credentials directly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Auditable revocation workflow with reason recording.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Critical Integrity Notice Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              The Critical Academic Distinction: Hash Integrity vs. Institutional Authenticity
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            A cryptographic SHA-256 match proves only that the evaluated file matches the exact bytes registered on-chain. It does <strong>not</strong> alone prove that the issuing organization is genuine, accredited, or that the student attained the skill.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            CertiTrust enforces a multi-layered verification paradigm, reporting four discrete results: 
            <strong> (1) Record Existence</strong>, <strong>(2) File Integrity</strong>, <strong>(3) Issuer Trust Status</strong>, and <strong>(4) Credential Lifecycle/Revocation Status</strong>.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-navy-950 text-white py-16 px-4 sm:px-6 lg:px-8 text-center border-t border-navy-800">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold">Ready to Explore the Platform?</h2>
          <p className="text-sm text-slate-300">
            Log in with any of the pre-configured demo accounts to experience the complete Student, Recruiter, Issuer, or Admin workflows.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/login">
              <Button size="lg" variant="primary">
                Open Demo Accounts
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="secondary">
                Read Project Details
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
