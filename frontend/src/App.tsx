import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import MainLayout from './components/layout/MainLayout';
import { useThemeStore } from './store/themeStore';

// Dynamic Code Splitting via React.lazy for instant initial bundle loading
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const Leads = React.lazy(() => import('./pages/Leads'));
const LeadDetails = React.lazy(() => import('./pages/LeadDetails'));
const Commissions = React.lazy(() => import('./pages/Commissions'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Financers = React.lazy(() => import('./pages/Financers'));
const Executives = React.lazy(() => import('./pages/Executives'));
const Dealers = React.lazy(() => import('./pages/Dealers'));
const ChannelExecutives = React.lazy(() => import('./pages/ChannelExecutives'));
const Users = React.lazy(() => import('./pages/Users'));
const SystemAudit = React.lazy(() => import('./pages/SystemAudit'));
const Banking = React.lazy(() => import('./pages/Banking'));
const Ledger = React.lazy(() => import('./pages/Ledger'));
const Followups = React.lazy(() => import('./pages/Followups'));
const IrrCalculator = React.lazy(() => import('./pages/IrrCalculator'));

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
    <Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense>
  );
}

export default App;
