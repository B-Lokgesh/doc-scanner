import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  FileCheck,
  History,
  Sparkles,
  Settings,
  Menu,
  X,
  PlusCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { fetchHealth } from '../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchHealth()
      .then((data) => setApiConnected(data.database_connected))
      .catch(() => setApiConnected(false));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [location.pathname]);

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/select-type', label: 'Verify Document', icon: FileCheck },
    { to: '/history', label: 'History', icon: History },
    { to: '/demo', label: 'Demo Center', icon: Sparkles },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-[#B45309] text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-medium">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Document verification requires a server connection.</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/pwa-192x192.png"
                alt="VeriDoc AI Logo"
                className="w-9 h-9 rounded-xl object-contain shadow-xs group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="text-lg font-bold tracking-tight text-[#14213D] flex items-center gap-1.5">
                  VeriDoc <span className="text-[#2563EB]">AI</span>
                </span>
                <span className="text-[10px] text-[#64748B] block -mt-1 font-medium">
                  Intelligent Verification
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-[#2563EB]'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Status & Action */}
            <div className="hidden md:flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-[#64748B]"
                title={apiConnected ? 'API Connected & Healthy' : 'Checking API Status...'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{apiConnected ? 'System Ready' : 'Connecting'}</span>
              </div>

              <Link
                to="/select-type"
                className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-xs transition-all hover:shadow"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Scan</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <Link
                to="/select-type"
                className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-[#2563EB]"
                aria-label="New scan"
              >
                <PlusCircle className="w-5 h-5" />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top duration-150">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                    isActive
                      ? 'bg-blue-50 text-[#2563EB]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
};
