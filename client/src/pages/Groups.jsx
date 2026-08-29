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
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GroupInvites from "@/components/GroupInvites";
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <Users className="w-10 h-10 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-destructive">Error Loading Groups</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
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
          <h1 className="text-2xl lg:text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground mt-1">Manage your groups and invitations</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/groups/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Group</span>
          </Link>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="groups" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Users className="w-4 h-4 mr-2" />
            My Groups ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Mail className="w-4 h-4 mr-2" />
            Invites
          </TabsTrigger>
        </TabsList>

        {/* My Groups Tab */}
        <TabsContent value="groups" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-secondary border-border focus:border-primary/20"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-11 px-4 rounded-xl bg-secondary border border-border text-sm focus:border-primary/20 outline-none"
              >
                <option value="all">All Groups</option>
                <option value="pinned">Pinned</option>
                <option value="pool">With Pool</option>
              </select>
              <div className="flex rounded-xl bg-secondary border border-border p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "grid"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${viewMode === "list"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
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
                    className={` border-border hover:border-primary/20 transition-all cursor-pointer group ${viewMode === "list" ? "flex items-center" : ""
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
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl relative bg-primary/10"
                          
                        >
                          {group.avatar}
                          {group.isPinned && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                              <Star className="w-3 h-3 text-primary-foreground" fill="currentColor" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className={viewMode === "list" ? "flex-1 min-w-0" : ""}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                              {group.name}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {group.description}
                            </p>
                          </div>
                          {viewMode === "grid" && (
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          )}
                        </div>

                        <div
                          className={`flex items-center gap-4 mt-4 ${viewMode === "list" ? "flex-wrap" : ""
                            }`}
                        >
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{group.members} members</span>
                          </div>
                          {group.hasPool && (
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary border-0"
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
                            : "mt-4 pt-4 border-t border-border flex items-center justify-between"
                          }`}
                      >
                        <div className={viewMode === "list" ? "" : ""}>
                          <p className="text-sm text-muted-foreground">
                            {viewMode === "grid" ? "Pool Balance" : "Balance"}
                          </p>
                          <p className="font-semibold text-primary">
                            ₹{group.balance.toLocaleString()}
                          </p>
                        </div>
                        {viewMode === "grid" && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Your Share</p>
                            <p
                              className={`font-semibold ${group.yourShare >= 0
                                  ? "text-primary"
                                  : "text-destructive"
                                }`}
                            >
                              {group.yourShare >= 0 ? "+" : ""}₹
                              {Math.abs(group.yourShare)}
                            </p>
                          </div>
                        )}
                      </div>

                      {viewMode === "list" && (
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
              <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No groups found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try a different search term"
                  : "Join or create your first group to get started"}
              </p>
              <Link
                to="/join-group"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors mr-4"
              >
                <Plus className="w-5 h-5" />
                <span>Join Group</span>
              </Link>
              <Link
                to="/groups/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create Group</span>
              </Link>
            </motion.div>
          )}
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites">
          <GroupInvites />
        </TabsContent>
      </Tabs>
    </div>
  );
}