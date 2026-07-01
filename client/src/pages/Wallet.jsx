import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Plus,
  Send,
  Download,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const transactions = [
  { id: 1, type: "credit", title: "Pool Contribution", group: "Weekend Trip", amount: 200, date: "2025-01-18", status: "completed" },
  { id: 2, type: "debit", title: "Expense Settlement", group: "Roommates", amount: 65, date: "2025-01-17", status: "completed" },
  { id: 3, type: "credit", title: "Payment Received", group: "Office Lunch", amount: 45, date: "2025-01-16", status: "completed" },
  { id: 4, type: "debit", title: "Group Payment", group: "Family", amount: 150, date: "2025-01-15", status: "pending" },
  { id: 5, type: "credit", title: "Refund", group: "Weekend Trip", amount: 30, date: "2025-01-14", status: "completed" },
];

const linkedCards = [
  { id: 1, type: "visa", last4: "4242", expiry: "12/26", name: "Alex Johnson" },
  { id: 2, type: "mastercard", last4: "8888", expiry: "08/25", name: "Alex Johnson" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function WalletPage() {
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);
  const walletId = "CPR-2025-ALEX-7892";
  const balance = 12450.00;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">My Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your funds and transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-border hover:bg-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            className="text-primary-foreground"
            style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Funds
          </Button>
        </div>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border overflow-hidden relative">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <CardContent className="p-6 lg:p-8 relative">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="w-5 h-5" />
                  <span>Total Balance</span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-1 hover:bg-secondary rounded-lg transition-colors"
                  >
                    {showBalance ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="text-4xl lg:text-5xl font-bold">
                  {showBalance ? (
                    <>
                      <span className="text-muted-foreground">$</span>
                      {balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </>
                  ) : (
                    "••••••"
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-primary text-sm">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>+$2,340 this month</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary">
                  <span className="text-sm text-muted-foreground">Wallet ID:</span>
                  <code className="text-sm font-mono">{walletId}</code>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-secondary rounded-lg transition-colors"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span className="font-medium">Send</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="font-medium">Receive</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={item}>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Income</p>
                  <p className="text-lg font-bold text-primary">$4,500</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold text-destructive">$2,160</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Linked Cards</p>
                  <p className="text-lg font-bold">{linkedCards.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pool Funds</p>
                  <p className="text-lg font-bold">$3,890</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="w-full justify-start bg-secondary border border-border p-1 rounded-xl">
          <TabsTrigger
            value="transactions"
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg"
          >
            Transactions
          </TabsTrigger>
          <TabsTrigger
            value="cards"
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg"
          >
            Linked Cards
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-6">
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              {transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary transition-colors"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      transaction.type === "credit"
                        ? "bg-primary/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {transaction.type === "credit" ? (
                      <ArrowDownRight className="w-6 h-6 text-primary" />
                    ) : (
                      <ArrowUpRight className="w-6 h-6 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{transaction.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.group} • {transaction.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === "credit"
                          ? "text-primary"
                          : "text-destructive"
                      }`}
                    >
                      {transaction.type === "credit" ? "+" : "-"}$
                      {transaction.amount}
                    </p>
                    <p
                      className={`text-xs ${
                        transaction.status === "completed"
                          ? "text-primary"
                          : "text-yellow-400"
                      }`}
                    >
                      {transaction.status}
                    </p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cards Tab */}
        <TabsContent value="cards" className="mt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {linkedCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-border overflow-hidden">
                  <CardContent className="p-6 relative">
                    <div className="absolute top-4 right-4">
                      {card.type === "visa" ? (
                        <span className="text-2xl font-bold italic text-foreground/50">
                          VISA
                        </span>
                      ) : (
                        <span className="text-xl font-bold text-foreground/50">
                          MC
                        </span>
                      )}
                    </div>
                    <div className="space-y-6">
                      <CreditCard className="w-10 h-10 text-primary" />
                      <div className="space-y-1">
                        <p className="text-2xl font-mono tracking-wider">
                          •••• •••• •••• {card.last4}
                        </p>
                        <p className="text-sm text-muted-foreground">{card.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {card.expiry}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Add Card Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-full rounded-2xl border-2 border-dashed border-border hover:border-primary/20 flex flex-col items-center justify-center gap-3 transition-colors"
              style={{ minHeight: "200px" }}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="font-medium text-muted-foreground">Add New Card</span>
            </motion.button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
