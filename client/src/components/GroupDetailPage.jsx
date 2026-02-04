import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import {
  connectSocket,
  joinGroup as socketJoinGroup,
  emitRuleAdded,
  emitSendMessage,
  onRuleAdded,
  onMemberJoined,
  onReceiveMessage,
  onFundsAdded,
  onExpenseLogged,
  removeListener
} from '../lib/socket';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [addFundsAmount, setAddFundsAmount] = useState('');
  const [addingFunds, setAddingFunds] = useState(false);
  const [fundsMessage, setFundsMessage] = useState('');

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await api.get(`/api/v1/groups/${groupId}`);
        setGroup(response.data.data);

        // Connect to socket and join the group room
        connectSocket();
        socketJoinGroup(groupId);
      } catch (err) {
        console.error('Error fetching group details:', err);
        setError(err.response?.data?.message || 'Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();

    // Define handlers for cleanup
    const handleRuleAdded = (data) => {
      setGroup(prevGroup => ({
        ...prevGroup,
        rules: [...(prevGroup.rules || []), data.rule]
      }));
      setMessages(prev => [...prev, {
        type: 'ruleAdded',
        content: `New rule added: ${data.rule.ruleType} - ${data.rule.ruleValue}`,
        timestamp: new Date().toLocaleString()
      }]);
    };

    const handleMemberJoined = (data) => {
      setGroup(prevGroup => ({
        ...prevGroup,
        members: [...(prevGroup.members || []), data.user]
      }));
      setMessages(prev => [...prev, {
        type: 'memberJoined',
        content: `${data.user.username || data.user.email} joined the group`,
        timestamp: new Date().toLocaleString()
      }]);
    };

    const handleReceiveMessage = (data) => {
      setMessages(prev => [...prev, {
        type: 'message',
        content: `${data.sender.name || data.sender.username}: ${data.message}`,
        timestamp: new Date().toLocaleString()
      }]);
    };

    const handleFundsAdded = (data) => {
      setGroup(prevGroup => ({
        ...prevGroup,
        pool: data.newPoolBalance,
        wallet: {
          ...prevGroup.wallet,
          balance: data.newWalletBalance
        }
      }));

      setMessages(prev => [...prev, {
        type: 'fundsAdded',
        content: `₹${data.amount} added to group`,
        timestamp: new Date().toLocaleString()
      }]);
    };

    const handleExpenseLogged = (data) => {
      setGroup(prevGroup => ({
        ...prevGroup,
        pool: data.pool,
        wallet: {
          ...prevGroup.wallet,
          balance: data.walletBalance
        },
        expenses: [...(prevGroup.expenses || []), data.expense]
      }));

      setMessages(prev => [...prev, {
        type: 'expenseLogged',
        content: `Expense: ${data.expense.description} - ₹${data.expense.amount}`,
        timestamp: new Date().toLocaleString()
      }]);
    };

    // Set up socket listeners
    onRuleAdded(handleRuleAdded);
    onMemberJoined(handleMemberJoined);
    onReceiveMessage(handleReceiveMessage);
    onFundsAdded(handleFundsAdded);
    onExpenseLogged(handleExpenseLogged);

    return () => {
      // Clean up socket listeners
      removeListener('ruleAdded', handleRuleAdded);
      removeListener('memberJoined', handleMemberJoined);
      removeListener('receiveMessage', handleReceiveMessage);
      removeListener('fundsAdded', handleFundsAdded);
      removeListener('expenseLogged', handleExpenseLogged);
    };
  }, [groupId]);

  const handleAddRule = async (e) => {
    e.preventDefault();

    if (!newRule.trim()) return;

    try {
      await api.post(`/groups/${groupId}/rules`, {
        ruleType: 'custom',
        ruleValue: newRule.trim(),
        description: `Rule: ${newRule.trim()}`
      });

      setNewRule('');
      // The rule will be reflected via socket update
    } catch (err) {
      console.error('Error adding rule:', err);
      alert(err.response?.data?.message || 'Failed to add rule');
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    emitSendMessage({
      groupId,
      message: newMessage.trim(),
      sender: {
        name: 'Current User', // In a real app, this would come from user context
        email: 'current@example.com'
      }
    });

    setNewMessage('');
  };

  const handleAddFunds = async () => {
    if (!addFundsAmount || isNaN(addFundsAmount) || Number(addFundsAmount) <= 0) {
      setFundsMessage("Enter a valid amount");
      return;
    }

    try {
      setAddingFunds(true);
      setFundsMessage("");

      const res = await api.post(
        `/api/v1/groups/${groupId}/add-funds`,
        { amount: Number(addFundsAmount) },
        { withCredentials: true }
      );

      // Update the group data with the new balance
      setGroup(prevGroup => ({
        ...prevGroup,
        pool: res.data.data.groupPool,
        wallet: {
          ...prevGroup.wallet,
          balance: res.data.data.groupWalletBalance
        }
      }));

      setFundsMessage("Funds added successfully");
      setAddFundsAmount("");
    } catch (err) {
      console.error('Error adding funds:', err);
      setFundsMessage(err.response?.data?.message || "Something went wrong");
    } finally {
      setAddingFunds(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg relative" role="alert">
          <span className="block sm:inline">Group not found</span>
        </div>
      </div>
    );
  }

  const MembersList = () => (
    <div className="space-y-3">
      {group.members?.map((member) => (
        <div key={member._id} className="flex items-center p-3 border rounded-lg bg-card">
          <div className="bg-muted border-2 border-dashed rounded-xl w-10 h-10 shrink-0" />
          <div className="ml-3 min-w-0">
            <p className="font-medium text-foreground truncate">{member.username || member.email}</p>
            {member._id === group.owner?._id && (
              <Badge variant="secondary" className="text-[10px]">Owner</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const RulesSection = () => (
    <div className="space-y-4">
      <form onSubmit={handleAddRule} className="flex gap-2">
        <Input
          type="text"
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          placeholder="Add a new rule..."
          className="flex-1"
        />
        <Button type="submit">Add</Button>
      </form>

      <div className="space-y-3">
        {group.rules?.map((rule, index) => (
          <div key={index} className="p-3 bg-muted/50 rounded-lg border">
            <p className="font-medium text-foreground">{rule.ruleType}</p>
            <p className="text-sm text-muted-foreground">{rule.ruleValue}</p>
            {rule.description && (
              <p className="text-xs text-muted-foreground/80 mt-1">{rule.description}</p>
            )}
          </div>
        ))}

        {(!group.rules || group.rules.length === 0) && (
          <p className="text-muted-foreground italic text-sm text-center py-4">No rules added yet</p>
        )}
      </div>
    </div>
  );

  const ActivityFeed = () => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      {messages.length > 0 ? (
        messages.map((msg, index) => (
          <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-sm text-foreground">{msg.content}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{msg.timestamp}</p>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground italic text-sm text-center py-10">No activity yet</p>
      )}
    </div>
  );

  const ChatAndExpenses = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        <h4 className="text-sm font-semibold mb-2">Recent Expenses</h4>
        {group.expenses?.slice(-5)?.reverse()?.map((expense, index) => (
          <div key={index} className="p-3 bg-muted/50 rounded-lg border">
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm text-foreground">{expense.description}</p>
              <p className="font-bold text-sm text-destructive">₹{expense.amount.toFixed(2)}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(expense.date).toLocaleDateString()}
            </p>
          </div>
        ))}

        {(!group.expenses || group.expenses.length === 0) && (
          <p className="text-muted-foreground italic text-xs text-center py-4">No expenses recorded yet</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Info */}
      <Card className="border-none shadow-none bg-transparent py-0">
        <CardHeader className="px-0">
          <CardTitle className="text-2xl md:text-3xl font-bold">{group.name}</CardTitle>
          <CardDescription className="text-base">{group.description}</CardDescription>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline">Created: {new Date(group.createdAt).toLocaleDateString()}</Badge>
            <Badge variant="outline">Owner: {group.owner?.username || group.owner?.email}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="py-4 border-blue-100 bg-blue-50/30">
          <CardContent className="py-0 flex flex-col items-center sm:items-start">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Balance</p>
            <p className="text-2xl font-bold text-blue-700">₹{group.wallet?.balance?.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>
        <Card className="py-4 border-green-100 bg-green-50/30">
          <CardContent className="py-0 flex flex-col items-center sm:items-start">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Members</p>
            <p className="text-2xl font-bold text-green-700">{group.members?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="py-4 border-purple-100 bg-purple-50/30">
          <CardContent className="py-0 flex flex-col items-center sm:items-start">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Rules</p>
            <p className="text-2xl font-bold text-purple-700">{group.rules?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Tabbed View / Desktop Grid View */}
      <div className="lg:hidden">
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid grid-cols-4 w-full h-10">
            <TabsTrigger value="activity">Feed</TabsTrigger>
            <TabsTrigger value="members">Users</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="funds">Funds</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Activity & Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="feed" className="w-full">
                  <TabsList className="grid grid-cols-2 mb-4">
                    <TabsTrigger value="feed">Feed</TabsTrigger>
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                  </TabsList>
                  <TabsContent value="feed">
                    <ActivityFeed />
                  </TabsContent>
                  <TabsContent value="chat">
                    <ChatAndExpenses />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Group Members</CardTitle>
              </CardHeader>
              <CardContent>
                <MembersList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Group Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <RulesSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funds" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Funds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="number"
                    value={addFundsAmount}
                    onChange={(e) => setAddFundsAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    onClick={handleAddFunds}
                    disabled={addingFunds}
                  >
                    {addingFunds ? 'Processing...' : 'Add Funds'}
                  </Button>
                  {fundsMessage && (
                    <p className={`text-center text-sm font-medium ${fundsMessage.includes('successfully') ? 'text-green-600' : 'text-destructive'}`}>
                      {fundsMessage}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Grid Layout (Hidden on Mobile) */}
      <div className="hidden lg:grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Members & Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Members</h3>
                <MembersList />
              </section>
              <section>
                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Rules</h3>
                <RulesSection />
              </section>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Funds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={addFundsAmount}
                  onChange={(e) => setAddFundsAmount(e.target.value)}
                  placeholder="Amount"
                  className="max-w-[200px]"
                />
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={handleAddFunds}
                  disabled={addingFunds}
                >
                  {addingFunds ? 'Processing...' : 'Add Funds'}
                </Button>
              </div>
              {fundsMessage && (
                <p className={`mt-2 text-sm font-medium ${fundsMessage.includes('successfully') ? 'text-green-600' : 'text-destructive'}`}>
                  {fundsMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
              <CardTitle>Activity & Discussion</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 py-6">
               <Tabs defaultValue="feed" className="h-full flex flex-col">
                  <TabsList className="grid grid-cols-2 mb-6 w-full">
                    <TabsTrigger value="feed">Activity Feed</TabsTrigger>
                    <TabsTrigger value="chat">Chat & Expenses</TabsTrigger>
                  </TabsList>
                  <TabsContent value="feed" className="flex-1">
                    <ActivityFeed />
                  </TabsContent>
                  <TabsContent value="chat" className="flex-1">
                    <ChatAndExpenses />
                  </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailPage;