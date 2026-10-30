import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SelectTypePage } from './pages/SelectTypePage';
import { UploadPage } from './pages/UploadPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { MyDocPage } from './pages/MyDocPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DemoPage } from './pages/DemoPage';
import { SettingsPage } from './pages/SettingsPage';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Full-width pages without sidebar (landing and standalone auth pages)
  const isAuthOrLanding = ['/', '/login', '/signup', '/forgot-password'].includes(
    location.pathname
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Sidebar (Desktop fixed left, Mobile slide-over) */}
      {!isAuthOrLanding && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main Column */}
      <div className={`flex-1 flex flex-col min-w-0 ${!isAuthOrLanding ? 'lg:pl-64' : ''}`}>
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/select-type" element={<SelectTypePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/results/:refId" element={<ResultsPage />} />
            <Route path="/history" element={<Navigate to="/dashboard" replace />} />
            <Route path="/my-doc" element={<MyDocPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
