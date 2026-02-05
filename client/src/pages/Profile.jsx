import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Edit2,
  Shield,
  Bell,
  CreditCard,
  LogOut,
  ChevronRight,
  Moon,
  Globe,
  Lock,
  Trash2,
  History,
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import api from "@/api/axios";

const menuSections = [
  {
    title: "Account",
    items: [
      { icon: User, label: "Personal Information", action: "personal" },
      { icon: Shield, label: "Security", action: "security" },
      { icon: CreditCard, label: "Payment Methods", action: "payment" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Bell, label: "Notifications", action: "notifications", toggle: true },
      { icon: Moon, label: "Dark Mode", action: "darkmode", toggle: true, defaultOn: true },
      { icon: Globe, label: "Language", action: "language", value: "English" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: Mail, label: "Help & Support", action: "support" },
      { icon: Lock, label: "Privacy Policy", action: "privacy" },
    ],
  },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get user data from API
  const [userData, setUserData] = useState({
    name: "User",
    email: "user@example.com",
    phone: "",
    location: "Unknown",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=cooper",
    joinedDate: "January 2024",
    stats: {
      groups: 0,
      expenses: 0,
      settled: "₹0.00",
      withdrawals: 0
    },
    creditWithdrawals: []
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
  });

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/user/profile", { withCredentials: true });
      const userProfile = response.data.data;

      console.log("Fetched user profile:", userProfile);

      const updatedUserData = {
        name: userProfile.username || "User",
        email: userProfile.email || "user@example.com",
        phone: userProfile.phone || "",
        location: userProfile.location || "Not set",
        avatar: userProfile.avatar?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.username || 'cooper'}`,
        joinedDate: userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "January 2024",
        stats: userProfile.stats || {
          groups: 0,
          expenses: 0,
          settled: "₹0.00",
          withdrawals: 0
        },
        creditWithdrawals: userProfile.creditWithdrawals || []
      };

      setUserData(updatedUserData);
      setFormData({
        name: updatedUserData.name,
        email: updatedUserData.email,
        phone: updatedUserData.phone,
        location: updatedUserData.location,
      });
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError(err.response?.data?.message || "Failed to fetch user profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleSettleWithdrawal = async (withdrawalId) => {
    try {
      await api.post(`/credit-withdrawals/${withdrawalId}/settle`, {}, { withCredentials: true });
      alert("Withdrawal settled successfully!");
      fetchUserProfile(); // Refresh data
    } catch (err) {
      console.error("Error settling withdrawal:", err);
      alert(err.response?.data?.message || "Failed to settle withdrawal");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("inviteToken");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card border-white/10 overflow-hidden relative shadow-2xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          {/* Cover Image */}
          <div
            className="h-40 relative"
            style={{ background: "linear-gradient(90deg, rgba(74,222,128,0.15), rgba(34,197,94,0.15), rgba(20,184,166,0.15))" }}
          >
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          </div>

          <CardContent className="relative px-8 pb-8">
            {/* Avatar & Info */}
            <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16">
              <div className="relative mx-auto md:mx-0">
                <Avatar className="w-32 h-32 border-4 border-[#0a0f0a] shadow-xl">
                  <AvatarImage src={userData.avatar} className="object-cover" />
                  <AvatarFallback
                    className="text-black text-4xl font-bold"
                    style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                  >
                    {userData.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg border-2 border-[#0a0f0a]">
                  <Camera className="w-4 h-4 text-black" />
                </button>
              </div>

              <div className="flex-1 pb-2 text-center md:text-left space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{userData.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm">
                   <Mail className="w-3 h-3" />
                   {userData.email}
                   {userData.phone && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                        <Phone className="w-3 h-3" />
                        {userData.phone}
                      </>
                   )}
                </div>
              </div>

              <div className="flex justify-center md:justify-end pb-2">
                 <Button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
              <div className="text-center p-3 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-emerald-400">
                  {userData.stats.groups}
                </p>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">Groups</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">
                   {userData.stats.withdrawals}
                </p>
                 <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">Withdrawals</p>
              </div>
               <div className="text-center p-3 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-white">{userData.stats.expenses}</p>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">Expenses</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-2xl font-bold text-emerald-400">
                  {userData.stats.settled}
                </p>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-1">Settled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Menu & Edit Form */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Edit Profile Form */}
            <AnimatePresence>
                {isEditing && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <Card className="glass-card border-white/10 mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Update Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                                }
                                className="pl-10 h-11 bg-white/5 border-white/10"
                            />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={formData.email}
                                onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                                }
                                className="pl-10 h-11 bg-white/5 border-white/10"
                            />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={formData.phone}
                                onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                                }
                                className="pl-10 h-11 bg-white/5 border-white/10"
                            />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={formData.location}
                                onChange={(e) =>
                                setFormData({ ...formData, location: e.target.value })
                                }
                                className="pl-10 h-11 bg-white/5 border-white/10"
                            />
                            </div>
                        </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsEditing(false)}
                            className="text-gray-400 hover:text-white hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="text-black bg-emerald-500 hover:bg-emerald-600"
                        >
                            Save Changes
                        </Button>
                        </div>
                    </CardContent>
                    </Card>
                </motion.div>
                )}
            </AnimatePresence>

            {/* Credit Withdrawals History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="glass-card border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="w-5 h-5 text-emerald-400" />
                            Recent Withdrawals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         {userData.creditWithdrawals && userData.creditWithdrawals.length > 0 ? (
                            userData.creditWithdrawals.map((withdrawal, index) => (
                                <div key={withdrawal._id || index} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                            <TrendingDown className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-200">{withdrawal.group}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(withdrawal.issuedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <p className="font-bold text-white">-₹{withdrawal.amount}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-[10px] h-5 bg-white/5 text-gray-400">
                                                {withdrawal.status}
                                            </Badge>
                                            {withdrawal.status === "issued" && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-7 px-2 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                    onClick={() => handleSettleWithdrawal(withdrawal._id)}
                                                >
                                                    Settle
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                         ) : (
                             <div className="text-center py-6 text-gray-500 text-sm">
                                 No recent withdrawal history
                             </div>
                         )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Menu Sections */}
            {menuSections.map((section, sectionIndex) => (
                <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (0.1 * sectionIndex) }}
                >
                <Card className="glass-card border-white/10">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                        {section.title}
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                    {section.items.map((item, itemIndex) => (
                        <motion.button
                        key={item.action}
                        whileHover={{ x: 4 }}
                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group"
                        >
                        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                            <item.icon className="w-4 h-4 text-gray-400 group-hover:text-emerald-400" />
                        </div>
                        <span className="flex-1 text-left font-medium text-sm text-gray-200">
                            {item.label}
                        </span>
                        {item.toggle ? (
                            <Switch
                            checked={
                                item.action === "notifications" ? notifications : darkMode
                            }
                            onCheckedChange={(checked) => {
                                if (item.action === "notifications") {
                                setNotifications(checked);
                                } else {
                                setDarkMode(checked);
                                }
                            }}
                            />
                        ) : item.value ? (
                            <span className="text-gray-500 text-xs">{item.value}</span>
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                        )}
                        </motion.button>
                    ))}
                    </CardContent>
                </Card>
                </motion.div>
            ))}
        </div>

        {/* Right Column: Danger Zone & Info */}
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card className="glass-card border-red-500/20 bg-red-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest text-red-400 font-bold">
                    Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-red-400 border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium text-sm">Logout</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-red-400 border border-transparent hover:border-red-500/20">
                        <Trash2 className="w-4 h-4" />
                        <span className="font-medium text-sm">Delete Account</span>
                    </button>
                </CardContent>
                </Card>
            </motion.div>

            {/* App Version */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center p-6 rounded-2xl bg-white/5 border border-white/5"
            >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                     <span className="font-bold text-emerald-500">C</span>
                </div>
                <p className="text-sm font-medium text-gray-300">
                Cooper App
                </p>
                <p className="text-xs text-gray-500 mt-1">
                Version 1.0.0
                </p>
                <p className="text-xs text-emerald-500/50 mt-4">
                Member since {userData.joinedDate}
                </p>
            </motion.div>
        </div>
      </div>
    </div>
  );
}
