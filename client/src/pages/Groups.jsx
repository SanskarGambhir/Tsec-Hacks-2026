import { useState, useEffect } from "react";
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
import api from "@/api/axios"; // Import the API instance

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
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  // Fetch user's groups from the backend
  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        setLoading(true);
        const response = await api.get("/groups/user-groups", { withCredentials: true });
        setGroups(response.data.data || []);
      } catch (err) {
        console.error("Error fetching user groups:", err);
        setError(err.response?.data?.message || "Failed to fetch groups");
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, []);

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "all") return matchesSearch;
    if (filter === "pinned") return matchesSearch && group.isPinned;
    if (filter === "pool") return matchesSearch && group.hasPool;
    return matchesSearch;
  });

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
          <Users className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-red-500">Error Loading Groups</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-black font-semibold hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
        >
          <span>Retry</span>
        </button>
      </div>
    );
  }

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
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list"
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
            <Link to={`/group/${group.id}`}>
              <Card
                className={`glass-card border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group ${viewMode === "list" ? "flex items-center" : ""
                  }`}
              >
                <CardContent
                  className={`${viewMode === "list"
                      ? "flex items-center gap-4 p-4 w-full"
                      : "p-5"
                    }`}
                >
                  {/* Avatar */}
                  <div className={viewMode === "list" ? "" : "mb-4"}>
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl relative"
                      style={{ background: `linear-gradient(135deg, ${group.color})` }}
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
                      className={`flex items-center gap-4 mt-4 ${viewMode === "list" ? "flex-wrap" : ""
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
                    className={`${viewMode === "list"
                        ? "text-right ml-4"
                        : "mt-4 pt-4 border-t border-white/10 flex items-center justify-between"
                      }`}
                  >
                    <div className={viewMode === "list" ? "" : ""}>
                      <p className="text-sm text-gray-400">
                        {viewMode === "grid" ? "Pool Balance" : "Balance"}
                      </p>
                      <p className="font-semibold text-emerald-400">
                        ₹{group.balance.toLocaleString()}
                      </p>
                    </div>
                    {viewMode === "grid" && (
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Your Share</p>
                        <p
                          className={`font-semibold ${group.yourShare >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                            }`}
                        >
                          {group.yourShare >= 0 ? "+" : ""}₹
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
      {filteredGroups.length === 0 && !loading && (
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
              : "Join or create your first group to get started"}
          </p>
          <Link
            to="/join-group"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-black font-semibold hover:opacity-90 transition-opacity mr-4"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            <Plus className="w-5 h-5" />
            <span>Join Group</span>
          </Link>
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