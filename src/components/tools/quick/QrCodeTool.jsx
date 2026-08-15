import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, RefreshCw } from 'lucide-react';

const PRESETS = ['https://example.com', 'Hello, World!', 'mailto:hello@example.com', '+1234567890'];
const STYLES = [
  { id: 'dark', label: 'Dark', fg: '#00F2FE', bg: '#080C14' },
  { id: 'purple', label: 'Purple', fg: '#E040FB', bg: '#0B0015' },
  { id: 'emerald', label: 'Emerald', fg: '#10B981', bg: '#001A10' },
  { id: 'classic', label: 'Classic', fg: '#000000', bg: '#FFFFFF' },
  { id: 'inv', label: 'Inverted', fg: '#FFFFFF', bg: '#000000' },
];

export default function QrCodeTool() {
  const [text, setText] = useState('https://omniunility.app');
  const [style, setStyle] = useState(STYLES[0]);
  const [size, setSize] = useState(300);
  const [errorLevel, setErrorLevel] = useState('M');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    generate();
  }, [text, style, size, errorLevel]);

  const generate = async () => {
    if (!text.trim()) return;
    try {
      const url = await QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        errorCorrectionLevel: errorLevel,
        color: { dark: style.fg, light: style.bg },
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadPng = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'qrcode.png';
    a.click();
  };

  const downloadSvg = async () => {
    const svgStr = await QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin: 2,
      errorCorrectionLevel: errorLevel,
      color: { dark: style.fg, light: style.bg },
    });
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qrcode.svg';
    a.click();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Content
            </label>
            <textarea
              className="input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter URL, text, phone number..."
              style={{ minHeight: 80, resize: 'vertical', fontFamily: 'var(--font-main)' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button key={p} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setText(p)}>
                  {p.slice(0, 20)}
                </button>
              ))}
            </div>
          </div>

          {/* Color Style */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Color Theme
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: style.id === s.id ? `2px solid var(--accent-cyan)` : '1px solid var(--border-default)',
                    background: style.id === s.id ? 'rgba(0,242,254,0.08)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: s.fg, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Size: {size}×{size}px
            </label>
            <input type="range" min={100} max={600} step={50} value={size} onChange={e => setSize(+e.target.value)} />
          </div>

          {/* Error Correction */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Error Correction
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['L','7%'],['M','15%'],['Q','25%'],['H','30%']].map(([v, pct]) => (
                <button key={v} onClick={() => setErrorLevel(v)} className={`btn btn-sm ${errorLevel === v ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{v}</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{pct}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Download buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={downloadPng} style={{ flex: 1 }}>
              <Download size={15} /> Download PNG
            </button>
            <button className="btn btn-purple" onClick={downloadSvg} style={{ flex: 1 }}>
              <Download size={15} /> Download SVG
            </button>
          </div>
        </div>

        {/* QR Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            padding: 16, borderRadius: 'var(--radius-lg)',
            background: style.bg,
            border: '2px solid var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 220, height: 220, borderRadius: 4 }} />
            ) : (
              <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={60} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 220 }}>
            Scan with any QR reader app
          </p>
        </div>
      </div>
    </div>
  );
}
