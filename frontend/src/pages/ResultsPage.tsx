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
} from 'lucide-react';
import { fetchVerificationResult, getReportDownloadUrl } from '../services/api';
import { VerificationResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { FilePreviewModal } from '../components/FilePreviewModal';

export const ResultsPage: React.FC = () => {
  const { refId } = useParams<{ refId: string }>();
  const location = useLocation();

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span className="font-mono text-slate-800">{result.reference_id}</span>
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
