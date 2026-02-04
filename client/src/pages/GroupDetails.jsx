import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Wallet,
  Receipt,
  Settings,
  BarChart3,
  Plus,
  UserPlus,
  UserMinus,
  MoreVertical,
  DollarSign,
  Calendar,
  Check,
  X,
  Mail,
  Crown,
  Phone,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getFriends } from "@/api/friends";
import { sendGroupInviteToFriend, sendGroupInviteViaWhatsApp } from "@/api/groups";

const groupData = {
  id: 1,
  name: "Weekend Trip",
  description: "Beach vacation with college friends",
  avatar: "🏖️",
  colorGradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
  poolBalance: 1200,
  totalExpenses: 3450,
  members: [
    { id: 1, name: "Alex (You)", email: "alex@example.com", avatar: "A", role: "admin", contributed: 500, owed: 0 },
    { id: 2, name: "Sarah", email: "sarah@example.com", avatar: "S", role: "member", contributed: 300, owed: 50 },
    { id: 3, name: "Mike", email: "mike@example.com", avatar: "M", role: "member", contributed: 200, owed: 120 },
    { id: 4, name: "Emily", email: "emily@example.com", avatar: "E", role: "member", contributed: 100, owed: 80 },
    { id: 5, name: "John", email: "john@example.com", avatar: "J", role: "member", contributed: 100, owed: 0 },
  ],
  expenses: [
    { id: 1, title: "Hotel Booking", amount: 800, paidBy: "Alex", date: "2025-01-15", category: "Accommodation" },
    { id: 2, title: "Dinner at Beach", amount: 250, paidBy: "Sarah", date: "2025-01-16", category: "Food" },
    { id: 3, title: "Surfing Lessons", amount: 400, paidBy: "Mike", date: "2025-01-16", category: "Activities" },
    { id: 4, title: "Groceries", amount: 150, paidBy: "Emily", date: "2025-01-17", category: "Food" },
    { id: 5, title: "Car Rental", amount: 350, paidBy: "Alex", date: "2025-01-14", category: "Transport" },
  ],
  rules: [
    "All expenses above $100 need group approval",
    "Pool contributions due by 1st of each month",
    "Receipts required for reimbursement",
  ],
};

const categoryColors = {
  Accommodation: "bg-blue-500/20 text-blue-400",
  Food: "bg-orange-500/20 text-orange-400",
  Activities: "bg-purple-500/20 text-purple-400",
  Transport: "bg-green-500/20 text-green-400",
};

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [members, setMembers] = useState(groupData.members);

  // Friend selection states
  const [addMethod, setAddMethod] = useState("friends"); // 'friends' or 'whatsapp'
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);

  // WhatsApp invite states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneInviteSuccess, setPhoneInviteSuccess] = useState(false);
  const [error, setError] = useState("");

  // Fetch friends list
  const fetchFriends = async () => {
    setFriendsLoading(true);
    try {
      const response = await getFriends();
      setFriends(response.data || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setFriendsLoading(false);
    }
  };

  // Handle dialog open
  const handleDialogOpen = (open) => {
    setShowAddMember(open);
    if (open) {
      fetchFriends();
      setSelectedFriends([]);
      setPhoneInviteSuccess(false);
      setError("");
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (friend) => {
    const isSelected = selectedFriends.some(f => f._id === friend._id);
    if (isSelected) {
      setSelectedFriends(selectedFriends.filter(f => f._id !== friend._id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  // Send invites to selected friends
  const handleInviteSelectedFriends = async () => {
    if (selectedFriends.length === 0) return;

    setFriendsLoading(true);
    setError("");
    
    try {
      // Send invites to all selected friends
      await Promise.all(
        selectedFriends.map(friend =>
          sendGroupInviteToFriend({ groupId: id, friendId: friend._id })
        )
      );

      // Add to members list (as pending)
      const newMembers = selectedFriends.map(friend => ({
        id: `pending-${friend._id}`,
        name: friend.username,
        email: friend.email,
        avatar: friend.username?.[0]?.toUpperCase() || "?",
        role: "member",
        contributed: 0,
        owed: 0,
        status: "invited"
      }));
      
      setMembers([...members, ...newMembers]);
      setSelectedFriends([]);
      setShowAddMember(false);
    } catch (error) {
      console.error("Error sending friend invites:", error);
      setError(error.response?.data?.message || "Failed to send invites");
    } finally {
      setFriendsLoading(false);
    }
  };

  // Send WhatsApp invite
  const handleSendWhatsAppInvite = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setPhoneLoading(true);
    setError("");
    
    try {
      await sendGroupInviteViaWhatsApp({
        groupId: id,
        phoneNumber: phoneNumber.trim()
      });

      setPhoneInviteSuccess(true);
      setPhoneNumber("");
      
      setTimeout(() => {
        setPhoneInviteSuccess(false);
        setShowAddMember(false);
      }, 2000);
    } catch (error) {
      console.error("Error sending WhatsApp invite:", error);
      setError(error.response?.data?.message || "Failed to send invite");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleAddMember = () => {
    if (newMemberEmail) {
      const newMember = {
        id: members.length + 1,
        name: newMemberEmail.split("@")[0],
        email: newMemberEmail,
        avatar: newMemberEmail[0].toUpperCase(),
        role: "member",
        contributed: 0,
        owed: 0,
      };
      setMembers([...members, newMember]);
      setNewMemberEmail("");
      setShowAddMember(false);
    }
  };

  const handleRemoveMember = (memberId) => {
    setMembers(members.filter((m) => m.id !== memberId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-fit p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="flex items-center gap-4 flex-1">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: groupData.colorGradient }}
          >
            {groupData.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{groupData.name}</h1>
            <p className="text-gray-400 text-sm">{groupData.description}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 hover:bg-white/5"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="text-black"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
        </div>
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
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pool Balance</p>
                <p className="text-xl font-bold text-emerald-400">
                  ${groupData.poolBalance}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Expenses</p>
                <p className="text-xl font-bold">${groupData.totalExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Members</p>
                <p className="text-xl font-bold">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Your Share</p>
                <p className="text-xl font-bold text-emerald-400">+$240</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-white/5 border border-white/10 p-1 rounded-xl overflow-x-auto">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="expenses"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg"
          >
            Expenses
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="rules"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg"
          >
            Rules
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg"
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Expenses */}
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent Expenses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupData.expenses.slice(0, 4).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <div
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${categoryColors[expense.category]
                        }`}
                    >
                      {expense.category}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.title}</p>
                      <p className="text-xs text-gray-500">by {expense.paidBy}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${expense.amount}</p>
                      <p className="text-xs text-gray-500">{expense.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Member Balances */}
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Member Balances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.slice(0, 4).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                      />
                      <AvatarFallback
                        className="text-black"
                        style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                      >
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <p className="text-xs text-gray-500">
                        Contributed: ${member.contributed}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold text-sm ${member.owed > 0 ? "text-red-400" : "text-emerald-400"
                          }`}
                      >
                        {member.owed > 0 ? `-$${member.owed}` : "Settled"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-6">
          <Card className="glass-card border-white/10">
            <CardContent className="p-4 space-y-3">
              {groupData.expenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${categoryColors[expense.category]
                      }`}
                  >
                    {expense.category}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{expense.title}</p>
                    <p className="text-sm text-gray-500">
                      Paid by {expense.paidBy} • {expense.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${expense.amount}</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Group Members</CardTitle>
              <Dialog open={showAddMember} onOpenChange={handleDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="text-black"
                    style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Member</DialogTitle>
                  </DialogHeader>

                  {/* Tabs for Friend/WhatsApp */}
                  <Tabs value={addMethod} onValueChange={setAddMethod} className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2 bg-white/5">
                      <TabsTrigger
                        value="friends"
                        className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Friends
                      </TabsTrigger>
                      <TabsTrigger
                        value="whatsapp"
                        className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </TabsTrigger>
                    </TabsList>

                    {/* Friends Tab */}
                    <TabsContent value="friends" className="space-y-4 mt-4">
                      {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      {friendsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        </div>
                      ) : friends.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                          <p className="text-gray-400">No friends found</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Add friends first to invite them to groups
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {friends
                            .filter(friend => !members.some(m => m.email === friend.email))
                            .map((friend) => (
                              <div
                                key={friend._id}
                                onClick={() => toggleFriendSelection(friend)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                  selectedFriends.some(f => f._id === friend._id)
                                    ? "bg-emerald-500/20 border border-emerald-500/30"
                                    : "bg-white/5 hover:bg-white/10 border border-transparent"
                                }`}
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={friend.avatar} />
                                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white">
                                    {friend.username?.[0]?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{friend.username}</p>
                                  <p className="text-sm text-gray-400 truncate">{friend.email}</p>
                                </div>
                                {selectedFriends.some(f => f._id === friend._id) && (
                                  <Check className="w-5 h-5 text-emerald-400" />
                                )}
                              </div>
                            ))}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddMember(false)}
                          className="border-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleInviteSelectedFriends}
                          disabled={selectedFriends.length === 0 || friendsLoading}
                          className="text-black"
                          style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
                        >
                          {friendsLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            `Invite ${selectedFriends.length > 0 ? `(${selectedFriends.length})` : ""}`
                          )}
                        </Button>
                      </div>
                    </TabsContent>

                    {/* WhatsApp Tab */}
                    <TabsContent value="whatsapp" className="space-y-4 mt-4">
                      {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      {phoneInviteSuccess ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-8 space-y-3"
                        >
                          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Check className="w-8 h-8 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Invite Sent!</h3>
                            <p className="text-sm text-gray-400 mt-1">
                              WhatsApp invitation has been sent
                            </p>
                          </div>
                        </motion.div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            <Label className="text-sm text-gray-300">
                              Enter Phone Number
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                type="tel"
                                placeholder="+91 9876543210"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="pl-11 h-12 bg-white/5 border-white/10"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSendWhatsAppInvite();
                                  }
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500">
                              Include country code (e.g., +91 for India)
                            </p>
                          </div>

                          <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
                            <Button
                              variant="outline"
                              onClick={() => setShowAddMember(false)}
                              className="border-white/10"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSendWhatsAppInvite}
                              disabled={phoneLoading || !phoneNumber.trim()}
                              className="text-black"
                              style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
                            >
                              {phoneLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Send Invite
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                    />
                    <AvatarFallback
                      className="text-black font-bold"
                      style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                    >
                      {member.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{member.name}</p>
                      {member.role === "admin" && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      {member.status === "invited" && (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs">
                          Invited
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${member.contributed}</p>
                    <p className="text-xs text-gray-500">contributed</p>
                  </div>
                  {member.role !== "admin" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-6">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">Group Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupData.rules.map((rule, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/5"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-gray-300">{rule}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries({
                  Accommodation: 800,
                  Food: 400,
                  Activities: 400,
                  Transport: 350,
                }).map(([category, amount]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{category}</span>
                      <span className="font-medium">${amount}</span>
                    </div>
                    <Progress
                      value={(amount / groupData.totalExpenses) * 100}
                      className="h-2 bg-white/10"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Contribution Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{member.name}</span>
                      <span className="font-medium">${member.contributed}</span>
                    </div>
                    <Progress
                      value={(member.contributed / 500) * 100}
                      className="h-2 bg-white/10"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
