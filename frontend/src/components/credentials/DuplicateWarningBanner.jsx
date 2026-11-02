import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DuplicateWarningBanner = ({ duplicateInfo, onDismiss }) => {
  if (!duplicateInfo || !duplicateInfo.found) return null;

  return (
    <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-2 animate-in fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-900 block">
              Potential Duplicate Evidence Detected
            </span>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              {duplicateInfo.message || `An evidence document matching these exact file bytes or title was previously registered: "${duplicateInfo.title}" (${duplicateInfo.credentialId}).`}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-700 hover:text-amber-900 font-bold px-1"
          >
            ✕
          </button>
        )}
      </div>

      {duplicateInfo.credentialId && (
        <div className="pl-7 flex items-center gap-2">
          <Link
            to={`/student/credentials/${duplicateInfo.credentialId}`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
            target="_blank"
          >
            Inspect Existing Record ({duplicateInfo.credentialId}) <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
};
