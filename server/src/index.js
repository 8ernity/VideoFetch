/**
 * VideoFetch Server — Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import videoRoutes from './routes/video.js';
import rateLimiter from './middleware/rateLimiter.js';

config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

/* ── Global middleware ── */
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimiter);

/* ── API Routes ── */
app.use('/api/video', videoRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ── Static Frontend Serving (Production / Render) ── */
if (fs.existsSync(CLIENT_DIST)) {
  console.log(`[Server] Serving static frontend from: ${CLIENT_DIST}`);
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  // 404 catch-all for API only mode
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
  });
}

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'An unexpected error occurred.' : err.message;
  
  res.status(status).json({ error: message });
});

/* ── Start ── */
// Listen in standalone Node environments (Render, Railway, Docker, Local Dev)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n  ⚡ VideoFetch server running on port ${PORT}\n`);
  });
}

export default app;
