import { Router } from 'express';
import { optionalAuth, requireAuth, type AuthedRequest } from '../middleware/auth';
import { analyzeUserFinances, parseAndMatchRentalQuery } from '../services/aiService';

const router = Router();

router.post('/financial-assistant', requireAuth, async (req: AuthedRequest, res) => {
  const question = String(
    req.body?.question || 'Analyze my monthly expenses, predict next month, and suggest savings.'
  ).trim();
  const result = await analyzeUserFinances(req.user!.userId, question);
  res.json(result);
});

router.post('/rental-assistant', optionalAuth, async (req: AuthedRequest, res) => {
  const query = String(req.body?.query || '').trim();
  if (!query) {
    res.status(400).json({ error: 'Please describe what room or roommate you are looking for.' });
    return;
  }
  const result = await parseAndMatchRentalQuery(query, req.user?.userId);
  res.json(result);
});

export default router;
