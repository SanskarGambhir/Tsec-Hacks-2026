import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import CreateGroup from "./pages/CreateGroup";
import GroupDetails from "./pages/GroupDetails";
import Wallet from "./pages/Wallet";
import Activity from "./pages/Activity";
import Profile from "./pages/Profile";
import FriendsPage from "./pages/FriendsPage";
import InviteHandler from "./pages/InviteHandler";
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

        {/* App Routes with Layout */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/create" element={<CreateGroup />} />
          <Route path="/groups/:id" element={<GroupDetails />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;