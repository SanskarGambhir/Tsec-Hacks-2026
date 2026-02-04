import { Server } from "socket.io";

let io;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("joinGroup", (groupId) => {
        socket.join(groupId);
        console.log(`Socket ${socket.id} joined group ${groupId}`);
    });

    socket.on("leaveGroup", (groupId) => {
        socket.leave(groupId);
        console.log(`Socket ${socket.id} left group ${groupId}`);
    });

    // Handle rule addition event
    socket.on("ruleAdded", (data) => {
      const { groupId, rule, userId } = data;
      console.log(`Rule added in group ${groupId}:`, rule);
      // Broadcast to all members in the group except sender
      socket.to(groupId).emit("ruleAdded", { rule, userId, timestamp: new Date() });
    });

    // Handle member joining event
    socket.on("memberJoined", (data) => {
      const { groupId, user } = data;
      console.log(`Member ${user.name || user.username || user.email} joined group ${groupId}`);
      // Notify all other members in the group
      socket.to(groupId).emit("memberJoined", { user, timestamp: new Date() });
    });

    // Handle member leaving event
    socket.on("memberLeft", (data) => {
      const { groupId, userId } = data;
      console.log(`Member ${userId} left group ${groupId}`);
      // Notify all other members in the group
      socket.to(groupId).emit("memberLeft", { userId, timestamp: new Date() });
    });

    // Handle message sending
    socket.on("sendMessage", (data) => {
      const { groupId, message, sender } = data;
      console.log(`Message sent in group ${groupId} by ${sender.name || sender.username || sender.email}:`, message);
      // Broadcast message to all members in the group except sender
      socket.to(groupId).emit("receiveMessage", { message, sender, timestamp: new Date() });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Helper function to emit events to a specific group from outside socket handlers
export const emitToGroup = (groupId, event, data) => {
  if (io) {
    io.to(groupId).emit(event, data);
  }
};
