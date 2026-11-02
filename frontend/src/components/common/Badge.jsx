import React from 'react';

export const Badge = ({ status, variant, children, size = 'md', className = '' }) => {
  const norm = (variant || status || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (norm.includes('externally verified') || norm.includes('externally_verified')) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/20';
  } else if (norm.includes('demo approval') || norm.includes('demo_approved')) {
    styles = 'bg-purple-50 text-purple-700 border-purple-300 ring-1 ring-purple-500/20';
  } else if (
    norm.includes('incomplete') || 
    norm.includes('not checked') || 
    norm.includes('unverified') || 
    norm.includes('pending') || 
    norm.includes('review') ||
    norm.includes('submitted')
  ) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20';
  } else if (
    norm.includes('not found') || 
    norm.includes('revoked') || 
    norm.includes('mismatch') || 
    norm.includes('suspended') || 
    norm.includes('failed') || 
    norm.includes('flagged') || 
    norm.includes('untrusted') ||
    norm.includes('rejected')
  ) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20';
  } else if (
    norm.includes('verified') || 
    norm.includes('active') || 
    norm.includes('valid') || 
    norm.includes('match') || 
    norm.includes('confirmed')
  ) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
  } else if (norm.includes('expired')) {
    styles = 'bg-slate-100 text-slate-600 border-slate-300';
  } else if (norm.includes('trusted') || norm.includes('issuer')) {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20';
  } else if (norm.includes('demo') || norm.includes('simulation') || norm.includes('mock') || norm.includes('not connected')) {
    styles = 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${styles} ${sizeClasses} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {children || status}
    </span>
  );
};
