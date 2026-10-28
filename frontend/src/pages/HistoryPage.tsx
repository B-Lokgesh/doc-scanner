import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Trash2,
  Eye,
  Download,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { fetchHistory, deleteVerificationRecord, getReportDownloadUrl } from '../services/api';
import { HistoryItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const HistoryPage: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const limit = 10;

  const [deleteTargetRef, setDeleteTargetRef] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetchHistory({
      search: search || undefined,
      document_type: docTypeFilter !== 'all' ? docTypeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit,
      offset: page * limit,
    })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Failed to fetch verification records'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [docTypeFilter, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadData();
  };

  const confirmDelete = async () => {
    if (!deleteTargetRef) return;
    setIsDeleting(true);
    try {
      await deleteVerificationRecord(deleteTargetRef);
      setDeleteTargetRef(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#14213D] tracking-tight">
            Verification History & Audit Log
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Query past verifications, reopen evidence files, and download compliance reports.
          </p>
        </div>
        <Link
          to="/select-type"
          className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Verification</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Reference ID (VD-...) or filename..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Doc Type Filter */}
          <select
            value={docTypeFilter}
            onChange={(e) => {
              setDocTypeFilter(e.target.value);
              setPage(0);
            }}
            className="w-full md:w-48 text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="all">All Document Types</option>
            <option value="pan">PAN Card</option>
            <option value="aadhaar">Aadhaar Card</option>
            <option value="passport">Passport</option>
            <option value="driving_licence">Driving Licence</option>
            <option value="voter_id">Voter ID</option>
            <option value="bank_statement">Bank Statement</option>
            <option value="educational_certificate">Educational Certificate</option>
            <option value="income_certificate">Income Certificate</option>
            <option value="other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full md:w-48 text-xs py-2 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="INVALID">Invalid</option>
            <option value="REVIEW">Requires Review</option>
            <option value="UNABLE">Unable to Verify</option>
          </select>

          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="underline font-semibold">Retry</button>
        </div>
      )}

      {/* History Table Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
            <p>Loading database history...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-semibold text-sm text-slate-800">No Records Match Query</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or document category filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-3.5">Reference ID</th>
                  <th className="px-6 py-3.5">Document Type</th>
                  <th className="px-6 py-3.5">Original File</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Failed Checks</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.reference_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-slate-900">
                      <Link
                        to={`/results/${row.reference_id}`}
                        className="text-[#2563EB] hover:underline"
                      >
                        {row.reference_id}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 capitalize font-medium text-slate-800">
                      {row.document_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 truncate max-w-[180px]">
                      {row.original_filename}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={row.final_status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 font-medium">
                      {row.failed_checks_count > 0 ? (
                        <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded font-mono border border-red-200">
                          {row.failed_checks_count} failed
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono border border-emerald-200">
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : 'N/A'}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <Link
                        to={`/results/${row.reference_id}`}
                        className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-semibold"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <a
                        href={getReportDownloadUrl(row.reference_id)}
                        download
                        className="p-1 text-slate-400 hover:text-slate-700 inline-block align-middle"
                        title="Download PDF Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => setDeleteTargetRef(row.reference_id)}
                        className="p-1 text-slate-400 hover:text-red-600 inline-block align-middle"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-medium">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Delete Verification Record?</h3>
              <p className="text-xs text-slate-600 mt-1">
                This will permanently delete record <strong className="font-mono">{deleteTargetRef}</strong> and
                all associated checks, extracted fields, and temporary documents from server storage.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetRef(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
