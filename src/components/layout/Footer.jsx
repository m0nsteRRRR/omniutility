import { Shield, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      marginTop: 80,
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(6,9,16,0.9)',
      backdropFilter: 'blur(20px)',
    }}>
      <div className="page-container" style={{ padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
          
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, #00F2FE, #7000FF)',
                borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={17} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 15 }}>
                <span className="text-gradient-cyan">Omni</span>Utility Suite
              </span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 220 }}>
              All-in-one privacy-first utility suite. Every operation runs locally in your browser — your files never leave your device.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <Shield size={14} color="var(--accent-emerald)" />
              <span style={{ fontSize: 12, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                100% Client-Side — Zero Uploads
              </span>
            </div>
          </div>

          {/* PDF Tools */}
          <div>
            <h4 style={{ marginBottom: 14, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>PDF Suite</h4>
            {['Merge PDF', 'Split PDF', 'Image to PDF', 'PDF to Image', 'Watermark PDF', 'Organize PDF'].map(t => (
              <div key={t} style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '4px 0', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--accent-cyan)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
              >{t}</div>
            ))}
          </div>

          {/* Media Tools */}
          <div>
            <h4 style={{ marginBottom: 14, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Media & Video</h4>
            {['Video Downloader', 'Audio Extractor', 'Format Converter'].map(t => (
              <div key={t} style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '4px 0', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--accent-magenta)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
              >{t}</div>
            ))}
          </div>

          {/* Quick Tools */}
          <div>
            <h4 style={{ marginBottom: 14, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Quick Tools</h4>
            {['QR Code Generator', 'Image Compressor'].map(t => (
              <div key={t} style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '4px 0', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--accent-emerald)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}
              >{t}</div>
            ))}
          </div>
        </div>

        <div className="divider" style={{ marginBottom: 20 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            © 2026 OmniUtility Suite. Built with ❤️ using React + Three.js
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms of Use', 'Open Source'].map(l => (
              <span key={l} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
              >{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
