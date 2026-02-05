import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  IndianRupee, 
  Wallet, 
  CreditCard, 
  ArrowDownUp, 
  ShieldAlert, 
  CalendarClock, 
  Percent,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MemberActionsModal = ({ member, balance, groupId, onClose, onAction }) => {
  const [actionType, setActionType] = useState(null); // 'takeCredits' or 'addFunds'
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleInitialConfirm = () => {
    setError('');
    if (!actionType) {
      setError('Please select an action type');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (actionType === 'takeCredits') {
      setShowTerms(true);
    } else {
      handleAction();
    }
  };

  const handleAction = async () => {
    if (actionType === 'takeCredits' && !agreed) {
      setError('You must agree to the terms and conditions');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAction({
        actionType,
        amount: parseFloat(amount),
        memberId: member._id
      });
      onClose();
    } catch (err) {
      console.error('Error performing action:', err);
      setError(err.response?.data?.message || 'Failed to perform action');
      setShowTerms(false); // Go back to fix amount/type if error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/10 max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              Member Actions
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {!showTerms ? (
              <motion.div
                key="main-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Member Info Card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                    {(member.username || member.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{member.username || member.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                        Balance: ₹{balance.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action Type Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Action Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActionType('takeCredits')}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group ${
                        actionType === 'takeCredits' 
                        ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                        : 'bg-white/5 border-white/10 hover:border-emerald-500/30'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 mb-2 transition-colors ${actionType === 'takeCredits' ? 'text-emerald-400' : 'text-gray-500 group-hover:text-emerald-400'}`} />
                      <span className={`text-sm font-bold ${actionType === 'takeCredits' ? 'text-white' : 'text-gray-400'}`}>Take Credits</span>
                    </button>
                    
                    <button
                      onClick={() => setActionType('addFunds')}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group ${
                        actionType === 'addFunds' 
                        ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/10' 
                        : 'bg-white/5 border-white/10 hover:border-blue-500/30'
                      }`}
                    >
                      <ArrowDownUp className={`w-6 h-6 mb-2 transition-colors ${actionType === 'addFunds' ? 'text-blue-400' : 'text-gray-500 group-hover:text-blue-400'}`} />
                      <span className={`text-sm font-bold ${actionType === 'addFunds' ? 'text-white' : 'text-gray-400'}`}>Add Funds</span>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <Label htmlFor="amount" className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Amount</Label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-emerald-400 font-bold border-r border-white/10 pr-3 mr-3">
                      ₹
                    </div>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-14 h-14 bg-white/5 border-white/10 text-xl font-bold tracking-tight rounded-2xl focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="flex-1 h-12 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInitialConfirm}
                    className="flex-1 h-12 rounded-xl text-black font-bold shadow-lg"
                    style={{ background: "linear-gradient(90deg, #4ade80, #22c55e)" }}
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="terms-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-yellow-500 font-bold text-sm uppercase tracking-widest">
                    <ShieldAlert className="w-4 h-4" />
                    Credit Terms & Conditions
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-yellow-500" />
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        The user is solely responsible for <span className="text-white font-bold">full repayment</span> of the credits withdrawn.
                      </p>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <CalendarClock className="w-3 h-3 text-yellow-500" />
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Repayment is due within <span className="text-white font-bold">10 days</span> from the date of withdrawal.
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <Percent className="w-3 h-3 text-yellow-500" />
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        An interest rate of <span className="text-white font-bold">6%</span> will be applied to the principal amount.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-yellow-500/10 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          className="peer appearance-none w-5 h-5 rounded-md border-2 border-yellow-500/30 bg-white/5 checked:bg-yellow-500 checked:border-yellow-500 transition-all cursor-pointer"
                        />
                        <Check className="absolute w-3.5 h-3.5 text-black left-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors select-none">
                        I understand and agree to the repayment terms and interest policy.
                      </span>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowTerms(false)}
                    className="flex-1 h-12 rounded-xl text-gray-400 hover:text-white"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleAction}
                    disabled={!agreed || loading}
                    className="flex-2 h-12 rounded-xl text-black font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: agreed ? "linear-gradient(90deg, #eab308, #ca8a04)" : "#333" }}
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      'Accept & Withdraw'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function Check(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshCw(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

export default MemberActionsModal;