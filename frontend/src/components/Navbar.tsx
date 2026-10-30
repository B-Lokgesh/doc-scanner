import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  PlusCircle,
  WifiOff,
  Menu,
  User as UserIcon,
  LogOut,
  Settings,
  FolderLock,
  BarChart3,
  ChevronDown,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { fetchHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside listener for user dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/login');
  };

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-[#B45309] text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-medium">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. Document verification requires a server connection.</span>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Sidebar Hamburger + Brand */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
                aria-label="Toggle Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link to="/" className="flex items-center gap-2.5 group">
                <img
                  src="/pwa-192x192.png"
                  alt="VeriDoc AI Logo"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-xs group-hover:scale-105 transition-transform"
                />
                <div>
                  <span className="text-base sm:text-lg font-bold tracking-tight text-[#14213D] flex items-center gap-1.5">
                    VeriDoc <span className="text-[#2563EB]">AI</span>
                  </span>
                  <span className="hidden sm:block text-[10px] text-[#64748B] -mt-1 font-medium">
                    Intelligent Verification System
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Center/Quick Links (when viewed without sidebar or on big screen) */}
            <div className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-600">
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-lg hover:bg-slate-100 ${
                  location.pathname === '/dashboard' ? 'text-blue-600 font-semibold bg-blue-50' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/my-doc"
                className={`px-3 py-1.5 rounded-lg hover:bg-slate-100 ${
                  location.pathname === '/my-doc' ? 'text-blue-600 font-semibold bg-blue-50' : ''
                }`}
              >
                My_Doc
              </Link>
              <Link
                to="/analytics"
                className={`px-3 py-1.5 rounded-lg hover:bg-slate-100 ${
                  location.pathname === '/analytics' ? 'text-blue-600 font-semibold bg-blue-50' : ''
                }`}
              >
                Analytics
              </Link>
            </div>

            {/* Right: Actions & User Menu */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* API Status Indicator */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-[#64748B]"
                title={apiConnected ? 'API Connected & Healthy' : 'Checking API Status...'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="hidden lg:inline">{apiConnected ? 'Engine Ready' : 'Connecting'}</span>
              </div>

              {/* Verify New Document CTA */}
              <Link
                to="/select-type"
                className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all hover:shadow"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Verify Doc</span>
              </Link>

              {/* Auth Dropdown / Buttons */}
              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                    aria-label="User profile menu"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[120px]">
                        {user.full_name}
                      </p>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <ShieldCheck className="w-4 h-4 text-slate-400" />
                          Dashboard
                        </Link>
                        <Link
                          to="/my-doc"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <FolderLock className="w-4 h-4 text-slate-400" />
                          My_Doc Storage
                        </Link>
                        <Link
                          to="/analytics"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <BarChart3 className="w-4 h-4 text-slate-400" />
                          Analytics
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          Profile Settings
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
