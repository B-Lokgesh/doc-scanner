import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ShieldAlert,
  BookOpen,
  Car,
  Vote,
  GraduationCap,
  Building2,
  FileSpreadsheet,
  FileText,
  Check,
  ArrowRight,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { fetchDocumentTypes } from '../services/api';
import { DocumentTypeItem, DocumentCategoryId } from '../types';

export const SelectTypePage: React.FC = () => {
  const navigate = useNavigate();
  const [types, setTypes] = useState<DocumentTypeItem[]>([]);
  const [selectedId, setSelectedId] = useState<DocumentCategoryId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocumentTypes()
      .then((data) => setTypes(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const iconMap: Record<string, React.ElementType> = {
    aadhaar: ShieldAlert,
    pan: CreditCard,
    passport: BookOpen,
    driving_licence: Car,
    voter_id: Vote,
    educational_certificate: GraduationCap,
    bank_statement: Building2,
    income_certificate: FileSpreadsheet,
    other: FileText,
  };

  const handleContinue = () => {
    if (!selectedId) return;
    navigate(`/upload?type=${selectedId}`);
  };

  const selectedDoc = types.find((t) => t.id === selectedId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
          Step 1 of 3
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#14213D] tracking-tight mt-1">
          Select Document Category
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          Choose the exact type of document you wish to analyze. Our engine configures
          deterministic format, checksum, and cross-consistency checks specific to that category.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {types.map((t) => {
            const isSelected = selectedId === t.id;
            const Icon = iconMap[t.id] || FileText;

            return (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#2563EB] bg-blue-50/40 ring-2 ring-[#2563EB] shadow-md'
                    : 'border-[#E2E8F0] bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-slate-100 text-[#14213D]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-100">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#0F172A]">{t.name}</h3>
                  <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="font-medium text-slate-500">
                    {t.supported_formats.join(', ')} (Max {t.max_size_mb}MB)
                  </span>
                  {t.has_deterministic_rules ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                      Rule-based
                    </span>
                  ) : (
                    <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                      General
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Type Limitations Banner */}
      {selectedDoc && (
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-3 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Verification Scope for {selectedDoc.name}: </span>
            <span>{selectedDoc.limitations_note}</span>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <p className="text-xs text-[#64748B]">
          {selectedId
            ? `Selected: ${selectedDoc?.name}. Click Continue to upload file.`
            : 'Please select a document category to proceed.'}
        </p>

        <button
          onClick={handleContinue}
          disabled={!selectedId}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
            selectedId
              ? 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white shadow-md hover:shadow-lg cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Continue to Upload</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
