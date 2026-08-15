import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Minimize2, Download, ImageIcon, ArrowRight } from 'lucide-react';

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export default function ImageCompressorTool() {
  const [original, setOriginal] = useState(null);
  const [compressed, setCompressed] = useState(null);
  const [quality, setQuality] = useState(80);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [format, setFormat] = useState('jpeg');
  const [compressing, setCompressing] = useState(false);

  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new window.Image();
    img.onload = () => {
      setOriginal({ file: f, url, width: img.naturalWidth, height: img.naturalHeight });
      setCompressed(null);
    };
    img.src = url;
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }, multiple: false,
  });

  const compress = () => {
    if (!original) return;
    setCompressing(true);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (format === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
      const dataUrl = canvas.toDataURL(mimeType, quality / 100);
      const byteStr = atob(dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteStr.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
      const blob = new Blob([ab], { type: mimeType });
      setCompressed({ url: dataUrl, blob, size: blob.size, width: w, height: h });
      setCompressing(false);
    };
    img.src = original.url;
  };

  const download = () => {
    if (!compressed) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(compressed.blob);
    a.download = `compressed.${format}`;
    a.click();
  };

  const savings = compressed ? Math.round((1 - compressed.size / original.file.size) * 100) : 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {!original ? (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <Minimize2 size={40} style={{ color: 'var(--accent-cyan)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
            {isDragActive ? 'Drop your image here!' : 'Drag & drop an image'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>PNG, JPG, WebP supported — compressed in-browser, nothing uploaded</p>
        </div>
      ) : (
        <div>
          {/* Settings */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Quality: {quality}%
              </label>
              <input type="range" min={5} max={100} value={quality} onChange={e => setQuality(+e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Max Width: {maxWidth}px
              </label>
              <input type="range" min={100} max={4000} step={100} value={maxWidth} onChange={e => setMaxWidth(+e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Output Format
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['jpeg','png','webp'].map(f => (
                  <button key={f} onClick={() => setFormat(f)} className={`btn btn-sm ${format === f ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 12 }}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Before / After */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            {/* Original */}
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Original</div>
              <img src={original.url} alt="Original" style={{ width: '100%', height: 200, objectFit: 'contain', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Size</span>
                  <span style={{ fontWeight: 600 }}>{formatBytes(original.file.size)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Dimensions</span>
                  <span style={{ fontWeight: 600 }}>{original.width}×{original.height}</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ArrowRight size={24} style={{ color: 'var(--accent-cyan)' }} />
              {compressed && savings > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div className="badge badge-emerald" style={{ fontSize: 13, padding: '4px 10px' }}>-{savings}%</div>
                  <div style={{ fontSize: 11, color: 'var(--accent-emerald)', marginTop: 4, fontWeight: 700 }}>Saved!</div>
                </div>
              )}
            </div>

            {/* Compressed */}
            <div className="glass-card" style={{ padding: 16, opacity: compressed ? 1 : 0.4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Compressed</div>
              {compressed ? (
                <>
                  <img src={compressed.url} alt="Compressed" style={{ width: '100%', height: 200, objectFit: 'contain', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Size</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{formatBytes(compressed.size)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Dimensions</span>
                      <span style={{ fontWeight: 600 }}>{compressed.width}×{compressed.height}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={40} style={{ color: 'var(--text-dim)' }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-lg" onClick={() => { setOriginal(null); setCompressed(null); }} style={{ flexShrink: 0 }}>
              Change Image
            </button>
            <button className="btn btn-primary btn-lg" onClick={compress} disabled={compressing} style={{ flex: 1 }}>
              {compressing ? 'Compressing...' : 'Compress Image'}
            </button>
            {compressed && (
              <button className="btn btn-emerald btn-lg" onClick={download} style={{ flexShrink: 0 }}>
                <Download size={16} /> Download
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
