import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  Users,
  User,
  ArrowRightLeft,
  Settings2,
  AlertCircle,
  ExternalLink,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const mockSplitwiseGroups = [
  { id: 101, name: "Goa Trip 2024", members: 5, balance: -450, status: "unsynced" },
  { id: 102, name: "Flatmates", members: 3, balance: 1200, status: "synced" },
  { id: 103, name: "Office Lunch", members: 8, balance: 0, status: "unsynced" },
];

const mockSplitwiseFriends = [
  { id: 201, name: "Rahul Sharma", balance: -200, avatar: "R" },
  { id: 202, name: "Sneha Kapoor", balance: 150, avatar: "S" },
  { id: 203, name: "Amit Patel", balance: 0, avatar: "A" },
];

export default function SplitwiseSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);

  const handleConnect = () => {
    setIsSyncing(true);
    // Simulate OAuth flow
    setTimeout(() => {
      setIsConnected(true);
      setIsSyncing(false);
    }, 2000);
  };

  const handleSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          setSyncedCount((c) => c + 1);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Splitwise Sync</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20">Beta</Badge>
          </div>
          <p className="text-muted-foreground">Import your Splitwise groups and settle debts effortlessly</p>
        </div>
        
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isSyncing}
            className="bg-[#5859f2] hover:bg-[#4a4bbd] text-foreground font-semibold h-12 px-6"
          >
            {isSyncing ? (
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Share2 className="w-5 h-5 mr-2" />
            )}
            Connect Splitwise
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing}
              className="border-primary/20 text-primary hover:bg-primary/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              Sync Data
            </Button>
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:bg-secondary"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>

      {!isConnected ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid place-items-center py-20"
        >
          <div className="text-center max-w-md space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-secondary border border-border flex items-center justify-center mx-auto mb-6">
              <Share2 className="w-12 h-12 text-[#5859f2]" />
            </div>
            <h2 className="text-2xl font-bold">Connect your accounts</h2>
            <p className="text-muted-foreground">
              Link your Splitwise account to Cooper to import your groups, expenses, and balances in one click.
            </p>
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Import all active groups
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Sync real-time balances
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                One-tap settlement via Cooper Wallet
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Groups */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Splitwise Groups
                  </CardTitle>
                  <CardDescription>Groups found on your Splitwise account</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">
                  Select All
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSyncing && (
                  <div className="space-y-2 mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-primary font-medium">Syncing groups...</span>
                      <span>{syncProgress}%</span>
                    </div>
                    <Progress value={syncProgress} className="h-2 bg-primary/10" />
                  </div>
                )}
                
                <div className="grid gap-4">
                  {mockSplitwiseGroups.map((group) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-secondary border border-border hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-200">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.members} members</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={`font-bold ${group.balance < 0 ? "text-destructive" : "text-primary"}`}>
                            {group.balance < 0 ? "-" : "+"}₹{Math.abs(group.balance)}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
                        </div>
                        {group.status === "synced" ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Synced
                          </Badge>
                        ) : (
                          <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">
                            Import
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    Pending Settlements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-red-500/10">
                    <span className="text-sm text-muted-foreground">Total Owed</span>
                    <span className="text-lg font-bold text-destructive">₹450</span>
                  </div>
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Settle via Cooper Wallet
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                    Auto-Sync
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Keep your Splitwise groups and Cooper groups in perfect harmony automatically.
                  </p>
                  <Button variant="outline" className="w-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10">
                    Enable Auto-Sync
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Friends */}
          <div className="lg:col-span-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" />
                  Splitwise Friends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockSplitwiseFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                        {friend.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{friend.name}</p>
                        <p className={`text-xs ${friend.balance < 0 ? "text-destructive" : friend.balance > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {friend.balance === 0 ? "Settled" : `${friend.balance < 0 ? "Owes you" : "You owe"} ₹${Math.abs(friend.balance)}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="link" className="w-full text-muted-foreground text-xs">
                  View all on Splitwise.com <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}