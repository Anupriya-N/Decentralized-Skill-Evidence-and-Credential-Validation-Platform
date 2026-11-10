import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { DemoBanner } from '../../components/common/DemoBanner';

export const LoginPage = () => {
  const { login, switchDemoUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectAfterLogin = (role) => {
    const from = location.state?.from?.pathname;
    if (from && !from.includes('/login')) {
      navigate(from, { replace: true });
    } else {
      navigate(`/${role}/dashboard`, { replace: true });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      redirectAfterLogin(user.role);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSelect = (demoEmail, demoPass, targetRole) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    switchDemoUser(targetRole);
    redirectAfterLogin(targetRole);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DemoBanner />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Shield className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold text-navy-950">
                Certi<span className="text-brand-600">Trust</span>
              </span>
            </Link>
            <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="text-xs text-slate-500">
              Access your verifiable skill evidence, certificates, and reviews.
            </p>
          </div>

          {/* Quick Demo Account Selector (Phase 1 acceptance requirement) */}
          <div className="bg-navy-900 text-white rounded-2xl p-4 shadow-md space-y-3 border border-navy-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" /> 1-Click Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Academic Prototype</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoSelect('student@example.com', 'student123', 'student')}
                className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-left border border-navy-700 transition-colors"
              >
                <div className="font-semibold text-white">Student</div>
                <div className="text-[10px] text-slate-400">student@example.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoSelect('recruiter@example.com', 'recruiter123', 'recruiter')}
                className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-left border border-navy-700 transition-colors"
              >
                <div className="font-semibold text-white">Recruiter</div>
                <div className="text-[10px] text-slate-400">recruiter@example.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoSelect('issuer@example.com', 'issuer123', 'issuer')}
                className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-left border border-navy-700 transition-colors"
              >
                <div className="font-semibold text-white">Issuer</div>
                <div className="text-[10px] text-slate-400">issuer@example.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoSelect('admin@example.com', 'admin123', 'admin')}
                className="p-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-left border border-navy-700 transition-colors"
              >
                <div className="font-semibold text-white">Admin</div>
                <div className="text-[10px] text-slate-400">admin@example.com</div>
              </button>
            </div>
          </div>

          {/* Regular Login Form */}
          <Card className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div data-testid="login-error" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    data-testid="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-[11px] text-brand-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    data-testid="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs pl-9 pr-10 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button data-testid="login-submit" type="submit" variant="primary" className="w-full" isLoading={loading}>
                Sign In
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-600 font-semibold hover:underline">
                Create an account
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
