import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ auth, roles = [], children }) {
  if (!auth.user) return <Navigate to="/login" />;
  if (roles.length && !roles.includes(auth.user.role)) return <Navigate to="/" />;
  return children;
}
