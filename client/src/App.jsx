import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Wallet from "./pages/Walllet";
import GroupChat from "./pages/GroupChat";
import JoinGroup from "./components/JoinGroup";
import GroupDetailPage from "./components/GroupDetailPage";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import Activity from "./pages/Activity";
import AIInsights from "./pages/AIInsights";
import Profile from "./pages/Profile";
import FriendsPage from "./pages/FriendsPage";
import InviteHandler from "./pages/InviteHandler";
import GroupInviteHandler from "./pages/GroupInviteHandler";
import Dashboard from "./pages/Dashboard";
import SplitwiseSync from "./pages/SplitwiseSync";
import CreateSharedExpense from "./pages/CreateSharedExpense";
import ViewSharedExpense from "./pages/ViewSharedExpense";

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/invite/:token" element={<InviteHandler />} />
        <Route path="/group-invite/:token" element={<GroupInviteHandler />} />

        {/* Standalone pages with own headers */}
        <Route path="/chat/:groupId" element={<GroupChat />} />
        <Route path="/shared-expense/:shareLink" element={<ViewSharedExpense />} />

        {/* App Routes with Layout */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/groups/create" element={<CreateGroup />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/ai-insights" element={<AIInsights />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/splitwise" element={<SplitwiseSync />} />
          <Route path="/split-bills" element={<CreateSharedExpense />} />
          <Route path="/join-group" element={<JoinGroup />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;