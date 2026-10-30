import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  FolderLock,
  BarChart3,
  User as UserIcon,
  Settings,
  LogOut,
  LogIn,
  UserPlus,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/select-type', label: 'Verify Document', icon: FileCheck },
    { to: '/my-doc', label: 'My_Doc Storage', icon: FolderLock, badge: user?.total_my_docs ? `${user.total_my_docs}` : undefined },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/demo', label: 'Demo Center', icon: Sparkles },
    { to: '/profile', label: 'My Profile', icon: UserIcon },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1">
                VeriDoc <span className="text-blue-600">AI</span>
              </span>
              <span className="text-[10px] text-slate-500 block -mt-0.5 font-medium">
                Enterprise Verification
              </span>
            </div>
          </NavLink>
        </div>

        {/* User Mini Profile Card */}
        {isAuthenticated && user ? (
          <div className="p-3.5 mx-3 mt-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{user.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active Account
              </span>
              <NavLink
                to="/profile"
                onClick={onClose}
                className="text-blue-600 font-medium hover:underline flex items-center gap-0.5"
              >
                Manage <ChevronRight className="w-3 h-3" />
              </NavLink>
            </div>
          </div>
        ) : (
          <div className="p-3 mx-3 mt-3 rounded-xl bg-blue-50/60 border border-blue-100 text-center">
            <p className="text-xs font-medium text-slate-700">Guest Session</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Sign in to save documents & history</p>
            <div className="mt-2.5 flex items-center gap-2">
              <NavLink
                to="/login"
                onClick={onClose}
                className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium text-center"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                onClick={onClose}
                className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium text-center"
              >
                Sign Up
              </NavLink>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Log Out</span>
            </button>
          ) : (
            <NavLink
              to="/login"
              onClick={onClose}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Sign In to Account</span>
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
};

