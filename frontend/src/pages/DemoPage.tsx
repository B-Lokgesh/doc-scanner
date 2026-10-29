import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { fetchDemoSamples, verifyDemoSample } from '../services/api';
import { DemoSample } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<DemoSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningSampleId, setRunningSampleId] = useState<string | null>(null);

  useEffect(() => {
    fetchDemoSamples()
      .then((data) => setSamples(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleRunSample = async (sampleId: string) => {
    setRunningSampleId(sampleId);
    try {
      const res = await verifyDemoSample(sampleId);
      try {
        sessionStorage.setItem(`veridoc_${res.reference_id}`, JSON.stringify(res));
      } catch (_) {}
      navigate(`/results/${res.reference_id}`, { state: { result: res } });
    } catch (err: any) {
      alert(err.message || 'Failed to verify sample');
      setRunningSampleId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Controlled Synthetic Test Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14213D] tracking-tight">
          Live Verification Demo Scenarios
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
          Test the real verification engine against certified synthetic fixtures.
          These test files exercise deterministic rules, dihedral Verhoeff checksums,
          temporal expiry detection, bank statement arithmetic, and mismatch classifiers.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p>
          <strong>Notice:</strong> All demo fixtures contain synthetic, non-real test data.
          Clicking "Run Live Audit" sends the file through the exact same backend pipeline as user uploads.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {samples.map((sample) => {
            const isExecuting = runningSampleId === sample.id;
            return (
              <div
                key={sample.id}
                className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[11px] font-mono uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded font-semibold">
                      {sample.document_type.replace(/_/g, ' ')}
                    </span>
                    <StatusBadge status={sample.expected_result} size="sm" />
                  </div>

                  <h3 className="font-bold text-base text-[#0F172A]">{sample.title}</h3>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                    {sample.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {sample.fixture_file}
                  </span>
                  <button
                    onClick={() => handleRunSample(sample.id)}
                    disabled={isExecuting}
                    className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Run Live Audit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
