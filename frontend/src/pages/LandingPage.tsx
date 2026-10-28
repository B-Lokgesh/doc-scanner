import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileCheck2,
  Lock,
  ArrowRight,
  Sparkles,
  Layers,
  Scale,
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Cpu,
  FileText,
  CreditCard,
  Building2,
  GraduationCap,
  Car,
  BookOpen,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Select Document Category',
      desc: 'Pick from 9 supported document types to activate appropriate deterministic validation rules.',
      icon: Layers,
    },
    {
      num: '02',
      title: 'Upload Document File',
      desc: 'Upload PDF or high-resolution scan. Deep file integrity checks reject malicious headers and corrupted streams.',
      icon: FileSearch,
    },
    {
      num: '03',
      title: 'Multi-Stage Analysis',
      desc: 'Text is parsed via OCR, fields are normalized, Verhoeff checksums are computed, and arithmetic is reconciled.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'Audited Verdict & Report',
      desc: 'Receive transparent status (Verified, Invalid, Requires Review) with full evidence and downloadable compliance PDF.',
      icon: Scale,
    },
  ];

  const categories = [
    { name: 'PAN Card', icon: CreditCard, tag: '10-char Syntax & Initial Match', color: 'blue' },
    { name: 'Aadhaar Card', icon: ShieldCheck, tag: 'Official Verhoeff Checksum', color: 'indigo' },
    { name: 'Passport', icon: BookOpen, tag: 'ICAO Format & Validity Dates', color: 'sky' },
    { name: 'Driving Licence', icon: Car, tag: 'State RTO Codes & Expiry', color: 'emerald' },
    { name: 'Bank Statement', icon: Building2, tag: 'Arithmetic Reconciliation', color: 'amber' },
    { name: 'Educational Certificate', icon: GraduationCap, tag: 'Chronological Sanity', color: 'purple' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-[#F8FAFC] py-16 md:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Intelligent Verification Engine</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#14213D] tracking-tight leading-tight">
              Honest, Deterministic <br className="hidden sm:block" />
              <span className="text-[#2563EB]">Document Verification</span>
            </h1>

            <p className="text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto">
              Prevent fraud and ensure compliance with automated OCR, format validation,
              dihedral checksum validation, and forensic consistency analysis. We never invent
              outcomes or claim unverified authenticity.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/select-type"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-7 py-3.5 rounded-xl text-base font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <span>Verify a Document</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-[#14213D] border border-slate-300 px-6 py-3.5 rounded-xl text-base font-semibold shadow-xs transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Test Synthetic Samples</span>
              </Link>
            </div>

            {/* Quick stats banner */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-200/80 max-w-2xl mx-auto text-left">
              <div>
                <p className="text-2xl font-bold text-[#14213D]">9+</p>
                <p className="text-xs text-[#64748B]">Document Types</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#14213D]">8 Stages</p>
                <p className="text-xs text-[#64748B]">Verification Pipeline</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#14213D]">100%</p>
                <p className="text-xs text-[#64748B]">Deterministic Rules</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#14213D]">Zero</p>
                <p className="text-xs text-[#64748B]">Hallucinated Validity</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Workflow Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#14213D]">
              How VeriDoc AI Evaluates Documents
            </h2>
            <p className="text-sm text-[#64748B] mt-2">
              Every document undergoes a reproducible multi-phase forensic audit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div
                  key={st.num}
                  className="relative p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-blue-300 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-slate-300 group-hover:text-blue-500 transition-colors">
                      {st.num}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#2563EB] shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-base text-[#0F172A] mb-2">{st.title}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported Categories Grid */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#14213D]">
                Supported Document Categories
              </h2>
              <p className="text-sm text-[#64748B] mt-1">
                Deterministic rules ensure rigorous inspection without false positives.
              </p>
            </div>
            <Link
              to="/select-type"
              className="mt-4 md:mt-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-blue-700"
            >
              <span>View all categories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  className="p-5 rounded-xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#0F172A]">{cat.name}</h3>
                    <span className="inline-block mt-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {cat.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Transparency and Safeguards Notice */}
      <section className="py-14 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-bold text-base text-amber-900">
                Ethical Verification & Government Safeguards
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                VeriDoc AI evaluates format patterns, mathematical checksums (such as the official
                Verhoeff algorithm for Aadhaar), chronological plausibility, and internal
                arithmetic reconciliation. It strictly distinguishes between a document that
                <strong> satisfies available format rules</strong> versus an
                <strong> officially authenticated state record</strong>. Unofficial visual validation
                never constitutes legal proof of identity without an accredited issuing authority lookup.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
