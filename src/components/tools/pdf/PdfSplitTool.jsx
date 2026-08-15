import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { Scissors, FileText, Download, Loader } from 'lucide-react';

export default function PdfSplitTool() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState('all'); // 'all' | 'range'
  const [range, setRange] = useState('');
  const [splitting, setSplitting] = useState(false);
  const [progress, setProgress] = useState(0);
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

  const parseRange = (str, max) => {
    const pages = new Set();
    str.split(',').forEach(part => {
      const [a, b] = part.trim().split('-').map(Number);
      if (b) for (let i = a; i <= Math.min(b, max); i++) pages.add(i - 1);
      else if (a) pages.add(a - 1);
    });
    return [...pages].sort((a, b) => a - b);
  };

  const split = async () => {
    if (!file) return;
    setSplitting(true);
    setProgress(0);
    try {
      const buf = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(buf);
      const total = srcPdf.getPageCount();
      const indices = mode === 'all' ? Array.from({ length: total }, (_, i) => i) : parseRange(range, total);
      
      const zip = new JSZip();
      for (let i = 0; i < indices.length; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(srcPdf, [indices[i]]);
        newPdf.addPage(page);
        const bytes = await newPdf.save();
        zip.file(`page-${indices[i] + 1}.pdf`, bytes);
        setProgress(Math.round(((i + 1) / indices.length) * 100));
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {!file ? (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <Scissors size={40} style={{ color: 'var(--accent-purple)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
            {isDragActive ? 'Drop your PDF here!' : 'Drag & drop a PDF file'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>or click to browse</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <FileText size={24} style={{ color: 'var(--accent-purple)' }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>{file.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pageCount} pages · {(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPageCount(0); setDone(false); setDownloadUrl(null); }}>
              Change
            </button>
          </div>

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[['all', 'Extract All Pages'], ['range', 'Custom Range']].map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)} className={`btn btn-sm ${mode === v ? 'btn-purple' : 'btn-ghost'}`} style={{ flex: 1 }}>
                {l}
              </button>
            ))}
          </div>

          {mode === 'range' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Page Range (e.g., 1-3, 5, 7-9) — Total: {pageCount} pages
              </label>
              <input
                type="text"
                className="input"
                placeholder="1-3, 5, 7-9"
                value={range}
                onChange={e => setRange(e.target.value)}
              />
            </div>
          )}

          {splitting && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Splitting pages...</span>
                <span style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 700 }}>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--grad-purple)' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-purple btn-lg" onClick={split} disabled={splitting} style={{ flex: 1 }}>
              {splitting ? <><Loader size={16} className="animate-spin" /> Splitting...</> : <>Split PDF</>}
            </button>
            {done && downloadUrl && (
              <a href={downloadUrl} download="split-pages.zip" className="btn btn-emerald btn-lg">
                <Download size={16} /> Download ZIP
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
