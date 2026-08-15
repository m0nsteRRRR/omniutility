import { useState } from 'react';
import {
  Search, Download, Play, Music, Film,
  AlertCircle, CheckCircle, Loader, User,
  Clock, Eye, ThumbsUp, RefreshCw, ExternalLink,
} from 'lucide-react';

// ── Backend URL ───────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Format definitions ────────────────────────────────────────────────────────
const ALL_FORMATS = [
  { id: '4k',   label: '4K',    desc: '2160p Ultra HD', type: 'video', icon: '🎬', color: 'var(--accent-cyan)' },
  { id: '2k',   label: '2K',    desc: '1440p Quad HD',  type: 'video', icon: '🎬', color: 'var(--accent-cyan)' },
  { id: '1080', label: '1080p', desc: 'Full HD',        type: 'video', icon: '🎞️',  color: 'var(--accent-blue)' },
  { id: '720',  label: '720p',  desc: 'HD Ready',       type: 'video', icon: '🎞️',  color: 'var(--accent-blue)' },
  { id: '480',  label: '480p',  desc: 'Standard',       type: 'video', icon: '📹', color: 'var(--text-secondary)' },
  { id: '360',  label: '360p',  desc: 'Low Quality',    type: 'video', icon: '📹', color: 'var(--text-muted)' },
  { id: 'mp3',  label: 'MP3',   desc: '320 kbps Audio', type: 'audio', icon: '🎵', color: 'var(--accent-magenta)' },
  { id: 'm4a',  label: 'M4A',   desc: 'AAC Audio',      type: 'audio', icon: '🎵', color: 'var(--accent-purple)' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseVideoId = (url) => {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const formatViews = (n) => {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function VideoDownloaderTool() {
  const [url,            setUrl]            = useState('');
  const [videoInfo,      setVideoInfo]      = useState(null);   // from backend
  const [videoId,        setVideoId]        = useState(null);   // for iframe
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [downloading,    setDownloading]    = useState(false);
  const [error,          setError]          = useState('');
  const [backendOnline,  setBackendOnline]  = useState(null);   // null=unknown

  // ── Check backend health ────────────────────────────────────────────────────
  const checkBackend = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
      setBackendOnline(res.ok);
      return res.ok;
    } catch {
      setBackendOnline(false);
      return false;
    }
  };

  // ── Fetch video info from backend ───────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setError('');
    setVideoInfo(null);
    setSelectedFormat(null);

    const trimmed = url.trim();
    const vid = parseVideoId(trimmed);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/video/info`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: trimmed }),
        signal:  AbortSignal.timeout(35_000),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `Server error ${res.status}`);
      }

      setVideoInfo(json.data);
      setVideoId(vid);
      setBackendOnline(true);
    } catch (err) {
      if (err.name === 'TimeoutError') {
        setError('Request timed out. The backend may be starting up — try again in a moment.');
      } else if (err.message.includes('fetch') || err.message.includes('network')) {
        setError('Cannot connect to the backend. Make sure Docker is running: docker compose up');
        setBackendOnline(false);
      } else {
        setError(err.message || 'Failed to fetch video info.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Trigger real download ───────────────────────────────────────────────────
  const handleDownload = () => {
    if (!selectedFormat || !videoInfo) return;
    setDownloading(true);

    // Build the download URL — browser will navigate to it, triggering the stream
    const downloadUrl = `${API_BASE}/api/video/download?url=${encodeURIComponent(videoInfo.webpage_url)}&format=${selectedFormat}`;

    // Create a hidden <a> and click it — browser downloads via Content-Disposition header
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Reset downloading state after a delay (we can't track streaming progress from the browser easily)
    setTimeout(() => setDownloading(false), 3000);
  };

  const fmt = ALL_FORMATS.find(f => f.id === selectedFormat);

  // Build the available format list: always show all 8, but mark which ones
  // the backend confirmed are actually available for this video
  const availableIds = new Set((videoInfo?.availableFormats || []).map(f => f.id));
  const formats = ALL_FORMATS.map(f => ({
    ...f,
    available: videoInfo ? availableIds.has(f.id) : true, // show all when no info yet
  }));

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>

      {/* ── Backend status banner ─────────────────────────────────────────── */}
      {backendOnline === false && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 'var(--radius-md)',
          background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.35)',
          marginBottom: 20,
        }}>
          <AlertCircle size={16} color="var(--accent-red)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: 13, margin: 0 }}>
              Backend not reachable
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '2px 0 0' }}>
              Start it with: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>docker compose up</code>
              {' '}from the project root.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={checkBackend} style={{ flexShrink: 0 }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── URL Input card ────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#FF0000',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Play size={18} color="#fff" fill="#fff" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 2 }}>Video Downloader</h3>
            <p style={{ fontSize: 13, margin: 0 }}>Paste a YouTube URL to fetch real video info</p>
          </div>
          {/* Backend status dot */}
          {backendOnline !== null && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: backendOnline ? 'var(--accent-emerald)' : 'var(--accent-red)',
                boxShadow: backendOnline ? '0 0 6px var(--accent-emerald)' : 'none',
              }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                {backendOnline ? 'Backend Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)',
            }} />
            <input
              type="text"
              className="input input-lg"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              style={{ paddingLeft: 42 }}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
            style={{ flexShrink: 0 }}
          >
            {loading
              ? <><Loader size={16} className="animate-spin" /> Fetching...</>
              : <><Search size={16} /> Get Info</>
            }
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, color: 'var(--accent-red)', fontSize: 13 }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try:</span>
          {['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=jNQXAC9IVRw'].map(u => (
            <button key={u} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setUrl(u)}>
              {u.slice(8, 38)}…
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ──────────────────────────────────────────────── */}
      {loading && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <div style={{ width: 120, height: 68, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 18, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 14, width: '40%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
              <div style={{ height: 12, width: '30%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
            </div>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <Loader size={14} className="animate-spin" style={{ display: 'inline', marginRight: 6 }} />
            Fetching video info via yt-dlp…
          </p>
        </div>
      )}

      {/* ── Video info + download ─────────────────────────────────────────── */}
      {videoInfo && !loading && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>

          {/* Thumbnail + meta */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
            {/* Thumbnail */}
            {videoInfo.thumbnail && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={videoInfo.thumbnail}
                  alt="Thumbnail"
                  style={{
                    width: 200, height: 112,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    display: 'block',
                  }}
                />
                {videoInfo.durationStr && (
                  <div style={{
                    position: 'absolute', bottom: 6, right: 6,
                    background: 'rgba(0,0,0,0.85)',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 4,
                  }}>
                    {videoInfo.durationStr}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ fontSize: 16, lineHeight: 1.4, marginBottom: 10, color: 'var(--text-primary)' }}>
                {videoInfo.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {videoInfo.uploader && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <User size={13} style={{ color: 'var(--text-muted)' }} />
                    {videoInfo.uploader}
                  </div>
                )}
                {videoInfo.durationStr && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    {videoInfo.durationStr}
                  </div>
                )}
                {videoInfo.viewCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <Eye size={13} style={{ color: 'var(--text-muted)' }} />
                    {formatViews(videoInfo.viewCount)} views
                  </div>
                )}
              </div>
              {videoInfo.webpage_url && (
                <a href={videoInfo.webpage_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 12, color: 'var(--accent-cyan)' }}>
                  <ExternalLink size={11} /> Open on YouTube
                </a>
              )}
            </div>
          </div>

          {/* Embedded player */}
          {videoId && (
            <div style={{
              position: 'relative', paddingBottom: '56.25%',
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              marginBottom: 24, background: '#000',
            }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
                title={videoInfo.title}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Format grid */}
          <h3 style={{ marginBottom: 6 }}>Select Format & Quality</h3>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            Formats confirmed available for this video are highlighted.
            {videoInfo.availableFormats?.length > 0 && (
              <span style={{ color: 'var(--accent-cyan)', marginLeft: 6 }}>
                {videoInfo.availableFormats.length} formats detected.
              </span>
            )}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
            {formats.map(f => {
              const isSelected  = selectedFormat === f.id;
              const unavailable = videoInfo && !f.available;
              return (
                <button
                  key={f.id}
                  onClick={() => !unavailable && setSelectedFormat(f.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected
                      ? `2px solid ${f.color}`
                      : unavailable
                        ? '1px solid rgba(255,255,255,0.04)'
                        : '1px solid var(--border-default)',
                    background: isSelected
                      ? `${f.color}18`
                      : unavailable
                        ? 'rgba(255,255,255,0.015)'
                        : 'rgba(255,255,255,0.03)',
                    cursor: unavailable ? 'not-allowed' : 'pointer',
                    opacity: unavailable ? 0.4 : 1,
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    boxShadow: isSelected ? `0 0 16px ${f.color}33` : 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{f.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: isSelected ? f.color : unavailable ? 'var(--text-dim)' : 'var(--text-primary)' }}>
                      {f.label}
                    </span>
                    {f.type === 'audio' && (
                      <span className="badge badge-purple" style={{ fontSize: 9 }}>Audio</span>
                    )}
                    {f.available && videoInfo && (
                      <CheckCircle size={10} color="var(--accent-emerald)" style={{ marginLeft: 'auto' }} />
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: unavailable ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                    {f.desc}
                  </span>
                  {unavailable && (
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600 }}>Not available</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Download button */}
          <button
            className="btn btn-primary btn-xl"
            onClick={handleDownload}
            disabled={!selectedFormat || downloading}
            style={{ width: '100%', opacity: !selectedFormat ? 0.5 : 1 }}
          >
            {downloading
              ? <><Loader size={18} className="animate-spin" /> Starting download…</>
              : selectedFormat
                ? <><Download size={18} /> Download {fmt?.label} — {fmt?.desc}</>
                : <><Download size={18} /> Select a format above</>
            }
          </button>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
            ✅ Real download powered by yt-dlp running in Docker. File streams directly to your browser.
          </p>
        </div>
      )}
    </div>
  );
}
