import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
  </div>
);

/**
 * Gate for everything behind a login.
 *
 * It waits for the session check to finish before deciding — redirecting while
 * `loading` is true would throw a signed-in user back to /login on every
 * refresh. The attempted path is remembered so login can return them to it.
 */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** The mirror image: keeps a signed-in user off the login and signup screens. */
export function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Spinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
