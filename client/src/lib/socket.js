import { io } from "socket.io-client";

let socket;

// Create socket connection
export const connectSocket = (token = null) => {
  const options = {
    transports: ["websocket"],
    upgrade: false,
    secure: false,
    rejectUnauthorized: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
  };

  // Use environment variable or default to localhost:8000
  // Remove /api/v1/ suffix if present since socket.io connects to base URL
  let SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  SERVER_URL = SERVER_URL.replace(/\/api\/v1\/?$/, "");

  if (token) {
    options.auth = { token };
  }

  socket = io(SERVER_URL, options);

  socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected from server:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
  });

  return socket;
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Get socket instance
export const getSocket = () => {
  if (!socket) {
    console.warn("Socket not connected. Call connectSocket() first.");
    return null;
  }
  return socket;
};

// Get socket ID
export const getSocketId = () => {
  if (!socket || !socket.connected) {
    console.warn("Socket not connected. Call connectSocket() first.");
    return null;
  }
  return socket.id;
};

// Get all socket IDs in a room/group
export const getSocketsInRoom = (roomId) => {
  return new Promise((resolve, reject) => {
    const socketInstance = getSocket();
    if (!socketInstance) {
      reject(new Error("Socket not connected"));
      return;
    }

    socketInstance.emit("getRoomSockets", roomId, (response) => {
      resolve(response);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error("Request timeout"));
    }, 5000);
  });
};

// Join a group
export const joinGroup = (groupId) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit("joinGroup", groupId);
  }
};

// Leave a group
export const leaveGroup = (groupId) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit("leaveGroup", groupId);
  }
};

// Emit rule added event
export const emitRuleAdded = (data) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit("ruleAdded", data);
  }
};

// Emit member joined event
export const emitMemberJoined = (data) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit("memberJoined", data);
  }
};

// Emit member left event
export const emitMemberLeft = (data) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit("memberLeft", data);
  }
};

// Emit send message event
export const emitSendMessage = (data) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.emit("sendMessage", data);
  }
};

// Listen for rule added event
export const onRuleAdded = (callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.on("ruleAdded", callback);
  }
};

// Listen for member joined event
export const onMemberJoined = (callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.on("memberJoined", callback);
  }
};

// Listen for member left event
export const onMemberLeft = (callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.on("memberLeft", callback);
  }
};

// Listen for received message event
export const onReceiveMessage = (callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.on("receiveMessage", callback);
  }
};

// Listen for funds added event
export const onFundsAdded = (callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.on("fundsAdded", callback);
  }

  console.log("Listening for fundsAdded event");
};

// Listen for new message event
export const onNewMessage = (callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.on("newMessage", callback);
  }
};

// Listen for expense logged event
export const onExpenseLogged = (callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.on("expenseLogged", callback);
  }
};

// Remove listeners
export const removeListener = (event, callback) => {
  const socketInstance = getSocket();
  if (socketInstance) {
    socketInstance.off(event, callback);
  }
};
