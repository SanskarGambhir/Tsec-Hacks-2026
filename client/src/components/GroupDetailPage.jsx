import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

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

  // Interaction State
  const [newRule, setNewRule] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]); // Activity Feed
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [addingFunds, setAddingFunds] = useState(false);
  const [fundsMessage, setFundsMessage] = useState("");

  // Member Management State (placeholder logic for now)
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Transaction State
  const [transactions, setTransactions] = useState([]);
  const [checkingPayments, setCheckingPayments] = useState(false);

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
      // TODO: Implement cancel endpoint
      await api.post(
        `/groups/${groupId}/cancel-deposit/${intentId}`,
        {},
        { withCredentials: true },
      );
      setFundsMessage("Transaction cancelled");
      fetchTransactions();
    } catch (err) {
      console.error(err);
      setFundsMessage("Failed to cancel transaction");
    }
  };

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
        `/api/v1/groups/${groupId}/messages`,
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
      console.log("Release Type:", releaseType);

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
                  <p className="text-sm text-gray-400">Your Share</p>
                  <p className="text-xl font-bold text-emerald-400">--</p>
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
                  transactions.map((tx, idx) => (
                    <motion.div
                      key={tx._id || idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group p-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            tx.type === "DEPOSIT"
                              ? "bg-emerald-500/10"
                              : "bg-red-500/10"
                          }`}
                        >
                          {tx.type === "DEPOSIT" ? (
                            <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5 text-red-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm text-gray-200">
                              {tx.type === "DEPOSIT" ? "Deposit" : tx.type}
                            </p>
                            <p className="font-bold text-emerald-400">
                              ₹{tx.amount?.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>ID: {tx.intentId?.slice(0, 8)}...</span>
                            </div>
                            {getStatusBadge(tx.status)}
                          </div>

                          {tx.status === "PENDING" && (
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
                  ))
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
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
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
              <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
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
                <DialogContent className="glass-card border-white/10">
                  <DialogHeader>
                    <DialogTitle>Add New Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        className="pl-11 h-12 bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddMember(false)}
                        className="border-white/10"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() =>
                          alert("Invite functionality to be implemented")
                        }
                        className="text-black"
                        style={{
                          background:
                            "linear-gradient(90deg, #4ade80, #22c55e)",
                        }}
                      >
                        Send Invite
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.members?.map((member, index) => (
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
                        background: "linear-gradient(135deg, #4ade80, #22c55e)",
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
                  {/* Placeholder for remove logic if user is owner */}
                  {/* <button
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button> */}
                </motion.div>
              ))}
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
    </div>
  );
};

export default GroupDetailPage;
