import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Eye,
  PlusCircle,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Lock,
  UploadCloud,
  FileCheck2,
  UserCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { fetchVerificationResult, getReportDownloadUrl, crossVerifyDocument } from '../services/api';
import { VerificationResult, CrossVerifyResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { useToast } from '../components/Toast';

const SUPPORTING_DOC_OPTIONS = [
  { id: 'pan', name: 'PAN Card' },
  { id: 'aadhaar', name: 'Aadhaar Card' },
  { id: 'passport', name: 'Passport' },
  { id: 'driving_licence', name: 'Driving Licence' },
  { id: 'voter_id', name: 'Voter ID' },
  { id: 'bank_statement', name: 'Bank Statement' },
  { id: 'educational_certificate', name: 'Educational Certificate' },
  { id: 'income_certificate', name: 'Income Certificate' },
];

export const ResultsPage: React.FC = () => {
  const { refId } = useParams<{ refId: string }>();
  const location = useLocation();
  const toast = useToast();

  // 1. Check router state (passed directly on navigation)
  // 2. Check sessionStorage (persists across page reloads in this browser tab)
  const getInitialResult = (): VerificationResult | null => {
    const fromState = (location.state as { result?: VerificationResult } | null)?.result;
    if (fromState) return fromState;
    if (refId) {
      try {
        const cached = sessionStorage.getItem(`veridoc_${refId}`);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return null;
  };

  const initialResult = getInitialResult();
  const [result, setResult] = useState<VerificationResult | null>(initialResult);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Supporting document cross-verification state
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [supportingDocType, setSupportingDocType] = useState<string>(() => {
    const defaultSupport = SUPPORTING_DOC_OPTIONS.find((o) => o.id !== initialResult?.document_type);
    return defaultSupport ? defaultSupport.id : 'pan';
  });
  const [isCrossVerifying, setIsCrossVerifying] = useState(false);
  const [crossResult, setCrossResult] = useState<CrossVerifyResult | null>(null);
  const [crossError, setCrossError] = useState<string | null>(null);
  const [isSupportingOpen, setIsSupportingOpen] = useState(true);

  useEffect(() => {
    if (result) {
      try {
        sessionStorage.setItem(`veridoc_${result.reference_id}`, JSON.stringify(result));
      } catch (_) {}
      return;
    }
    if (!refId) return;

    setLoading(true);
    fetchVerificationResult(refId)
      .then((data) => {
        setResult(data);
        setError(null);
        try {
          sessionStorage.setItem(`veridoc_${refId}`, JSON.stringify(data));
        } catch (_) {}
      })
      .catch((err) => setError(err.message || 'Failed to load verification findings'))
      .finally(() => setLoading(false));
  }, [refId, result]);

  const copyRefId = () => {
    if (result?.reference_id) {
      navigator.clipboard.writeText(result.reference_id);
      toast.success('Reference ID copied to clipboard!');
    }
  };

  const handleSupportingFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSupportingFile(file);
      setCrossResult(null);
      setCrossError(null);
      toast.info(`Selected "${file.name}" as supporting document`);
    }
  };

  const handleSupportingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSupportingFile(file);
      setCrossResult(null);
      setCrossError(null);
      toast.info(`Selected "${file.name}" as supporting document`);
    }
  };

  const handleCrossVerify = async () => {
    if (!result || !supportingFile) {
      toast.warning('Please select a supporting document file first.');
      return;
    }

    setIsCrossVerifying(true);
    setCrossError(null);

    try {
      const response = await crossVerifyDocument(
        result.reference_id,
        supportingFile,
        supportingDocType,
        result.extracted_fields
      );
      setCrossResult(response);
      if (response.overall_identity_match) {
        toast.success('Identity confirmed across both documents!', 'Cross-Verification Match');
      } else if (response.cross_verify_status === 'IDENTITY_MISMATCH') {
        toast.error('Discrepancy detected between documents!', 'Potential Impersonation');
      } else {
        toast.warning('Insufficient matching fields between documents.', 'Partial Comparison');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to cross-verify supporting document';
      setCrossError(msg);
      toast.error(msg, 'Cross-Verification Error');
    } finally {
      setIsCrossVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Retrieving verified audit report from database...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Report Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Verification reference ID does not exist.'}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-lg"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const isVerified = result.final_status.includes('VERIFIED');
  const isInvalid = result.final_status === 'INVALID';
  const isReview = result.final_status.includes('REVIEW');

  // Identify fraud or tampering checks
  const fraudChecks = result.checks.filter(
    (c) =>
      c.result === 'FAILED' &&
      (c.check_name.includes('authenticity') ||
        c.check_name.includes('tamper') ||
        c.check_name.includes('checksum') ||
        c.check_name.includes('manipulation') ||
        c.check_name.includes('integrity') ||
        c.check_name.includes('software'))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Link to="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <button
              onClick={copyRefId}
              className="font-mono text-slate-800 hover:text-blue-600 flex items-center gap-1 font-semibold group"
              title="Click to copy"
            >
              <span>{result.reference_id}</span>
              <Copy className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition" />
            </button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14213D] tracking-tight mt-1">
            Verification Findings
          </h1>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>View Document</span>
          </button>

          <a
            href={getReportDownloadUrl(result.reference_id)}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
          </a>

          <Link
            to="/select-type"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Verify Another</span>
          </Link>
        </div>
      </div>

      {/* Primary Verdict Hero Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border shadow-sm ${
          isVerified
            ? 'bg-[#F0FDF4] border-[#BBF7D0]'
            : isInvalid
            ? 'bg-[#FEF2F2] border-[#FECACA]'
            : isReview
            ? 'bg-[#FFFBEB] border-[#FDE68A]'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={result.final_status} size="lg" />
              <span className="text-xs font-mono text-slate-500 uppercase">
                {result.document_type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed max-w-2xl">
              {result.summary}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Processed at {result.created_at.slice(0, 19).replace('T', ' ')}</span>
              <span>•</span>
              <span>Original file: {result.original_filename}</span>
            </p>
          </div>

          {/* Checklist Counter Pills */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center p-3 rounded-xl bg-white/80 border border-slate-200/60 min-w-[70px]">
              <span className="block text-xl font-bold text-[#15803D]">{result.passed_checks_count}</span>
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Passed</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/80 border border-slate-200/60 min-w-[70px]">
              <span className="block text-xl font-bold text-[#B91C1C]">{result.failed_checks_count}</span>
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Failed</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/80 border border-slate-200/60 min-w-[70px]">
              <span className="block text-xl font-bold text-[#B45309]">{result.warning_checks_count}</span>
              <span className="text-[10px] uppercase font-bold text-[#64748B]">Warnings</span>
            </div>
          </div>
        </div>
      </div>

      {/* WRONG DOCUMENT TYPE SMART DETECTION BANNER */}
      {result.suggested_type && result.suggested_type !== result.document_type && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
                  Wrong Document Type Detected
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                This document is more likely a{' '}
                <span className="text-amber-800 underline decoration-amber-400 decoration-2 font-black">
                  {result.suggested_type_name || result.suggested_type.replace('_', ' ').toUpperCase()}
                </span>
                , not a {result.document_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}.
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                The verification failed because keywords and format patterns correspond to a different official
                document category. To evaluate this file correctly, verify it under its proper classification or
                upload a valid {result.document_type.replace('_', ' ')}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
            <Link
              to={`/upload?type=${result.suggested_type}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
            >
              <span>Verify as {result.suggested_type_name || result.suggested_type}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={`/upload?type=${result.document_type}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 text-xs font-semibold shadow-xs transition"
            >
              <span>Upload Valid {result.document_type.replace('_', ' ').toUpperCase()}</span>
            </Link>
          </div>
        </div>
      )}

      {/* FRAUD & FORGERY FORENSIC DETECTION ALERT */}
      {fraudChecks.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-2 border-red-300 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-800 bg-red-200/70 px-2 py-0.5 rounded">
                  High-Risk Forensic Alert
                </span>
                <span className="text-xs font-semibold text-red-700">
                  {fraudChecks.length} Security Failure{fraudChecks.length > 1 ? 's' : ''} Detected
                </span>
              </div>
              <h3 className="text-sm font-bold text-red-950">
                Suspected Fake or Manipulated Document Content
              </h3>
              <p className="text-xs text-red-900 leading-relaxed">
                VeriDoc AI forensic analysis detected non-standard patterns, suspicious issuer markers, or structure
                discrepancies typical of fraudulent or synthesized IDs:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 pl-13">
            {fraudChecks.map((fc, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-white/90 border border-red-200 text-xs shadow-2xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-900 font-mono text-[11px]">{fc.check_name}</span>
                  <span className="text-[10px] font-bold text-red-600 uppercase bg-red-50 px-1.5 py-0.5 rounded">
                    {fc.severity}
                  </span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">{fc.explanation}</p>
                {fc.evidence_reference && (
                  <p className="text-[10px] font-mono text-slate-500 bg-slate-50 p-1 rounded border border-slate-200">
                    {fc.evidence_reference}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Fields Table */}
      {result.extracted_fields.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#14213D]">Extracted & Normalized Entity Data</h2>
              <p className="text-xs text-[#64748B]">Sensitive personal identifiers are automatically masked.</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Masked Storage</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Attribute</th>
                  <th className="px-6 py-3">Normalized Value</th>
                  <th className="px-6 py-3">Confidence</th>
                  <th className="px-6 py-3">Sensitivity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.extracted_fields.map((field) => (
                  <tr key={field.field_name} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium capitalize text-slate-800">
                      {field.field_name.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                      {field.normalized_value || field.raw_value || 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {(field.extraction_confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-6 py-3">
                      {field.is_sensitive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Lock className="w-3 h-3" />
                          <span>Masked</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DUAL-DOCUMENT IDENTITY CROSS-VERIFICATION SECTION */}
      <div className="bg-white rounded-2xl border-2 border-blue-200/80 shadow-md overflow-hidden">
        <div
          onClick={() => setIsSupportingOpen(!isSupportingOpen)}
          className="px-6 py-4.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border-b border-blue-100 flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Cross-Verify with Supporting Document
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Anti-Impersonation
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Upload a secondary credential (e.g. PAN or Passport) to automatically cross-match Name, DOB, and identity details.
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition p-1">
            {isSupportingOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {isSupportingOpen && (
          <div className="p-6 space-y-6">
            {/* Upload & Selector Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Supporting Document Type</label>
                <select
                  value={supportingDocType}
                  onChange={(e) => setSupportingDocType(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                >
                  {SUPPORTING_DOC_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name} {opt.id === result.document_type ? '(Same category)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Select the type of the 2nd ID you are presenting.
                </p>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Upload Supporting File (PDF, JPG, PNG)</label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleSupportingFileDrop}
                  className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 transition text-center bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer"
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleSupportingFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-3">
                    <UploadCloud className="w-6 h-6 text-blue-600 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-800">
                        {supportingFile ? (
                          <span className="text-blue-700 font-bold">{supportingFile.name}</span>
                        ) : (
                          'Choose or drag supporting file here'
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {supportingFile
                          ? `${(supportingFile.size / 1024).toFixed(1)} KB — Ready to cross-verify`
                          : 'Max size 10MB • Deterministic field correlation'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Deterministic token & initial matching engine</span>
              </div>

              <button
                onClick={handleCrossVerify}
                disabled={!supportingFile || isCrossVerifying}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                  !supportingFile || isCrossVerifying
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-blue-500/20'
                }`}
              >
                {isCrossVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cross-Verifying Identity...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Run Cross-Verification</span>
                  </>
                )}
              </button>
            </div>

            {/* Cross Verification Error Banner */}
            {crossError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{crossError}</span>
              </div>
            )}

            {/* Cross Verification Results Panel */}
            {crossResult && (
              <div className="space-y-4 pt-2 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    crossResult.overall_identity_match
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : crossResult.cross_verify_status === 'IDENTITY_MISMATCH'
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {crossResult.overall_identity_match ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : crossResult.cross_verify_status === 'IDENTITY_MISMATCH' ? (
                      <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        {crossResult.overall_identity_match
                          ? 'Identity Confirmed Across Documents'
                          : crossResult.cross_verify_status === 'IDENTITY_MISMATCH'
                          ? 'Discrepancy Detected — Possible Impersonation'
                          : 'Inconclusive Field Comparison'}
                      </h4>
                      <p className="text-xs leading-relaxed opacity-90 mt-0.5">
                        {crossResult.cross_verify_summary}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="inline-block text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 shadow-2xs">
                      {crossResult.matched_fields} / {crossResult.total_comparable_fields} Fields Matched
                    </span>
                  </div>
                </div>

                {/* Field-by-Field Comparison Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Attribute</th>
                        <th className="px-4 py-2.5">
                          Primary ({result.document_type.replace('_', ' ').toUpperCase()})
                        </th>
                        <th className="px-4 py-2.5">
                          Supporting ({crossResult.supporting_document_type.replace('_', ' ').toUpperCase()})
                        </th>
                        <th className="px-4 py-2.5">Match Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {crossResult.field_comparison.map((comp) => (
                        <tr key={comp.field} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-bold text-slate-800">{comp.label}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-900">
                            {comp.primary_value}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-900">
                            {comp.supporting_value}
                          </td>
                          <td className="px-4 py-2.5">
                            {comp.both_present ? (
                              comp.match ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Identical Match</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Mismatch Detected</span>
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 text-[11px]">Missing in one document</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Checks Evaluation Checklist */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-bold text-[#14213D]">
            Comprehensive Verification Checklist ({result.checks.length} Checks Run)
          </h2>
          <p className="text-xs text-[#64748B]">
            Every line represents an inspection rule actually executed by the verification engine.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {result.checks.map((check, idx) => (
            <div
              key={idx}
              className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={check.result} size="sm" />
                  <h3 className="font-semibold text-xs text-slate-900">{check.check_name}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">({check.severity})</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                  {check.explanation}
                </p>
              </div>

              {check.evidence_reference && (
                <div className="shrink-0 text-left sm:text-right">
                  <span className="inline-block text-[11px] font-mono bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                    {check.evidence_reference}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Compliance Actions */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#14213D] flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#2563EB]" />
          <span>Recommended Compliance Actions</span>
        </h3>
        <ul className="space-y-1.5 text-xs text-slate-700">
          {result.recommended_next_steps.map((rec, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#2563EB] font-bold">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        referenceId={result.reference_id}
        filename={result.original_filename}
        mimeType={result.mime_type}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
