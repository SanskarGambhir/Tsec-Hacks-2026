import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  connectSocket,
  joinGroup as socketJoinGroup,
  leaveGroup as socketLeaveGroup,
  emitSendMessage,
  onNewMessage,
  onReceiveMessage,
  removeListener
} from '../lib/socket';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const GroupChat = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Get current user from localStorage - handling potential { user: { _id: ... } } structure
  const userData = JSON.parse(localStorage.getItem('user'));
  const currentUser = userData?.data?.user || userData;
  const currentUserId = currentUser?._id;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Fetch group details
    const fetchGroupDetails = async () => {
      try {
        const response = await api.get(`/api/v1/groups/${groupId}`);
        setGroup(response.data.data);

        // Load messages
        setMessages(response.data.data.messages || []);
      } catch (err) {
        console.error('Error fetching group details:', err);
        setError(err.response?.data?.message || 'Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();

    // Connect to socket and join the group room
    connectSocket();
    socketJoinGroup(groupId);

    // Define message handler
    const handleMessageReceived = (data) => {
      setMessages(prev => [...prev, {
        content: data.message.content,
        sender: data.message.sender,
        timestamp: data.message.timestamp
      }]);
    };

    // Set up socket listener for new messages
    onNewMessage(handleMessageReceived);
    onReceiveMessage(handleMessageReceived);

    return () => {
      // Clean up socket listeners and leave group room
      removeListener('newMessage', handleMessageReceived);
      removeListener('receiveMessage', handleMessageReceived);
      socketLeaveGroup(groupId);
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    try {
      // Send message via API
      await api.post(`/api/v1/groups/${groupId}/messages`, {
        content: newMessage.trim()
      }, { withCredentials: true });

      // Clear the input field
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  const handleGoBack = () => {
    navigate('/homepage');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
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

  console.log(messages);
  console.log(currentUserId);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">{group.name}</h1>
          <Button onClick={handleGoBack} variant="secondary" className="text-white">
            Back to Groups
          </Button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col container mx-auto p-4 max-w-4xl">
        <Card className="flex-1 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg">Group Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto mb-4 max-h-[60vh] p-2 flex flex-col">
              {messages.length > 0 ? (
                messages.map((message, index) => {
                  const isOwnMessage = message.sender._id === currentUserId || message.sender === currentUserId;

                  return (
                    <div
                      key={index}
                      className={`mb-3 p-3 rounded-lg max-w-[80%] ${isOwnMessage
                        ? 'bg-primary text-primary-foreground self-end ml-4'
                        : 'bg-secondary self-start mr-4'
                        }`}
                    >
                      <div className="font-medium text-[10px] mb-1 opacity-80">
                        {isOwnMessage ? 'You' : (message.sender.username || message.sender.email || 'User')}
                      </div>
                      <div className="break-words text-sm">{message.content}</div>
                      <div className="text-[9px] opacity-70 mt-1 text-right">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit">Send</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupChat;