import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Activity,
  User,
  LogOut,
  Zap,
  X,
  UserPlus,
  Divide,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Users, label: "My Groups", path: "/groups" },
  { icon: UserPlus, label: "Friends", path: "/friends" },
  { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: Divide, label: "Split Bills", path: "/split-bills" },
  { icon: Activity, label: "Activity", path: "/activity" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Close button for mobile */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors lg:hidden z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-emerald-500/10">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 10 }}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
        >
          <Zap className="w-6 h-6 text-black" />
        </motion.div>
        <span className="text-xl font-bold gradient-text">Cooper</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                ? "text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: "linear-gradient(90deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))" }
                : {}
            }
          >
            {({ isActive }) => (
              <div className="flex items-center gap-3 w-full">
                <item.icon
                  className={`w-5 h-5 transition-all ${isActive ? "text-emerald-400" : "group-hover:text-emerald-400"
                    }`}
                />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Assistant Card */}
      <div className="mx-4 mb-4 p-4 rounded-xl glass-card">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm">Cooper AI</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Your smart expense assistant
        </p>
        <button
          className="w-full py-2 px-3 text-xs font-medium rounded-lg text-white hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(90deg, #a855f7, #ec4899)" }}
        >
          Coming Soon
        </button>
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-emerald-500/10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Always visible on lg+ */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 h-screen w-64 z-30 flex-col"
        style={{
          background: "linear-gradient(180deg, rgba(10, 15, 10, 0.98) 0%, rgba(16, 24, 16, 0.95) 100%)",
          borderRight: "1px solid rgba(74, 222, 128, 0.1)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar - Animated */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Mobile Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-screen w-64 z-50 flex flex-col lg:hidden"
              style={{
                background: "linear-gradient(180deg, rgba(10, 15, 10, 0.98) 0%, rgba(16, 24, 16, 0.95) 100%)",
                borderRight: "1px solid rgba(74, 222, 128, 0.1)",
              }}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
