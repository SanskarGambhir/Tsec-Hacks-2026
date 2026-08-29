import { Menu, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

export default function TopBar({ onMenuClick, title }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 px-4 py-3 lg:px-6 bg-background border-b border-border">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </motion.button>

          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          </div>
        </div>

        {/* Mobile Title */}
        <div className="lg:hidden flex-1 text-center min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search - Hidden on mobile */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-transparent focus-within:border-primary transition-colors"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-40 lg:w-56 placeholder:text-muted-foreground text-foreground"
            />
          </motion.div>

          {/* Quick Add Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/groups/create")}
            className="p-2 rounded-full bg-primary hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </motion.button>

          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=cooper" />
              <AvatarFallback 
                className="text-primary-foreground font-bold bg-primary"
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
