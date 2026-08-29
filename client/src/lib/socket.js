import { io } from "socket.io-client";

import { SERVER_ORIGIN } from "../api/axios";

/**
 * One shared socket for the app.
 *
 * The connection authenticates using the same httpOnly cookies as the REST
 * API, so there is no token to pass around. Group rooms are membership-checked
 * on the server, so joining one is a request that can be refused.
 */

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;
  if (socket) return socket;

  socket = io(SERVER_ORIGIN, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    timeout: 20000,
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection failed:", error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

/**
 * Join a group room. Resolves false when the server refuses because the user
 * is not a member, so callers can react rather than silently receiving nothing.
 */
export const joinGroup = (groupId) =>
  new Promise((resolve) => {
    const sock = connectSocket();
    if (!sock) return resolve(false);

    const emit = () =>
      sock.emit("joinGroup", groupId, (response) => resolve(Boolean(response?.ok)));

    if (sock.connected) emit();
    else sock.once("connect", emit);

    // Rejoin automatically after a dropped connection, otherwise a reconnect
    // leaves the user in no room and silently stops all live updates.
    sock.on("connect", emit);
  });

export const leaveGroup = (groupId) => {
  socket?.emit("leaveGroup", groupId);
};

/** Subscribe to an event; returns the unsubscribe function. */
export const on = (event, handler) => {
  const sock = connectSocket();
  sock?.on(event, handler);
  return () => sock?.off(event, handler);
};

export const off = (event, handler) => {
  socket?.off(event, handler);
};

export const emit = (event, payload) => {
  socket?.emit(event, payload);
};

/* Named helpers for the events the UI actually listens to. Chat messages are
   sent over the REST API — it persists them and broadcasts the result, so a
   message can no longer appear live but vanish on refresh. */

export const onNewMessage = (handler) => on("newMessage", handler);
export const onFundsAdded = (handler) => on("fundsAdded", handler);
export const onExpenseLogged = (handler) => on("expenseLogged", handler);
export const onMemberJoined = (handler) => on("memberJoined", handler);
export const onMemberLeft = (handler) => on("memberLeft", handler);
export const onRuleAdded = (handler) => on("ruleAdded", handler);
export const onCreditsWithdrawn = (handler) => on("creditsWithdrawn", handler);
export const onMemberFundsAdded = (handler) => on("memberFundsAdded", handler);
export const onApprovalRequest = (handler) => on("approval_request", handler);
export const onApprovalResponse = (handler) => on("approvalResponse", handler);

/** Ask a specific member to approve a large expense. */
export const requestExpenseApproval = ({ groupId, targetUserId, amount, description, message }) => {
  emit("largeExpenseWarning", { groupId, targetUserId, amount, description, message });
};

export const respondToApproval = ({ groupId, targetUserId, approved, expenseData }) => {
  emit("approvalResponse", { groupId, targetUserId, approved, expenseData });
};

export const removeListener = off;
