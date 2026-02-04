import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, User, IndianRupee, Copy, Divide } from 'lucide-react';
import api from '@/api/axios';

const CreateSharedExpense = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [participants, setParticipants] = useState([
    { id: Date.now(), name: '', sharePercentage: '', shareAmount: '' }
  ]);
  const [equalSplit, setEqualSplit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const addParticipant = () => {
    setParticipants([
      ...participants,
      { id: Date.now(), name: '', sharePercentage: '', shareAmount: '' }
    ]);
  };

  const removeParticipant = (id) => {
    if (participants.length <= 1) return;
    setParticipants(participants.filter(p => p.id !== id));
  };

  const updateParticipant = (id, field, value) => {
    const updatedParticipants = participants.map(p => {
      if (p.id === id) {
        // Prevent negative values for percentage and amount
        let sanitizedValue = value;
        if (field === 'sharePercentage' || field === 'shareAmount') {
          const numValue = parseFloat(value) || 0;
          sanitizedValue = Math.max(0, numValue).toString(); // Ensure non-negative
        }

        const updated = { ...p, [field]: sanitizedValue };

        // If updating percentage, calculate amount
        if (field === 'sharePercentage' && totalAmount) {
          const percentage = parseFloat(sanitizedValue) || 0;
          updated.shareAmount = ((percentage / 100) * parseFloat(totalAmount)).toFixed(2);
        }
        // If updating amount, calculate percentage
        else if (field === 'shareAmount' && totalAmount) {
          const amount = parseFloat(sanitizedValue) || 0;
          updated.sharePercentage = ((amount / parseFloat(totalAmount)) * 100).toFixed(2);
        }

        return updated;
      }
      return p;
    });

    setParticipants(updatedParticipants);
  };

  const calculateTotalPercentage = () => {
    return participants.reduce((sum, p) => sum + (parseFloat(p.sharePercentage) || 0), 0);
  };

  const applyEqualSplit = () => {
    if (!totalAmount || participants.length === 0) return;

    const totalPeople = participants.length + 1; // +1 for the creator
    const percentagePerPerson = Math.max(0, (100 / totalPeople)).toFixed(2);
    const amountPerPerson = Math.max(0, (parseFloat(totalAmount) / totalPeople)).toFixed(2);

    const updatedParticipants = participants.map(p => ({
      ...p,
      sharePercentage: percentagePerPerson,
      shareAmount: amountPerPerson
    }));

    setParticipants(updatedParticipants);
    setEqualSplit(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setError('Valid total amount is required');
      return;
    }

    if (!creatorName.trim()) {
      setError('Creator name is required');
      return;
    }

    if (!creatorEmail.trim()) {
      setError('Creator email is required');
      return;
    }

    // Validate participants
    for (const p of participants) {
      if (!p.name.trim()) {
        setError('All participants must have a name');
        return;
      }
      if (!p.sharePercentage || parseFloat(p.sharePercentage) < 0) {
        setError('All participants must have a non-negative share percentage');
        return;
      }
    }

    // Check if percentages sum to 100% and ensure creator percentage is not negative
    const totalParticipantPercentage = calculateTotalPercentage();
    const creatorPercentage = 100 - totalParticipantPercentage;

    if (creatorPercentage < 0) {
      setError('Total participant percentages exceed 100%. Please adjust percentages so the total does not exceed 100%.');
      return;
    }

    try {
      // Add creator as a participant
      const allParticipants = [
        ...participants,
        {
          name: creatorName.trim(),
          sharePercentage: parseFloat(Math.max(0, creatorPercentage).toFixed(2)),
          shareAmount: parseFloat(Math.max(0, (creatorPercentage / 100) * parseFloat(totalAmount)).toFixed(2))
        }
      ];

      const expenseData = {
        title: title.trim(),
        description: description.trim(),
        totalAmount: parseFloat(totalAmount),
        creatorName: creatorName.trim(),
        creatorEmail: creatorEmail.trim(),
        participants: allParticipants
      };

      const response = await api.post('/shared-expenses/create', expenseData);

      setSuccess(true);
      setShareLink(`${window.location.origin}/shared-expense/${response.data.data.shareLink}`);
    } catch (err) {
      console.error('Error creating shared expense:', err);
      setError(err.response?.data?.message || 'Failed to create shared expense');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="bg-green-900/20 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              Expense Created Successfully!
            </CardTitle>
            <CardDescription className="text-green-300">
              Your expense details have been created and are ready to share
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Share this link with others:</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareLink}
                    className="flex-1 bg-gray-700/50 text-gray-200"
                  />
                  <Button
                    onClick={copyToClipboard}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1 border-gray-600"
                >
                  Back Home
                </Button>
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setShareLink('');
                    setTitle('');
                    setDescription('');
                    setTotalAmount('');
                    setCreatorName('');
                    setCreatorEmail('');
                    setParticipants([{ id: Date.now(), name: '', email: '', sharePercentage: '', shareAmount: '' }]);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Create Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="w-6 h-6" />
            Create Shared Expense
          </CardTitle>
          <CardDescription>Split expenses with others and share the details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Expense Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Dinner, Rent, Groceries"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₹) *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => {
                    setTotalAmount(e.target.value);
                    // Recalculate amounts for all participants
                    const updatedParticipants = participants.map(p => {
                      if (e.target.value) {
                        const percentage = parseFloat(p.sharePercentage) || 0;
                        return {
                          ...p,
                          shareAmount: ((percentage / 100) * parseFloat(e.target.value)).toFixed(2)
                        };
                      }
                      return p;
                    });
                    setParticipants(updatedParticipants);
                  }}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this expense is for"
              />
            </div>

            {/* Creator Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creatorName">Your Name *</Label>
                <Input
                  id="creatorName"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creatorEmail">Your Email *</Label>
                <Input
                  id="creatorEmail"
                  type="email"
                  value={creatorEmail}
                  onChange={(e) => setCreatorEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Participants *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={applyEqualSplit}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Divide className="w-4 h-4 mr-1" />
                    Equal Split
                  </Button>
                  <Button type="button" onClick={addParticipant} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Participant
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div key={participant.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Input
                        value={participant.name}
                        onChange={(e) => updateParticipant(participant.id, 'name', e.target.value)}
                        placeholder="Name"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={participant.sharePercentage}
                        onChange={(e) => updateParticipant(participant.id, 'sharePercentage', e.target.value)}
                        type="number"
                        placeholder="%"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={participant.shareAmount}
                        onChange={(e) => updateParticipant(participant.id, 'shareAmount', e.target.value)}
                        type="number"
                        placeholder="₹"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      {participants.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeParticipant(participant.id)}
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Creator row */}
                <div className="grid grid-cols-12 gap-2 items-end bg-gray-800/20 p-3 rounded-lg">
                  <div className="col-span-5">
                    <Input
                      value={creatorName}
                      readOnly
                      placeholder="Creator (you)"
                      className="bg-gray-700/30"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={Math.max(0, 100 - calculateTotalPercentage()).toFixed(2)}
                      readOnly
                      placeholder="%"
                      className="bg-gray-700/30"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={Math.max(0, ((100 - calculateTotalPercentage()) / 100 * parseFloat(totalAmount || 0))).toFixed(2)}
                      readOnly
                      placeholder="₹"
                      className="bg-gray-700/30"
                    />
                  </div>
                  <div className="col-span-1">
                    <div className="h-9 w-9 flex items-center justify-center text-gray-500">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm text-gray-500">
                    Total Percentage: <span className={Math.abs(100 - (100 - calculateTotalPercentage())) < 0.01 ? 'text-green-500' : 'text-red-500'}>
                      100%
                    </span>
                    <br />
                    <span className="text-xs">
                      Participants: {calculateTotalPercentage()}%, Creator: {(100 - calculateTotalPercentage()).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Total Amount: ₹{totalAmount || '0.00'}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
              Create Shared Expense
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSharedExpense;