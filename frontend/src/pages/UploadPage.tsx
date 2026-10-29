import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  FileCheck2,
  FileText,
  X,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Eye,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { fetchDocumentTypes, uploadAndVerifyDocument } from '../services/api';
import { DocumentTypeItem } from '../types';

export const UploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const typeParam = searchParams.get('type') || 'pan';

  const [docTypes, setDocTypes] = useState<DocumentTypeItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stages = [
    'Upload received & temporary sandbox allocated',
    'Binary file integrity & magic headers evaluated',
    'OCR & machine-readable text extracted',
    'Document category signals & structural markers validated',
    'Key entity fields & identifiers normalized',
    'Deterministic rules & checksums evaluated',
    'Forensic manipulation & metadata indicators assessed',
    'Audit findings consolidated & final verdict prepared',
  ];

  useEffect(() => {
    fetchDocumentTypes()
      .then((data) => setDocTypes(data))
      .catch((err) => console.error(err));
  }, []);

  const selectedCategory = docTypes.find((d) => d.id === typeParam) || {
    id: typeParam,
    name: typeParam.replace('_', ' ').toUpperCase(),
    description: 'Document verification profile.',
    max_size_mb: 10,
  };

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);

    // 1. Check size limit
    if (file.size === 0) {
      setErrorMsg('The selected file is 0 bytes (empty file). Please choose a valid file.');
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit.`);
      return;
    }

    // 2. Check extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!ext || !allowed.includes(ext)) {
      setErrorMsg(`Unsupported file type (.${ext}). Accepted formats: PDF, JPG, JPEG, PNG.`);
      return;
    }

    setSelectedFile(file);

    // Create preview url if image
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartVerification = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setCurrentStageIndex(0);

    // Live stage progression timer to simulate real granular event pipeline
    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < stages.length - 1) return prev + 1;
        return prev;
      });
    }, 450);

    try {
      const result = await uploadAndVerifyDocument(selectedFile, typeParam);
      clearInterval(interval);
      try {
        sessionStorage.setItem(`veridoc_${result.reference_id}`, JSON.stringify(result));
      } catch (_) {}
      navigate(`/results/${result.reference_id}`, { state: { result } });
    } catch (err: any) {
      clearInterval(interval);
      setIsProcessing(false);
      setErrorMsg(err.message || 'Verification failed during backend execution.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Step 2 of 3
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#14213D] tracking-tight mt-1">
            Upload Document for Analysis
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Analyzing under profile: <strong>{selectedCategory.name}</strong>
          </p>
        </div>
        <Link
          to="/select-type"
          className="inline-flex items-center gap-1.5 text-xs text-[#2563EB] hover:underline font-medium self-start sm:self-center"
        >
          <span>Change Document Category</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-xs">Validation Error</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Processing State Overlay */}
      {isProcessing ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#E2E8F0] shadow-lg text-center space-y-6">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-[#2563EB] animate-spin" />
            <ShieldCheck className="w-7 h-7 text-[#2563EB] absolute" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#14213D]">Executing Verification Engine</h2>
            <p className="text-xs text-[#64748B] mt-1">
              Please wait while our server runs real file parsing, OCR, and deterministic rule evaluation.
            </p>
          </div>

          {/* Stepper progress */}
          <div className="max-w-md mx-auto text-left space-y-2.5 pt-2">
            {stages.map((st, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={st} className="flex items-center gap-3 text-xs">
                  {isPast ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span
                    className={
                      isCurrent
                        ? 'font-bold text-[#2563EB]'
                        : isPast
                        ? 'text-slate-700 line-through'
                        : 'text-slate-400'
                    }
                  >
                    {st}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : !selectedFile ? (
        /* Dropzone Component */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-10 sm:p-14 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
            isDragging
              ? 'border-[#2563EB] bg-blue-50/50 scale-[0.99]'
              : 'border-slate-300 bg-white hover:border-[#2563EB] hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-4 shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-[#0F172A]">
            Drag and drop document file here, or{' '}
            <span className="text-[#2563EB] underline">browse</span>
          </h3>
          <p className="text-xs text-[#64748B] mt-1.5 max-w-sm">
            Supports PDF, JPG, JPEG, and PNG files up to 10 MB. Server verifies actual byte headers.
          </p>

          <div className="mt-6 flex items-center gap-4 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Client & Server Validated
            </span>
            <span>•</span>
            <span>Encrypted Temporary Ingestion</span>
          </div>
        </div>
      ) : (
        /* Selected File Summary Card */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">{selectedFile.name}</h3>
                <p className="text-xs text-[#64748B]">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>
              <button
                onClick={handleRemoveFile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {/* Image Preview if available */}
          {previewUrl && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-xs font-semibold text-slate-500 mb-2">Document Image Preview</p>
              <img
                src={previewUrl}
                alt="Upload preview"
                className="max-h-60 mx-auto rounded-lg shadow-xs border border-slate-200"
              />
            </div>
          )}

          {/* Pre-flight Privacy Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#64748B] flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Zero Leakage Guarantee:</strong> Uploaded files are executed in an isolated
              sandbox. Personal identifiers are masked in all audit screens. Temporary files are automatically
              purged according to your retention policy.
            </p>
          </div>

          {/* Start Verification Action Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleRemoveFile}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              onClick={handleStartVerification}
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-7 py-3 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Start Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
