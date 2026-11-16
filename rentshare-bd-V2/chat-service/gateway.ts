import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { verifyJwt, type AuthPayload } from '../server/middleware/auth';
import type { DbClient } from '../server/db/client';
import { getAppConfig } from '../server/config/env';

interface AuthedSocket extends Socket {
  user?: AuthPayload;
}

const onlineUsers = new Map<number, Set<string>>();

export function getOnlineUserIds(): number[] {
  return Array.from(onlineUsers.keys());
}

export function attachChatGateway(httpServer: HttpServer, db: DbClient): SocketIOServer {
  const cfg = getAppConfig();
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: cfg.nodeEnv === 'production' ? cfg.chatCorsOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: AuthedSocket, next) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.headers.authorization || '').replace('Bearer ', '');
    if (!token) {
      return next(new Error('Unauthorized: missing token'));
    }
    try {
      socket.user = verifyJwt(token);
      next();
    } catch {
      next(new Error('Unauthorized: invalid token'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    const userId = socket.user!.userId;

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);
    socket.join(`user:${userId}`);
    io.emit('presence:update', { onlineUserIds: getOnlineUserIds() });

    socket.on('group:join', async (groupId: number) => {
      const member = await db.queryOne(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
      );
      if (member) {
        socket.join(`group:${groupId}`);
      }
    });

    socket.on('group:message', async (payload: { groupId: number; content: string }) => {
      const content = String(payload?.content || '').trim();
      const groupId = Number(payload?.groupId);
      if (!content || !groupId) return;

      const member = await db.queryOne(
        'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
      );
      if (!member) {
        socket.emit('chat:error', { error: 'Not authorized for this group' });
        return;
      }

      const res = await db.execute(
        `INSERT INTO messages (group_id, sender_id, content, is_read) VALUES (?, ?, ?, 0)`,
        [groupId, userId, content]
      );
      const sender = await db.queryOne<{ full_name: string }>(
        'SELECT full_name FROM users WHERE id = ?',
        [userId]
      );

      const message = {
        id: res.insertId,
        group_id: groupId,
        sender_id: userId,
        sender_name: sender?.full_name || 'Roommate',
        content,
        is_read: 0,
        created_at: new Date().toISOString(),
      };

      io.to(`group:${groupId}`).emit('group:message:new', message);

      // Persist notifications for other group members
      const otherMembers = await db.query<{ user_id: number }>(
        'SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?',
        [groupId, userId]
      );
      for (const m of otherMembers) {
        await db.execute(
          `INSERT INTO notifications (user_id, type, title, message, link_path) VALUES (?, 'chat', ?, ?, '/tenant/chat')`,
          [m.user_id, `New message from ${sender?.full_name || 'Roommate'}`, content.slice(0, 100)]
        );
        io.to(`user:${m.user_id}`).emit('notification:new', { type: 'chat' });
      }
    });

    socket.on('dm:message', async (payload: { receiverId: number; content: string }) => {
      const content = String(payload?.content || '').trim();
      const receiverId = Number(payload?.receiverId);
      if (!content || !receiverId) return;

      const res = await db.execute(
        `INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, 0)`,
        [userId, receiverId, content]
      );
      const sender = await db.queryOne<{ full_name: string }>(
        'SELECT full_name FROM users WHERE id = ?',
        [userId]
      );

      const message = {
        id: res.insertId,
        sender_id: userId,
        receiver_id: receiverId,
        sender_name: sender?.full_name || 'User',
        content,
        is_read: 0,
        created_at: new Date().toISOString(),
      };

      io.to(`user:${userId}`).emit('dm:message:new', message);
      io.to(`user:${receiverId}`).emit('dm:message:new', message);

      await db.execute(
        `INSERT INTO notifications (user_id, type, title, message, link_path) VALUES (?, 'chat', ?, ?, '/tenant/private-chat')`,
        [receiverId, `Direct message from ${sender?.full_name || 'User'}`, content.slice(0, 100)]
      );
      io.to(`user:${receiverId}`).emit('notification:new', { type: 'chat' });
    });

    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) onlineUsers.delete(userId);
      }
      io.emit('presence:update', { onlineUserIds: getOnlineUserIds() });
    });
  });

  return io;
}
