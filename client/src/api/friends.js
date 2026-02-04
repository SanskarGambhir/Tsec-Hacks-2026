import axios from "./axios";

// Send friend request
export const sendFriendRequest = async (recipientId) => {
  const response = await axios.post("/friends/send-request", { recipientId });
  return response.data;
};

// Accept friend request
export const acceptFriendRequest = async (requestId) => {
  const response = await axios.patch(`/friends/accept/${requestId}`);
  return response.data;
};

// Reject friend request
export const rejectFriendRequest = async (requestId) => {
  const response = await axios.patch(`/friends/reject/${requestId}`);
  return response.data;
};

// Remove friend
export const removeFriend = async (friendId) => {
  const response = await axios.delete(`/friends/remove/${friendId}`);
  return response.data;
};

// Get all friends
export const getFriends = async () => {
  const response = await axios.get("/friends");
  return response.data;
};

// Get pending friend requests (received)
export const getPendingRequests = async () => {
  const response = await axios.get("/friends/pending");
  return response.data;
};

// Get sent friend requests
export const getSentRequests = async () => {
  const response = await axios.get("/friends/sent");
  return response.data;
};

// Search users
export const searchUsers = async (query) => {
  const response = await axios.get(`/friends/search?query=${encodeURIComponent(query)}`);
  return response.data;
};

// Block user
export const blockUser = async (userId) => {
  const response = await axios.post(`/friends/block/${userId}`);
  return response.data;
};

// Send phone invite
export const sendPhoneInvite = async (phoneNumber) => {
  const response = await axios.post("/friends/invite/phone", { phoneNumber });
  return response.data;
};

// Accept phone invite
export const acceptPhoneInvite = async (token) => {
  const response = await axios.post(`/friends/invite/accept/${token}`);
  return response.data;
};
