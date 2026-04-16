import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ClinicProfileModal from './ClinicProfileModal';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export default function Layout({ children, activePage, onNavigate, theme, onThemeChange }: LayoutProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      <div className="app-layout" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Sidebar
          activePage={activePage}
          onNavigate={onNavigate}
          theme={theme}
          onThemeChange={onThemeChange}
        />
        <main
          className="main-content"
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            height: '100%',
            position: 'relative',
          }}
        >
          {activePage === 'subscription' && (
            <div style={{ position: 'absolute', top: 15, right: 25, zIndex: 100 }}>
              <button
                onClick={() => setShowProfile(true)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px 16px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontWeight: 600,
                  transition: '0.2s',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.transform = 'scale(1.02)')
                }
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) =>
                  (e.currentTarget.style.transform = 'scale(1)')
                }
              >
                <span style={{ fontSize: 18 }}>🏥</span>
                MedCenter InnoClinic
              </button>
            </div>
          )}
          {children}
        </main>
        <ClinicProfileModal
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
}
