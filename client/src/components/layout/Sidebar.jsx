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
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Close button for mobile */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors lg:hidden z-10"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-sidebar-border">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-primary"
        >
          <Zap className="w-6 h-6 text-primary-foreground" />
        </motion.div>
        <span className="text-xl font-bold text-foreground">Cooper</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 group ${isActive
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`
            }
          >
            {({ isActive }) => (
              <div className="flex items-center gap-3 w-full">
                <item.icon
                  className={`w-5 h-5 transition-all ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                />
                <span>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* AI Assistant Card */}
      <div className="mx-4 mb-4 p-4 rounded-[24px] bg-secondary">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">Cooper AI</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Your smart expense assistant
        </p>
        <button className="w-full py-2 px-3 text-xs font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Coming Soon
        </button>
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-full text-destructive hover:bg-destructive/10 transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Always visible on lg+ */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 z-30 flex-col">
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
              className="fixed inset-0 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Mobile Sidebar */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-screen w-64 z-50 flex flex-col lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
