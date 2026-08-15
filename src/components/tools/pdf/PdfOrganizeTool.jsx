import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { LayoutGrid, RotateCw, Trash2, Download, Loader, FileText } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function PdfOrganizeTool() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // [{ index, rotation, thumbnail, deleted }]
  const [saving, setSaving] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [done, setDone] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const onDrop = useCallback(async (accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setDone(false);
    setDownloadUrl(null);
    const buf = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const ps = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.25 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      ps.push({ index: i - 1, rotation: 0, thumbnail: canvas.toDataURL(), deleted: false });
    }
    setPages(ps);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false,
  });

  const rotate = (i) => setPages(p => p.map((pg, idx) => idx === i ? { ...pg, rotation: (pg.rotation + 90) % 360 } : pg));
  const toggleDelete = (i) => setPages(p => p.map((pg, idx) => idx === i ? { ...pg, deleted: !pg.deleted } : pg));

  const handleDragStart = (i) => setDragIdx(i);
  const handleDrop = (i) => {
    if (dragIdx === null || dragIdx === i) return;
    setPages(p => {
      const a = [...p];
      const [item] = a.splice(dragIdx, 1);
      a.splice(i, 0, item);
      return a;
    });
    setDragIdx(null);
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const buf = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(buf);
      const newPdf = await PDFDocument.create();
      const active = pages.filter(p => !p.deleted);
      for (const pg of active) {
        const [copied] = await newPdf.copyPages(srcPdf, [pg.index]);
        copied.setRotation(degrees(pg.rotation));
        newPdf.addPage(copied);
      }
      const bytes = await newPdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setDownloadUrl(URL.createObjectURL(blob));
      setDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const activePagesCount = pages.filter(p => !p.deleted).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {!file ? (
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <LayoutGrid size={40} style={{ color: 'var(--accent-purple)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
            {isDragActive ? 'Drop your PDF here!' : 'Drag & drop a PDF file'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Visually reorder, rotate, and delete pages</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <FileText size={20} style={{ color: 'var(--accent-purple)' }} />
            <span style={{ fontWeight: 600 }}>{file.name}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{activePagesCount} / {pages.length} pages</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setFile(null); setPages([]); setDone(false); }}>Change File</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
            {pages.map((pg, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: pg.deleted ? '2px dashed rgba(244,63,94,0.5)' : '1px solid var(--border-default)',
                  overflow: 'hidden',
                  cursor: 'grab',
                  opacity: pg.deleted ? 0.4 : 1,
                  transition: 'all 0.2s',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ position: 'relative', background: '#fff' }}>
                  <img
                    src={pg.thumbnail}
                    alt={`Page ${pg.index + 1}`}
                    style={{
                      width: '100%', display: 'block',
                      transform: `rotate(${pg.rotation}deg)`,
                      transition: 'transform 0.3s',
                    }}
                  />
                </div>
                <div style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                    p.{pg.index + 1}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => rotate(i)} title="Rotate 90°" style={{ color: 'var(--accent-cyan)' }}>
                      <RotateCw size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleDelete(i)} title={pg.deleted ? 'Restore' : 'Delete'} style={{ color: pg.deleted ? 'var(--accent-emerald)' : 'var(--accent-red)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-purple btn-lg" onClick={save} disabled={saving || activePagesCount === 0} style={{ flex: 1, opacity: activePagesCount === 0 ? 0.5 : 1 }}>
              {saving ? <><Loader size={16} className="animate-spin" /> Saving...</> : `Save Organized PDF (${activePagesCount} pages)`}
            </button>
            {done && downloadUrl && (
              <a href={downloadUrl} download="organized.pdf" className="btn btn-emerald btn-lg">
                <Download size={16} /> Download
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
