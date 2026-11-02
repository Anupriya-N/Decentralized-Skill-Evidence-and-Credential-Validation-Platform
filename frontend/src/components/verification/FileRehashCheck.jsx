import React, { useState } from 'react';
import { calculateSHA256 } from '../../utils/hashUtils';
import { validateEvidenceFile } from '../../utils/validationUtils';
import { Upload, FileCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import toast from 'react-hot-toast';

export const FileRehashCheck = ({ onFileHashed, isProcessing }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [computedHash, setComputedHash] = useState('');
  const [hashing, setHashing] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateEvidenceFile(file);
    if (!validation.valid) {
      toast.error(validation.errors.join(' '));
      return;
    }

    setSelectedFile(file);
    setHashing(true);

    try {
      // Calculate real SHA-256 via Web Crypto API
      const hash = await calculateSHA256(file);
      setComputedHash(hash);
      onFileHashed(hash, file);
      toast.success('SHA-256 binary digest computed!');
    } catch (err) {
      toast.error('Failed to hash file: ' + err.message);
    } finally {
      setHashing(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 bg-slate-50/50 text-center transition-colors">
      <input
        type="file"
        id="rehash-file-input"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={handleFileChange}
      />
      <label htmlFor="rehash-file-input" className="cursor-pointer block">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
          {hashing ? (
            <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
          ) : selectedFile ? (
            <FileCheck className="w-6 h-6 text-emerald-600" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>
        <p className="text-sm font-semibold text-slate-800">
          {selectedFile ? selectedFile.name : 'Verify File Authenticity (Optional Re-Hash)'}
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Upload the PDF or image file to calculate its SHA-256 digest in your browser and check for tampering.
        </p>
      </label>

      {computedHash && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Computed File Digest (SHA-256)
          </span>
          <code className="text-[11px] font-mono text-brand-700 break-all select-all block mt-0.5">
            {computedHash}
          </code>
        </div>
      )}
    </div>
  );
};
