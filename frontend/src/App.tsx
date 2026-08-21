import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import HeroBackdrop from './components/HeroBackdrop';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import CreatePatient from './pages/CreatePatient';
import CreateReferral from './pages/CreateReferral';
import Referrals from './pages/Referrals';
import IncomingReferrals from './pages/IncomingReferrals';
import Messages from './pages/Messages';
import Approvals from './pages/Approvals';
import Doctors from './pages/Doctors';
import Notifications from './pages/Notifications';
import SettingsPage from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center">
        <div className="app-shell__texture" aria-hidden />
        <div className="relative z-[1] text-center">
          <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-base-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell app-shell--hero flex min-h-screen">
      <HeroBackdrop variant="app" />
      <Sidebar />
      <div className="app-main relative z-[1] flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Patients />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/patients/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CreatePatient />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PatientDetail />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/referrals"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Referrals />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/referrals/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CreateReferral />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/incoming-referrals"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <IncomingReferrals />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Messages />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/approvals"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Approvals />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctors"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Doctors />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Notifications />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
