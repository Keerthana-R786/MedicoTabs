import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import CreatePatient from './pages/CreatePatient';
import CreateReferral from './pages/CreateReferral';
import Referrals from './pages/Referrals';
import Messages from './pages/Messages';
import Approvals from './pages/Approvals';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
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
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
