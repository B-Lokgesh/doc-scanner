import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Trash2,
  Database,
  Cpu,
  FileText,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Info,
  Server,
} from 'lucide-react';
import { fetchHealth, purgeAllData } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState<string | null>(null);

  const loadHealth = () => {
    setLoading(true);
    fetchHealth()
      .then((data) => setHealth(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      await purgeAllData();
      setShowPurgeConfirm(false);
      setPurgeSuccessMsg('All verification records and temporary files have been permanently wiped.');
      loadHealth();
    } catch (err: any) {
      alert(err.message || 'Failed to purge data');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14213D] tracking-tight">
          Settings, Privacy & System Health
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          Configure document retention limits, purge sensitive audit trails, and review engine status.
        </p>
      </div>

      {purgeSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{purgeSuccessMsg}</span>
          <button onClick={() => setPurgeSuccessMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* System Health Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-sm font-bold text-[#0F172A]">System Diagnostic Status</h2>
          </div>
          <button
            onClick={loadHealth}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
            title="Refresh Health"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">API Gateway</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {health?.status || 'Active'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Database</span>
            <span className="font-semibold text-slate-800 block mt-1">
              SQLite (WAL Enabled)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Engine Version</span>
            <span className="font-mono font-semibold text-slate-800 block mt-1">
              v{health?.version || '1.0.0'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Sandboxes</span>
            <span className="font-semibold text-emerald-700 block mt-1">
              Allocated
            </span>
          </div>
        </div>
      </div>

      {/* Privacy & Document Retention Policies */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Document Ingestion & Privacy Safeguards</span>
        </h2>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong>Storage Encryption:</strong> Uploaded files are written directly into an isolated,
            unindexed backend storage folder with non-predictable UUID tokens. No uploaded files are ever
            exposed publicly via static asset routes.
          </p>
          <p>
            <strong>Masked Personally Identifiable Information (PII):</strong> Sensitive identifiers
            such as 12-digit Aadhaar numbers and bank accounts are automatically masked in the UI and
            report outputs (e.g. <span className="font-mono font-semibold">XXXX XXXX 1234</span>). Full OCR
            blobs are never recorded into application error logs.
          </p>
          <p>
            <strong>Zero Government Database Scraping:</strong> All checks are performed locally against
            mathematical rules (Verhoeff checksum dihedral matrix, regex syntax, dates, balances).
            We do not attempt unauthorized government portal lookups.
          </p>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-600" />
          <span>Technical Parameters & Limits</span>
        </h2>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-500">Maximum File Size Limit</span>
            <span className="font-semibold text-slate-800">10.0 MB</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-500">Supported Binary Formats</span>
            <span className="font-semibold text-slate-800">PDF, JPG, JPEG, PNG</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-500">Magic Byte Signature Validation</span>
            <span className="font-semibold text-emerald-700">Strict Header Enforcement</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-500">Checksum Algorithms</span>
            <span className="font-semibold text-slate-800">Verhoeff Dihedral (Aadhaar), SHA-256 (File Hash)</span>
          </div>
        </div>
      </div>

      {/* Dangerous Actions: Purge All Records */}
      <div className="bg-red-50/50 rounded-2xl border border-red-200 p-6 space-y-3">
        <h2 className="text-sm font-bold text-red-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span>Data Erasure & Reset</span>
        </h2>
        <p className="text-xs text-red-700 leading-relaxed">
          Wipe all verification history records, checks, extracted fields, and temporary uploaded files
          from the server. This operation is permanent and irreversible.
        </p>

        <button
          onClick={() => setShowPurgeConfirm(true)}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Purge All Records & Storage</span>
        </button>
      </div>

      {/* Purge Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Purge All Database Records?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Are you sure? This will delete every verification audit record and unlink all storage files.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPurgeConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                disabled={isPurging}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
              >
                {isPurging ? 'Purging...' : 'Yes, Purge Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
