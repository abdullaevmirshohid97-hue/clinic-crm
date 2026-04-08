import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as AuthController from '../controllers/auth.controller';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});

const router = Router();

router.post('/login', authLimiter, AuthController.login);
router.post('/refresh', authLimiter, AuthController.refresh);
router.post('/logout', AuthController.logout);

export default router;
