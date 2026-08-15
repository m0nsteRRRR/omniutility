'use strict';

const express = require('express');
const router  = express.Router();

const {
  getVideoInfo,
  downloadStream,
  isYouTubeUrl,
  isSafeUrl,
} = require('../utils/ytdlp');

const { infoLimiter, downloadLimiter } = require('../middleware/rateLimit');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/video/info
//
// Body: { url: string }
// Returns: sanitized video metadata object
// ─────────────────────────────────────────────────────────────────────────────
router.post('/info', infoLimiter, async (req, res) => {
  const { url } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "url" in request body.', code: 'MISSING_URL' });
  }

  if (!isSafeUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL. Must be a valid http/https URL.', code: 'INVALID_URL' });
  }

  // Optionally restrict to YouTube only
  if (process.env.YOUTUBE_ONLY === 'true' && !isYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Only YouTube URLs are supported.', code: 'UNSUPPORTED_DOMAIN' });
  }

  // ── Fetch info ────────────────────────────────────────────────────────────
  try {
    console.log(`[POST /info] ${req.ip} → ${url}`);
    const info = await getVideoInfo(url);
    return res.json({ success: true, data: info });
  } catch (err) {
    console.error('[POST /info] error:', err.message);
    return res.status(422).json({
      error:   err.message || 'Failed to fetch video info.',
      code:    'YTDLP_ERROR',
      success: false,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/video/download
//
// Query params:
//   url      {string}  - encoded video URL
//   format   {string}  - one of: 4k, 2k, 1080, 720, 480, 360, mp3, m4a
//
// Streams the file directly to the response with appropriate headers.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/download', downloadLimiter, (req, res) => {
  const { url, format } = req.query;

  // ── Input validation ──────────────────────────────────────────────────────
  const VALID_FORMATS = ['4k', '2k', '1080', '720', '480', '360', 'mp3', 'm4a'];

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing "url" query parameter.', code: 'MISSING_URL' });
  }
  if (!format || !VALID_FORMATS.includes(format)) {
    return res.status(400).json({ error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`, code: 'INVALID_FORMAT' });
  }

  const decodedUrl = decodeURIComponent(url);

  if (!isSafeUrl(decodedUrl)) {
    return res.status(400).json({ error: 'Invalid URL.', code: 'INVALID_URL' });
  }
  if (process.env.YOUTUBE_ONLY === 'true' && !isYouTubeUrl(decodedUrl)) {
    return res.status(400).json({ error: 'Only YouTube URLs are supported.', code: 'UNSUPPORTED_DOMAIN' });
  }

  // ── Determine output file extension and MIME type ─────────────────────────
  const isAudio    = format === 'mp3' || format === 'm4a';
  const ext        = format === 'mp3' ? 'mp3' : format === 'm4a' ? 'm4a' : 'mp4';
  const mime       = isAudio
    ? (format === 'mp3' ? 'audio/mpeg' : 'audio/mp4')
    : 'video/mp4';

  const qualityLabel = {
    '4k': '4K-2160p', '2k': '2K-1440p', '1080': '1080p',
    '720': '720p', '480': '480p', '360': '360p',
    'mp3': 'audio-320kbps', 'm4a': 'audio-m4a',
  }[format] || format;

  const filename = `video-${qualityLabel}.${ext}`;

  // ── Set response headers ──────────────────────────────────────────────────
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Format', format);
  // Allow the frontend to read these custom headers cross-origin
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Format');

  console.log(`[GET /download] ${req.ip} | format=${format} | ${decodedUrl}`);

  // ── Start the download stream ─────────────────────────────────────────────
  let handles;
  try {
    handles = downloadStream(decodedUrl, format, res);
  } catch (err) {
    console.error('[GET /download] spawn error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to start download.', code: 'SPAWN_ERROR' });
    }
    return;
  }

  // ── Handle client disconnect — kill yt-dlp & ffmpeg immediately ───────────
  req.on('close', () => {
    console.log(`[GET /download] client disconnected — killing processes`);
    if (handles?.proc)       handles.proc.kill('SIGKILL');
    if (handles?.ffmpegProc) handles.ffmpegProc.kill('SIGKILL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/video/formats
//
// Returns the list of available format IDs and their descriptions.
// Useful for the frontend to build the format picker dynamically.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/formats', (req, res) => {
  res.json({
    success: true,
    formats: [
      { id: '4k',   label: '4K',    desc: '2160p Ultra HD', type: 'video' },
      { id: '2k',   label: '2K',    desc: '1440p Quad HD',  type: 'video' },
      { id: '1080', label: '1080p', desc: 'Full HD',        type: 'video' },
      { id: '720',  label: '720p',  desc: 'HD Ready',       type: 'video' },
      { id: '480',  label: '480p',  desc: 'Standard',       type: 'video' },
      { id: '360',  label: '360p',  desc: 'Low Quality',    type: 'video' },
      { id: 'mp3',  label: 'MP3',   desc: '320 kbps Audio', type: 'audio' },
      { id: 'm4a',  label: 'M4A',   desc: 'AAC Audio',      type: 'audio' },
    ],
  });
});

module.exports = router;
