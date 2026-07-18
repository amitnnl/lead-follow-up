import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import MainLayout from './components/layout/MainLayout';
import { useThemeStore } from './store/themeStore';

// Static imports for instant navigation (removes lazy load slowness)
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import Commissions from './pages/Commissions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Financers from './pages/Financers';
import Executives from './pages/Executives';
import Dealers from './pages/Dealers';
import ChannelExecutives from './pages/ChannelExecutives';
import Users from './pages/Users';
import SystemAudit from './pages/SystemAudit';
import Banking from './pages/Banking';
import Ledger from './pages/Ledger';
import Followups from './pages/Followups';
import IrrCalculator from './pages/IrrCalculator';
const RouteLoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
    <div className="relative flex items-center justify-center">
      <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-emerald-400 opacity-20"></div>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
    </div>
    <span className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400 tracking-wide">
      Loading LeadFlow Pro...
    </span>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <RouteLoadingFallback />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const { checkAuth } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  useThemeStore(); // Forces store subscription and initialization at root level

  useEffect(() => {
    checkAuth();
    fetchSettings();
  }, [checkAuth, fetchSettings]);

  return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes wrapped in MainLayout */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Leads Module */}
          <Route path="leads">
            <Route index element={<Leads />} />
            <Route path="assigned" element={<Navigate to="/leads?assigned=1" replace />} />
            <Route path="disbursed" element={<Navigate to="/leads?status=disbursed" replace />} />
            <Route path=":id" element={<LeadDetails />} />
          </Route>
          
          {/* Follow-ups */}
          <Route path="followups" element={<Followups />} />
          
          {/* Network Module */}
          <Route path="financers" element={<Financers />} />
          <Route path="executives" element={<Executives />} />
          <Route path="dealers" element={<Dealers />} />
          <Route path="channels" element={<Navigate to="/channel-executives" replace />} />
          <Route path="channel-executives" element={<ChannelExecutives />} />
          
          {/* Finance Module */}
          <Route path="banking" element={<Banking />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="calculator" element={<IrrCalculator />} />
          
          {/* System Module */}
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="audit" element={<SystemAudit />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
  );
}

export default App;
