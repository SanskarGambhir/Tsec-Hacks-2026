import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/homepage" element={<Homepage />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/chat/:groupId" element={<GroupChat />} />
        <Route path="/socket-test" element={<SocketTestComponent />} />
        <Route path="/join-group" element={<JoinGroup />} />
        <Route path="/group/:groupId" element={<GroupDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;