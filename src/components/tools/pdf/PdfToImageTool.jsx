import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import * as pdfjsLib from 'pdfjs-dist';
import { FileImage, Download, Loader, FileText } from 'lucide-react';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function PdfToImageTool() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [format, setFormat] = useState('png');
  const [scale, setScale] = useState(2);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [done, setDone] = useState(false);

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setDone(false);
    setDownloadUrl(null);
    setPreviews([]);
    const buf = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    setPageCount(pdf.numPages);
    // Generate first-page preview
    const page = await pdf.getPage(1);
    const vp = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    setPreviews([canvas.toDataURL()]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false,
  });

  const convert = async () => {
    if (!file) return;
    setConverting(true);
    setProgress(0);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const zip = new JSZip();
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        const base64 = dataUrl.split(',')[1];
        zip.file(`page-${i}.${format}`, base64, { base64: true });
        setProgress(Math.round((i / pdf.numPages) * 100));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
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
      {!file ? (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <FileImage size={40} style={{ color: 'var(--accent-cyan)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
            {isDragActive ? 'Drop your PDF here!' : 'Drag & drop a PDF file'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Convert each page to a high-resolution PNG or JPG image</p>
        </div>
      ) : (
        <div>
          <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <FileText size={24} style={{ color: 'var(--accent-cyan)' }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pageCount} pages · {(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreviews([]); setDone(false); }}>Change</button>
            </div>

            {previews.length > 0 && (
              <div style={{ marginBottom: 20, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                <img src={previews[0]} alt="Page 1 preview" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#fff', display: 'block' }} />
                <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)' }}>
                  Preview: Page 1
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Format</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['png', 'jpg'].map(f => (
                    <button key={f} onClick={() => setFormat(f)} className={`btn btn-sm ${format === f ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
                      .{f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Quality: {scale === 1 ? '72 DPI' : scale === 2 ? '144 DPI (HD)' : '216 DPI (4K)'}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[[1,'SD'],[2,'HD'],[3,'4K']].map(([v,l]) => (
                    <button key={v} onClick={() => setScale(v)} className={`btn btn-sm ${scale === v ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {converting && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Rendering pages...</span>
                  <span style={{ fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 700 }}>{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary btn-lg" onClick={convert} disabled={converting} style={{ flex: 1 }}>
                {converting ? <><Loader size={16} className="animate-spin" /> Rendering...</> : 'Convert to Images'}
              </button>
              {done && downloadUrl && (
                <a href={downloadUrl} download="pdf-pages.zip" className="btn btn-emerald btn-lg">
                  <Download size={16} /> Download ZIP
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
