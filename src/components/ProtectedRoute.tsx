import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from '../pages/LoginPage';

type ProtectedRouteProps = {
  children: ReactNode;
  requireAdmin?: boolean;
};

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { client, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!client) {
    return <LoginPage />;
  }

  if (requireAdmin && client.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-600 text-xl font-semibold mb-4">Access Denied</div>
          <p className="text-slate-600 mb-6">This page is restricted to administrators only.</p>
          <button
            onClick={() => {
              localStorage.removeItem('auth_token');
              window.location.href = '/login';
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
