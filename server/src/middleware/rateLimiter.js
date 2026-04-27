import rateLimit from 'express-rate-limit';

/**
 * Rate limiter middleware.
 * Defaults: 50 requests per 15-minute window per IP.
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: 'See Retry-After header',
  },
});

export default limiter;
