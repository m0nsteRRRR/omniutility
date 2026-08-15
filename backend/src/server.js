'use strict';

// ── Load environment variables first ─────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

const videoRouter = require('./routes/video');
const { globalLimiter, apiKeyGuard } = require('./middleware/rateLimit');

// ── Constants ─────────────────────────────────────────────────────────────────
const PORT    = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// Parse allowed origins from env (comma-separated)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// ── Ensure temp directory exists ──────────────────────────────────────────────
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/ytdlp-scratch';
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log(`[server] Created temp dir: ${TEMP_DIR}`);
}

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  // Allow iframes only for the frontend (video player embeds)
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (Postman, curl, Fly health checks)
    if (!origin) return callback(null, true);

    // Allow any *.vercel.app subdomain (handles preview deployments automatically)
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    // Allow explicitly configured origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods:            ['GET', 'POST', 'OPTIONS'],
  allowedHeaders:     ['Content-Type', 'Authorization'],
  exposedHeaders:     ['Content-Disposition', 'Content-Length', 'X-Format'],
  credentials:        true,
  optionsSuccessStatus: 200,
}));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(globalLimiter);

// ── Optional API key guard ────────────────────────────────────────────────────
app.use('/api', apiKeyGuard);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'omniutility-backend',
    timestamp: new Date().toISOString(),
    uptime:    Math.round(process.uptime()),
  });
});

// ── Version / environment info ─────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const { execSync } = require('child_process');
  let ytdlpVersion = 'unknown';
  let ffmpegVersion = 'unknown';

  try { ytdlpVersion  = execSync('yt-dlp --version', { timeout: 5000 }).toString().trim(); } catch {}
  try { ffmpegVersion = execSync('ffmpeg -version 2>&1 | head -1', { timeout: 5000, shell: true }).toString().trim(); } catch {}

  res.json({
    status:       'ok',
    ytdlp:        ytdlpVersion,
    ffmpeg:       ffmpegVersion,
    nodeVersion:  process.version,
    allowedOrigins: ALLOWED_ORIGINS,
    youtubeOnly:  process.env.YOUTUBE_ONLY === 'true',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/video', videoRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.path}`,
    code:  'NOT_FOUND',
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: err.message, code: 'CORS_ERROR' });
  }
  res.status(500).json({
    error: IS_PROD ? 'Internal server error' : err.message,
    code:  'INTERNAL_ERROR',
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       OmniUtility Backend — yt-dlp Service       ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Listening on  : http://0.0.0.0:${PORT}              ║`);
  console.log(`║  Environment   : ${(process.env.NODE_ENV || 'development').padEnd(30)} ║`);
  console.log(`║  YouTube-only  : ${(process.env.YOUTUBE_ONLY === 'true' ? 'Yes' : 'No').padEnd(30)} ║`);
  console.log(`║  API Key Guard : ${(process.env.API_KEY ? 'Enabled' : 'Disabled').padEnd(30)} ║`);
  console.log(`║  Temp Dir      : ${TEMP_DIR.padEnd(30)} ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('');
});

module.exports = app;
