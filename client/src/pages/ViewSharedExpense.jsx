import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, User, Users, Mail } from 'lucide-react';
import api from '@/api/axios';

const ViewSharedExpense = () => {
  const { shareLink } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedExpense = async () => {
      try {
        const response = await api.get(`/shared-expenses/${shareLink}`);
        setExpense(response.data.data);
      } catch (err) {
        console.error('Error fetching shared expense:', err);
        setError(err.response?.data?.message || 'Failed to load shared expense');
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-300">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Expense Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The shared expense link is invalid or no longer active.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <IndianRupee className="w-6 h-6" />
                {expense.title}
              </CardTitle>
              <CardDescription className="mt-1">
                Created by {expense.creatorName} ({expense.creatorEmail})
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg py-2 px-4">
              Total: ₹{expense.totalAmount.toFixed(2)}
            </Badge>
          </div>
          {expense.description && (
            <p className="text-gray-300 mt-2">{expense.description}</p>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Expense Breakdown
          </CardTitle>
          <CardDescription>
            How the total amount is divided among participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">Participant</th>
                  <th className="text-right py-3 px-4">Share %</th>
                  <th className="text-right py-3 px-4">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {expense.participants.map((participant, index) => (
                  <tr key={index} className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-emerald-400" />
                        </div>
                        {participant.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">{participant.sharePercentage}%</td>
                    <td className="py-3 px-4 text-right font-medium">₹{participant.shareAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center">
              <div className="text-lg font-medium">Total</div>
              <div className="text-lg font-bold text-emerald-400">₹{expense.totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Use This Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            <li>This expense breakdown shows how much each person owes</li>
            <li>Share this page with all participants to ensure transparency</li>
            <li>Payments can be settled directly between participants</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewSharedExpense;