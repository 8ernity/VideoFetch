import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware — configured for multi-hop cloud proxies (Render / Cloudflare).
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return String(forwarded).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown-client';
  },
  validate: { trustProxy: false },
  message: {
    error: 'Too many requests. Please try again in a few minutes.',
  },
});

export default limiter;
