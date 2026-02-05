import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Wallet from "./pages/Walllet";
import GroupChat from "./pages/GroupChat";
import SocketTestComponent from "./components/SocketTestComponent";
import JoinGroup from "./components/JoinGroup";
import GroupDetailPage from "./components/GroupDetailPage";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import Activity from "./pages/Activity";
import Profile from "./pages/Profile";
import FriendsPage from "./pages/FriendsPage";
import InviteHandler from "./pages/InviteHandler";
import GroupInviteHandler from "./pages/GroupInviteHandler";
import BillScanner from "./pages/BillScanner";
import Dashboard from "./pages/Dashboard";
import SplitwiseSync from "./pages/SplitwiseSync";
import CreateSharedExpense from "./pages/CreateSharedExpense";
import ViewSharedExpense from "./pages/ViewSharedExpense";
import "./App.css";

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

        <Route path="/chat/:groupId" element={<GroupChat />} />
        <Route path="/socket-test" element={<SocketTestComponent />} />
        <Route path="/join-group" element={<JoinGroup />} />
        <Route path="/group/:groupId" element={<GroupDetailPage />} />
        <Route path="/shared-expense/:shareLink" element={<ViewSharedExpense />} />
        <Route path="/split-bills" element={<CreateSharedExpense />} />

        {/* App Routes with Layout */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/groups/create" element={<CreateGroup />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/scan-bill" element={<BillScanner />} />
          <Route path="/splitwise" element={<SplitwiseSync />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;