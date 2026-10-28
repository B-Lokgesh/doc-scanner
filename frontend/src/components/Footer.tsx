import React from 'react';
import { ShieldCheck, Lock, AlertCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <img
                src="/pwa-192x192.png"
                alt="VeriDoc AI Logo"
                className="w-8 h-8 rounded-lg object-contain"
              />
              <span className="font-bold text-base text-[#14213D]">
                VeriDoc <span className="text-[#2563EB]">AI</span>
              </span>
            </div>
            <p className="text-sm text-[#64748B] max-w-md leading-relaxed">
              Enterprise-grade document verification platform combining optical character
              recognition, forensic structure analysis, and deterministic mathematical rules
              to combat document manipulation.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> 256-bit Local Sandbox
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Verhoeff Algorithmic Validation
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-[#0F172A] tracking-wider uppercase mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-[#64748B]">
              <li>
                <Link to="/select-type" className="hover:text-[#2563EB] transition-colors">
                  Verify a Document
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#2563EB] transition-colors">
                  Compliance Dashboard
                </Link>
              </li>
              <li>
                <Link to="/demo" className="hover:text-[#2563EB] transition-colors">
                  Synthetic Demo Fixtures
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-[#2563EB] transition-colors">
                  Audit History
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Limits */}
          <div>
            <h4 className="text-xs font-semibold text-[#0F172A] tracking-wider uppercase mb-3">
              Safeguards & Legal
            </h4>
            <ul className="space-y-2 text-sm text-[#64748B]">
              <li>
                <Link to="/settings" className="hover:text-[#2563EB] transition-colors">
                  Data Retention Policy
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-[#2563EB] transition-colors">
                  Verification Bounds
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-[#2563EB] transition-colors">
                  System Diagnostics
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-start gap-2 max-w-3xl">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-normal">
              <strong>Statutory Safeguard Notice:</strong> VeriDoc AI evaluates document formats,
              checksums, and internal consistency against published deterministic rules. It does
              not perform unauthorized government database lookups or claim official state
              authentication without an accredited issuing authority API.
            </p>
          </div>
          <div className="shrink-0 text-slate-400">
            © {new Date().getFullYear()} VeriDoc AI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
