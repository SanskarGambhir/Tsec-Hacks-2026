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
import { useAuth } from "../context/AuthContext";

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
  const { logout } = useAuth();
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

  const handleLogout = async () => {
    // Clears the httpOnly session cookies server-side, not just local state.
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg relative" role="alert">
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
        <Card className="border-border overflow-hidden relative shadow-sm">

          
          {/* Cover Image */}
          <div className="h-40 relative bg-gradient-to-br from-primary via-primary/80 to-primary/60">
             <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
          </div>

          <CardContent className="relative px-8 pb-8">
            {/* Avatar & Info */}
            <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16">
              <div className="relative mx-auto md:mx-0">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                  <AvatarImage src={userData.avatar} className="object-cover" />
                  <AvatarFallback
                    className="text-primary-foreground text-4xl font-bold"
                    
                  >
                    {userData.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:bg-primary transition-colors shadow-lg border-2 border-background">
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>

              <div className="flex-1 pb-2 text-center md:text-left space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{userData.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground text-sm">
                   <Mail className="w-3 h-3" />
                   {userData.email}
                   {userData.phone && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-secondary" />
                        <Phone className="w-3 h-3" />
                        {userData.phone}
                      </>
                   )}
                </div>
              </div>

              <div className="flex justify-center md:justify-end pb-2">
                 <Button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border">
              <div className="text-center p-3 rounded-2xl bg-secondary border border-border">
                <p className="text-2xl font-bold text-primary">
                  {userData.stats.groups}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Groups</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-secondary border border-border">
                <p className="text-2xl font-bold text-foreground">
                   {userData.stats.withdrawals}
                </p>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Withdrawals</p>
              </div>
               <div className="text-center p-3 rounded-2xl bg-secondary border border-border">
                <p className="text-2xl font-bold text-foreground">{userData.stats.expenses}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Expenses</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-secondary border border-border">
                <p className="text-2xl font-bold text-primary">
                  {userData.stats.settled}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Settled</p>
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
                    <Card className="border-border mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Update Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                                }
                                className="pl-10 h-11 bg-secondary border-border"
                            />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={formData.email}
                                onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                                }
                                className="pl-10 h-11 bg-secondary border-border"
                            />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={formData.phone}
                                onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                                }
                                className="pl-10 h-11 bg-secondary border-border"
                            />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={formData.location}
                                onChange={(e) =>
                                setFormData({ ...formData, location: e.target.value })
                                }
                                className="pl-10 h-11 bg-secondary border-border"
                            />
                            </div>
                        </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsEditing(false)}
                            className="text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="text-primary-foreground bg-primary hover:bg-primary"
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
                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            Recent Withdrawals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                         {userData.creditWithdrawals && userData.creditWithdrawals.length > 0 ? (
                            userData.creditWithdrawals.map((withdrawal, index) => (
                                <div key={withdrawal._id || index} className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                            <TrendingDown className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-foreground">{withdrawal.group}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(withdrawal.issuedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <p className="font-bold text-foreground">-₹{withdrawal.amount}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-[10px] h-5 bg-secondary text-muted-foreground">
                                                {withdrawal.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))
                         ) : (
                             <div className="text-center py-6 text-muted-foreground text-sm">
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
                <Card className="border-border">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                        {section.title}
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                    {section.items.map((item, itemIndex) => (
                        <motion.button
                        key={item.action}
                        whileHover={{ x: 4 }}
                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-secondary transition-all group"
                        >
                        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span className="flex-1 text-left font-medium text-sm text-foreground">
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
                            <span className="text-muted-foreground text-xs">{item.value}</span>
                        ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                <Card className="border-red-500/20 bg-destructive/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest text-destructive font-bold">
                    Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive border border-transparent hover:border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium text-sm">Logout</span>
                    </button>
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive border border-transparent hover:border-red-500/20">
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
                className="text-center p-6 rounded-2xl bg-secondary border border-border"
            >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                     <span className="font-bold text-primary">C</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                Cooper App
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                Version 1.0.0
                </p>
                <p className="text-xs text-primary/50 mt-4">
                Member since {userData.joinedDate}
                </p>
            </motion.div>
        </div>
      </div>
    </div>
  );
}
