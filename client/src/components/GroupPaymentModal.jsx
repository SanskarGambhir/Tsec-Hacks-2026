import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, User, IndianRupee, Divide, Wallet, Scan } from 'lucide-react';
import api from '@/api/axios';
import BillScannerModal from '../pages/BillScanner';

const GroupPaymentModal = ({ group, onClose, onSuccess }) => {
  const [showBillScanner, setShowBillScanner] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [divisionMethod, setDivisionMethod] = useState('even'); // 'even', 'exclude', 'custom'
  const [excludedMembers, setExcludedMembers] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize custom amounts when members change
  useEffect(() => {
    if (group?.members) {
      const initialCustomAmounts = {};
      group.members.forEach(member => {
        initialCustomAmounts[member._id] = '';
      });
      setCustomAmounts(initialCustomAmounts);
    }
  }, [group]);

  // If bill scanner is open, render it instead (AFTER all hooks)
  if (showBillScanner) {
    return (
      <BillScannerModal
        group={group}
        onClose={() => setShowBillScanner(false)}
        onSuccess={onSuccess}
      />
    );
  }

  const toggleExcludeMember = (memberId) => {
    if (excludedMembers.includes(memberId)) {
      setExcludedMembers(excludedMembers.filter(id => id !== memberId));
    } else {
      setExcludedMembers([...excludedMembers, memberId]);
    }
  };

  const handleCustomAmountChange = (memberId, value) => {
    setCustomAmounts({
      ...customAmounts,
      [memberId]: value
    });
  };

  const calculateEvenSplit = () => {
    if (!paymentAmount || !group?.members) return 0;

    const eligibleMembers = group.members.filter(member => !excludedMembers.includes(member._id));
    return parseFloat(paymentAmount) / eligibleMembers.length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        setError('Payment amount is required and must be greater than 0');
        setLoading(false);
        return;
      }

      if (!paymentDescription.trim()) {
        setError('Payment description is required');
        setLoading(false);
        return;
      }

      // Prepare the expense data based on division method
      let expenseData = {
        amount: parseFloat(paymentAmount),
        description: paymentDescription.trim(),
        divisionMethod,
        groupId: group._id
      };

      if (divisionMethod === 'exclude') {
        expenseData.excludedMembers = excludedMembers;
      } else if (divisionMethod === 'custom') {
        // Validate custom amounts
        const totalCustomAmount = Object.values(customAmounts).reduce((sum, val) => {
          const numVal = parseFloat(val) || 0;
          return sum + numVal;
        }, 0);

        if (Math.abs(totalCustomAmount - parseFloat(paymentAmount)) > 0.01) {
          setError(`Custom amounts must sum to the payment amount (₹${paymentAmount}). Current total: ₹${totalCustomAmount.toFixed(2)})`);
          setLoading(false);
          return;
        }

        expenseData.customAmounts = customAmounts;
      }

      // Call the API to process the group payment
      const response = await api.post(`/group-payments/${group._id}/process-payment`, expenseData, {
        withCredentials: true
      });

      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Error processing group payment:', err);
      setError(err.response?.data?.message || 'Failed to process group payment');
    } finally {
      setLoading(false);
    }
  };

  const evenSplitAmount = divisionMethod === 'even' || divisionMethod === 'exclude' ? calculateEvenSplit() : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700 my-8 max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Process Group Payment
              </CardTitle>
              <CardDescription>
                Pay from group wallet and divide the expense among members
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1">
          {/* Scan Bill Option */}
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <Scan className="w-5 h-5 text-emerald-400" />
                  Scan Bill with AI
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Upload and automatically split a bill using AI
                </p>
              </div>
              <Button
                onClick={() => setShowBillScanner(true)}
                className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
              >
                <Scan className="w-4 h-4 mr-2" />
                Scan Bill
              </Button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-500">Or enter manually</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount (₹) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDescription">Description *</Label>
                <Input
                  id="paymentDescription"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  placeholder="What is this payment for?"
                />
              </div>
            </div>

            {/* Division Method */}
            <div className="space-y-4">
              <Label>How to divide the expense?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={divisionMethod === 'even' ? 'default' : 'outline'}
                  className={`flex flex-col items-center p-3 sm:p-4 ${divisionMethod === 'even' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600'}`}
                  onClick={() => setDivisionMethod('even')}
                >
                  <span className="text-xs">Even Split</span>
                </Button>
                <Button
                  type="button"
                  variant={divisionMethod === 'exclude' ? 'default' : 'outline'}
                  className={`flex flex-col items-center p-3 sm:p-4 ${divisionMethod === 'exclude' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600'}`}
                  onClick={() => setDivisionMethod('exclude')}
                >
                  <span className="text-xs">Exclude Some</span>
                </Button>
                <Button
                  type="button"
                  variant={divisionMethod === 'custom' ? 'default' : 'outline'}
                  className={`flex flex-col items-center p-3 sm:p-4 ${divisionMethod === 'custom' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-gray-600'}`}
                  onClick={() => setDivisionMethod('custom')}
                >
                  <span className="text-xs">Custom Amounts</span>
                </Button>
              </div>
            </div>

            {/* Members List - for exclude and even split */}
            {(divisionMethod === 'even' || divisionMethod === 'exclude') && (
              <div className="space-y-2">
                <Label>Members to include/exclude</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {group?.members?.map((member) => (
                    <div
                      key={member._id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${excludedMembers.includes(member._id)
                        ? 'bg-red-500/20 border border-red-500/30'
                        : 'bg-gray-800/50 hover:bg-gray-800'
                        }`}
                      onClick={() => toggleExcludeMember(member._id)}
                    >
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.username || member.email}</p>
                        {divisionMethod === 'even' && !excludedMembers.includes(member._id) && (
                          <p className="text-sm text-gray-400">₹{evenSplitAmount.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {excludedMembers.includes(member._id) ? (
                          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                            <X className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-transparent"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {divisionMethod === 'even' && (
                  <div className="p-3 bg-gray-800/50 rounded-lg mt-2">
                    <p className="text-sm text-gray-300">
                      Each included member pays: ₹{evenSplitAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Custom Amounts */}
            {divisionMethod === 'custom' && (
              <div className="space-y-2">
                <Label>Set custom amounts for each member</Label>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {group?.members?.map((member) => (
                    <div key={member._id} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.username || member.email}</p>
                      </div>
                      <div className="w-24 sm:w-32 flex-shrink-0">
                        <Input
                          type="number"
                          value={customAmounts[member._id] || ''}
                          onChange={(e) => handleCustomAmountChange(member._id, e.target.value)}
                          placeholder="₹0.00"
                          min="0"
                          step="0.01"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
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
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-600"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process Payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupPaymentModal;