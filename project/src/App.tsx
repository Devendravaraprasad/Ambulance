import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import DriverDashboard from './pages/driver/Dashboard';
import HospitalDashboard from './pages/hospital/Dashboard';
import { useAuth } from './hooks/useAuth';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        aria-label="Loading"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-blue-500 font-medium">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/driver/*"
            element={
              <ProtectedRoute>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/*"
            element={
              <ProtectedRoute>
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
