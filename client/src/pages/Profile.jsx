import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";



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
  
  // Get user data from localStorage
  const [userData, setUserData] = useState({
    name: "User",
    email: "user@example.com",
    phone: "+1 (555) 123-4567",
    location: "San Francisco, CA",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=cooper",
    joinedDate: "January 2024",
    stats: {
      groups: 8,
      expenses: 156,
      settled: "$12,450",
    },
  });

  const [formData, setFormData] = useState({
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    location: userData.location,
  });

  useEffect(() => {
    // Fetch user data from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const user = parsed.data?.user || parsed.user || parsed; // Handle nested structure
        const updatedUserData = {
          name: user.username || "User",
          email: user.email || "user@example.com",
          phone: user.phone || "+1 (555) 123-4567",
          location: user.location || "San Francisco, CA",
          avatar: user.avatar?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'cooper'}`,
          joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "January 2024",
          stats: {
            groups: 8,
            expenses: 156,
            settled: "$12,450",
          },
        };
        setUserData(updatedUserData);
        setFormData({
          name: updatedUserData.name,
          email: updatedUserData.email,
          phone: updatedUserData.phone,
          location: updatedUserData.location,
        });
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("inviteToken");
    navigate("/login");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="glass-card border-white/10 overflow-hidden">
          {/* Cover Image */}
          <div 
            className="h-32 relative"
            style={{ background: "linear-gradient(90deg, rgba(74,222,128,0.2), rgba(34,197,94,0.2), rgba(20,184,166,0.2))" }}
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          </div>

          <CardContent className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
              <div className="relative">
                <Avatar className="w-28 h-28 border-4 border-[#0a0f0a]">
                  <AvatarImage src={userData.avatar} />
                  <AvatarFallback 
                    className="text-black text-3xl font-bold"
                    style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                  >
                    {userData.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors">
                  <Camera className="w-4 h-4 text-black" />
                </button>
              </div>

              <div className="flex-1 pb-2">
                <h1 className="text-2xl font-bold">{userData.name}</h1>
                <p className="text-gray-400">{userData.email}</p>
              </div>

              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {userData.stats.groups}
                </p>
                <p className="text-sm text-gray-400">Groups</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{userData.stats.expenses}</p>
                <p className="text-sm text-gray-400">Expenses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">
                  {userData.stats.settled}
                </p>
                <p className="text-sm text-gray-400">Settled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Profile Form */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="pl-11 h-12 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-11 h-12 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="pl-11 h-12 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="pl-11 h-12 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-white/10"
                >
                  Cancel
                </Button>
                <Button 
                  className="text-black"
                  style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Menu Sections */}
      {menuSections.map((section, sectionIndex) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 * sectionIndex }}
        >
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 font-medium">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {section.items.map((item, itemIndex) => (
                <motion.button
                  key={item.action}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * itemIndex }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="flex-1 text-left font-medium">
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
                    <span className="text-gray-400 text-sm">{item.value}</span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                </motion.button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass-card border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 font-medium">
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-500/10 transition-colors text-red-400"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="flex-1 text-left font-medium">Logout</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-500/10 transition-colors text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="flex-1 text-left font-medium">Delete Account</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* App Version */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pb-8"
      >
        <p className="text-sm text-gray-500">
          Cooper v1.0.0 • Made with ❤️
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Member since {userData.joinedDate}
        </p>
      </motion.div>
    </div>
  );
}
