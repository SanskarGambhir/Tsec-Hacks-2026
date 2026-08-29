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
      <DialogContent className="border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Actions for {member.username || member.email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm text-foreground mb-1">Current Balance</p>
            <p className="text-xl font-bold text-primary">₹{balance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Available for withdrawal</p>
          </div>

          <AnimatePresence mode="wait">
            {!showTerms ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Action Type Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Action Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setActionType('takeCredits')}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group ${
                        actionType === 'takeCredits' 
                        ? 'bg-primary/20 border-primary/50 shadow-lg shadow-emerald-500/10' 
                        : 'bg-secondary border-border hover:border-primary/30'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 mb-2 transition-colors ${actionType === 'takeCredits' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                      <span className={`text-sm font-bold ${actionType === 'takeCredits' ? 'text-foreground' : 'text-muted-foreground'}`}>Take Credits</span>
                    </button>
                    
                    <button
                      onClick={() => setActionType('addFunds')}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 group ${
                        actionType === 'addFunds' 
                        ? 'bg-primary/20 border-primary/50 shadow-lg shadow-blue-500/10' 
                        : 'bg-secondary border-border hover:border-primary/30'
                      }`}
                    >
                      <ArrowDownUp className={`w-6 h-6 mb-2 transition-colors ${actionType === 'addFunds' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                      <span className={`text-sm font-bold ${actionType === 'addFunds' ? 'text-foreground' : 'text-muted-foreground'}`}>Add Funds</span>
                    </button>
                  </div>
                </div>

                {actionType && (
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="pl-10 h-12 bg-secondary border-border"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button 
                  onClick={handleInitialConfirm}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                >
                  Continue
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="terms"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 bg-yellow-500/10 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-600">Terms & Conditions</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        By withdrawing credits, you agree that this action cannot be undone. 
                        The selected amount will be transferred.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input 
                      type="checkbox" 
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-secondary text-amber-600 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-foreground">I agree to the terms and conditions</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowTerms(false)}
                    className="flex-1 h-12 rounded-xl text-muted-foreground hover:text-foreground"
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