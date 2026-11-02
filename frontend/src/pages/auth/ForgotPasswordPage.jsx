import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Shield, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';
import toast from 'react-hot-toast';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success('Simulation: Password reset instructions dispatched to your email.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DemoBanner />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold text-navy-950">
                Certi<span className="text-brand-600">Trust</span>
              </span>
            </Link>
            <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
            <p className="text-xs text-slate-500">
              Enter your registered email address to receive reset instructions.
            </p>
          </div>

          <Card className="p-6">
            {submitted ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Reset Link Sent (Simulated)</h3>
                <p className="text-xs text-slate-600">
                  We sent simulated reset instructions to <strong>{email}</strong>. For this demo, use the 1-click accounts on the login screen.
                </p>
                <Link to="/login" className="inline-block pt-2">
                  <Button variant="primary" size="sm">Back to Login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                <Button type="submit" variant="primary" className="w-full">
                  Send Reset Link
                </Button>

                <div className="text-center pt-2">
                  <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
