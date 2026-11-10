import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Award,
  UploadCloud,
  Layers,
  Share2,
  History,
  Sparkles,
  Bell,
  User,
  Settings,
  Search,
  Bookmark,
  Building2,
  FileCheck2,
  ShieldCheck,
  Users,
  FileText,
  Boxes,
  ScrollText,
  Sliders,
  CheckCircle2
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const getNavLinks = () => {
    switch (role) {
      case 'student':
        return [
          { to: '/student/dashboard', label: 'Overview', icon: LayoutDashboard },
          { to: '/student/credentials', label: 'My Credentials', icon: Award },
          { to: '/student/upload', label: 'Upload Evidence', icon: UploadCloud },
          { to: '/student/portfolio', label: 'Skill Portfolio', icon: Layers },
          { to: '/student/shared', label: 'Shared Credentials', icon: Share2 },
          { to: '/student/history', label: 'Verification History', icon: History },
          { to: '/student/ai-assistant', label: 'AI Skill Assistant', icon: Sparkles, badge: 'AI' },
          { to: '/student/notifications', label: 'Notifications', icon: Bell },
          { to: '/student/profile', label: 'Profile', icon: User },
          { to: '/student/settings', label: 'Settings', icon: Settings },
        ];
      case 'recruiter':
        return [
          { to: '/recruiter/dashboard', label: 'Overview', icon: LayoutDashboard },
          { to: '/recruiter/verify', label: 'Verify Credential', icon: CheckCircle2 },
          { to: '/recruiter/candidates', label: 'Candidate Search', icon: Search },
          { to: '/recruiter/saved', label: 'Saved Candidates', icon: Bookmark },
          { to: '/recruiter/history', label: 'Verification Logs', icon: History },
          { to: '/recruiter/profile', label: 'Company Profile', icon: Building2 },
          { to: '/recruiter/settings', label: 'Settings', icon: Settings },
        ];
      case 'issuer':
        return [
          { to: '/issuer/dashboard', label: 'Issuer Dashboard', icon: LayoutDashboard },
          { to: '/issuer/profile', label: 'Organization Profile', icon: Building2 },
          { to: '/issuer/credentials', label: 'Issued Credentials', icon: Award },
          { to: '/issuer/requests', label: 'Validation Requests', icon: FileCheck2 },
          { to: '/issuer/issue', label: 'Issue Credential', icon: UploadCloud },
          { to: '/issuer/history', label: 'Activity History', icon: History },
          { to: '/issuer/settings', label: 'Settings', icon: Settings },
        ];
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
          { to: '/admin/users', label: 'User Management', icon: Users },
          { to: '/admin/issuers', label: 'Issuer Approval', icon: ShieldCheck },
          { to: '/admin/credentials', label: 'Credentials Admin', icon: Award },
          { to: '/admin/blockchain', label: 'Blockchain Ledger', icon: Boxes },
          { to: '/admin/logs', label: 'Verification Logs', icon: ScrollText },
          { to: '/admin/reports', label: 'Analytics Reports', icon: FileText },
          { to: '/admin/audit', label: 'Audit Trail', icon: History },
          { to: '/admin/settings', label: 'Platform Settings', icon: Sliders },
        ];
      default:
        return [];
    }
  };

  const links = getNavLinks();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        data-testid="sidebar"
        className={`fixed lg:sticky top-0 lg:top-16 left-0 h-screen lg:h-[calc(100vh-4rem)] w-64 bg-navy-950 text-slate-300 flex flex-col z-40 transition-transform duration-200 ease-in-out border-r border-navy-800 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-navy-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Portal View</span>
            <p className="text-sm font-semibold text-white capitalize">{role} Portal</p>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
            v1.0
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-navy-900'
                  }`
                }
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-purple-500/30 text-purple-200 border border-purple-400/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom verification badge */}
        <div className="p-4 border-t border-navy-800/80 bg-navy-900/40 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Simulated Ledger Online
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Proof records cryptographically linked to SHA-256 binary hash.
          </p>
        </div>
      </aside>
    </>
  );
};
