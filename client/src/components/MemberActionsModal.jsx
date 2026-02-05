import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Wallet, CreditCard, ArrowDownUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MemberActionsModal = ({ member, balance, groupId, onClose, onAction }) => {
  const [actionType, setActionType] = useState(null); // 'takeCredits' or 'addFunds'
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!actionType) {
      setError('Please select an action');
      return;
    }

    if (actionType === 'takeCredits' && (!amount || parseFloat(amount) <= 0)) {
      setError('Please enter a valid amount to withdraw');
      return;
    }

    if (actionType === 'addFunds' && (!amount || parseFloat(amount) <= 0)) {
      setError('Please enter a valid amount to add');
      return;
    }

    // if (actionType === 'takeCredits' && parseFloat(amount) > balance) {
    //   setError(`Amount exceeds available balance of ₹${balance.toFixed(2)}`);
    //   return;
    // }

    setLoading(true);
    setError('');

    try {
      // Call the appropriate API based on action type
      await onAction({
        actionType,
        amount: parseFloat(amount),
        memberId: member._id
      });

      // Close the modal after successful action
      onClose();
    } catch (err) {
      console.error('Error performing action:', err);
      setError(err.response?.data?.message || 'Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass-card border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Actions for {member.username || member.email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-300 mb-1">Current Balance</p>
            <p className="text-xl font-bold text-emerald-400">₹{balance.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Available for withdrawal</p>
          </div>

          <div className="space-y-3">
            <Label>Action Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={actionType === 'takeCredits' ? 'default' : 'outline'}
                className={`flex flex-col items-center p-3 ${actionType === 'takeCredits' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600'}`}
                onClick={() => setActionType('takeCredits')}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-xs">Take Credits</span>
              </Button>
              <Button
                type="button"
                variant={actionType === 'addFunds' ? 'default' : 'outline'}
                className={`flex flex-col items-center p-3 ${actionType === 'addFunds' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600'}`}
                onClick={() => setActionType('addFunds')}
              >
                <ArrowDownUp className="w-5 h-5 mb-1" />
                <span className="text-xs">Add Funds</span>
              </Button>
            </div>
          </div>

          {actionType && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-10 h-12 bg-white/5 border-white/10"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberActionsModal;