import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  IndianRupee, 
  Users, 
  Receipt, 
  Calendar,
  User,
  PieChart,
  ChevronRight,
  ShieldCheck,
  Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

export default function ViewSharedExpense() {
  const { shareLink } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSharedExpense = async () => {
      try {
        const baseURL = import.meta.env.VITE_SERVER_URL;
        const response = await axios.get(`${baseURL}shared-expenses/${shareLink}`);
        setExpense(response.data.data);
      } catch (err) {
        console.error("Error fetching shared expense:", err);
        setError("This shared expense link is invalid or no longer active.");
      } finally {
        setLoading(false);
      }
    };

    if (shareLink) {
      fetchSharedExpense();
    }
  }, [shareLink]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center p-4 text-center">
        <Card className="border-red-500/20 max-w-md">
          <CardContent className="p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Receipt className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Split Not Found</h1>
            <p className="text-muted-foreground">{error || "Could not find expense details."}</p>
            <button 
              onClick={() => window.location.href = "/"}
              className="mt-4 px-6 py-2 bg-secondary border border-border rounded-xl hover:bg-secondary transition-colors"
            >
              Return Home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] p-4 md:p-12">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Branding */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="font-black text-primary-foreground text-xl italic">C</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-foreground tracking-tighter leading-none">COOPER</span>
              <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase leading-none mt-1">Split Explorer</span>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-border overflow-hidden relative shadow-2xl">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            
            <CardHeader className="p-8 md:p-10 pb-6 relative border-b border-border bg-white/[0.02]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs uppercase font-bold tracking-wider">
                      Shared Receipt
                    </Badge>
                  </div>
                  <CardTitle className="text-4xl font-black text-foreground leading-tight">{expense.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(expense.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end">
                   <p className="text-xs text-muted-foreground uppercase font-black tracking-widest mb-1">Total Amount</p>
                   <div className="flex items-baseline gap-1 text-5xl font-black text-foreground">
                      <span className="text-2xl text-primary">₹</span>
                      <span>{expense.totalAmount.toLocaleString()}</span>
                   </div>
                </div>
              </div>

              {expense.description && (
                <div className="mt-6 p-4 rounded-xl border border-border text-gray-300 italic text-sm">
                  "{expense.description}"
                </div>
              )}
            </CardHeader>

            <CardContent className="p-8 md:p-10 space-y-10 relative">
              {/* Creator Card */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-border group hover:border-primary/20 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-primary uppercase tracking-widest mb-0.5">Organized By</p>
                  <h3 className="text-xl font-bold text-foreground">{expense.creatorName}</h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Mail className="w-3 h-3" />
                    {expense.creatorEmail}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <ShieldCheck className="w-6 h-6 text-primary/30" />
                </div>
              </div>

              {/* Shares Table */}
              <div className="space-y-5">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                    <PieChart className="w-4 h-4 text-primary" />
                    Share Distribution
                  </div>
                  <div className="text-[10px] font-bold text-gray-600 uppercase">
                    {expense.participants.length} Members
                  </div>
                </div>
                
                <div className="grid gap-3">
                  {expense.participants.map((participant, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + (idx * 0.05) }}
                      className="group flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-border hover:bg-white/[0.04] hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary font-bold border border-border group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-200 group-hover:text-foreground transition-colors">{participant.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-secondary border-border text-muted-foreground">
                              {participant.sharePercentage}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-black text-foreground tracking-tighter group-hover:text-primary transition-colors">
                          <span className="text-sm font-bold text-primary/50 mr-0.5">₹</span>
                          {participant.shareAmount.toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer / Call to Action */}
              <div className="pt-10 border-t border-border">
                <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-3xl p-8 text-center space-y-6 border border-border">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-foreground">Want to simplify your splits?</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                      Join Cooper to track group expenses, settle balances via UPI, and manage your finances with AI.
                    </p>
                  </div>
                  <button 
                    className="group relative inline-flex items-center justify-center px-10 py-4 font-black text-primary-foreground transition-all duration-200 bg-emerald-400 rounded-2xl hover:bg-emerald-300 active:scale-95 shadow-xl shadow-emerald-500/20"
                    onClick={() => window.location.href = "/signup"}
                  >
                    Get Started Free
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legal / Info Footer */}
        <div className="flex flex-col items-center gap-4 text-gray-600 py-8">
           <p className="text-xs font-bold tracking-widest uppercase opacity-50 flex items-center gap-2">
             <ShieldCheck className="w-3 h-3" />
             Secure Data Hosting
           </p>
           <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
             <a href="#" className="hover:text-primary transition-colors">Terms</a>
             <a href="#" className="hover:text-primary transition-colors">Privacy</a>
             <a href="#" className="hover:text-primary transition-colors">Help</a>
           </div>
        </div>
      </div>
    </div>
  );
}
