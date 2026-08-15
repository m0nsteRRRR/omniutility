import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument } from 'pdf-lib';
import { FilePlus, Trash2, Download, MoveUp, MoveDown, FileText, Loader } from 'lucide-react';

export default function PdfMergeTool() {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map(f => ({ file: f, id: Math.random().toString(36).slice(2) }));
    setFiles(prev => [...prev, ...newFiles]);
    setDone(false);
    setDownloadUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true,
  });

  const remove = (id) => setFiles(f => f.filter(x => x.id !== id));
  const moveUp = (i) => {
    if (i === 0) return;
    setFiles(f => { const a = [...f]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  };
  const moveDown = (i) => {
    setFiles(f => { if (i === f.length - 1) return f; const a = [...f]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; });
  };

  const merge = async () => {
    if (files.length < 2) return;
    setMerging(true);
    setProgress(0);
    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const buf = await files[i].file.arrayBuffer();
        const pdf = await PDFDocument.load(buf);
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{ marginBottom: 24 }}>
        <input {...getInputProps()} />
        <FilePlus size={40} style={{ color: 'var(--accent-cyan)', marginBottom: 14, display: 'block', margin: '0 auto 14px' }} />
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
          {isDragActive ? 'Drop your PDF files here!' : 'Drag & drop PDF files here'}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>or click to browse — Add multiple PDFs to merge</p>
      </div>

      {files.length > 0 && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h4 style={{ color: 'var(--text-primary)' }}>Files to merge ({files.length})</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFiles([]); setDone(false); setDownloadUrl(null); }}>
              Clear All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {files.map((f, i) => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}>
                <FileText size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.file.name}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {(f.file.size / 1024).toFixed(0)} KB
                </span>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => moveUp(i)} title="Move up">
                    <MoveUp size={13} />
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => moveDown(i)} title="Move down">
                    <MoveDown size={13} />
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => remove(f.id)} title="Remove"
                    style={{ color: 'var(--accent-red)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {merging && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Merging PDFs...</span>
            <span style={{ fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 700 }}>{progress}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={merge}
          disabled={files.length < 2 || merging}
          style={{ flex: 1, opacity: files.length < 2 ? 0.5 : 1 }}
        >
          {merging ? <><Loader size={16} className="animate-spin" /> Merging...</> : 'Merge PDFs'}
        </button>
        {done && downloadUrl && (
          <a
            href={downloadUrl}
            download="merged.pdf"
            className="btn btn-emerald btn-lg"
          >
            <Download size={16} /> Download
          </a>
        )}
      </div>

      {files.length < 2 && files.length > 0 && (
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--accent-yellow)', textAlign: 'center' }}>
          ⚡ Add at least 2 PDF files to merge
        </p>
      )}
    </div>
  );
}
