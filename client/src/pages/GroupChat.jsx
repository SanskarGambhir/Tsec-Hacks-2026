import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  joinGroup as socketJoinGroup,
  leaveGroup as socketLeaveGroup,
  onNewMessage,
} from '../lib/socket';
import { useAuth } from '../context/AuthContext';
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

  // The signed-in user comes from the auth context rather than a localStorage
  // copy that could be stale or hand-edited.
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?._id;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        // The axios baseURL already ends in /api/v1; repeating it here produced
        // /api/v1/api/v1/... and a 404 on every load.
        const [groupRes, messageRes] = await Promise.all([
          api.get(`/groups/${groupId}`),
          api.get(`/groups/${groupId}/messages`, { params: { limit: 100 } }),
        ]);

        if (!active) return;
        setGroup(groupRes.data.data);
        setMessages(messageRes.data.data.messages || []);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Failed to load this chat');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    // The server refuses the room unless the caller is a member.
    socketJoinGroup(groupId).then((joined) => {
      if (active && !joined) {
        setError('You do not have access to this group chat');
      }
    });

    // Messages are persisted by the API, which then broadcasts them; listening
    // for the broadcast is what keeps every open tab in sync.
    const unsubscribe = onNewMessage((data) => {
      if (data.groupId !== groupId) return;
      setMessages((prev) => [...prev, data.message]);
    });

    return () => {
      active = false;
      unsubscribe();
      socketLeaveGroup(groupId);
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    // Clear straight away so the input feels responsive; restore it if the
    // send fails rather than losing what was typed.
    setNewMessage('');

    try {
      const { data } = await api.post(`/groups/${groupId}/messages`, { content });
      // The sender does not receive their own broadcast, so append locally.
      setMessages((prev) => [...prev, data.data.message]);
    } catch (err) {
      setNewMessage(content);
      setError(err.response?.data?.message || 'Failed to send message');
    }
  };

  const handleGoBack = () => {
    navigate('/groups');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
        <div className="bg-amber-50 border border-amber-300 text-amber-700 px-4 py-3 rounded-lg relative" role="alert">
          <span className="block sm:inline">Group not found</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">{group.name}</h1>
          <Button onClick={handleGoBack} variant="secondary" className="text-foreground">
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
                  const senderId = message.sender?._id || message.sender;
                  const isOwnMessage = senderId === currentUserId;

                  return (
                    <div
                      key={index}
                      className={`mb-3 p-3 rounded-lg max-w-[80%] ${isOwnMessage
                        ? 'bg-primary text-primary-foreground self-end ml-4'
                        : 'bg-secondary self-start mr-4'
                        }`}
                    >
                      <div className="font-medium text-[10px] mb-1 opacity-80">
                        {isOwnMessage ? 'You' : (message.sender?.username || message.sender?.email || 'User')}
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