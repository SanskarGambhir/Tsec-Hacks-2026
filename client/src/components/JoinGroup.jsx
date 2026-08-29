import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Using the existing axios configuration

const JoinGroup = () => {
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoinGroup = async (e) => {
    e.preventDefault();

    if (!groupId.trim()) {
      setError('Please enter a group ID');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post(`/groups/${groupId}/join`);

      if (response.data.success) {
        setMessage(response.data.message || 'Successfully joined the group!');
        setGroupId(''); // Clear the input field

        // Navigate to the group detail page after successfully joining
        setTimeout(() => {
          navigate(`/group/${groupId}`);
        }, 1500); // Wait 1.5 seconds to show success message before navigating
      }
    } catch (err) {
      console.error('Error joining group:', err);
      setError(err.response?.data?.message || 'Failed to join group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Join Group</h2>

      <form onSubmit={handleJoinGroup}>
        <div className="mb-4">
          <label htmlFor="groupId" className="block text-sm font-medium text-muted-foreground mb-1">
            Group ID
          </label>
          <input
            type="text"
            id="groupId"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="Enter group ID to join"
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md text-foreground font-medium ${loading
            ? 'bg-secondary cursor-not-allowed'
            : 'bg-primary hover:bg-primary'
            }`}
        >
          {loading ? 'Joining...' : 'Join Group'}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 bg-primary/10 text-primary rounded-md">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      <div className="mt-6 text-sm text-muted-foreground">
        <p><strong>Note:</strong> You need to have a valid group ID to join a group.</p>
        <p>If you don't have a group ID, ask the group owner to share it with you.</p>
      </div>
    </div>
  );
};

export default JoinGroup;