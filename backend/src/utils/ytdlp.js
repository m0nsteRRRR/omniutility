/**
 * ytdlp.js — Core yt-dlp wrapper utilities
 *
 * All interactions with the yt-dlp binary go through these helpers.
 * We use child_process.spawn (not exec) so we can:
 *  - Stream download output directly to the HTTP response
 *  - Avoid buffering entire files in memory
 *  - Kill the process if the client disconnects
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');
const { updateJob } = require('./jobStore');

// ── Config ────────────────────────────────────────────────────────────────────
const YTDLP_BIN  = process.env.YTDLP_PATH  || 'yt-dlp';
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';
const TEMP_DIR   = process.env.TEMP_DIR    || '/tmp/ytdlp-scratch';

// ── Cookies support ───────────────────────────────────────────────────────────
function getCookiesPath() {
  if (process.env.YTDLP_COOKIES_B64) {
    try {
      const cookiesPath = '/tmp/yt-cookies.txt';
      fs.writeFileSync(cookiesPath, Buffer.from(process.env.YTDLP_COOKIES_B64, 'base64').toString('utf8'));
      return cookiesPath;
    } catch (e) {
      console.warn('[ytdlp] Failed to write cookies file from env:', e.message);
    }
  }
  const possiblePaths = [
    path.join(process.cwd(), 'cookies.txt'),
    path.join(__dirname, '../../cookies.txt'),
    path.join(__dirname, '../cookies.txt'),
    '/tmp/yt-cookies.txt',
    '/app/cookies.txt'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.statSync(p).size > 10) {
      return p;
    }
  }
  return null;
}

/**
 * Returns the base yt-dlp args shared across all calls.
 * Injects --cookies and proper User-Agent.
 * @param {string} playerClient  e.g. 'default', 'web,android', 'tv_embedded,ios'
 * @returns {string[]}
 */
function baseArgs(playerClient = 'default') {
  const cookies = getCookiesPath();
  const args = [
    '--no-warnings',
    '--no-check-certificates',
    '--socket-timeout', '30',
    '--age-limit', '99',
  ];

  if (cookies) {
    args.push(
      '--cookies', cookies,
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );
  } else {
    args.push(
      '--user-agent', 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
    );
  }

  if (playerClient && playerClient !== 'default') {
    args.push('--extractor-args', `youtube:player_client=${playerClient}`);
  }

  return args;
}

// Supported YouTube-like domains
const YOUTUBE_DOMAINS = [
  'youtube.com', 'youtu.be', 'www.youtube.com',
  'm.youtube.com', 'music.youtube.com',
];

// ── Validators ────────────────────────────────────────────────────────────────

/**
 * Checks whether a URL is a valid YouTube URL.
 * @param {string} url
 * @returns {boolean}
 */
function isYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    return YOUTUBE_DOMAINS.some(d => parsed.hostname === d);
  } catch {
    return false;
  }
}

/**
 * Basic URL sanity check — must be http/https, no shell metacharacters.
 * @param {string} url
 * @returns {boolean}
 */
function isSafeUrl(url) {
  if (typeof url !== 'string' || url.length > 2048) return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // Block shell metacharacters that could escape the argument
    if (/[;&|`$<>\\]/.test(url)) return false;
    return true;
  } catch {
    return false;
  }
}

// ── Format Helpers ────────────────────────────────────────────────────────────

/**
 * Maps our frontend format IDs to yt-dlp format selectors.
 *
 * yt-dlp format strings:
 *  - "bestvideo[height<=N]+bestaudio/best[height<=N]" for video
 *  - "bestaudio" for audio-only
 *  - "/best" fallback ensures something always downloads
 */
const FORMAT_SELECTORS = {
  '4k':   'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]/best',
  '2k':   'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best[height<=1440]/best',
  '1080': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
  '720':  'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]/best',
  '480':  'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]/best',
  '360':  'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best[height<=360]/best',
  'mp3':  'bestaudio/best',
  'm4a':  'bestaudio[ext=m4a]/bestaudio/best',
};

/**
 * Get the yt-dlp format selector string for a given frontend format ID.
 * @param {string} formatId
 * @returns {string}
 */
function getFormatSelector(formatId) {
  return FORMAT_SELECTORS[formatId] || FORMAT_SELECTORS['720'];
}

// ── Video Info ─────────────────────────────────────────────────────────────────

/**
 * Fetches video metadata from yt-dlp --dump-json.
 * Returns a cleaned-up object safe to send to the frontend.
 *
 * @param {string} url
 * @returns {Promise<object>}
 */
/**
 * Attempts yt-dlp --dump-json with the given player_client arg.
 * Resolves with raw JSON string or rejects with stderr.
 * @param {string} url
 * @param {string} playerClient  e.g. 'tv_embedded,ios'
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
function _ytdlpDumpJson(url, playerClient, timeoutMs) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-playlist',
      ...baseArgs(playerClient),
      url,
    ];

    const proc = spawn(YTDLP_BIN, args, { env: { ...process.env } });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => { stderr += c.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('timeout'));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr));
      resolve(stdout);
    });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

/**
 * Fetches video metadata, trying multiple player clients in order.
 * tv_embedded + ios bypass YouTube's cloud-IP sign-in blocks best.
 */
function getVideoInfo(url) {
  const hasCookies = !!getCookiesPath();
  const CLIENTS = hasCookies
    ? ['default', 'web,android', 'mweb,ios', 'tv_embedded,ios']
    : ['tv_embedded,ios', 'tv_embedded,web_creator', 'web_creator,ios', 'mweb,ios', 'android,ios'];

  return new Promise(async (resolve, reject) => {
    console.log(`[yt-dlp] info: ${url}`);
    let lastError = null;

    for (const client of CLIENTS) {
      try {
        console.log(`[yt-dlp] trying player_client=${client}`);
        const stdout = await _ytdlpDumpJson(url, client, 35_000);
        const raw = JSON.parse(stdout);
        console.log(`[yt-dlp] success with client=${client}`);
        return resolve(sanitizeVideoInfo(raw));
      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        // Only retry on sign-in / auth errors — fail fast on real errors
        const isAuthError = msg.includes('Sign in') || msg.includes('age-restricted') ||
                            msg.includes('login') || msg.includes('unavailable') ||
                            msg.includes('timeout');
        if (!isAuthError) break;
        console.warn(`[yt-dlp] client=${client} failed: ${msg.slice(0, 120)} — trying next`);
      }
    }

    reject(new Error(parseYtdlpError(lastError?.message || '')));
  });
}

/**
 * Strips raw yt-dlp JSON down to what the frontend needs.
 * @param {object} raw
 * @returns {object}
 */
function sanitizeVideoInfo(raw) {
  // Build available quality list from formats
  const qualityMap = {};
  (raw.formats || []).forEach((f) => {
    const h = f.height;
    if (!h || f.vcodec === 'none') return; // audio-only formats, skip for video list
    const key = h <= 360 ? '360' : h <= 480 ? '480' : h <= 720 ? '720' : h <= 1080 ? '1080' : h <= 1440 ? '2k' : '4k';
    if (!qualityMap[key]) qualityMap[key] = { id: key, height: h, hasVideo: true };
  });

  // Always include audio options if there are any audio streams
  const hasAudio = (raw.formats || []).some(f => f.acodec !== 'none');
  if (hasAudio) {
    qualityMap['mp3'] = { id: 'mp3', height: 0, hasVideo: false };
    qualityMap['m4a'] = { id: 'm4a', height: 0, hasVideo: false };
  }

  return {
    id:          raw.id,
    title:       raw.title || 'Unknown Title',
    uploader:    raw.uploader || raw.channel || 'Unknown',
    thumbnail:   raw.thumbnail || null,
    duration:    raw.duration || 0,
    durationStr: raw.duration_string || formatDuration(raw.duration),
    viewCount:   raw.view_count || 0,
    likeCount:   raw.like_count || null,
    uploadDate:  raw.upload_date || null,
    description: (raw.description || '').slice(0, 300),
    webpage_url: raw.webpage_url || raw.original_url,
    availableFormats: Object.values(qualityMap),
  };
}

/**
 * Format seconds into HH:MM:SS or MM:SS string.
 * @param {number} secs
 * @returns {string}
 */
function formatDuration(secs) {
  if (!secs) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ── Download Stream ────────────────────────────────────────────────────────────

/**
 * Spawns yt-dlp and pipes output to the provided writable stream (HTTP response).
 * For MP3: yt-dlp extracts audio and FFmpeg transcodes to mp3 on the fly.
 * For video: yt-dlp merges video+audio using FFmpeg and pipes mp4 to stdout.
 *
 * @param {string}   url       - Video URL
 * @param {string}   formatId  - One of: 4k, 2k, 1080, 720, 480, 360, mp3, m4a
 * @param {import('http').ServerResponse} res - Express response object to pipe into
 * @returns {{ proc: ChildProcess, ffmpegProc: ChildProcess|null }} - so callers can kill on disconnect
 */
function downloadStream(url, formatId, res) {
  const selector = getFormatSelector(formatId);
  const isAudio  = formatId === 'mp3' || formatId === 'm4a';
  const ext      = formatId === 'mp3' ? 'mp3' : formatId === 'm4a' ? 'm4a' : 'mp4';
  const mime     = isAudio
    ? (formatId === 'mp3' ? 'audio/mpeg' : 'audio/mp4')
    : 'video/mp4';

  console.log(`[yt-dlp] download: ${url} | format: ${formatId} | selector: ${selector}`);

  // ── MP3 path: yt-dlp → pipe raw audio → FFmpeg → mp3 ──────────────────────
  if (formatId === 'mp3') {
    const ytdlpArgs = [
      '--no-playlist',
      ...baseArgs('tv_embedded,ios'),
      '-f', selector,
      '-o', '-',       // pipe to stdout
      url,
    ];

    const ffmpegArgs = [
      '-hide_banner', '-loglevel', 'error',
      '-i', 'pipe:0',   // stdin from yt-dlp
      '-vn',            // no video
      '-acodec', 'libmp3lame',
      '-ab', '320k',
      '-ar', '44100',
      '-f', 'mp3',
      'pipe:1',         // stdout → response
    ];

    const ytProc = spawn(YTDLP_BIN, ytdlpArgs, { env: { ...process.env } });
    const ffProc = spawn(FFMPEG_BIN, ffmpegArgs, { env: { ...process.env } });

    // Pipe yt-dlp → ffmpeg → response
    ytProc.stdout.pipe(ffProc.stdin);
    ffProc.stdout.pipe(res);

    ytProc.stderr.on('data', d => console.error('[yt-dlp stderr]', d.toString().trim()));
    ffProc.stderr.on('data', d => console.error('[ffmpeg stderr]', d.toString().trim()));

    ytProc.on('error', (e) => { console.error('[yt-dlp error]', e.message); res.end(); });
    ffProc.on('error', (e) => { console.error('[ffmpeg error]', e.message); res.end(); });
    ffProc.on('close', (code) => {
      if (code !== 0) console.error(`[ffmpeg] exited with code ${code}`);
    });

    return { proc: ytProc, ffmpegProc: ffProc };
  }

  // ── M4A path: yt-dlp → pipe m4a directly ──────────────────────────────────
  if (formatId === 'm4a') {
    const ytdlpArgs = [
      '--no-playlist',
      ...baseArgs('tv_embedded,ios'),
      '-f', selector,
      '--merge-output-format', 'm4a',
      '-o', '-',
      url,
    ];
    const ytProc = spawn(YTDLP_BIN, ytdlpArgs, { env: { ...process.env } });
    ytProc.stdout.pipe(res);
    ytProc.stderr.on('data', d => console.error('[yt-dlp stderr]', d.toString().trim()));
    ytProc.on('error', (e) => { console.error('[yt-dlp error]', e.message); res.end(); });
    return { proc: ytProc, ffmpegProc: null };
  }

  // ── Video path: yt-dlp merges video+audio → mp4 ───────────────────────────
  const { v4: uuidv4 } = require('uuid');
  const os   = require('os');
  const fs   = require('fs');
  const tmpFile = path.join(TEMP_DIR, `${uuidv4()}.mp4`);

  const ytdlpArgs = [
    '--no-playlist',
    ...baseArgs('tv_embedded,ios'),
    '-f', selector,
    '--merge-output-format', 'mp4',
    '--ffmpeg-location', FFMPEG_BIN,
    '-o', tmpFile,
    url,
  ];

  const ytProc = spawn(YTDLP_BIN, ytdlpArgs, { env: { ...process.env } });

  ytProc.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (msg) console.log('[yt-dlp]', msg);
  });

  ytProc.on('error', (e) => {
    console.error('[yt-dlp error]', e.message);
    cleanup(tmpFile);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  });

  ytProc.on('close', (code) => {
    if (code !== 0) {
      console.error(`[yt-dlp] exited with code ${code}`);
      cleanup(tmpFile);
      if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
      return;
    }

    // Stream the temp file to response
    const stat = fs.statSync(tmpFile);
    if (!res.headersSent) {
      res.setHeader('Content-Length', stat.size);
    }

    const fileStream = fs.createReadStream(tmpFile);
    fileStream.pipe(res);
    fileStream.on('close', () => cleanup(tmpFile));
    fileStream.on('error', (e) => {
      console.error('[stream error]', e.message);
      cleanup(tmpFile);
    });
  });

  return { proc: ytProc, ffmpegProc: null };
}

// ── Background Download ───────────────────────────────────────────────────────

/**
 * Starts a background download and updates progress in the job store.
 * @param {string} jobId 
 * @param {string} url 
 * @param {string} formatId 
 */
function startBackgroundDownload(jobId, url, formatId) {
  const { v4: uuidv4 } = require('uuid');
  const selector = getFormatSelector(formatId);
  const isAudio  = formatId === 'mp3' || formatId === 'm4a';
  const ext      = formatId === 'mp3' ? 'mp3' : formatId === 'm4a' ? 'm4a' : 'mp4';
  const tmpFile  = path.join(TEMP_DIR, `${uuidv4()}.${ext}`);

  console.log(`[yt-dlp bg] job: ${jobId} | ${url} | format: ${formatId}`);

  let ytdlpArgs = [
    '--no-playlist',
    ...baseArgs('tv_embedded,ios'),
    '-f', selector,
    '--newline', // Force newline to parse progress
  ];

  if (isAudio) {
    if (formatId === 'mp3') {
      ytdlpArgs.push('-x', '--audio-format', 'mp3', '--audio-quality', '320K', '--ffmpeg-location', FFMPEG_BIN);
    } else {
      ytdlpArgs.push('-x', '--audio-format', 'm4a', '--ffmpeg-location', FFMPEG_BIN);
    }
    // yt-dlp's post-processor appends the extension, so we strip it for the -o template
    ytdlpArgs.push('-o', tmpFile.replace(/\.(mp3|m4a)$/, ''));
  } else {
    ytdlpArgs.push('--merge-output-format', 'mp4', '--ffmpeg-location', FFMPEG_BIN, '-o', tmpFile);
  }
  
  ytdlpArgs.push(url);

  const proc = spawn(YTDLP_BIN, ytdlpArgs, { env: { ...process.env } });

  updateJob(jobId, { proc, filePath: tmpFile });

  // Parse progress from stdout
  proc.stdout.on('data', (d) => {
    const lines = d.toString().split('\n');
    for (const line of lines) {
      // Look for: [download]  12.3% of 50MiB...
      const match = line.match(/\[download\]\s+([\d\.]+)%/);
      if (match && match[1]) {
        const pct = parseFloat(match[1]);
        if (!isNaN(pct)) {
          updateJob(jobId, { progress: pct });
        }
      } else if (line.includes('[ExtractAudio]') || line.includes('[Merger]')) {
        updateJob(jobId, { status: 'merging' });
      }
    }
  });

  let stderr = '';
  proc.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  proc.on('error', (e) => {
    console.error(`[yt-dlp bg error] job ${jobId}:`, e.message);
    cleanup(tmpFile);
    updateJob(jobId, { status: 'error', errorMsg: e.message });
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log(`[yt-dlp bg completed] job ${jobId}`);
      updateJob(jobId, { status: 'completed', progress: 100 });
    } else {
      console.error(`[yt-dlp bg failed] job ${jobId} exited ${code}`);
      cleanup(tmpFile);
      const errMsg = parseYtdlpError(stderr);
      updateJob(jobId, { status: 'error', errorMsg: errMsg });
    }
  });
}

// ── Error Parsing ─────────────────────────────────────────────────────────────

/**
 * Converts raw yt-dlp stderr into a user-friendly error message.
 * @param {string} stderr
 * @returns {string}
 */
function parseYtdlpError(stderr) {
  if (!stderr) return 'Unknown yt-dlp error';
  if (stderr.includes('Video unavailable')) return 'This video is unavailable or private.';
  if (stderr.includes('age-restricted'))   return 'This video is age-restricted and cannot be downloaded without login.';
  if (stderr.includes('Sign in'))          return 'This video requires sign-in. Age-restricted or members-only content.';
  if (stderr.includes('copyright'))        return 'This video is blocked due to copyright in your region.';
  if (stderr.includes('Premieres in'))     return 'This video has not premiered yet.';
  if (stderr.includes('live event'))       return 'Live streams cannot be downloaded while airing.';
  if (stderr.includes('HTTP Error 429'))   return 'YouTube rate limit hit. Please wait a few minutes and try again.';
  if (stderr.includes('HTTP Error 403'))   return 'Access forbidden. The video may be geo-blocked.';
  return stderr.replace(/ERROR:\s*/g, '').slice(0, 200) || 'Failed to fetch video. Try again or check the URL.';
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function cleanup(filePath) {
  const fs = require('fs');
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); }
  catch (e) { console.warn('[cleanup] could not delete', filePath, e.message); }
}

module.exports = {
  getVideoInfo,
  downloadStream,
  startBackgroundDownload,
  isYouTubeUrl,
  isSafeUrl,
  getFormatSelector,
  YOUTUBE_DOMAINS,
};
