'use strict';

const express = require('express');
const router  = express.Router();

  getVideoInfo,
  downloadStream,
  startBackgroundDownload,
  isYouTubeUrl,
  isSafeUrl,
} = require('../utils/ytdlp');
const { getJob, createJob, jobs } = require('../utils/jobStore');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

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
// POST /api/video/download
//
// Body: { url, format }
// Starts a background download job and returns jobId
// ─────────────────────────────────────────────────────────────────────────────
router.post('/download', downloadLimiter, (req, res) => {
  const { url, format } = req.body;

  const VALID_FORMATS = ['4k', '2k', '1080', '720', '480', '360', 'mp3', 'm4a'];

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing "url" in request body.', code: 'MISSING_URL' });
  }
  if (!format || !VALID_FORMATS.includes(format)) {
    return res.status(400).json({ error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}`, code: 'INVALID_FORMAT' });
  }

  if (!isSafeUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL.', code: 'INVALID_URL' });
  }
  if (process.env.YOUTUBE_ONLY === 'true' && !isYouTubeUrl(url)) {
    return res.status(400).json({ error: 'Only YouTube URLs are supported.', code: 'UNSUPPORTED_DOMAIN' });
  }

  const jobId = uuidv4();
  createJob(jobId, url, format);

  // Start background process
  try {
    startBackgroundDownload(jobId, url, format);
    return res.json({ success: true, jobId });
  } catch (err) {
    console.error('[POST /download] spawn error:', err.message);
    jobs.delete(jobId);
    return res.status(500).json({ error: 'Failed to start download.', code: 'SPAWN_ERROR' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/video/download/:jobId
//
// Returns job progress
// ─────────────────────────────────────────────────────────────────────────────
router.get('/download/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found', code: 'JOB_NOT_FOUND' });
  }

  res.json({
    success: true,
    status: job.status,
    progress: job.progress,
    error: job.errorMsg
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/video/download/:jobId/file
//
// Streams the completed file to the user and cleans up the job
// ─────────────────────────────────────────────────────────────────────────────
router.get('/download/:jobId/file', (req, res) => {
  const jobId = req.params.jobId;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found', code: 'JOB_NOT_FOUND' });
  }

  if (job.status !== 'completed' || !job.filePath) {
    return res.status(400).json({ error: 'Job not ready or file missing', code: 'JOB_NOT_READY' });
  }

  if (!fs.existsSync(job.filePath)) {
    jobs.delete(jobId);
    return res.status(404).json({ error: 'File no longer exists on server', code: 'FILE_MISSING' });
  }

  const format = job.format;
  const isAudio = format === 'mp3' || format === 'm4a';
  const ext = format === 'mp3' ? 'mp3' : format === 'm4a' ? 'm4a' : 'mp4';
  const mime = isAudio ? (format === 'mp3' ? 'audio/mpeg' : 'audio/mp4') : 'video/mp4';

  const qualityLabel = {
    '4k': '4K-2160p', '2k': '2K-1440p', '1080': '1080p',
    '720': '720p', '480': '480p', '360': '360p',
    'mp3': 'audio-320kbps', 'm4a': 'audio-m4a',
  }[format] || format;

  const filename = `video-${qualityLabel}.${ext}`;

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Format', format);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Format');

  const stat = fs.statSync(job.filePath);
  if (!res.headersSent) {
    res.setHeader('Content-Length', stat.size);
  }

  const fileStream = fs.createReadStream(job.filePath);
  fileStream.pipe(res);

  fileStream.on('close', () => {
    // Delete file and job after serving
    try {
      fs.unlinkSync(job.filePath);
    } catch (e) {}
    jobs.delete(jobId);
  });

  fileStream.on('error', (e) => {
    console.error('[stream error]', e.message);
    try { fs.unlinkSync(job.filePath); } catch (e) {}
    jobs.delete(jobId);
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
