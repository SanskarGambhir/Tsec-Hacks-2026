import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, 
  Plus, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RefreshCw,
  IndianRupee
} from "lucide-react";
import api from "../api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function WalletPage() {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    checkPayments();
  }, []);

  useEffect(() => {
    const interval = setInterval(checkPayments, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/wallet/get_trans", {
        withCredentials: true,
      });
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  const verifyTransaction = async (intentId) => {
    try {
      setLoading(true);
      setMessage("Submitting proof...");

      const res = await api.post(
        `/wallet/complete_deposit/${intentId}`,
        {},
        { withCredentials: true }
      );

      if (res.data.success) {
        setMessage("Proof submitted. Payment will settle shortly.");
        fetchTransactions();
        fetchBalance();
      }

      await api.post(
        `/auth/add-money`,
        { amount: Number(amount) },
        { withCredentials: true }
      );

    } catch (err) {
      console.error(err);
      setMessage("Proof submission failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await api.get("/wallet/balance", { withCredentials: true });
      setBalance(res.data.balance);
    } catch (err) {
      console.error("Balance fetch failed", err);
    }
  };

  const checkPayments = async () => {
    try {
      const res = await api.get("/wallet/check_payments", {
        withCredentials: true,
      });
      const { updated } = res.data;
      if (updated.length > 0) {
        setMessage("Payment confirmed and wallet updated!");
        fetchTransactions();
        fetchBalance();
      }
    } catch (err) {
      console.error("Payment sync failed", err);
    }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setMessage("Enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res3 = await api.post("/wallet/pay", { amount: Number(amount) });
      const intentId = res3.data.intentId;
      localStorage.setItem("pendingIntent", intentId);
      window.open(res3.data.paymentUrl);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
      case "SUCCESS":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">Completed</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/20">Pending</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-gray-400 mt-1">Manage your balance and transactions</p>
        </div>
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <Wallet className="w-6 h-6 text-emerald-400" />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Balance Card & Add Money */}
        <div className="md:col-span-5 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card border-white/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-8 relative">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">Current Balance</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold text-emerald-400">₹</span>
                    <span className="text-5xl font-bold tracking-tighter">
                      {balance !== null ? balance.toLocaleString() : "..."}
                    </span>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center gap-2 text-sm text-emerald-400/80 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Account Wallet</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Add Money
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 h-12 bg-white/5 border-white/10 text-lg"
                />
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-12 text-black font-semibold text-lg"
                style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Plus className="w-5 h-5 mr-2" />
                )}
                {loading ? "Processing..." : "Deposit Now"}
              </Button>

              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                      message.includes("success") || message.includes("confirmed")
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 text-gray-300 border border-white/10"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <div className="md:col-span-7">
          <Card className="glass-card border-white/10 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Recent Transactions
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchTransactions} className="text-gray-400 hover:text-emerald-400">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <History className="w-8 h-8 opacity-20" />
                  </div>
                  <p>No transactions found</p>
                </div>
              ) : (
                transactions.map((tx, idx) => (
                  <motion.div
                    key={tx._id || idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "DEPOSIT" ? "bg-emerald-500/10" : "bg-red-500/10"
                    }`}>
                      {tx.type === "DEPOSIT" ? (
                        <ArrowDownRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-200">
                          {tx.type === "DEPOSIT" ? "Wallet Deposit" : tx.type}
                        </p>
                        <p className="font-bold text-lg">
                          ₹{tx.amount.toLocaleString()}
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
                        <Button
                          size="sm"
                          onClick={() => verifyTransaction(tx.intentId)}
                          disabled={loading}
                          className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-xs h-8"
                        >
                          Confirm Delivery
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default WalletPage;