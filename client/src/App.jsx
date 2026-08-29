import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { MainLayout } from "./components/layout";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";

import Login from "./pages/Login";
import SignUp from "./pages/SignUp";

/**
 * Everything past the login screen is code-split. Loading all twenty pages
 * eagerly made the first paint wait on the bill scanner's OCR bundle.
 */
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Groups = lazy(() => import("./pages/Groups"));
const CreateGroup = lazy(() => import("./pages/CreateGroup"));
const GroupDetailPage = lazy(() => import("./components/GroupDetailPage"));
const GroupChat = lazy(() => import("./pages/GroupChat"));
const JoinGroup = lazy(() => import("./components/JoinGroup"));
const Wallet = lazy(() => import("./pages/Wallet"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const Activity = lazy(() => import("./pages/Activity"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const Profile = lazy(() => import("./pages/Profile"));
const CreateSharedExpense = lazy(() => import("./pages/CreateSharedExpense"));
const ViewSharedExpense = lazy(() => import("./pages/ViewSharedExpense"));
const InviteHandler = lazy(() => import("./pages/InviteHandler"));
const GroupInviteHandler = lazy(() => import("./pages/GroupInviteHandler"));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Signed-out only — a logged-in user landing here goes to the
                  dashboard instead of seeing a login form again. */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
              </Route>

              {/* Public: invite links must work before an account exists, and a
                  shared bill is meant to be readable by anyone with the link. */}
              <Route path="/invite/:token" element={<InviteHandler />} />
              <Route path="/group-invite/:token" element={<GroupInviteHandler />} />
              <Route path="/shared-expense/:shareLink" element={<ViewSharedExpense />} />

              {/* Everything below requires a session. */}
              <Route element={<ProtectedRoute />}>
                <Route path="/chat/:groupId" element={<GroupChat />} />

                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/groups/create" element={<CreateGroup />} />
                  <Route path="/groups/:groupId" element={<GroupDetailPage />} />
                  <Route path="/join-group" element={<JoinGroup />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/friends" element={<FriendsPage />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/ai-insights" element={<AIInsights />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/split-bills" element={<CreateSharedExpense />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
