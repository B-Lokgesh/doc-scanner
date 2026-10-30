import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderLock,
  Layers,
  Copy,
  RefreshCw,
  ArrowRight,
  PieChart as PieIcon,
} from 'lucide-react';
import { fetchPersonalAnalytics } from '../services/api';
import { PersonalAnalyticsResponse } from '../types';
import { useAuth } from '../context/AuthContext';

export const AnalyticsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<PersonalAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchPersonalAnalytics();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load personal analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-56 bg-slate-200 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="h-72 bg-slate-100 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  const total = data?.total_verifications || 0;
  const verified = data?.verified_count || 0;
  const invalid = data?.invalid_count || 0;
  const review = data?.review_count || 0;
  const unable = data?.unable_count || 0;
  const passRate = data?.pass_rate_percent || 0;

  // Pie chart calculation
  const slices = [
    { label: 'Verified', count: verified, color: '#10B981' },
    { label: 'Invalid', count: invalid, color: '#EF4444' },
    { label: 'Review', count: review, color: '#F59E0B' },
    { label: 'Unable', count: unable, color: '#64748B' },
  ];

  // Document types breakdown array
  const categoryEntries = Object.entries(data?.category_distribution || {}).sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = Math.max(...categoryEntries.map((e) => e[1]), 1);

  // Monthly trend max
  const maxMonthlyCount = Math.max(...(data?.monthly_trend || []).map((m) => m.count), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {isAuthenticated && user ? `${user.full_name}'s Analytics` : 'Personal Analytics'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Audit metrics, compliance pass rate, category breakdown, and monthly verification velocity
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pass Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Compliance Pass Rate</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {passRate}%
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {verified} of {total} documents passed
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Verifications */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Audits Executed</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{total}</p>
            <p className="text-[11px] text-slate-500 mt-1">Full 8-stage pipeline runs</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* My_Doc Vault */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Stored Vault Files</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {data?.total_stored_docs || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {formatBytes(data?.total_storage_bytes || 0)} encrypted storage
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
            <FolderLock className="w-6 h-6" />
          </div>
        </div>

        {/* SHA-256 Duplicate Catches */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Duplicate Checks Handled</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {data?.duplicate_detections_count || 0}
            </p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">
              Prevented redundant processing
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <Copy className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Verification Outcomes</h2>
              <p className="text-xs text-slate-500">Breakdown of all completed audits</p>
            </div>
            <PieIcon className="w-5 h-5 text-slate-400" />
          </div>

          {total === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No verification data yet.</div>
          ) : (
            <div className="space-y-4">
              {/* Progress stack */}
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${(verified / total) * 100}%` }} className="bg-emerald-500" title={`Verified: ${verified}`} />
                <div style={{ width: `${(invalid / total) * 100}%` }} className="bg-rose-500" title={`Invalid: ${invalid}`} />
                <div style={{ width: `${(review / total) * 100}%` }} className="bg-amber-500" title={`Review: ${review}`} />
                <div style={{ width: `${(unable / total) * 100}%` }} className="bg-slate-400" title={`Unable: ${unable}`} />
              </div>

              {/* Status items */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-900">Verified</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-950">{verified} ({total ? Math.round((verified/total)*100) : 0}%)</span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-semibold text-rose-900">Invalid</span>
                  </div>
                  <span className="text-sm font-bold text-rose-950">{invalid} ({total ? Math.round((invalid/total)*100) : 0}%)</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-900">Needs Review</span>
                  </div>
                  <span className="text-sm font-bold text-amber-950">{review} ({total ? Math.round((review/total)*100) : 0}%)</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700">Unable/Other</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{unable} ({total ? Math.round((unable/total)*100) : 0}%)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document Type Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Document Type Distribution</h2>
              <p className="text-xs text-slate-500">Frequency by standard categories</p>
            </div>
            <Layers className="w-5 h-5 text-slate-400" />
          </div>

          {categoryEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No documents processed yet.</div>
          ) : (
            <div className="space-y-3">
              {categoryEntries.map(([category, count]) => {
                const percent = Math.round((count / maxCategoryCount) * 100);
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 capitalize">
                        {category.replace('_', ' ')}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {count} ({total ? Math.round((count / total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Verification Velocity Trend */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Verification Activity Trend (Last 6 Months)</h2>
            <p className="text-xs text-slate-500">Monthly audit volume progression</p>
          </div>
          <TrendingUp className="w-5 h-5 text-slate-400" />
        </div>

        {(!data?.monthly_trend || data.monthly_trend.length === 0) ? (
          <div className="py-10 text-center text-slate-400 text-xs">No activity trend available.</div>
        ) : (
          <div className="pt-4">
            <div className="flex items-end justify-between gap-4 h-44 px-2">
              {data.monthly_trend.map((m) => {
                const heightPercent = maxMonthlyCount > 0 ? Math.max((m.count / maxMonthlyCount) * 100, 6) : 6;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[11px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                    <div className="w-full max-w-[48px] bg-blue-100 group-hover:bg-blue-200 rounded-t-lg flex items-end justify-center transition-all h-36">
                      <div
                        className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 group-hover:bg-blue-700"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 truncate max-w-full">
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick CTA banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-lg font-bold">Ready to verify a new document?</h3>
          <p className="text-xs text-blue-100 mt-0.5">
            Run an instant 8-stage compliance verification against national standards.
          </p>
        </div>
        <Link
          to="/select-type"
          className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 shrink-0"
        >
          <span>Start Verification</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

