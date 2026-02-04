import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Users,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const groups = [
  {
    id: 1,
    name: "Weekend Trip",
    description: "Beach vacation with college friends",
    members: 5,
    balance: 1200,
    yourShare: 240,
    avatar: "🏖️",
    color: "from-blue-500 to-cyan-500",
    isPinned: true,
    lastActivity: "2 hours ago",
    hasPool: true,
  },
  {
    id: 2,
    name: "Roommates",
    description: "Monthly rent and utilities",
    members: 4,
    balance: 450,
    yourShare: -120,
    avatar: "🏠",
    color: "from-purple-500 to-pink-500",
    isPinned: true,
    lastActivity: "5 hours ago",
    hasPool: true,
  },
  {
    id: 3,
    name: "Office Lunch",
    description: "Daily lunch expenses",
    members: 8,
    balance: 89,
    yourShare: 15,
    avatar: "🍕",
    color: "from-orange-500 to-red-500",
    isPinned: false,
    lastActivity: "1 day ago",
    hasPool: false,
  },
  {
    id: 4,
    name: "Family",
    description: "Family gatherings and events",
    members: 6,
    balance: 2500,
    yourShare: 0,
    avatar: "👨‍👩‍👧‍👦",
    color: "from-emerald-500 to-green-500",
    isPinned: false,
    lastActivity: "3 days ago",
    hasPool: true,
  },
  {
    id: 5,
    name: "Gym Buddies",
    description: "Shared gym membership",
    members: 3,
    balance: 75,
    yourShare: 25,
    avatar: "💪",
    color: "from-yellow-500 to-orange-500",
    isPinned: false,
    lastActivity: "1 week ago",
    hasPool: false,
  },
  {
    id: 6,
    name: "Book Club",
    description: "Monthly book purchases",
    members: 7,
    balance: 180,
    yourShare: -30,
    avatar: "📚",
    color: "from-indigo-500 to-purple-500",
    isPinned: false,
    lastActivity: "2 weeks ago",
    hasPool: true,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Groups() {
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "all") return matchesSearch;
    if (filter === "pinned") return matchesSearch && group.isPinned;
    if (filter === "pool") return matchesSearch && group.hasPool;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">My Groups</h1>
          <p className="text-gray-400 mt-1">{groups.length} groups total</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/groups/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-black font-semibold hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            <Plus className="w-5 h-5" />
            <span>Create Group</span>
          </Link>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-white/5 border-white/10 focus:border-emerald-500/50"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-emerald-500/50 outline-none"
          >
            <option value="all">All Groups</option>
            <option value="pinned">Pinned</option>
            <option value="pool">With Pool</option>
          </select>
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Groups Grid/List */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={
          viewMode === "grid"
            ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        }
      >
        {filteredGroups.map((group) => (
          <motion.div key={group.id} variants={item}>
            <Link to={`/groups/${group.id}`}>
              <Card
                className={`glass-card border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group ${
                  viewMode === "list" ? "flex items-center" : ""
                }`}
              >
                <CardContent
                  className={`${
                    viewMode === "list"
                      ? "flex items-center gap-4 p-4 w-full"
                      : "p-5"
                  }`}
                >
                  {/* Avatar */}
                  <div className={viewMode === "list" ? "" : "mb-4"}>
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl relative"
                      style={{ background: `linear-gradient(135deg, ${group.color.includes('blue') ? '#3b82f6, #06b6d4' : group.color.includes('purple') ? '#a855f7, #ec4899' : group.color.includes('orange') ? '#f97316, #ef4444' : group.color.includes('emerald') ? '#4ade80, #22c55e' : group.color.includes('yellow') ? '#eab308, #f97316' : '#6366f1, #a855f7'})` }}
                    >
                      {group.avatar}
                      {group.isPinned && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Star className="w-3 h-3 text-black" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={viewMode === "list" ? "flex-1 min-w-0" : ""}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate group-hover:text-emerald-400 transition-colors">
                          {group.name}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {group.description}
                        </p>
                      </div>
                      {viewMode === "grid" && (
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-4 mt-4 ${
                        viewMode === "list" ? "flex-wrap" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{group.members} members</span>
                      </div>
                      {group.hasPool && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-500/20 text-emerald-400 border-0"
                        >
                          Pool Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Balance */}
                  <div
                    className={`${
                      viewMode === "list"
                        ? "text-right ml-4"
                        : "mt-4 pt-4 border-t border-white/10 flex items-center justify-between"
                    }`}
                  >
                    <div className={viewMode === "list" ? "" : ""}>
                      <p className="text-sm text-gray-400">
                        {viewMode === "grid" ? "Pool Balance" : "Balance"}
                      </p>
                      <p className="font-semibold text-emerald-400">
                        ${group.balance.toLocaleString()}
                      </p>
                    </div>
                    {viewMode === "grid" && (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Your Share</p>
                        <p
                          className={`font-semibold ${
                            group.yourShare >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {group.yourShare >= 0 ? "+" : ""}$
                          {Math.abs(group.yourShare)}
                        </p>
                      </div>
                    )}
                  </div>

                  {viewMode === "list" && (
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredGroups.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No groups found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery
              ? "Try a different search term"
              : "Create your first group to get started"}
          </p>
          <Link
            to="/groups/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-black font-semibold hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            <Plus className="w-5 h-5" />
            <span>Create Group</span>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
