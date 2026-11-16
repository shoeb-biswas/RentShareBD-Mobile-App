import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';

import {
  getAppConfig,
  getPublicIntegrationStatus,
  logStartupConfigSummary,
} from './server/config/env';
import { db } from './server/db/client';
import { attachChatGateway } from './chat-service/gateway';
import authRoutes from './server/routes/auth';
import propertyRoutes from './server/routes/properties';
import roommateRoutes from './server/routes/roommates';
import rentalRoutes from './server/routes/rentals';
import groupRoutes from './server/routes/groups';
import financeRoutes from './server/routes/finance';
import livingRoutes from './server/routes/living';
import adminRoutes from './server/routes/admin';
import notificationRoutes from './server/routes/notifications';
import aiRoutes from './server/routes/ai';
import uploadRoutes from './server/routes/uploads';

async function bootstrap() {
  const cfg = getAppConfig();
  logStartupConfigSummary(cfg);
  await db.init();

  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json({ limit: '8mb' }));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  // Serve local fallback image uploads when Cloudinary is not configured
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'rentshare-bd-api',
      databaseDriver: db.driver,
      integrations: getPublicIntegrationStatus(cfg),
    });
  });

  app.get('/api/config/integrations', (_req, res) => {
    res.json(getPublicIntegrationStatus(cfg));
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/roommates', roommateRoutes);
  app.use('/api/rentals', rentalRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/living', livingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/uploads', uploadRoutes);

  // Attach real-time Socket.IO chat microservice gateway on shared port 3000
  attachChatGateway(server, db);

  if (cfg.nodeEnv === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(cfg.port, '0.0.0.0', () => {
    console.log(`[RentShare BD] Full-stack server + Socket.IO running on http://localhost:${cfg.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[RentShare BD] Fatal startup error:', err);
  process.exit(1);
});
