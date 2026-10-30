import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PlusCircle,
  History,
  FileText,
  ArrowRight,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  FolderLock,
  BarChart3,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { fetchDashboardStats, getReportDownloadUrl } from '../services/api';
import { DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewRef, setPreviewRef] = useState<{ id: string; name: string; mime: string } | null>(null);

  const loadStats = () => {
    setLoading(true);
    fetchDashboardStats()
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const total = stats?.total_processed || 0;
  const verified = stats?.verified_count || 0;
  const invalid = stats?.invalid_count || 0;
  const review = stats?.requires_review_count || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Personalized Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-blue-100">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>VeriDoc AI Enterprise Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isAuthenticated && user
              ? `Welcome back, ${user.full_name}!`
              : 'Intelligent Verification Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-xl">
            {isAuthenticated
              ? 'Your individual data is fully isolated. Inspect your historical audits, upload new documents to My_Doc, and run 8-stage compliance checks.'
              : 'Evaluate document authenticity, run multi-stage compliance verification, and inspect audit findings in real time.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/select-type"
            className="inline-flex items-center gap-1.5 bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Quick Verify</span>
          </Link>
          <Link
            to="/my-doc"
            className="inline-flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-blue-400/40 backdrop-blur-xs transition-all"
          >
            <FolderLock className="w-4 h-4" />
            <span>My_Doc Vault</span>
          </Link>
          <button
            onClick={loadStats}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadStats} className="underline text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Total Verified
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#14213D] mt-3">{total}</p>
          <p className="text-[11px] text-[#64748B] mt-1">Direct from your database records</p>
        </div>

        {/* Verified Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#15803D]">
              Verified
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#14213D] mt-3">{verified}</p>
          <p className="text-[11px] text-[#15803D] mt-1 font-semibold">
            {total > 0 ? `${((verified / total) * 100).toFixed(0)}% passed available rules` : '0% of total'}
          </p>
        </div>

        {/* Invalid Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-rose-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
              Invalid Documents
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#14213D] mt-3">{invalid}</p>
          <p className="text-[11px] text-[#B91C1C] mt-1 font-semibold">
            Hard rule failures / checksum errors
          </p>
        </div>

        {/* Requires Review */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
              Requires Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] text-[#B45309] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#14213D] mt-3">{review}</p>
          <p className="text-[11px] text-[#B45309] mt-1 font-semibold">
            Ambiguous scan / unverified sources
          </p>
        </div>
      </div>

      {/* Distribution Progress Bar & Shortcuts */}
      {total > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
            <span>Verification Status Distribution</span>
            <Link to="/analytics" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
              <span>View Full Analytics</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            {verified > 0 && (
              <div
                style={{ width: `${(verified / total) * 100}%` }}
                className="bg-[#15803D] h-full"
                title={`Verified: ${verified}`}
              />
            )}
            {invalid > 0 && (
              <div
                style={{ width: `${(invalid / total) * 100}%` }}
                className="bg-[#B91C1C] h-full"
                title={`Invalid: ${invalid}`}
              />
            )}
            {review > 0 && (
              <div
                style={{ width: `${(review / total) * 100}%` }}
                className="bg-[#B45309] h-full"
                title={`Requires Review: ${review}`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-[#64748B]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
              Verified ({verified})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]" />
              Invalid ({invalid})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" />
              Requires Review ({review})
            </span>
          </div>
        </div>
      )}

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#14213D]">Previously Verified Documents</h2>
            <p className="text-xs text-[#64748B]">
              {isAuthenticated ? 'Private verification records for your account.' : 'Evaluated documents stored in local database.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {stats?.recent_verifications?.length || 0} records
            </span>
            <button
              onClick={loadStats}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              title="Refresh records"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {total === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="font-semibold text-slate-900 text-sm">No Documents Verified Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload your first document or test our synthetic demo fixtures to populate actual database metrics.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/select-type"
                className="inline-flex items-center gap-1.5 bg-[#2563EB] text-white px-4 py-2 rounded-lg text-xs font-semibold"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Explore Demos</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3">Reference ID</th>
                  <th className="px-6 py-3">Document Category</th>
                  <th className="px-6 py-3">File Name</th>
                  <th className="px-6 py-3">Result</th>
                  <th className="px-6 py-3">Date Processed</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recent_verifications.map((row) => (
                  <tr key={row.reference_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono font-medium text-slate-900">
                      <Link
                        to={`/results/${row.reference_id}`}
                        className="text-[#2563EB] hover:underline"
                      >
                        {row.reference_id}
                      </Link>
                    </td>
                    <td className="px-6 py-3 capitalize text-slate-700 font-medium">
                      {row.document_type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-3 text-slate-600 truncate max-w-[160px]">
                      {row.original_filename}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={row.final_status} size="sm" />
                    </td>
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                      {row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <a
                        href={getReportDownloadUrl(row.reference_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 inline-flex items-center"
                        title="Download PDF Audit Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <Link
                        to={`/results/${row.reference_id}`}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-[#2563EB] font-medium"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewRef && (
        <FilePreviewModal
          referenceId={previewRef.id}
          filename={previewRef.name}
          mimeType={previewRef.mime}
          isOpen={true}
          onClose={() => setPreviewRef(null)}
        />
      )}
    </div>
  );
};
