import React from 'react';
import { Modal } from './Modal';
import { FileText, Image as ImageIcon, Download, ExternalLink, Hash } from 'lucide-react';
import { formatBytes, truncateHash } from '../../utils/formatUtils';
import { Button } from './Button';

export const DocumentPreview = ({ isOpen, onClose, file, fileUrl, fileName, fileSize, mimeType, fileHash }) => {
  const isImage = mimeType?.startsWith('image/') || fileName?.match(/\.(jpeg|jpg|png|webp|gif)$/i);
  const isPdf = mimeType === 'application/pdf' || fileName?.endsWith('.pdf');

  // Compute display URL
  const previewSrc = file ? URL.createObjectURL(file) : fileUrl;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Document Preview: ${fileName || 'Evidence File'}`} maxWidth="max-w-3xl">
      <div className="space-y-4">
        {/* File Attributes Header */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-brand-600 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-brand-600 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-slate-800">{fileName || 'Evidence Document'}</p>
              <span className="text-[11px] text-slate-500">
                {fileSize ? formatBytes(fileSize) : 'Standard Size'} • {mimeType || 'Document'}
              </span>
            </div>
          </div>

          {fileHash && (
            <div className="font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
              <span className="text-slate-400">SHA-256:</span> {truncateHash(fileHash, 6, 6)}
            </div>
          )}
        </div>

        {/* Preview Container */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900/5 min-h-[360px] max-h-[500px] flex items-center justify-center">
          {previewSrc ? (
            isImage ? (
              <img
                src={previewSrc}
                alt={fileName || 'Preview'}
                className="max-h-[480px] w-auto max-w-full object-contain mx-auto rounded-lg shadow-sm"
              />
            ) : isPdf ? (
              <iframe
                src={`${previewSrc}#toolbar=0`}
                title="PDF Preview"
                className="w-full h-[480px] border-0"
              />
            ) : (
              <div className="text-center p-8 space-y-2">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Preview not supported for this file type</p>
                <p className="text-[11px] text-slate-400">Document format: {mimeType}</p>
              </div>
            )
          ) : (
            <div className="text-center p-8 space-y-2">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">Document file stored locally</p>
              <p className="text-[11px] text-slate-400">
                In prototype mode, mock evidence is referenced cryptographically by its SHA-256 digest.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          {previewSrc && (
            <a href={previewSrc} download={fileName || 'certificate'} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" icon={Download}>
                Download Document
              </Button>
            </a>
          )}
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
};
