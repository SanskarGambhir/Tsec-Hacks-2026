import React, { useState, useEffect } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinGroup,
  leaveGroup,
  emitRuleAdded,
  emitMemberJoined,
  emitMemberLeft,
  emitSendMessage,
  onRuleAdded,
  onMemberJoined,
  onMemberLeft,
  onReceiveMessage,
  removeListener
} from '../lib/socket';

const SocketTestComponent = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState('');
  const [messages, setMessages] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Connect to socket when component mounts
    const socket = connectSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id);
      addMessage(`Connected with ID: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setSocketId('');
      addMessage('Disconnected from server');
    });

    // Listen for custom events from server
    socket.on('message', (data) => {
      addMessage(`Received: ${data}`);
    });

    // Listen for rule added events
    onRuleAdded((data) => {
      addMessage(`Rule added: ${data.rule} by user ${data.userId || 'unknown'}`);
    });

    // Listen for member joined events
    onMemberJoined((data) => {
      addMessage(`Member joined: ${data.user.name || data.user.username || data.user.email || 'Unknown User'}`);
    });

    // Listen for member left events
    onMemberLeft((data) => {
      addMessage(`Member left: User ID ${data.userId}`);
    });

    // Listen for received messages
    onReceiveMessage((data) => {
      addMessage(`Message from ${data.sender.name || data.sender.username || data.sender.email || 'Unknown'}: ${data.message}`);
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      removeListener('ruleAdded', () => {});
      removeListener('memberJoined', () => {});
      removeListener('memberLeft', () => {});
      removeListener('receiveMessage', () => {});
    };
  }, []);

  const addMessage = (message) => {
    setMessages(prev => [...prev, { id: Date.now(), text: message, timestamp: new Date().toLocaleTimeString() }]);
  };

  const handleJoinGroup = () => {
    if (groupId.trim()) {
      joinGroup(groupId.trim());
      addMessage(`Attempting to join group: ${groupId.trim()}`);
    }
  };

  const handleLeaveGroup = () => {
    if (groupId.trim()) {
      leaveGroup(groupId.trim());
      addMessage(`Attempting to leave group: ${groupId.trim()}`);
    }
  };

  const handleAddRule = () => {
    if (groupId.trim() && newRule.trim()) {
      const ruleData = {
        groupId: groupId.trim(),
        rule: newRule.trim(),
        userId: 'current-user-id' // In a real app, this would be the actual user ID
      };
      emitRuleAdded(ruleData);
      addMessage(`Sending rule to group ${groupId.trim()}: ${newRule.trim()}`);
      setNewRule(''); // Clear the input
    }
  };

  const handleMemberJoin = () => {
    if (groupId.trim() && newUser.trim()) {
      const userData = {
        groupId: groupId.trim(),
        user: {
          name: newUser.trim(),
          email: `${newUser.trim()}@example.com` // In a real app, this would be actual user data
        }
      };
      emitMemberJoined(userData);
      addMessage(`Sending member join notification for ${newUser.trim()} to group ${groupId.trim()}`);
      setNewUser(''); // Clear the input
    }
  };

  const handleSendMessage = () => {
    if (groupId.trim() && newMessage.trim()) {
      const messageData = {
        groupId: groupId.trim(),
        message: newMessage.trim(),
        sender: {
          name: 'Current User',
          email: 'current@example.com' // In a real app, this would be actual user data
        }
      };
      emitSendMessage(messageData);
      addMessage(`Sending message to group ${groupId.trim()}: ${newMessage.trim()}`);
      setNewMessage(''); // Clear the input
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Socket Connection Test</h2>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
          {socketId && <span>Socket ID: {socketId}</span>}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="Enter group ID to join/leave"
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleJoinGroup}
            disabled={!groupId.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Group
          </button>
          <button
            onClick={handleLeaveGroup}
            disabled={!groupId.trim()}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Leave Group
          </button>
        </div>

        {/* Rule Addition Section */}
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Add Rule</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Enter new rule"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddRule}
              disabled={!groupId.trim() || !newRule.trim()}
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Rule
            </button>
          </div>
        </div>

        {/* Member Join Section */}
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Add Member</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              placeholder="Enter member name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleMemberJoin}
              disabled={!groupId.trim() || !newUser.trim()}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Member
            </button>
          </div>
        </div>

        {/* Send Message Section */}
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Send Message</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter message"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!groupId.trim() || !newMessage.trim()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Message
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Messages:</h3>
        <div className="border border-gray-200 rounded-md p-4 h-64 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic">No messages yet...</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="py-1 border-b border-gray-100 last:border-b-0">
                <span className="text-xs text-gray-500 mr-2">[{msg.timestamp}]</span>
                <span>{msg.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600 mt-4">
        <p><strong>Note:</strong> This component demonstrates socket connection functionality.</p>
        <p>Check browser console and server logs for detailed connection information.</p>
      </div>
    </div>
  );
};

export default SocketTestComponent;