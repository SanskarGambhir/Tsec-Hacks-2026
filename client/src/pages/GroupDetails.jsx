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
  Trash2,
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
import { sendGroupInviteToFriend, sendGroupInviteViaWhatsApp, getGroupDetails, removeRuleFromGroup } from "../api/groups";
import toast from "react-hot-toast";

const categoryColors = {
  Accommodation: "bg-blue-500/20 text-blue-400",
  Food: "bg-orange-500/20 text-orange-400",
  Activities: "bg-purple-500/20 text-purple-400",
  Transport: "bg-green-500/20 text-orange-400",
};

export default function GroupDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removingRule, setRemovingRule] = useState(null);

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

  // Fetch group details
  const fetchGroupDetails = async () => {
    setLoading(true);
    try {
      const response = await getGroupDetails(id);
      setGroup(response.data);
    } catch (error) {
      console.error("Error fetching group details:", error);
      toast.error(error.response?.data?.message || "Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  // Fetch group details on component mount and when id changes
  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

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
          sendGroupInviteToFriend(id, friend._id)
        )
      );

      toast.success("Invites sent successfully!");
      fetchGroupDetails(); // Refresh group data
      setSelectedFriends([]);
      setShowAddMember(false);
    } catch (error) {
      console.error("Error sending friend invites:", error);
      setError(error.response?.data?.message || "Failed to send invites");
      toast.error(error.response?.data?.message || "Failed to send invites");
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
      await sendGroupInviteViaWhatsApp(id, phoneNumber.trim());
      setPhoneInviteSuccess(true);
      setPhoneNumber("");

      setTimeout(() => {
        setPhoneInviteSuccess(false);
        setShowAddMember(false);
      }, 2000);

      toast.success("WhatsApp invite sent successfully!");
      fetchGroupDetails(); // Refresh group data
    } catch (error) {
      console.error("Error sending WhatsApp invite:", error);
      setError(error.response?.data?.message || "Failed to send invite");
      toast.error(error.response?.data?.message || "Failed to send invite");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Remove rule from group
  const handleRemoveRule = async (ruleIndex) => {
    if (!window.confirm("Are you sure you want to remove this rule?")) {
      return;
    }

    setRemovingRule(ruleIndex);
    try {
      await removeRuleFromGroup(id, ruleIndex);
      toast.success("Rule removed successfully!");
      fetchGroupDetails(); // Refresh group data
    } catch (error) {
      console.error("Error removing rule:", error);
      toast.error(error.response?.data?.message || "Failed to remove rule");
    } finally {
      setRemovingRule(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Group not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

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
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{group.name}</h1>
            <p className="text-gray-400 text-sm">{group.description}</p>
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
                  ₹{group.wallet?.balance || 0}
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
                <p className="text-xl font-bold">₹{group.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0}</p>
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
                <p className="text-xl font-bold">{group.members?.length || 0}</p>
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
                <p className="text-sm text-gray-400">Rules</p>
                <p className="text-xl font-bold">{group.rules?.length || 0}</p>
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
                {(group.expenses || []).slice(0, 4).map((expense, index) => (
                  <div
                    key={expense._id || index}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <div
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${categoryColors[expense.category] || "bg-gray-500/20 text-gray-400"}`}
                    >
                      {expense.category || "General"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.description}</p>
                      <p className="text-xs text-gray-500">by {expense.spentBy?.username || "Unknown"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{expense.amount}</p>
                      <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {(!group.expenses || group.expenses.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No expenses recorded yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Member Balances */}
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Group Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(group.members || []).slice(0, 4).map((member, index) => (
                  <div
                    key={member._id || index}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email || member.username}`}
                      />
                      <AvatarFallback
                        className="text-black"
                        style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                      >
                        {member.username?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.username}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹0</p>
                      <p className="text-xs text-gray-500">balance</p>
                    </div>
                  </div>
                ))}
                {(!group.members || group.members.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No members in this group
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-6">
          <Card className="glass-card border-white/10">
            <CardContent className="p-4 space-y-3">
              {(group.expenses || []).map((expense, index) => (
                <motion.div
                  key={expense._id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${categoryColors[expense.category] || "bg-gray-500/20 text-gray-400"}`}
                  >
                    {expense.category || "General"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{expense.description}</p>
                    <p className="text-sm text-gray-500">
                      Paid by {expense.spentBy?.username || "Unknown"} • {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">₹{expense.amount}</p>
                  </div>
                </motion.div>
              ))}
              {(!group.expenses || group.expenses.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No expenses recorded yet
                </div>
              )}
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
                            .filter(friend => !group.members.some(m => m._id === friend._id))
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
              {(group.members || []).map((member, index) => (
                <motion.div
                  key={member._id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email || member.username}`}
                    />
                    <AvatarFallback
                      className="text-black font-bold"
                      style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)" }}
                    >
                      {member.username?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{member.username}</p>
                      {member._id === group.owner?._id && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹0</p>
                    <p className="text-xs text-gray-500">balance</p>
                  </div>
                </motion.div>
              ))}
              {(!group.members || group.members.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No members in this group
                </div>
              )}
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
              {(group.rules || []).map((rule, index) => (
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
                  <div className="flex-1">
                    <p className="text-gray-300 font-medium">{rule.ruleType}</p>
                    <p className="text-gray-400 text-sm">{rule.description}</p>
                    <p className="text-gray-500 text-xs mt-1">{rule.ruleValue}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveRule(index)}
                    disabled={removingRule === index}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {removingRule === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </motion.div>
              ))}
              {(!group.rules || group.rules.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No rules defined for this group
                </div>
              )}
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
                {Object.entries(
                  (group.expenses || []).reduce((acc, expense) => {
                    const category = expense.category || "General";
                    acc[category] = (acc[category] || 0) + expense.amount;
                    return acc;
                  }, {})
                ).map(([category, amount]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{category}</span>
                      <span className="font-medium">₹{amount}</span>
                    </div>
                    <Progress
                      value={(amount / Math.max(1, (group.expenses || []).reduce((sum, exp) => sum + exp.amount, 0))) * 100}
                      className="h-2 bg-white/10"
                    />
                  </div>
                ))}
                {Object.keys((group.expenses || []).reduce((acc, expense) => {
                  const category = expense.category || "General";
                  acc[category] = (acc[category] || 0) + expense.amount;
                  return acc;
                }, {})).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No expenses recorded yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Contribution Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(group.members || []).map((member, index) => (
                  <div key={member._id || index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{member.username}</span>
                      <span className="font-medium">₹0</span>
                    </div>
                    <Progress
                      value={0}
                      className="h-2 bg-white/10"
                    />
                  </div>
                ))}
                {(!group.members || group.members.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No members in this group
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
