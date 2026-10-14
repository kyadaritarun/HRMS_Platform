import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  feature?: string;
}

export const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles, feature }) => {
  const { user, isLoading, hasFeature } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white text-xs font-semibold">Loading Uptrix Workspace...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // First login forced password change check
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'PRODUCT_SUPER_ADMIN') {
    if (user.role === 'COMPANY_ADMIN' || user.role === 'HR') {
      return <Navigate to="/company/dashboard" replace />;
    }
    return <Navigate to="/employee/dashboard" replace />;
  }

  // Feature check
  if (feature && !hasFeature(feature)) {
    // If feature is locked, redirect to dashboard
    if (user.role === 'COMPANY_ADMIN' || user.role === 'HR') {
      return <Navigate to="/company/dashboard" replace />;
    }
    return <Navigate to="/employee/dashboard" replace />;
  }

  return <>{children}</>;
};
