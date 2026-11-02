import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { QRCodeModal } from './QRCodeModal';
import { formatDate, truncateHash } from '../../utils/formatUtils';
import { Award, QrCode, ExternalLink, Calendar, Building, Hash, Eye, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const CredentialCard = ({ credential, onRevoke, showActions = true, isStudentOwner = false }) => {
  const [showQRModal, setShowQRModal] = useState(false);

  if (!credential) return null;

  return (
    <>
      <Card hoverEffect className="flex flex-col justify-between h-full group">
        <div className="space-y-4">
          {/* Header badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-slate-500 font-semibold">
              {credential.credentialId}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge status={credential.credentialStatus} size="sm" />
              <Badge status={credential.issuerStatus === 'trusted' ? 'Trusted Issuer' : credential.issuerStatus} size="sm" />
            </div>
          </div>

          {/* Title & Skill */}
          <div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
              {credential.title}
            </h3>
            <p className="text-xs font-medium text-brand-600 mt-1 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              {credential.skillName}
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{credential.category}</span>
            </p>
          </div>

          {/* Description snippet */}
          {credential.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {credential.description}
            </p>
          )}

          {/* Metadata Grid */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Issuer
              </span>
              <span className="font-medium text-slate-700 truncate max-w-[180px] text-right">
                {credential.issuerName}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Issued
              </span>
              <span className="font-medium text-slate-700">
                {formatDate(credential.issueDate)}
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Digest
              </span>
              <span className="text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {truncateHash(credential.fileHash, 6, 6)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {showActions && (
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={QrCode}
              onClick={() => setShowQRModal(true)}
            >
              QR Code
            </Button>

            <div className="flex items-center gap-2">
              <Link to={`/verify/${credential.credentialId}`}>
                <Button variant="ghost" size="sm" icon={ExternalLink}>
                  Verify
                </Button>
              </Link>

              {isStudentOwner && (
                <Link to={`/student/credentials/${credential.id}`}>
                  <Button variant="primary" size="sm" icon={Eye}>
                    Details
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        credential={credential}
      />
    </>
  );
};
