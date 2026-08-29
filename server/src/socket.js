import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { User } from "./models/user.models.js";
import { Group } from "./models/group.models.js";

let io;

const allowedOrigins = () =>
  [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
  ].filter(Boolean);

/**
 * Read the JWT from the handshake — either the `auth.token` the client sends
 * or the httpOnly cookie set at login.
 */
const extractToken = (socket) => {
  const fromAuth = socket.handshake.auth?.token;
  if (fromAuth) return fromAuth.replace(/^Bearer /, "");

  const cookieHeader = socket.handshake.headers?.cookie;
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  /**
   * Every connection is authenticated before any handler runs. The client was
   * already sending a token; the server simply never checked it, so any client
   * could join any group room and read its chat.
   */
  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded?._id).select("username email avatar");

      if (!user) return next(new Error("Invalid token"));

      socket.user = user;
      return next();
    } catch {
      return next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();

    // A private room per user, so the server can address someone directly
    // without the client having to hand out raw socket ids.
    socket.join(`user:${userId}`);

    /**
     * Joining a group room requires actual membership of that group — this is
     * the check that turns rooms into a real boundary.
     */
    socket.on("joinGroup", async (groupId, callback) => {
      try {
        const group = await Group.findById(groupId).select("members owner").lean();

        if (!group) {
          return callback?.({ ok: false, error: "Group not found" });
        }

        const isMember =
          group.members.some((m) => m.toString() === userId) ||
          group.owner.toString() === userId;

        if (!isMember) {
          return callback?.({ ok: false, error: "Not a member of this group" });
        }

        socket.join(groupId);
        return callback?.({ ok: true });
      } catch (error) {
        console.error("joinGroup failed:", error.message);
        return callback?.({ ok: false, error: "Could not join group" });
      }
    });

    socket.on("leaveGroup", (groupId) => {
      socket.leave(groupId);
    });

    /**
     * Relayed events carry the sender's identity from the verified session, not
     * from the payload, so a client cannot speak as someone else. They are only
     * delivered to rooms this socket has actually joined.
     */
    const relay = (event, build) => {
      socket.on(event, (data = {}) => {
        const { groupId } = data;
        if (!groupId || !socket.rooms.has(groupId)) return;

        socket.to(groupId).emit(event, {
          ...build(data),
          user: socket.user,
          timestamp: new Date(),
        });
      });
    };

    relay("ruleAdded", (d) => ({ rule: d.rule }));
    relay("typing", () => ({}));

    /**
     * Large-expense approval. The request is addressed to a user id rather than
     * a raw socket id: socket ids are transient, and accepting one from a
     * client let anyone target any connection on the server.
     */
    socket.on("largeExpenseWarning", (data = {}) => {
      const { groupId, targetUserId, amount, description, message } = data;
      if (!groupId || !socket.rooms.has(groupId) || !targetUserId) return;

      io.to(`user:${targetUserId}`).emit("approval_request", {
        groupId,
        amount,
        description,
        message,
        requestedBy: socket.user,
        timestamp: new Date(),
      });
    });

    socket.on("approvalResponse", (data = {}) => {
      const { groupId, targetUserId, approved, expenseData } = data;
      if (!groupId || !socket.rooms.has(groupId) || !targetUserId) return;

      io.to(`user:${targetUserId}`).emit("approvalResponse", {
        groupId,
        approved: Boolean(approved),
        expenseData,
        approvedBy: socket.user,
        timestamp: new Date(),
      });
    });

    socket.on("disconnect", () => {
      // Rooms are cleaned up by socket.io itself.
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io is not initialised");
  return io;
};

/** Emit to a group room from outside a socket handler (controllers use this). */
export const emitToGroup = (groupId, event, data) => {
  if (io) io.to(String(groupId)).emit(event, data);
};

/** Emit to one user across all of their open tabs. */
export const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};
