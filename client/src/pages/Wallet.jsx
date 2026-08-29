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
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/wallet/get_trans", {
        withCredentials: true,
      });
      setTransactions(res.data.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await api.get("/wallet/balance", { withCredentials: true });
      setBalance(res.data.data.balance);
    } catch (err) {
      console.error("Balance fetch failed", err);
    }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setMessage("Enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setMessage("Initializing payment...");
      
      const res = await api.post("/wallet/pay", { amount: Number(amount) }, { withCredentials: true });
      const order = res.data.data.order;

      const options = {
        // Must match the key the server signs with; hard-coding a placeholder
        // here meant checkout silently used the wrong merchant account.
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Cooper Wallet",
        description: "Add funds to wallet",
        order_id: order.id,
        handler: async function (response) {
          try {
            setMessage("Verifying payment...");
            await api.post("/wallet/pay_verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }, { withCredentials: true });
            
            setMessage("Payment successful! Wallet updated.");
            setAmount("");
            fetchBalance();
            fetchTransactions();
          } catch (err) {
            console.error(err);
            setMessage("Payment verification failed.");
          }
        },
        theme: {
          color: "#0052ff",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setMessage("Payment failed or cancelled.");
      });
      rzp.open();
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
        return <Badge className="bg-primary/10 text-primary border-primary/20">Completed</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-50 text-amber-600 border-amber-200">Pending</Badge>;
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
          <p className="text-muted-foreground mt-1">Manage your balance and transactions</p>
        </div>
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <Wallet className="w-6 h-6 text-primary" />
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
            <Card className="border-border overflow-hidden relative">

              <CardContent className="p-8 relative">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Balance</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold text-primary">₹</span>
                    <span className="text-5xl font-bold tracking-tighter font-mono">
                      {balance !== null ? balance.toLocaleString() : "..."}
                    </span>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center gap-2 text-sm text-primary/80 bg-primary/10 p-3 rounded-xl border border-primary/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Account Wallet</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add Money
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border text-lg"
                />
              </div>
              
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-12 font-semibold text-lg"
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
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-secondary text-foreground border border-border"
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
          <Card className="border-border h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Transactions
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchTransactions} className="text-muted-foreground hover:text-primary">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
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
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-secondary border border-border hover:border-primary/20 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "DEPOSIT" ? "bg-primary/10" : "bg-destructive/10"
                    }`}>
                      {tx.type === "DEPOSIT" ? (
                        <ArrowDownRight className="w-6 h-6 text-primary" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-foreground">
                          {tx.type === "DEPOSIT" ? "Wallet Deposit" : tx.type}
                        </p>
                        <p className="font-bold text-lg">
                          ₹{tx.amount.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>ID: {tx.intentId?.slice(0, 8)}...</span>
                        </div>
                        {getStatusBadge(tx.status)}
                      </div>

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
