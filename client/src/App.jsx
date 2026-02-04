import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Homepage from "./pages/Homepage";
import Wallet from "./pages/Walllet";
import GroupChat from "./pages/GroupChat";
import SocketTestComponent from "./components/SocketTestComponent";
import JoinGroup from "./components/JoinGroup";
import GroupDetailPage from "./components/GroupDetailPage";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/chat/:groupId" element={<GroupChat />} />
        <Route path="/socket-test" element={<SocketTestComponent />} />
        <Route path="/join-group" element={<JoinGroup />} />
        <Route path="/group/:groupId" element={<GroupDetailPage />} />

        {/* App Routes with Layout */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/create" element={<CreateGroup />} />
          <Route path="/groups/:id" element={<GroupDetails />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/scan-bill" element={<BillScanner />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;