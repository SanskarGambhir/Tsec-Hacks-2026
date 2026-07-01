import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/groups": "My Groups",
  "/groups/create": "Create Group",
  "/wallet": "Wallet",
  "/activity": "Activity",
  "/profile": "Profile",
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getTitle = () => {
    // Check for dynamic routes like /groups/:id
    if (location.pathname.match(/^\/groups\/[^/]+$/) && !location.pathname.includes("create")) {
      return "Group Details";
    }
    return pageTitles[location.pathname] || "Cooper";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="lg:pl-64">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          title={getTitle()}
        />

        <main className="p-4 lg:p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
