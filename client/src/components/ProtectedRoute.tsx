import { Navigate, Outlet } from 'react-router-dom';

const AUTH_TOKEN_KEY = 'auth_token';

export default function ProtectedRoute() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
