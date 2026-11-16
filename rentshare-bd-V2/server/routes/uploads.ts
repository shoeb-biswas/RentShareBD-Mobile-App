import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { uploadImageAsset } from '../services/uploadService';
import { getPublicIntegrationStatus } from '../config/env';

const router = Router();

router.get('/status', requireAuth, (_req, res) => {
  const status = getPublicIntegrationStatus();
  res.json({
    cloudinaryEnabled: status.cloudinaryEnabled,
    storageMode: status.imageStorageMode,
  });
});

router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const dataUrl = String(req.body?.dataUrl || '');
    const folder = String(req.body?.folder || 'rentshare-bd').replace(/[^a-zA-Z0-9_-]/g, '');
    const result = await uploadImageAsset(dataUrl, folder || 'rentshare-bd');
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
