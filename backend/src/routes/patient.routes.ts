import { Router } from 'express';

const router = Router();

// Test Route
router.get('/test', (req, res) => {
  res.json({ message: 'Patient routes working' });
});

export default router;
