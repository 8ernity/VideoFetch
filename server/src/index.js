/**
 * VideoFetch Server — Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import videoRoutes from './routes/video.js';
import rateLimiter from './middleware/rateLimiter.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ── Global middleware ── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimiter);

/* ── Routes ── */
app.use('/api/video', videoRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  
  // Handle JSON parsing errors from body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'An unexpected error occurred.' : err.message;
  
  res.status(status).json({ error: message });
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`\n  ⚡ VideoFetch server running on http://localhost:${PORT}\n`);
});
