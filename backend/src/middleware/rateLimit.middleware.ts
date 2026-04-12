import rateLimit from 'express-rate-limit';

/**
 * Strict rate limit for auth endpoints (login, register).
 * 10 attempts per 15 minutes per IP.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

/**
 * Rate limit for payment endpoints.
 * 30 requests per 1 minute per IP.
 */
export const paymentRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many payment requests. Please slow down.',
  },
});

/**
 * General API rate limit (already applied globally, but can be tighter per-route).
 * 200 requests per 15 minutes per IP.
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
  },
});
