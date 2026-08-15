'use strict';

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter — applied globally.
 * Defaults: 20 requests per minute per IP.
 */
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20', 10),
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    error: 'Too many requests. Please wait a moment before trying again.',
    code:  'RATE_LIMITED',
  },
  skip: (req) => {
    // Never rate-limit health checks
    return req.path === '/health';
  },
});

/**
 * Stricter limiter specifically for download endpoints.
 * Downloads are heavier — limit to 5 per minute.
 */
const downloadLimiter = rateLimit({
  windowMs: 60_000,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    error: 'Too many download requests. Please wait a minute before trying again.',
    code:  'DOWNLOAD_RATE_LIMITED',
  },
});

/**
 * Stricter limiter for info requests — 10 per minute.
 */
const infoLimiter = rateLimit({
  windowMs: 60_000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    error: 'Too many info requests. Please wait before trying again.',
    code:  'INFO_RATE_LIMITED',
  },
});

/**
 * Optional API key middleware.
 * Only active when process.env.API_KEY is set.
 */
function apiKeyGuard(req, res, next) {
  const key = process.env.API_KEY;
  if (!key) return next(); // disabled

  const authHeader = req.headers['authorization'] || '';
  const provided   = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (provided !== key) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or missing API key.', code: 'UNAUTHORIZED' });
  }
  next();
}

module.exports = { globalLimiter, downloadLimiter, infoLimiter, apiKeyGuard };
