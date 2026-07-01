import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  Check,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getActivityFeed, getActivityStats } from "@/api/activity.js";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const defaultActivities = [
  {
    id: 1,
    type: "expense",
    title: "Grocery Shopping",
    description: "Sarah added a new expense",
    group: "Roommates",
    amount: 65.00,
    user: { name: "Sarah", avatar: "S", email: "sarah@example.com" },
    time: "2 hours ago",
    date: "2025-01-18",
  },
  {
    id: 2,
    type: "payment",
    title: "Settled Up",
    description: "Mike paid their share",
    group: "Weekend Trip",
    amount: 120.00,
    user: { name: "Mike", avatar: "M", email: "mike@example.com" },
    time: "5 hours ago",
    date: "2025-01-18",
  },
  {
    id: 3,
    type: "expense",
    title: "Dinner at Restaurant",
    description: "You added a new expense",
    group: "Office Lunch",
    amount: 45.00,
    user: { name: "You", avatar: "A", email: "alex@example.com" },
    time: "1 day ago",
    date: "2025-01-17",
  },
  {
    id: 4,
    type: "member",
    title: "New Member",
    description: "Emily joined the group",
    group: "Family",
    amount: null,
    user: { name: "Emily", avatar: "E", email: "emily@example.com" },
    time: "2 days ago",
    date: "2025-01-16",
  },
  {
    id: 5,
    type: "pool",
    title: "Pool Contribution",
    description: "John contributed to pool",
    group: "Weekend Trip",
    amount: 200.00,
    user: { name: "John", avatar: "J", email: "john@example.com" },
    time: "3 days ago",
    date: "2025-01-15",
  },
  {
    id: 6,
    type: "expense",
    title: "Movie Tickets",
    description: "Sarah added a new expense",
    group: "Friends",
    amount: 80.00,
    user: { name: "Sarah", avatar: "S", email: "sarah@example.com" },
    time: "4 days ago",
    date: "2025-01-14",
  },
  {
    id: 7,
    type: "payment",
    title: "Settled Up",
    description: "You paid Emily",
    group: "Roommates",
    amount: 50.00,
    user: { name: "You", avatar: "A", email: "alex@example.com" },
    time: "5 days ago",
    date: "2025-01-13",
  },
  {
    id: 8,
    type: "expense",
    title: "Uber Ride",
    description: "Mike added a new expense",
    group: "Office Lunch",
    amount: 25.00,
    user: { name: "Mike", avatar: "M", email: "mike@example.com" },
    time: "1 week ago",
    date: "2025-01-11",
  },
];

const activityIcons = {
  expense: { icon: Receipt, color: "bg-destructive/10 text-destructive" },
  payment: { icon: Check, color: "bg-primary/10 text-primary" },
  member: { icon: Users, color: "bg-blue-500/20 text-blue-400" },
  pool: { icon: TrendingUp, color: "bg-purple-500/20 text-purple-400" },
  message: { icon: Clock, color: "bg-yellow-500/20 text-yellow-400" },
  settlement: { icon: Check, color: "bg-primary/10 text-primary" },
};

const filters = ["All", "Expenses", "Payments", "Members", "Pool"];

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    totalActivities: 0,
    expenses: 0,
    payments: 0,
    messages: 0,
    poolActivities: 0,
  });
  const [activeFilter, setActiveFilter] = useState("All");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch activities and stats on component mount
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch activity feed
        const activityResponse = await getActivityFeed();
        
        // Extract activities from response (could be array or object with activities property)
        const activityData = Array.isArray(activityResponse) 
          ? activityResponse 
          : activityResponse?.activities || [];
        
        // Transform API response to component format
        const formattedActivities = (activityData || []).map((activity) => ({
          id: activity._id,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          group: activity.groupName || activity.name || "Unknown Group",
          amount: activity.amount || null,
          user: {
            name: activity.user?.username || "Unknown User",
            avatar: activity.user?.username?.charAt(0)?.toUpperCase() || "U",
            email: activity.user?.email || "unknown@example.com",
          },
          time: getTimeAgo(activity.date || activity.createdAt),
          date: new Date(activity.date || activity.createdAt).toISOString().split("T")[0],
        }));

        setActivities(formattedActivities);

        // Fetch stats
        const statsData = await getActivityStats();
        if (statsData) {
          setStats(statsData);
        }
      } catch (err) {
        console.error("Failed to fetch activities:", err);
        setError("Failed to load activities. Please try again.");
        // Use default activities as fallback
        setActivities(defaultActivities);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Helper function to format time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now - activityDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return "1 week ago";
  };

  const filteredActivities = activities.filter((activity) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Expenses") return activity.type === "expense";
    if (activeFilter === "Payments") return activity.type === "payment";
    if (activeFilter === "Members") return activity.type === "member";
    if (activeFilter === "Pool") return activity.type === "pool";
    return true;
  });

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = activity.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  // Prepare chart data for activity trends by date
  const trendChartData = Object.entries(groupedActivities)
    .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
    .slice(-7) // Last 7 days
    .map(([date, dayActivities]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: dayActivities.length,
    }));

  // Prepare chart data for activity type distribution
  const typeDistribution = [
    { name: "Expenses", value: activities.filter((a) => a.type === "expense").length, fill: "#ef4444" },
    { name: "Payments", value: activities.filter((a) => a.type === "payment").length, fill: "#10b981" },
    { name: "Messages", value: activities.filter((a) => a.type === "message").length, fill: "#f59e0b" },
    { name: "Settlement", value: activities.filter((a) => a.type === "settlement").length, fill: "#8b5cf6" },
  ].filter((item) => item.value > 0);

  // Prepare chart data for activity by type (bar chart)
  const activityByType = [
    { type: "Expenses", count: activities.filter((a) => a.type === "expense").length },
    { type: "Payments", count: activities.filter((a) => a.type === "payment").length },
    { type: "Messages", count: activities.filter((a) => a.type === "message").length },
    { type: "Settlement", count: activities.filter((a) => a.type === "settlement").length },
  ].filter((item) => item.count > 0);

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-destructive/10 border border-red-500/30 text-destructive"
        >
          {error}
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <ActivityIcon className="w-10 h-10 text-muted-foreground animate-spin" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Loading activities</h3>
          <p className="text-muted-foreground">Please wait...</p>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Activity</h1>
          <p className="text-muted-foreground mt-1">Track all your group activities</p>
        </div>
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary transition-colors w-fit"
        >
          <Calendar className="w-4 h-4" />
          <span>This Month</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ActivityIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-xl font-bold">{stats.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-xl font-bold">{stats.expenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Settlements</p>
                <p className="text-xl font-bold">{stats.payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pool Updates</p>
                <p className="text-xl font-bold">{stats.poolActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Section */}
      {!loading && activities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Activity Trend Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Activity Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#1f2937", 
                        border: "1px solid #374151",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Type Distribution */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Activity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {typeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#1f2937", 
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#fff"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No distribution data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity by Type Bar Chart */}
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Activities by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="type" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#1f2937", 
                        border: "1px solid #374151",
                        borderRadius: "8px"
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {filters.map((filter) => (
          <motion.button
            key={filter}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {filter}
          </motion.button>
        ))}
      </motion.div>

      {/* Activity List */}
      {!loading && (
        <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dayActivities], groupIndex) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * groupIndex }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {formatDate(date)}
            </h3>
            <Card className="border-border">
              <CardContent className="p-2">
                {dayActivities.map((activity, index) => {
                  const iconData = activityIcons[activity.type] || activityIcons.expense;
                  const IconComponent = iconData.icon;
                  const iconColor = iconData.color;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-secondary transition-colors"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>

                      <Avatar className="w-10 h-10 hidden sm:flex">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.user.email}`}
                        />
                        <AvatarFallback 
                          className="text-primary-foreground text-sm"
                          style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                        >
                          {activity.user.avatar}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{activity.title}</p>
                          <Badge
                            variant="secondary"
                            className="bg-secondary text-muted-foreground border-0 text-xs hidden sm:inline-flex"
                          >
                            {activity.group}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.description}
                        </p>
                      </div>

                      <div className="text-right">
                        {activity.amount && (
                          <p
                            className={`font-semibold ${
                              activity.type === "expense"
                                ? "text-destructive"
                                : "text-primary"
                            }`}
                          >
                            {activity.type === "expense" ? "-" : "+"}$
                            {activity.amount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {activity.time}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredActivities.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <ActivityIcon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No activities found</h3>
          <p className="text-muted-foreground">
            No activities match your current filter
          </p>
        </motion.div>
      )}
    </div>
  );
}
