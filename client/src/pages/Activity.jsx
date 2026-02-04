import { useState } from "react";
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

const activities = [
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
  expense: { icon: Receipt, color: "bg-red-500/20 text-red-400" },
  payment: { icon: Check, color: "bg-emerald-500/20 text-emerald-400" },
  member: { icon: Users, color: "bg-blue-500/20 text-blue-400" },
  pool: { icon: TrendingUp, color: "bg-purple-500/20 text-purple-400" },
};

const filters = ["All", "Expenses", "Payments", "Members", "Pool"];

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [showDateFilter, setShowDateFilter] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Activity</h1>
          <p className="text-gray-400 mt-1">Track all your group activities</p>
        </div>
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors w-fit"
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
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ActivityIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Activities</p>
                <p className="text-xl font-bold">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Expenses</p>
                <p className="text-xl font-bold">
                  {activities.filter((a) => a.type === "expense").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Settlements</p>
                <p className="text-xl font-bold">
                  {activities.filter((a) => a.type === "payment").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pool Updates</p>
                <p className="text-xl font-bold">
                  {activities.filter((a) => a.type === "pool").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {filter}
          </motion.button>
        ))}
      </motion.div>

      {/* Activity List */}
      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dayActivities], groupIndex) => (
          <motion.div
            key={date}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * groupIndex }}
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3 px-1">
              {formatDate(date)}
            </h3>
            <Card className="glass-card border-white/10">
              <CardContent className="p-2">
                {dayActivities.map((activity, index) => {
                  const IconComponent = activityIcons[activity.type].icon;
                  const iconColor = activityIcons[activity.type].color;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * index }}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
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
                          className="text-black text-sm"
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
                            className="bg-white/10 text-gray-400 border-0 text-xs hidden sm:inline-flex"
                          >
                            {activity.group}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {activity.description}
                        </p>
                      </div>

                      <div className="text-right">
                        {activity.amount && (
                          <p
                            className={`font-semibold ${
                              activity.type === "expense"
                                ? "text-red-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {activity.type === "expense" ? "-" : "+"}$
                            {activity.amount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
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

      {/* Empty State */}
      {filteredActivities.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <ActivityIcon className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No activities found</h3>
          <p className="text-gray-400">
            No activities match your current filter
          </p>
        </motion.div>
      )}
    </div>
  );
}
