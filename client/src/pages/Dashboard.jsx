import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const stats = [
  {
    title: "Total Balance",
    value: "$12,450.00",
    change: "+12.5%",
    trend: "up",
    icon: Wallet,
  },
  {
    title: "Active Groups",
    value: "8",
    change: "+2",
    trend: "up",
    icon: Users,
  },
  {
    title: "Money Owed",
    value: "$340.00",
    change: "-$120",
    trend: "down",
    icon: TrendingDown,
  },
  {
    title: "Money Lent",
    value: "$890.00",
    change: "+$250",
    trend: "up",
    icon: TrendingUp,
  },
];

const recentGroups = [
  {
    id: 1,
    name: "Weekend Trip",
    members: 5,
    balance: "$1,200",
    avatar: "🏖️",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 2,
    name: "Roommates",
    members: 4,
    balance: "$450",
    avatar: "🏠",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: 3,
    name: "Office Lunch",
    members: 8,
    balance: "$89",
    avatar: "🍕",
    color: "from-orange-500 to-red-500",
  },
];

const recentActivity = [
  {
    id: 1,
    type: "expense",
    title: "Grocery Shopping",
    group: "Roommates",
    amount: "$65.00",
    user: "Sarah",
    time: "2h ago",
  },
  {
    id: 2,
    type: "payment",
    title: "Settled Up",
    group: "Weekend Trip",
    amount: "$120.00",
    user: "Mike",
    time: "5h ago",
  },
  {
    id: 3,
    type: "expense",
    title: "Dinner",
    group: "Office Lunch",
    amount: "$45.00",
    user: "You",
    time: "1d ago",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            Welcome back, <span className="gradient-text">Alex</span> 👋
          </h1>
          <p className="text-gray-400 mt-1">Here's what's happening with your expenses</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/groups/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-black font-semibold hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            <Plus className="w-5 h-5" />
            <span>New Group</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, index) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="glass-card border-white/10 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span
                    className={`flex items-center text-xs font-medium ${
                      stat.trend === "up" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-bold">{stat.value}</div>
                <div className="text-xs lg:text-sm text-gray-400 mt-1">{stat.title}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Groups */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Groups</CardTitle>
              <Link
                to="/groups"
                className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <Link
                    to={`/groups/${group.id}`}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-emerald-500/30 transition-all"
                  >
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0"
                      style={{ background: `linear-gradient(135deg, ${group.color.includes('blue') ? '#3b82f6, #06b6d4' : group.color.includes('purple') ? '#a855f7, #ec4899' : '#f97316, #ef4444'})` }}
                    >
                      {group.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{group.name}</h3>
                      <p className="text-sm text-gray-400">{group.members} members</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-400">{group.balance}</div>
                      <div className="text-xs text-gray-400">Pool Balance</div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              <Link
                to="/activity"
                className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      activity.type === "expense"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    {activity.type === "expense" ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <TrendingUp className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    <p className="text-xs text-gray-400">
                      {activity.user} • {activity.group}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        activity.type === "expense" ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {activity.type === "expense" ? "-" : "+"}
                      {activity.amount}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Income</span>
                  <span className="font-medium text-emerald-400">$4,500</span>
                </div>
                <Progress value={75} className="h-2 bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Expenses</span>
                  <span className="font-medium text-red-400">$2,340</span>
                </div>
                <Progress value={52} className="h-2 bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Savings</span>
                  <span className="font-medium text-blue-400">$2,160</span>
                </div>
                <Progress value={48} className="h-2 bg-white/10" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
