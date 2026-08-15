import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { Stamp, FileText, Download, Loader } from 'lucide-react';

export default function PdfWatermarkTool() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(45);
  const [color, setColor] = useState('#ff0000');
  const [applying, setApplying] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [done, setDone] = useState(false);

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setDone(false);
    setDownloadUrl(null);
    const buf = await f.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    setPageCount(pdf.getPageCount());
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false,
  });

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    return rgb(r, g, b);
  };

  const applyWatermark = async () => {
    if (!file || !text.trim()) return;
    setApplying(true);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buf);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const c = hexToRgb(color);

      pdf.getPages().forEach(page => {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: width / 2 - textWidth / 2,
          y: height / 2 - fontSize / 2,
          size: fontSize,
          font,
          color: c,
          opacity,
          rotate: degrees(rotation),
        });
      });

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {!file ? (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <Stamp size={40} style={{ color: 'var(--accent-orange)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
            {isDragActive ? 'Drop your PDF here!' : 'Drag & drop a PDF file'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add a custom text watermark to every page</p>
        </div>
      ) : (
        <div>
          <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <FileText size={24} style={{ color: 'var(--accent-orange)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pageCount} pages</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setDone(false); setDownloadUrl(null); }}>Change</button>
            </div>

            {/* Watermark Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Watermark Text
                </label>
                <input
                  type="text"
                  className="input input-lg"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="CONFIDENTIAL"
                  maxLength={40}
                />
              </div>

              {/* Preview */}
              <div style={{
                position: 'relative', height: 140, background: '#fff',
                borderRadius: 'var(--radius-md)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--border-default)',
              }}>
                <div style={{
                  position: 'absolute',
                  fontSize: fontSize * 0.6,
                  fontWeight: 700,
                  color: color,
                  opacity,
                  transform: `rotate(${rotation}deg)`,
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-main)',
                  letterSpacing: '0.05em',
                  userSelect: 'none',
                }}>
                  {text || 'WATERMARK'}
                </div>
                <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 10, color: '#aaa', background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: 4 }}>
                  Live Preview
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Font Size: {fontSize}pt
                  </label>
                  <input type="range" min={12} max={120} value={fontSize} onChange={e => setFontSize(+e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Opacity: {Math.round(opacity * 100)}%
                  </label>
                  <input type="range" min={5} max={100} value={opacity * 100} onChange={e => setOpacity(+e.target.value / 100)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Rotation: {rotation}°
                  </label>
                  <input type="range" min={-90} max={90} value={rotation} onChange={e => setRotation(+e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)}
                      style={{ width: 48, height: 44, padding: 4, background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                    {['#ff0000','#0000ff','#000000','#808080'].map(c => (
                      <button key={c} onClick={() => setColor(c)} style={{
                        width: 28, height: 28, borderRadius: 6, background: c,
                        border: color === c ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                        cursor: 'pointer', flexShrink: 0,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-lg" onClick={applyWatermark} disabled={applying || !text.trim()} style={{
                flex: 1,
                background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-red))',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(251,146,60,0.3)',
                border: 'none',
                opacity: !text.trim() ? 0.5 : 1,
              }}>
                {applying ? <><Loader size={16} className="animate-spin" /> Applying...</> : 'Apply Watermark'}
              </button>
              {done && downloadUrl && (
                <a href={downloadUrl} download="watermarked.pdf" className="btn btn-emerald btn-lg">
                  <Download size={16} /> Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
