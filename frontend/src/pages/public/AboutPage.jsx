import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Footer } from '../../components/layout/Footer';
import { Shield, BookOpen, Layers, CheckCircle2, Lock, Cpu, ArrowLeft } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-navy-950 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-navy-800">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            About the Project & System Blueprint
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Decentralized Skill Evidence and Credential Validation Platform — A final-year engineering project addressing credential fraud, fragmented portfolios, and disconnected verification mechanisms.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 flex-1">
        {/* Section 1: Problem Statement */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-600" />
            1. Problem Statement
          </h2>
          <Card>
            <p className="text-xs text-slate-600 leading-relaxed">
              Today, evidence of skills is scattered across disparate PDF certificates, workshop records, internship letters, course platforms, project repositories, and institutional portals. Recruiters and admissions committees often rely on manual, time-consuming, and disconnected verification steps. 
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mt-3">
              Furthermore, digital certificates are vulnerable to post-issuance alteration. A malicious actor can easily modify names, grades, or dates in a PDF document. Without an immutable anchor, distinguishing authentic evidence from fabricated documents is costly and unreliable.
            </p>
          </Card>
        </section>

        {/* Section 2: Core Objectives */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            2. Core Engineering Objectives
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Unified digital portfolio for skills and evidence files.',
              'Client-side SHA-256 calculation directly from binary file bytes.',
              'Registration of cryptographic proof records on a smart contract ledger.',
              'QR verification links granting instant public verifiability.',
              'Independent evaluation of file integrity and issuer accreditation.',
              'Auditable issuer application, accreditation, and revocation workflows.',
              'Optional assistive AI features with mandatory human-in-the-loop review.',
              'Strict zero-PII storage policy on public blockchain ledgers.'
            ].map((obj, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3.5 bg-white rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">{obj}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: System Architecture */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-600" />
            3. System Architecture & Privacy Principles
          </h2>
          <Card className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              CertiTrust is engineered with strict adherence to privacy-by-design and data minimization principles:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">1. On-Chain Ledger Proofs:</span>
                <span className="text-slate-600 ml-1">
                  Only non-identifying proof records (Credential ID, SHA-256 Digest, Issuer Address, and Timestamps) are written to the ledger.
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">2. Never on Blockchain:</span>
                <span className="text-slate-600 ml-1">
                  No certificate PDFs, personal identification, email addresses, phone numbers, or passwords are ever stored on-chain.
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">3. Assistive AI Boundary:</span>
                <span className="text-slate-600 ml-1">
                  AI suggestions never automatically approve credentials or grant authenticity badges. All suggestions require explicit human confirmation.
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* Navigation Actions */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-200">
          <Link to="/">
            <Button variant="secondary" icon={ArrowLeft}>Back to Landing</Button>
          </Link>
          <Link to="/login">
            <Button variant="primary">Launch Demo</Button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
