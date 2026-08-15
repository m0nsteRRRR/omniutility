import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, PageSizes } from 'pdf-lib';
import { ImageIcon, Trash2, Download, Loader, ArrowUp, ArrowDown } from 'lucide-react';

const PAGE_SIZES = {
  A4: PageSizes.A4,
  Letter: PageSizes.Letter,
  Legal: [612, 1008],
  A5: [419.53, 595.28],
};

export default function ImageToPdfTool() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState(20);
  const [converting, setConverting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [done, setDone] = useState(false);

  const onDrop = useCallback((accepted) => {
    const items = accepted.map(f => ({ file: f, id: Math.random().toString(36).slice(2), preview: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...items]);
    setDone(false);
    setDownloadUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }, multiple: true,
  });

  const remove = (id) => setImages(imgs => imgs.filter(i => i.id !== id));
  const moveUp = (i) => setImages(imgs => { if (i === 0) return imgs; const a = [...imgs]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  const moveDown = (i) => setImages(imgs => { if (i === imgs.length - 1) return imgs; const a = [...imgs]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; });

  const convert = async () => {
    if (images.length === 0) return;
    setConverting(true);
    try {
      const pdf = await PDFDocument.create();
      let [w, h] = PAGE_SIZES[pageSize];
      if (orientation === 'landscape') [w, h] = [h, w];
      const m = margin;

      for (const item of images) {
        const bytes = await item.file.arrayBuffer();
        let img;
        if (item.file.type === 'image/png') img = await pdf.embedPng(bytes);
        else img = await pdf.embedJpg(bytes);
        const page = pdf.addPage([w, h]);
        const { width, height } = img.scaleToFit(w - m * 2, h - m * 2);
        const x = (w - width) / 2;
        const y = (h - height) / 2;
        page.drawImage(img, { x, y, width, height });
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ marginBottom: 24 }}>
        <input {...getInputProps()} />
        <ImageIcon size={40} style={{ color: 'var(--accent-emerald)', margin: '0 auto 14px', display: 'block' }} />
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
          {isDragActive ? 'Drop images here!' : 'Drag & drop images (PNG, JPG, WebP)'}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Each image becomes a page in the PDF</p>
      </div>

      {/* Settings */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Page Size</label>
          <select className="input" value={pageSize} onChange={e => setPageSize(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
            {Object.keys(PAGE_SIZES).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Orientation</label>
          <select className="input" value={orientation} onChange={e => setOrientation(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Margin: {margin}px
          </label>
          <input type="range" min={0} max={80} value={margin} onChange={e => setMargin(+e.target.value)} />
        </div>
      </div>

      {/* Image list */}
      {images.length > 0 && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4>{images.length} image{images.length !== 1 ? 's' : ''} added</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => setImages([])}>Clear</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {images.map((img, i) => (
              <div key={img.id} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                <img src={img.preview} alt={img.file.name} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0)',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  opacity: 0,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.7)'; e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0'; }}
                >
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => moveUp(i)} style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}><ArrowUp size={12} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => moveDown(i)} style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}><ArrowDown size={12} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(img.id)} style={{ color: 'var(--accent-red)', background: 'rgba(255,255,255,0.1)' }}><Trash2 size={12} /></button>
                </div>
                <div style={{ padding: '4px 6px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, background: 'rgba(0,0,0,0.7)' }}>
                  {i + 1}. {img.file.name.slice(0, 10)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-emerald btn-lg" onClick={convert} disabled={images.length === 0 || converting} style={{ flex: 1, opacity: images.length === 0 ? 0.5 : 1 }}>
          {converting ? <><Loader size={16} className="animate-spin" /> Converting...</> : 'Convert to PDF'}
        </button>
        {done && downloadUrl && (
          <a href={downloadUrl} download="images.pdf" className="btn btn-primary btn-lg">
            <Download size={16} /> Download PDF
          </a>
        )}
      </div>
    </div>
  );
}
