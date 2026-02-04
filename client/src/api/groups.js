import axios from "./axios";

// Send group invite to friend
export const sendGroupInviteToFriend = async (groupId, friendId) => {
  const response = await axios.post("/groups/invite/friend", { groupId, friendId });
  return response.data;
};

// Send group invite via WhatsApp
export const sendGroupInviteViaWhatsApp = async (groupId, phoneNumber) => {
  const response = await axios.post("/groups/invite/whatsapp", { groupId, phoneNumber });
  return response.data;
};

// Get all pending group invites
export const getGroupInvites = async () => {
  const response = await axios.get("/groups/invites");
  return response.data;
};

// Accept group invite
export const acceptGroupInvite = async (inviteId) => {
  const response = await axios.post(`/groups/invites/${inviteId}/accept`);
  return response.data;
};

// Reject group invite
export const rejectGroupInvite = async (inviteId) => {
  const response = await axios.post(`/groups/invites/${inviteId}/reject`);
  return response.data;
};

// Accept group invite by token (for WhatsApp invites)
export const acceptGroupInviteByToken = async (token) => {
  const response = await axios.post(`/groups/invite-token/${token}/accept`);
  return response.data;
};

// Leave group
export const leaveGroup = async (groupId) => {
  const response = await axios.post(`/groups/${groupId}/leave`);
  return response.data;
};
