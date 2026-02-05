import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import api from "../api/axios";
import {
  connectSocket,
  joinGroup as socketJoinGroup,
  onRuleAdded,
  onMemberJoined,
  onReceiveMessage,
  onFundsAdded,
  onExpenseLogged,
  onNewMessage,
  removeListener,
} from "../lib/socket";
import {
  ArrowLeft,
  Users,
  Wallet,
  Receipt,
  Settings,
  Plus,
  UserPlus,
  UserMinus,
  DollarSign,
  Mail,
  Crown,
  Send,
  MessageSquare,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  History,
  XCircle,
  Link,
  Phone,
  Loader2,
  MessageCircle,
  Check,
  LogOut,
} from "lucide-react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import GroupPaymentModal from "./GroupPaymentModal";
import ExpenseDetailsModal from "./ExpenseDetailsModal";
import MemberActionsModal from "./MemberActionsModal";
import { getFriends } from "../api/friends";
import {
  sendGroupInviteToFriend,
  sendGroupInviteViaWhatsApp,
  leaveGroup,
} from "../api/groups";

const categoryColors = {
  Accommodation: "bg-blue-500/20 text-blue-400",
  Food: "bg-orange-500/20 text-orange-400",
  Activities: "bg-purple-500/20 text-purple-400",
  Transport: "bg-green-500/20 text-green-400",
  General: "bg-gray-500/20 text-gray-400",
};

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUser = userData?.data?.user || userData;
  const currentUserId = currentUser?._id;

  console.log(currentUserId, "CURRENT USER ID");

  console.log(group?.owner?._id, "OWNER ID");

  // Interaction State
  const [newRule, setNewRule] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]); // Activity Feed
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [addingFunds, setAddingFunds] = useState(false);
  const [fundsMessage, setFundsMessage] = useState("");

  // Member Management State
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Transaction State
  const [transactions, setTransactions] = useState([]);
  const [checkingPayments, setCheckingPayments] = useState(false);
  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Group Payment Modal State
  const [showGroupPaymentModal, setShowGroupPaymentModal] = useState(false);

  // Group Invitation State
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Member Actions Modal State
  const [showMemberActionsModal, setShowMemberActionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMemberBalance, setSelectedMemberBalance] = useState(0);

  // Friend selection states
  const [addMethod, setAddMethod] = useState("friends"); // 'friends' or 'whatsapp'
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);

  // WhatsApp invite states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneInviteSuccess, setPhoneInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Leave group state
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  // Expense details state
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Pending invites state
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Get current user


  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await api.get(`/groups/${groupId}`);
        setGroup(response.data.data);

        // Connect to socket and join the group room
        connectSocket();
        socketJoinGroup(groupId);
      } catch (err) {
        console.error("Error fetching group details:", err);
        setError(err.response?.data?.message || "Failed to load group details");
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
    fetchTransactions();
    fetchPendingInvites();

    // Define handlers for cleanup
    const handleRuleAdded = (data) => {
      setGroup((prevGroup) => ({
        ...prevGroup,
        rules: [...(prevGroup.rules || []), data.rule],
      }));
      setMessages((prev) => [
        ...prev,
        {
          type: "ruleAdded",
          content: `New rule added: ${data.rule.ruleType} - ${data.rule.ruleValue}`,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    };

    const handleMemberJoined = (data) => {
      setGroup((prevGroup) => ({
        ...prevGroup,
        members: [...(prevGroup.members || []), data.user],
      }));
      setMessages((prev) => [
        ...prev,
        {
          type: "memberJoined",
          content: `${data.user.username || data.user.email} joined the group`,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    };

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          type: "message",
          content: `${data.sender.name || data.sender.username}: ${data.message}`,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    };

    const handleFundsAdded = (data) => {
      setGroup((prevGroup) => ({
        ...prevGroup,
        pool: data.newPoolBalance,
        wallet: {
          ...prevGroup.wallet,
          balance: data.newWalletBalance,
        },
      }));

      setMessages((prev) => [
        ...prev,
        {
          type: "fundsAdded",
          content: `₹${data.amount} added to group`,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    };

    const handleExpenseLogged = (data) => {
      setGroup((prevGroup) => ({
        ...prevGroup,
        pool: data.pool,
        wallet: {
          ...prevGroup.wallet,
          balance: data.walletBalance,
        },
        expenses: [...(prevGroup.expenses || []), data.expense],
      }));

      setMessages((prev) => [
        ...prev,
        {
          type: "expenseLogged",
          content: `Expense: ${data.expense.description} - ₹${data.expense.amount}`,
          timestamp: new Date().toLocaleString(),
        },
      ]);
    };

    const handleNewMessage = (data) => {
      // Update the group's messages array
      setGroup((prevGroup) => ({
        ...prevGroup,
        messages: [...(prevGroup.messages || []), data.message],
      }));

      // Also add to the activity feed
      setMessages((prev) => [
        ...prev,
        {
          type: "message",
          content: `${data.message.sender.username || data.message.sender.email}: ${data.message.content}`,
          timestamp: new Date(data.message.timestamp).toLocaleString(),
        },
      ]);
    };

    // Set up socket listeners
    onRuleAdded(handleRuleAdded);
    onMemberJoined(handleMemberJoined);
    onReceiveMessage(handleReceiveMessage);
    onFundsAdded(handleFundsAdded);
    onExpenseLogged(handleExpenseLogged);
    onNewMessage(handleNewMessage);

    return () => {
      // Clean up socket listeners
      removeListener("ruleAdded", handleRuleAdded);
      removeListener("memberJoined", handleMemberJoined);
      removeListener("receiveMessage", handleReceiveMessage);
      removeListener("fundsAdded", handleFundsAdded);
      removeListener("expenseLogged", handleExpenseLogged);
      removeListener("newMessage", handleNewMessage);
    };
  }, [groupId]);

  // Periodic payment checking
  useEffect(() => {
    if (groupId) {
      checkGroupPayments();
      const interval = setInterval(checkGroupPayments, 5000);
      return () => clearInterval(interval);
    }
  }, [groupId]);

  const fetchTransactions = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/transactions`, {
        withCredentials: true,
      });
      if (res.data.data?.transactions) {
        setTransactions(res.data.data.transactions);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      setLoadingInvites(true);
      const res = await api.get(`/groups/${groupId}/pending-invites`, {
        withCredentials: true,
      });
      if (res.data.data?.invites) {
        setPendingInvites(res.data.data.invites);
      }
    } catch (err) {
      console.error("Failed to fetch pending invites:", err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const checkGroupPayments = async () => {
    if (!groupId) return;
    try {
      setCheckingPayments(true);
      const res = await api.get(`/groups/${groupId}/check-payments`, {
        withCredentials: true,
      });
      const { updated } = res.data.data || {};
      if (updated && updated.length > 0) {
        setFundsMessage("Payment confirmed and balance updated!");
        fetchTransactions();
        // Refresh group details to get updated balance
        const response = await api.get(`/groups/${groupId}`);
        setGroup(response.data.data);
      }
    } catch (err) {
      // Silent fail for background checks
      console.error("Payment sync failed:", err);
    } finally {
      setCheckingPayments(false);
    }
  };

  const confirmTransaction = async (intentId) => {
    try {
      setFundsMessage("Submitting proof...");

      const res = await api.post(
        `/wallet/complete_deposit/${intentId}`,
        {},
        { withCredentials: true },
      );

      if (res.data.success) {
        setFundsMessage(
          "Proof submitted. Payment will settle at Decided Date.",
        );
        localStorage.removeItem("pendingTimeLockedIntent");
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
      setFundsMessage("Proof submission failed");
    }
  };

  const cancelTransaction = async (intentId) => {
    try {
      setFundsMessage("Cancelling transaction...");

      await api.post(
        `/groups/${groupId}/cancel-deposit/${intentId}`,
        {},
        { withCredentials: true },
      );

      setFundsMessage("Transaction cancelled");

      // Refresh group to update pendingFunds
      const response = await api.get(`/groups/${groupId}`);
      setGroup(response.data.data);

      // Refresh transactions list
      fetchTransactions();
    } catch (err) {
      console.error(err);
      setFundsMessage(
        err.response?.data?.message || "Failed to cancel transaction",
      );
    }
  };
  1;
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
      case "SUCCESS":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">
            Completed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/20">
            Pending
          </Badge>
        );
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();

    if (!newRule.trim()) return;

    try {
      await api.post(`/groups/${groupId}/rules`, {
        ruleType: "custom",
        ruleValue: newRule.trim(),
        description: `Rule: ${newRule.trim()}`,
      });

      setNewRule("");
      // The rule will be reflected via socket update
    } catch (err) {
      console.error("Error adding rule:", err);
      alert(err.response?.data?.message || "Failed to add rule");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await api.post(
        `/groups/${groupId}/messages`,
        {
          content: newMessage.trim(),
        },
        { withCredentials: true },
      );

      // Clear the input field
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleAddFunds = async () => {
    const releaseType = group.releaseType;
    if (
      !addFundsAmount ||
      isNaN(addFundsAmount) ||
      Number(addFundsAmount) <= 0
    ) {
      setFundsMessage("Enter a valid amount");
      return;
    }

    try {
      setAddingFunds(true);
      setFundsMessage("");

      if (releaseType === "time_locked") {
        console.log("Creating time-locked payment intent");
        const unlockDate = group.unlockDate;
        console.log("Unlock Date:", unlockDate);

        // Convert unlock date to Unix timestamp
        const timeLockUntil = Math.floor(
          new Date(unlockDate).getTime() / 1000,
        ).toString();
        const paymentIntentResponse = await axios.post(
          "https://api.fmm.finternetlab.io/api/v1/payment-intents",
          {
            amount: addFundsAmount,
            currency: "USDC",
            type: "DELIVERY_VS_PAYMENT",
            settlementMethod: "OFF_RAMP_MOCK",
            settlementDestination: "bank_account_123",
            metadata: {
              releaseType: "TIME_LOCKED",
              timeLockUntil: timeLockUntil,
            },
          },

          {
            headers: {
              "X-API-Key": "sk_hackathon_5d3da8cd5d11aa58990e3edd273b1dd6",
              "Content-Type": "application/json",
            },
          },
        );

        // Create payment intent with time-lock metadata

        console.log("Payment Intent Response:", paymentIntentResponse.data);
        const intentId = paymentIntentResponse.data.data.id;
        localStorage.setItem("pendingTimeLockedIntent", intentId);
        window.open(paymentIntentResponse.data.data.paymentUrl);

        // Create transaction record with intentId
        const res = await api.post(
          `/groups/${groupId}/add-funds`,
          {
            amount: Number(addFundsAmount),
            intentId: intentId,
          },
          { withCredentials: true },
        );

        // Update the group data
        setGroup((prevGroup) => ({
          ...prevGroup,
          pool: res.data.data.groupPool,
          pendingFunds: res.data.data.pendingFunds,
          wallet: {
            ...prevGroup.wallet,
            balance: res.data.data.groupWalletBalance,
          },
        }));

        setFundsMessage("Payment intent created. Please confirm payment.");
        setAddFundsAmount("");

        // Fetch transactions to show the newly created one
        setTimeout(() => fetchTransactions(), 1000);

        return; // Exit early for time_locked flow
      }
      //confirm intent automatically

      const res = await api.post(
        `/groups/${groupId}/add-funds`,
        { amount: Number(addFundsAmount) },
        { withCredentials: true },
      );

      // Update the group data with the new balance
      setGroup((prevGroup) => ({
        ...prevGroup,
        pool: res.data.data.groupPool,
        wallet: {
          ...prevGroup.wallet,
          balance: res.data.data.groupWalletBalance,
        },
      }));

      setFundsMessage("Funds added successfully");
      setAddFundsAmount("");
    } catch (err) {
      console.error("Error adding funds:", err);
      setFundsMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setAddingFunds(false);
    }
  };

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
      setInviteError("");
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (friend) => {
    const isSelected = selectedFriends.some((f) => f._id === friend._id);
    if (isSelected) {
      setSelectedFriends(selectedFriends.filter((f) => f._id !== friend._id));
    } else {
      setSelectedFriends([...selectedFriends, friend]);
    }
  };

  // Send invites to selected friends
  const handleInviteSelectedFriends = async () => {
    if (selectedFriends.length === 0) return;

    setFriendsLoading(true);
    setInviteError("");

    try {
      // Send invites to all selected friends
      await Promise.all(
        selectedFriends.map((friend) =>
          sendGroupInviteToFriend(groupId, friend._id),
        ),
      );

      setSelectedFriends([]);
      setShowAddMember(false);
      toast.success(`Successfully sent ${selectedFriends.length} invite(s)!`);
      fetchPendingInvites(); // Refresh pending invites
    } catch (error) {
      console.error("Error sending friend invites:", error);
      setInviteError(error.response?.data?.message || "Failed to send invites");
    } finally {
      setFriendsLoading(false);
    }
  };

  // Send WhatsApp invite
  const handleSendWhatsAppInvite = async () => {
    if (!phoneNumber.trim()) {
      setInviteError("Please enter a phone number");
      return;
    }

    setPhoneLoading(true);
    setInviteError("");

    try {
      await sendGroupInviteViaWhatsApp(groupId, phoneNumber.trim());

      setPhoneInviteSuccess(true);
      setPhoneNumber("");
      toast.success("WhatsApp invite sent successfully!");
      fetchPendingInvites(); // Refresh pending invites

      setTimeout(() => {
        setPhoneInviteSuccess(false);
        setShowAddMember(false);
      }, 2000);
    } catch (error) {
      console.error("Error sending WhatsApp invite:", error);
      setInviteError(error.response?.data?.message || "Failed to send invite");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Leave group handler
  const handleLeaveGroup = async () => {
    setLeavingGroup(true);
    try {
      await leaveGroup(groupId);
      // Navigate back to groups page after leaving
      navigate("/groups");
    } catch (error) {
      console.error("Error leaving group:", error);
      alert(error.response?.data?.message || "Failed to leave group");
    } finally {
      setLeavingGroup(false);
      setShowLeaveDialog(false);
    }
  };

  // Function to handle adding an expense
  const handleAddExpense = async (expenseData) => {
    try {
      const response = await api.post(
        `/groups/${groupId}/expense`,
        expenseData,
        { withCredentials: true },
      );

      // The expense will be reflected via socket update
      console.log("Expense added successfully:", response.data);
    } catch (err) {
      console.error("Error adding expense:", err);
      alert(err.response?.data?.message || "Failed to add expense");
    }
  };

  // Function to handle group payment
  const handleGroupPayment = async (paymentData) => {
    try {
      const response = await api.post(
        `/api/v1/groups/${groupId}/process-payment`,
        paymentData,
        { withCredentials: true },
      );

      // The expense will be reflected via socket update
      console.log("Group payment processed successfully:", response.data);
      setShowGroupPaymentModal(false);
    } catch (err) {
      console.error("Error processing group payment:", err);
      alert(err.response?.data?.message || "Failed to process group payment");
    }
  };

  // Function to handle member actions (take credits or add funds)
  const handleMemberAction = async (actionData) => {
    try {
      let response;

      if (actionData.actionType === 'takeCredits') {
        // Withdraw credits from member's balance
        response = await api.post(`/members/${groupId}/withdraw-credits`, {
          memberId: actionData.memberId,
          amount: actionData.amount
        }, { withCredentials: true });
      } else if (actionData.actionType === 'addFunds') {
        const response = await api.post(
          `/groups/${groupId}/add-funds`,
          { amount: actionData.amount },
          { withCredentials: true }
        );

      }

      console.log('Member action processed successfully:', response.data);

      // Refresh the group data to reflect the changes
      const refreshedResponse = await api.get(`/groups/${groupId}`);
      setGroup(refreshedResponse.data.data);
    } catch (err) {
      console.error('Error processing member action:', err);
      throw err; // Re-throw to be caught by the modal
    }
  };


  // Check if the group is a regular split group
  const isRegularSplitGroup = group?.rules?.some(
    (rule) => rule.ruleType === "regular_split",
  );

  // Function to copy invitation link to clipboard
  const copyInvitationLink = async () => {
    try {
      // Generate the invitation link
      const link = `${window.location.origin}/join-group/${groupId}`;
      await navigator.clipboard.writeText(link);
      alert("Invitation link copied to clipboard!");
    } catch (err) {
      console.error("Error copying link:", err);
      alert("Failed to copy link");
    }
  };

  // Helper to generate a consistent color/avatar if missing
  const getAvatarLetter = (name) => (name ? name.charAt(0).toUpperCase() : "?");

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
        <div
          className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg relative"
          role="alert"
        >
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!group) return null;



  return (
    <div className="space-y-6 p-4 md:p-8">
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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
            {/* Placeholder Emoji or Icon */}
            📁
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
            onClick={() => setShowInviteDialog(true)}
          >
            <Link className="w-4 h-4" />
          </Button>
          {group.owner?._id !== currentUserId && (
            <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 hover:bg-red-500/10 text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-white/10">
                <DialogHeader>
                  <DialogTitle>Leave Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-gray-300">
                    Are you sure you want to leave{" "}
                    <span className="font-semibold text-white">
                      {group.name}
                    </span>
                    ?
                  </p>
                  <p className="text-sm text-gray-400">
                    You will need to be invited again to rejoin this group.
                  </p>
                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowLeaveDialog(false)}
                      disabled={leavingGroup}
                      className="border-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleLeaveGroup}
                      disabled={leavingGroup}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {leavingGroup ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Leaving...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4 mr-2" />
                          Leave Group
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isRegularSplitGroup && (
            <Button
              size="sm"
              className="text-black"
              style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
              onClick={() => setShowExpenseModal(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Expense
            </Button>
          )}
          {group.owner?._id === currentUserId && (
            <Button
              size="sm"
              className="text-black"
              style={{ background: "linear-gradient(90deg, #60a5fa, #3b82f6)" }}
              onClick={() => setShowGroupPaymentModal(true)}
            >
              <Wallet className="w-4 h-4 mr-1" />
              Pay from Group
            </Button>
          )}
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
                  ₹{group.wallet?.balance?.toFixed(2) || "0.00"}
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
                <p className="text-xl font-bold">
                  {/* Calculate total expenses if possible, else placeholder */}
                  {group.expenses?.length || 0}
                </p>
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
                <p className="text-xl font-bold">
                  {group.members?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {group.releaseType === "time_locked" ? (
          <Card className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Pending Funds</p>
                  <p className="text-xl font-bold text-yellow-400">
                    ₹{group.pendingFunds?.toFixed(2) || "0.00"}
                  </p>
                  {group.unlockDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Unlocks:{" "}
                      {new Date(group.unlockDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Your Balance</p>
                  <p className={`text-xl font-bold ${(() => {
                    const userBalance = group.wallet?.memberBalances?.find(
                      (balance) => balance.user.toString() === currentUserId?.toString()
                    );
                    const balanceAmount = userBalance ? userBalance.balance : 0;
                    return balanceAmount >= 0 ? 'text-emerald-400' : 'text-red-400';
                  })()
                    }`}>
                    {(() => {
                      const userBalance = group.wallet?.memberBalances?.find(
                        (balance) => balance.user.toString() === currentUserId?.toString()
                      );
                      const balanceAmount = userBalance ? userBalance.balance : 0;
                      return `${balanceAmount >= 0 ? '+' : '-'}₹${Math.abs(balanceAmount).toFixed(2)}`;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const userBalance = group.wallet?.memberBalances?.find(
                        (balance) => balance.user.toString() === currentUserId?.toString()
                      );
                      const balanceAmount = userBalance ? userBalance.balance : 0;
                      return balanceAmount >= 0 ? 'Available in pool' : 'Owed to pool';
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
            value="chat"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 rounded-lg"
          >
            Chat
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
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activity - Transactions */}
            <Card className="glass-card border-white/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  Recent Transactions
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchTransactions}
                  className="text-gray-400 hover:text-emerald-400"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${checkingPayments ? "animate-spin" : ""}`}
                  />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <History className="w-6 h-6 opacity-20" />
                    </div>
                    <p className="text-sm">No transactions found</p>
                  </div>
                ) : (
                  transactions.map((tx, idx) => {
                    const getTransactionIcon = () => {
                      switch (tx.type) {
                        case "DEPOSIT":
                          return <ArrowDownRight className="w-5 h-5 text-emerald-400" />;
                        case "WITHDRAWAL":
                          return <ArrowUpRight className="w-5 h-5 text-red-400" />;
                        case "GROUP_PAYMENT":
                          return <Receipt className="w-5 h-5 text-orange-400" />;
                        default:
                          return <DollarSign className="w-5 h-5 text-gray-400" />;
                      }
                    };

                    const getTransactionBgColor = () => {
                      switch (tx.type) {
                        case "DEPOSIT":
                          return "bg-emerald-500/10";
                        case "WITHDRAWAL":
                          return "bg-red-500/10";
                        case "GROUP_PAYMENT":
                          return "bg-orange-500/10";
                        default:
                          return "bg-gray-500/10";
                      }
                    };

                    const getTransactionLabel = () => {
                      switch (tx.type) {
                        case "DEPOSIT":
                          return "Deposit";
                        case "WITHDRAWAL":
                          return "Withdrawal";
                        case "GROUP_PAYMENT":
                          return "Group Payment";
                        default:
                          return tx.type;
                      }
                    };

                    const showUsername = tx.fromUser?.username || tx.fromUser?.email || "Unknown";

                    return (
                      <motion.div
                        key={tx._id || idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group p-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getTransactionBgColor()}`}
                          >
                            {getTransactionIcon()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <p className="font-semibold text-sm text-gray-200">
                                  {getTransactionLabel()}
                                </p>
                                {tx.description && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {tx.description}
                                  </p>
                                )}
                                {tx.fromUser && tx.type !== "DEPOSIT" && (
                                  <p className="text-xs text-gray-500 truncate">
                                    by {showUsername}
                                  </p>
                                )}
                              </div>
                              <p className={`font-bold ${tx.type === "DEPOSIT"
                                ? "text-emerald-400"
                                : tx.type === "GROUP_PAYMENT" || tx.type === "WITHDRAWAL"
                                  ? "text-orange-400"
                                  : "text-gray-400"
                                }`}>
                                {tx.type === "DEPOSIT" ? "+" : "-"}₹{tx.amount?.toLocaleString()}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(tx.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {getStatusBadge(tx.status)}
                            </div>

                            {tx.status === "PENDING" && tx.intentId && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => confirmTransaction(tx.intentId)}
                                  disabled={addingFunds}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs h-8"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => cancelTransaction(tx.intentId)}
                                  disabled={addingFunds}
                                  variant="destructive"
                                  className="flex-1 text-xs h-8"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Add Funds Section */}
            <Card className="glass-card border-white/10 h-fit">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Add Funds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={addFundsAmount}
                    onChange={(e) => setAddFundsAmount(e.target.value)}
                    placeholder="Amount (₹)"
                    className="flex-1 bg-white/5 border-white/10"
                  />
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleAddFunds}
                    disabled={addingFunds}
                  >
                    {addingFunds ? "Processing..." : "Add"}
                  </Button>
                </div>
                {fundsMessage && (
                  <p
                    className={`mt-2 text-sm font-medium ${fundsMessage.includes("successfully") ? "text-green-400" : "text-red-400"}`}
                  >
                    {fundsMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-6">
          <Card className="glass-card border-white/10 flex flex-col h-[600px]">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                Group Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {group.messages?.length > 0 ? (
                [...group.messages].reverse().map((message, index) => {
                  const isSystem = !message.sender; // simplified check
                  return (
                    <div
                      key={index}
                      className={`flex flex-col ${isSystem ? "items-center" : "items-start"}`}
                    >
                      <div
                        className={`p-3 rounded-lg max-w-[80%] ${isSystem ? "bg-white/5 text-center text-xs" : "bg-emerald-500/20 border border-emerald-500/20"}`}
                      >
                        {!isSystem && (
                          <p className="text-xs font-bold text-emerald-400 mb-1">
                            {message.sender?.username || message.sender?.email}
                          </p>
                        )}
                        <p className="text-sm text-gray-200">
                          {message.content}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-white/5 border-white/10"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button
                onClick={handleSendMessage}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-6">
          <Card className="glass-card border-white/10">
            <CardContent className="p-4 space-y-3">
              {group.expenses?.length > 0 ? (
                [...group.expenses].reverse().map((expense, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <div
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${categoryColors[expense.category || "General"]}`}
                    >
                      {expense.category || "Expense"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {expense.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        ₹{expense.amount.toFixed(2)}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center py-8 text-gray-500">
                  No expenses recorded yet.
                </p>
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
                    style={{
                      background: "linear-gradient(90deg, #4ade80, #22c55e)",
                    }}
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
                  <Tabs
                    value={addMethod}
                    onValueChange={setAddMethod}
                    className="w-full mt-4"
                  >
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
                      {inviteError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          {inviteError}
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
                            .filter(
                              (friend) =>
                                !group.members?.some(
                                  (m) => m.email === friend.email,
                                ),
                            )
                            .map((friend) => (
                              <div
                                key={friend._id}
                                onClick={() => toggleFriendSelection(friend)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedFriends.some(
                                  (f) => f._id === friend._id,
                                )
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
                                  <p className="font-medium truncate">
                                    {friend.username}
                                  </p>
                                  <p className="text-sm text-gray-400 truncate">
                                    {friend.email}
                                  </p>
                                </div>
                                {selectedFriends.some(
                                  (f) => f._id === friend._id,
                                ) && (
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
                          disabled={
                            selectedFriends.length === 0 || friendsLoading
                          }
                          className="text-black"
                          style={{
                            background:
                              "linear-gradient(90deg, #4ade80, #22c55e)",
                          }}
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
                      {inviteError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          {inviteError}
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
                            <h3 className="font-semibold text-lg">
                              Invite Sent!
                            </h3>
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
                              style={{
                                background:
                                  "linear-gradient(90deg, #4ade80, #22c55e)",
                              }}
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
              {group.members?.map((member, index) => {
                // Find the member's balance in memberBalances

                const memberBalance = group.wallet?.memberBalances?.find(
                  (balance) =>
                    balance.user.toString() === member._id.toString(),
                );
                const displayButton = member._id === currentUserId && memberBalance && memberBalance.balance <= 100;
                const balanceAmount = memberBalance ? memberBalance.balance : 0;
                const isPositive = balanceAmount >= 0;

                console.log(displayButton, member.username, balanceAmount);

                return (
                  <motion.div
                    key={member._id || index}
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
                        style={{
                          background:
                            "linear-gradient(135deg, #4ade80, #22c55e)",
                        }}
                      >
                        {getAvatarLetter(member.username || member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {member.username || member.email}
                        </p>
                        {member._id === group.owner?._id && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {isPositive ? "+" : "-"}₹
                        {Math.abs(balanceAmount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isPositive ? "Credit" : "Debt"}
                      </p>

                      {/* Show action button if user has credit >= 100 */}
                      {displayButton && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => {
                              // Set the selected member and open the modal
                              setSelectedMember(member);
                              setSelectedMemberBalance(balanceAmount);
                              setShowMemberActionsModal(true);
                            }}
                          >
                            Actions
                          </Button>
                        </div>
                      )}
                    </div>
                    {/* Placeholder for remove logic if user is owner */}
                    {/* <button
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button> */}
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          {/* Pending Invites Section */}
          <Card className="glass-card border-white/10 mt-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Pending Invites
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPendingInvites}
                className="text-gray-400 hover:text-emerald-400"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingInvites ? "animate-spin" : ""}`}
                />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingInvites ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : pendingInvites.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 mx-auto text-gray-500 mb-3 opacity-20" />
                  <p className="text-gray-400 text-sm">No pending invites</p>
                </div>
              ) : (
                pendingInvites.map((invite, index) => (
                  <motion.div
                    key={invite._id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      {invite.inviteType === "phone" ? (
                        <Phone className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Mail className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {invite.inviteType === "phone"
                            ? invite.phoneNumber
                            : invite.recipient?.email || "Unknown"}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-yellow-500/30 text-yellow-400 text-xs"
                        >
                          Pending
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>
                          Invited by{" "}
                          {invite.sender?.username || invite.sender?.email}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {invite.expiresAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Expires:{" "}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge
                        className={`${invite.inviteType === "phone" ? "bg-purple-500/20 text-purple-400 border-purple-500/20" : "bg-blue-500/20 text-blue-400 border-blue-500/20"}`}
                      >
                        {invite.inviteType === "phone" ? "WhatsApp" : "Friend"}
                      </Badge>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="mt-6">
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Group Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Rule Form */}
              <form onSubmit={handleAddRule} className="flex gap-2 mb-6">
                <Input
                  type="text"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="Add a new rule..."
                  className="flex-1 bg-white/5 border-white/10"
                />
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Add
                </Button>
              </form>

              <div className="space-y-3">
                {group.rules?.map((rule, index) => (
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
                    <div>
                      <p className="text-gray-200 font-medium">
                        {rule.ruleType}
                      </p>
                      <p className="text-gray-400 text-sm">{rule.ruleValue}</p>
                    </div>
                  </motion.div>
                ))}
                {(!group.rules || group.rules.length === 0) && (
                  <p className="text-gray-500 italic text-center">
                    No rules set yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Expense Modal */}
      {/* {showExpenseModal && group && (
        // <AddExpenseModal
        //   group={group}
        //   onClose={() => setShowExpenseModal(false)}
        //   onSave={handleAddExpense}
        // />
      )} */}

      {/* Group Payment Modal */}
      {showGroupPaymentModal && group && (
        <GroupPaymentModal
          group={group}
          onClose={() => setShowGroupPaymentModal(false)}
          onSuccess={() => { }}
        />
      )}

      {/* Member Actions Modal */}
      {showMemberActionsModal && selectedMember && (
        <MemberActionsModal
          member={selectedMember}
          balance={selectedMemberBalance}
          groupId={groupId}
          onClose={() => setShowMemberActionsModal(false)}
          onAction={handleMemberAction}
        />
      )}

      {/* Invitation Link Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="glass-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-emerald-400" />
              Invite Members
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">
                Share this link with others to join your group:
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/join-group/${groupId}`}
                  className="flex-1 bg-gray-700/50 text-gray-200"
                />
                <Button
                  onClick={copyInvitationLink}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Copy
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Anyone with this link can join your group. Make sure to share it
              securely.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Details Modal */}
      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          group={group}
          onClose={() => setSelectedExpense(null)}
        />
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "rgba(17, 24, 39, 0.95)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </div>
  );
};

export default GroupDetailPage;
