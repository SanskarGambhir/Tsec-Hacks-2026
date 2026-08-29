import { Server } from "socket.io";

let io;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CORS_ORIGIN,
        "http://localhost:5173",
        "https://tsec-hacks-2026-lac.vercel.app"
      ].filter(Boolean),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
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
      socket
        .to(groupId)
        .emit("ruleAdded", { rule, userId, timestamp: new Date() });
    });

    // Handle member joining event
    socket.on("memberJoined", (data) => {
      const { groupId, user } = data;
      console.log(
        `Member ${user.name || user.username || user.email} joined group ${groupId}`,
      );
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

    // Handle message sending via API
    socket.on("sendMessage", (data) => {
      const { groupId, message, sender } = data;
      console.log(
        `Message sent in group ${groupId} by ${sender.name || sender.username || sender.email}:`,
        message,
      );
      // Broadcast message to all members in the group except sender
      socket
        .to(groupId)
        .emit("receiveMessage", { message, sender, timestamp: new Date() });
    });

    // Handle new message event from API
    socket.on("newMessage", (data) => {
      const { groupId, message } = data;
      console.log(
        `New message in group ${groupId} by ${message.sender.username || message.sender.email}:`,
        message.content,
      );
      // Broadcast message to all members in the group
      socket.to(groupId).emit("newMessage", { message });
    });

    // Handle request to get sockets in a room
    socket.on("getRoomSockets", (roomId, callback) => {
      const room = io.sockets.adapter.rooms.get(roomId);
      const socketIds = room ? Array.from(room) : [];
      const roomSize = socketIds.length;

      console.log(`Room ${roomId} has ${roomSize} connected sockets`);

      if (callback && typeof callback === "function") {
        callback({ socketIds, count: roomSize });
      }
    });

    // Handle high expense warning and send approval request to target socket
    socket.on("largeExpenseWarning", (data) => {
      const {
        targetSocketId,
        message,
        amount,
        socketId,
        description,
        groupId,
      } = data;

      console.log(`High expense alert: ₹${amount} in group ${groupId}`);
      console.log(`Sending approval request to socket: ${targetSocketId}`);

      // Send approval request to the specific target socket
      io.to(targetSocketId).emit("approval_request", {
        amount,
        description,
        message,
        groupId,
        socketId,
        requestedBy: socket.id,
        timestamp: new Date(),
      });
    });

    // Handle approval response and forward to requester
    socket.on("approvalResponse", (data) => {
      const { targetSocketId, approved, expenseData, groupId } = data;

      console.log(
        `Approval response: ${approved ? "APPROVED" : "DENIED"} for expense in group ${groupId}`,
      );
      console.log(`Sending response to requester socket: ${targetSocketId}`);

      // Send approval response back to the requester
      io.to(targetSocketId).emit("approvalResponse", {
        approved,
        expenseData,
        groupId,
        approvedBy: socket.id,
        timestamp: new Date(),
      });
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

// Get all socket IDs in a specific room/group
export const getSocketsInRoom = (roomId) => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }

  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) {
    return [];
  }

  // Convert Set to Array
  return Array.from(room);
};

// Get count of sockets in a room
export const getRoomSize = (roomId) => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }

  const room = io.sockets.adapter.rooms.get(roomId);
  return room ? room.size : 0;
};
