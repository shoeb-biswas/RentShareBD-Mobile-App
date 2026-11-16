import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import { db } from '../server/db/client';
import { getAppConfig } from '../server/config/env';
import { attachChatGateway, getOnlineUserIds } from './gateway';

const cfg = getAppConfig();
const app = express();
app.use(
  cors({
    origin: cfg.nodeEnv === 'production' ? cfg.chatCorsOrigins : true,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    service: 'rentshare-chat-microservice',
    status: 'ok',
    port: cfg.chatServicePort,
    onlineUsersCount: getOnlineUserIds().length,
  });
});

const server = http.createServer(app);
const port = cfg.chatServicePort;

db.init()
  .then(() => {
    attachChatGateway(server, db);
    server.listen(port, '0.0.0.0', () => {
      console.log(`[Chat Microservice] Socket.IO & Express listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('[Chat Microservice] Failed to start:', err);
    process.exit(1);
  });
