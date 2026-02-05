import { Menu, Bell, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

export default function TopBar({ onMenuClick, title }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 px-4 py-3 lg:px-6" style={{
      background: "linear-gradient(135deg, rgba(16, 24, 16, 0.8) 0%, rgba(10, 15, 10, 0.9) 100%)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(74, 222, 128, 0.1)",
    }}>
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          <div className="hidden lg:block">
            <h1 className="text-xl font-bold">{title}</h1>
          </div>
        </div>

        {/* Mobile Title */}
        <div className="lg:hidden flex-1 text-center min-w-0">
          <h1 className="text-base sm:text-lg font-bold gradient-text truncate">{title}</h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search - Hidden on mobile */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-emerald-500/50 transition-colors"
          >
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-40 lg:w-56 placeholder:text-gray-500"
            />
          </motion.div>

          {/* Quick Add Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/groups/create")}
            className="p-2 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            <Plus className="w-5 h-5 text-black" />
          </motion.button>

          {/* Notifications */}
          {/* <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </motion.button> */}

          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-emerald-500/50">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=cooper" />
              <AvatarFallback 
                className="text-black font-bold"
                style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
              >
                C
              </AvatarFallback>
            </Avatar>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
