import { useState, useEffect } from "react";
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
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import api from "../api/axios";

// Helper function to get emoji based on group name
const getGroupEmoji = (name) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('trip') || nameLower.includes('travel') || nameLower.includes('vacation')) return '🏖️';
  if (nameLower.includes('room') || nameLower.includes('home') || nameLower.includes('house')) return '🏠';
  if (nameLower.includes('food') || nameLower.includes('lunch') || nameLower.includes('dinner') || nameLower.includes('restaurant')) return '🍕';
  if (nameLower.includes('office') || nameLower.includes('work')) return '💼';
  if (nameLower.includes('party') || nameLower.includes('event')) return '🎉';
  if (nameLower.includes('sport') || nameLower.includes('gym')) return '⚽';
  return '👥';
};

// Helper function to get gradient color based on index
const getGradientColor = (index) => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-primary to-primary",
    "from-yellow-500 to-orange-500",
    "from-indigo-500 to-purple-500",
  ];
  return colors[index % colors.length];
};

// Helper function to format time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

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
  const [username, setUsername] = useState("User");
  const [balance, setBalance] = useState(null);
  const [recentGroups, setRecentGroups] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState([
    {
      title: "Total Balance",
      value: "...",
      change: "+12.5%",
      trend: "up",
      icon: Wallet,
    },
    {
      title: "Active Groups",
      value: "...",
      change: "+2",
      trend: "up",
      icon: Users,
    },
  ]);

  const fetchBalance = async () => {
    try {
      const res = await api.get("/wallet/balance", { withCredentials: true });
      if (res.data.success) {
        const balanceValue = res.data.balance;
        setBalance(balanceValue);
        
        // Update the stats array with the fetched balance
        setStats(prev => prev.map((stat, index) => 
          index === 0 
            ? { ...stat, value: `₹${balanceValue.toLocaleString()}` }
            : stat
        ));
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setStats(prev => prev.map((stat, index) => 
        index === 0 
          ? { ...stat, value: "₹0" }
          : stat
      ));
    }
  };

  const fetchUserGroups = async () => {
    try {
      const res = await api.get("/groups/user-groups", { withCredentials: true });
      if (res.data.success) {
        const groups = res.data.data || [];
        
        // Update active groups count in stats
        setStats(prev => prev.map((stat, index) => 
          index === 1 
            ? { ...stat, value: groups.length.toString() }
            : stat
        ));
        
        // Take only the 3 most recent groups
        const recentGroupsData = groups.slice(0, 3).map((group, index) => ({
          id: group._id,
          name: group.name,
          members: group.members,
          balance: `₹${group.balance.toLocaleString()}`,
          avatar: getGroupEmoji(group.name),
          color: getGradientColor(index),
        }));
        
        setRecentGroups(recentGroupsData);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setStats(prev => prev.map((stat, index) => 
        index === 1 
          ? { ...stat, value: "0" }
          : stat
      ));
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const res = await api.get("/wallet/get_trans", { withCredentials: true });
      if (res.data.success) {
        const transactions = res.data.transactions || [];
        
        // Take only the 3 most recent transactions
        const recentActivityData = transactions.slice(0, 3).map((tx) => ({
          id: tx._id,
          type: tx.type === "DEPOSIT" ? "payment" : "expense",
          title: tx.type === "DEPOSIT" ? "Wallet Deposit" : tx.type,
          group: "Wallet",
          amount: `₹${tx.amount.toLocaleString()}`,
          user: "You",
          time: getTimeAgo(tx.createdAt),
        }));
        
        setRecentActivity(recentActivityData);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  useEffect(() => {
    // Get username from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const user = parsed.data?.user || parsed.user || parsed; // Handle nested structure
        setUsername(user.username || "User");
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    
    // Fetch all data
    fetchBalance();
    fetchUserGroups();
    fetchRecentTransactions();
  }, []);

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
            Welcome back, <span className="text-foreground">{username}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your expenses</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link
            to="/groups/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
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
        className="grid grid-cols-2 lg:grid-cols-2 gap-4"
      >
        {stats.map((stat, index) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="border-border hover:border-primary/20 transition-colors">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span
                    className={`flex items-center text-xs font-medium ${stat.trend === "up" ? "text-primary" : "text-destructive"
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
                <div className="text-xs lg:text-sm text-muted-foreground mt-1">{stat.title}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Splitwise Teaser */}
      {/* <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link to="/splitwise">
          <Card className="border-primary/20 bg-primary/10 hover:bg-primary/10 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all" />
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Sync with Splitwise</h3>
                  <p className="text-sm text-muted-foreground">Import your existing groups and settle balances instantly</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-primary group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </motion.div> */}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Groups */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Groups</CardTitle>
              <Link
                to="/groups"
                className="text-sm text-primary hover:text-primary flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <Users className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm">No groups yet</p>
                  <Link
                    to="/groups/create"
                    className="text-primary hover:text-primary text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first group
                  </Link>
                </div>
              ) : (
                recentGroups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <Link
                      to={`/groups/${group.id}`}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-secondary hover:bg-secondary border border-transparent hover:border-primary/20 transition-all"
                    >
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0"
                        style={{ background: `linear-gradient(135deg, ${group.color.includes('blue') ? '#3b82f6, #06b6d4' : group.color.includes('purple') ? '#a855f7, #ec4899' : '#f97316, #ef4444'})` }}
                      >
                        {group.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        <p className="text-sm text-muted-foreground">{group.members} members</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">{group.balance}</div>
                        <div className="text-xs text-muted-foreground">Pool Balance</div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              <Link
                to="/activity"
                className="text-sm text-primary hover:text-primary flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === "expense"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
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
                      <p className="text-xs text-muted-foreground">
                        {activity.user} • {activity.group}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold text-sm ${activity.type === "expense" ? "text-destructive" : "text-primary"
                          }`}
                      >
                        {activity.type === "expense" ? "-" : "+"}
                        {activity.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Overview */}
      {/* <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Income</span>
                  <span className="font-medium text-primary">$4,500</span>
                </div>
                <Progress value={75} className="h-2 bg-secondary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-medium text-destructive">$2,340</span>
                </div>
                <Progress value={52} className="h-2 bg-secondary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Savings</span>
                  <span className="font-medium text-blue-400">$2,160</span>
                </div>
                <Progress value={48} className="h-2 bg-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div> */}
    </div>
  );
}
