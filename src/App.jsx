import { useState, useMemo } from 'react';
import Canvas3D from './components/3d/Canvas3D';
import TiltCard from './components/ui/TiltCard';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// PDF Tools
import PdfMergeTool from './components/tools/pdf/PdfMergeTool';
import PdfSplitTool from './components/tools/pdf/PdfSplitTool';
import ImageToPdfTool from './components/tools/pdf/ImageToPdfTool';
import PdfToImageTool from './components/tools/pdf/PdfToImageTool';
import PdfWatermarkTool from './components/tools/pdf/PdfWatermarkTool';
import PdfOrganizeTool from './components/tools/pdf/PdfOrganizeTool';

// Media Tools
import VideoDownloaderTool from './components/tools/media/VideoDownloaderTool';
import AudioExtractorTool from './components/tools/media/AudioExtractorTool';

// Quick Tools
import QrCodeTool from './components/tools/quick/QrCodeTool';
import ImageCompressorTool from './components/tools/quick/ImageCompressorTool';

const ALL_TOOLS = [
  // PDF Suite
  {
    id: 'merge', category: 'pdf', label: 'Merge PDF', icon: '📄',
    desc: 'Combine multiple PDF files into a single document with custom ordering',
    color: 'var(--accent-cyan)', gradient: 'var(--grad-cyan)',
    badge: 'PDF', component: PdfMergeTool,
  },
  {
    id: 'split', category: 'pdf', label: 'Split PDF', icon: '✂️',
    desc: 'Extract individual pages or page ranges from any PDF file into separate files',
    color: 'var(--accent-magenta)', gradient: 'var(--grad-purple)',
    badge: 'PDF', component: PdfSplitTool,
  },
  {
    id: 'img2pdf', category: 'pdf', label: 'Image to PDF', icon: '🖼️',
    desc: 'Convert PNG, JPG and WebP images into a high-quality PDF document',
    color: 'var(--accent-emerald)', gradient: 'var(--grad-emerald)',
    badge: 'PDF', component: ImageToPdfTool,
  },
  {
    id: 'pdf2img', category: 'pdf', label: 'PDF to Image', icon: '📸',
    desc: 'Render PDF pages as high-resolution PNG or JPG images',
    color: 'var(--accent-blue)', gradient: 'linear-gradient(135deg, #4FACFE, #00F2FE)',
    badge: 'PDF', component: PdfToImageTool,
  },
  {
    id: 'watermark', category: 'pdf', label: 'Watermark PDF', icon: '🔏',
    desc: 'Add custom text watermarks with opacity, rotation and color settings',
    color: 'var(--accent-orange)', gradient: 'var(--grad-hot)',
    badge: 'PDF', component: PdfWatermarkTool,
  },
  {
    id: 'organize', category: 'pdf', label: 'Organize PDF', icon: '🗂️',
    desc: 'Reorder, rotate, and delete pages visually with drag-and-drop thumbnails',
    color: 'var(--accent-purple)', gradient: 'linear-gradient(135deg, #7000FF, #E040FB)',
    badge: 'PDF', component: PdfOrganizeTool,
  },
  // Media
  {
    id: 'video', category: 'media', label: 'Video Downloader', icon: '▶️',
    desc: 'Download YouTube videos in 4K, 1080p, 720p, or extract MP3 audio',
    color: '#FF0000', gradient: 'linear-gradient(135deg, #FF0000, #FF6B6B)',
    badge: 'Video', component: VideoDownloaderTool,
  },
  {
    id: 'audio', category: 'media', label: 'Audio Extractor', icon: '🎵',
    desc: 'Extract audio tracks from local video files directly in the browser',
    color: 'var(--accent-magenta)', gradient: 'var(--grad-purple)',
    badge: 'Audio', component: AudioExtractorTool,
  },
  // Quick
  {
    id: 'qr', category: 'quick', label: 'QR Code Generator', icon: '⬛',
    desc: 'Generate customizable QR codes with themes, download as PNG or SVG',
    color: 'var(--accent-cyan)', gradient: 'var(--grad-cyan)',
    badge: 'Quick', component: QrCodeTool,
  },
  {
    id: 'compress', category: 'quick', label: 'Image Compressor', icon: '📉',
    desc: 'Compress images with quality control and live before/after comparison',
    color: 'var(--accent-emerald)', gradient: 'var(--grad-emerald)',
    badge: 'Quick', component: ImageCompressorTool,
  },
];

const CATEGORY_META = {
  home: { title: 'All Tools', subtitle: 'Browse our complete collection of privacy-first utilities' },
  pdf: { title: 'PDF Suite', subtitle: 'Professional PDF processing tools — all running client-side' },
  media: { title: 'Media & Video', subtitle: 'Download, convert, and process video and audio files' },
  quick: { title: 'Quick Tools', subtitle: 'Fast utility tools for everyday tasks' },
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTool, setActiveTool] = useState(null);

  const filtered = useMemo(() => {
    let tools = ALL_TOOLS;
    if (activeCategory !== 'home') tools = tools.filter(t => t.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tools = tools.filter(t => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
    }
    return tools;
  }, [activeCategory, searchQuery]);

  const currentTool = ALL_TOOLS.find(t => t.id === activeTool);
  const ToolComponent = currentTool?.component;

  const openTool = (id) => {
    setActiveTool(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeTool = () => setActiveTool(null);

  const meta = CATEGORY_META[activeCategory] || CATEGORY_META.home;

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* 3D Background */}
      <Canvas3D />

      {/* Radial ambient glows */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 60% 40% at 20% 20%, rgba(0,242,254,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(112,0,255,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 50% 50%, rgba(16,185,129,0.03) 0%, transparent 60%)
        `,
      }} />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Header
          activeCategory={activeCategory}
          onCategoryChange={(cat) => { setActiveCategory(cat); setActiveTool(null); setSearchQuery(''); }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main>
          {/* Hero Section — only on home with no tool open */}
          {activeCategory === 'home' && !activeTool && !searchQuery && (
            <div style={{ textAlign: 'center', padding: '80px 24px 40px', maxWidth: 800, margin: '0 auto' }}>
              <div className="badge badge-cyan animate-fade" style={{ marginBottom: 20, display: 'inline-flex' }}>
                ⚡ 100% Client-Side · Zero Uploads · Private by Design
              </div>
              <h1 className="text-gradient-full animate-fade-up" style={{ marginBottom: 20 }}>
                Your All-in-One<br />Utility Suite
              </h1>
              <p className="animate-fade-up delay-100" style={{ fontSize: 18, maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.7 }}>
                PDF processing, video downloading, media conversion, QR code generation, and image compression — all running privately in your browser.
              </p>

              {/* Stat badges */}
              <div className="animate-fade-up delay-200" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  ['10+', 'Tools Available'],
                  ['0', 'Server Uploads'],
                  ['∞', 'Files Processed'],
                  ['100%', 'Free Forever'],
                ].map(([val, label]) => (
                  <div key={label} style={{
                    padding: '12px 20px', borderRadius: 'var(--radius-lg)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-default)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, background: 'var(--grad-cyan)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool View */}
          {activeTool && ToolComponent ? (
            <div className="page-container section">
              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
                <button className="btn btn-ghost btn-sm" onClick={closeTool} style={{ gap: 6 }}>
                  ← Back to Tools
                </button>
                <span style={{ color: 'var(--text-dim)' }}>/</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {currentTool.label}
                </span>
              </div>

              {/* Tool Header */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                    background: currentTool.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, flexShrink: 0,
                    boxShadow: `0 8px 24px ${currentTool.color}40`,
                  }}>
                    {currentTool.icon}
                  </div>
                  <div>
                    <h2 style={{ marginBottom: 6 }}>{currentTool.label}</h2>
                    <p style={{ fontSize: 15, maxWidth: 480 }}>{currentTool.desc}</p>
                  </div>
                </div>
                <div className="divider" />
              </div>

              <ToolComponent />
            </div>
          ) : (
            /* Tool Grid */
            <div className="page-container section">
              {/* Category header */}
              <div style={{ marginBottom: 36 }}>
                <h2 style={{ marginBottom: 8 }}>{meta.title}</h2>
                <p style={{ fontSize: 15 }}>{meta.subtitle}</p>
                {filtered.length === 0 && (
                  <div style={{ marginTop: 60, textAlign: 'center' }}>
                    <p style={{ fontSize: 18, color: 'var(--text-muted)' }}>
                      No tools found for "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>

              <div className="tool-grid">
                {filtered.map((tool, i) => (
                  <TiltCard
                    key={tool.id}
                    className={`animate-fade-up delay-${Math.min(i * 100, 400)}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      onClick={() => openTool(tool.id)}
                      style={{ padding: 24 }}
                    >
                      {/* Icon + Badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 'var(--radius-md)',
                          background: tool.gradient,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 24,
                          boxShadow: `0 6px 20px ${tool.color}40`,
                          transition: 'box-shadow 0.3s, transform 0.3s',
                        }}>
                          {tool.icon}
                        </div>
                        <span className={`badge ${tool.category === 'pdf' ? 'badge-cyan' : tool.category === 'media' ? 'badge-purple' : 'badge-emerald'}`}>
                          {tool.badge}
                        </span>
                      </div>

                      {/* Info */}
                      <h3 style={{ marginBottom: 8, fontSize: 16 }}>{tool.label}</h3>
                      <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{tool.desc}</p>

                      {/* CTA */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 13, fontWeight: 700,
                        color: tool.color,
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: 16,
                      }}>
                        <span>Open Tool</span>
                        <span style={{ transition: 'transform 0.2s' }}>→</span>
                      </div>
                    </div>
                  </TiltCard>
                ))}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
