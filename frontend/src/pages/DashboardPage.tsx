import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  PlusCircle,
  History,
  FileText,
  ArrowRight,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { fetchDashboardStats, getReportDownloadUrl } from '../services/api';
import { DashboardStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { FilePreviewModal } from '../components/FilePreviewModal';

export const DashboardPage: React.FC = () => {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  const total = stats?.total_processed || 0;
  const verified = stats?.verified_count || 0;
  const invalid = stats?.invalid_count || 0;
  const review = stats?.requires_review_count || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#14213D] tracking-tight">
            Verification Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Real-time compliance audit statistics and recent verification outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadStats}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/select-type"
            className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-all hover:shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Verify Document</span>
          </Link>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Total Processed
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#14213D] mt-3">{total}</p>
          <p className="text-[11px] text-[#64748B] mt-1">Direct from database records</p>
        </div>

        {/* Verified Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#15803D]">
              Verified
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#15803D] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#14213D] mt-3">{verified}</p>
          <p className="text-[11px] text-[#15803D] mt-1 font-medium">
            {total > 0 ? `${((verified / total) * 100).toFixed(0)}% passed available rules` : '0% of total'}
          </p>
        </div>

        {/* Invalid Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
              Invalid Documents
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#14213D] mt-3">{invalid}</p>
          <p className="text-[11px] text-[#B91C1C] mt-1 font-medium">
            Hard rule failures / checksum errors
          </p>
        </div>

        {/* Requires Review */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
              Requires Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#B45309] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#14213D] mt-3">{review}</p>
          <p className="text-[11px] text-[#B45309] mt-1 font-medium">
            Ambiguous scan / unverified sources
          </p>
        </div>
      </div>

      {/* Distribution Progress Bar */}
      {total > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
            <span>Verification Status Distribution</span>
            <span className="text-[#64748B]">{total} total records</span>
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
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#14213D]">Recent Verification Activity</h2>
            <p className="text-xs text-[#64748B]">Latest evaluated documents stored in local SQLite database.</p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
