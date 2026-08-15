import { useState } from 'react';
import { Search, Zap, FileText, Video, Code, ChevronDown } from 'lucide-react';

const categories = [
  { id: 'home', label: 'Home', icon: Zap },
  { id: 'pdf', label: 'PDF Suite', icon: FileText },
  { id: 'media', label: 'Media & Video', icon: Video },
  { id: 'quick', label: 'Quick Tools', icon: Code },
];

export default function Header({ activeCategory, onCategoryChange, searchQuery, onSearchChange }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(8,12,20,0.85)',
      backdropFilter: 'blur(24px) saturate(2)',
      WebkitBackdropFilter: 'blur(24px) saturate(2)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
    }}>
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, height: 68 }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #00F2FE, #7000FF)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0,242,254,0.4)',
              flexShrink: 0,
            }}>
              <Zap size={20} color="#fff" fill="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                <span className="text-gradient-cyan">Omni</span>
                <span style={{ color: 'var(--text-primary)' }}>Utility</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Suite
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isActive ? 'rgba(0,242,254,0.1)' : 'transparent',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-main)',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(0,242,254,0.25)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Icon size={14} />
                  <span className="nav-label">{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Search */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Search size={15} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="input"
              style={{ paddingLeft: 36, width: 200, fontSize: 13 }}
            />
          </div>

          {/* Privacy Badge */}
          <div className="badge badge-emerald" style={{ flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', display: 'inline-block' }} />
            100% Private
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .nav-label { display: none; }
        }
      `}</style>
    </header>
  );
}
