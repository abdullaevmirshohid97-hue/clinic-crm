import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { authStore } from '../../app/store';
import { supabase } from '../../lib/supabase';
import { PAGE_PERMISSIONS } from '../../utils/permissions';

const NAV_GROUPS = [
  {
    title: 'Operations',
    items: [
      { key: 'dashboard', icon: '🏠', fKey: 'F1' },
      { key: 'reception', icon: '📝', fKey: 'F2' },
      { key: 'queue', icon: '🎫', fKey: 'F3' },
      { key: 'inpatient', icon: '🛌', fKey: 'F6' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { key: 'laboratory', icon: '🧪', badge: 'lab' },
      { key: 'pharmacy', icon: '💊' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { key: 'cashier', icon: '💰', fKey: 'F10' },
      { key: 'journal', icon: '🧾', fKey: 'F4' },
      { key: 'analytics', icon: '📊', fKey: 'F7' },
    ],
  },
  {
    title: 'System',
    items: [
      { key: 'marketing', icon: '📣' },
      { key: 'archive', icon: '📂' },
      { key: 'staff', icon: '👥' },
      { key: 'subscription', icon: '💳' },
      { key: 'settings', icon: '⚙️', fKey: 'F9' },
    ],
  },
];

export default function Sidebar({
  activePage,
  onNavigate,
  theme,
  onThemeChange,
}: {
  activePage: string;
  onNavigate: any;
  theme: string;
  onThemeChange: any;
}) {
  const { t, lang, setLang } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [badges, setBadges] = useState({ lab: 0, inv: 0, debt: 0 });
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const [timeState, setTimeState] = useState({ time: '', date: '' });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeState({
        time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase(),
      });
    };
    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadBadges() {
      try {
        const { count: labCount } = await supabase
          .from('laboratory_tests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        // Note: Comparing currentStock to minStock column requires a more advanced filter or a view in Supabase.
        // For now we do a simple check or retrieve count.
        const { count: invCount } = await supabase
          .from('inventory')
          .select('*', { count: 'exact', head: true });
        setBadges({
          lab: labCount || 0,
          inv: invCount || 0,
          debt: 0,
        });
      } catch (e) {
        /* ignore */
      }
    }
    loadBadges();
    const bInterval = setInterval(loadBadges, 30000); // Update every 30s
    return () => clearInterval(bInterval);
  }, []);

  const themes = [
    { key: 'dark', label: '🌙' },
    { key: 'light', label: '☀️' },
    { key: 'classic', label: '🏥' },
  ];

  const langs = [
    { key: 'uz', flag: '🇺🇿' },
    { key: 'ru', flag: '🇷🇺' },
    { key: 'en', flag: '🇬🇧' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div
          className="sidebar-logo"
          onClick={() => onNavigate('dashboard')}
          onDoubleClick={() => setShowAboutModal(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '5px 0',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L2 12C2 12 8 13 12 22C16 13 22 12 22 12L12 2Z" fill="url(#eagleGrad)" />
              <path d="M12 22C16 13 22 12 22 12L12 2V22Z" fill="#7C3AED" />
              <defs>
                <linearGradient
                  id="eagleGrad"
                  x1="2"
                  y1="2"
                  x2="22"
                  y2="22"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#A78BFA" />
                  <stop offset="1" stopColor="#4F46E5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="logo-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#000000',
                }}
              >
                CLARY
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  marginTop: '-2px',
                }}
              >
                Cloud System
              </span>
            </div>
          )}
        </div>
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="sidebar-nav custom-scrollbar">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item: any) => {
            return authStore.hasPermission(item.key) || authStore.hasRole('super_admin');
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="nav-group">
              {visibleItems.map((item: any) => (
                <button
                  key={item.key}
                  className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                  onClick={() => onNavigate(item.key)}
                  title={isCollapsed ? (t('sidebar.' + item.key) as string) : ''}
                >
                  <div className="nav-icon-wrapper">
                    <span className="nav-icon">{item.icon}</span>
                    {item.badge && (badges as any)[item.badge] > 0 && (
                      <span className="nav-badge">{(badges as any)[item.badge]}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="nav-label">
                        {(t('sidebar.' + item.key) as string) ||
                          item.key.charAt(0).toUpperCase() + item.key.slice(1)}
                      </span>
                      {item.fKey && <span className="nav-fkey">{item.fKey}</span>}
                    </>
                  )}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <div
        className="sidebar-bottom"
        style={{
          padding: '20px 15px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
        }}
      >
        {/* WORLD STANDARD CTO CLOCK WIDGET */}
        {!isCollapsed ? (
          <div
            style={{
              background: 'var(--bg-input)',
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 15,
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  letterSpacing: '1px',
                }}
              >
                LOCAL TIME
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {timeState.date}
              </span>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: '1px',
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {timeState.time}
            </div>
          </div>
        ) : (
          <div
            style={{
              marginBottom: 15,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 800,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              paddingBottom: 10,
            }}
          >
            {timeState.time}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: isCollapsed ? 'center' : 'space-between',
            alignItems: 'center',
          }}
        >
          {/* THEME SELECTOR */}
          <div style={{ position: 'relative', flex: isCollapsed ? 'none' : 1 }}>
            <button
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowLangMenu(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px' : '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>
                  {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🏥'}
                </span>
                {!isCollapsed && <span style={{ fontSize: 13, fontWeight: 600 }}>Mode</span>}
              </div>
              {!isCollapsed && <span style={{ opacity: 0.5, fontSize: 10 }}>▲</span>}
            </button>

            {showThemeMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: 0,
                  width: isCollapsed ? '150px' : '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  zIndex: 100,
                  boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
                }}
              >
                {themes.map((th) => (
                  <button
                    key={th.key}
                    onClick={() => {
                      onThemeChange(th.key);
                      setShowThemeMenu(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: theme === th.key ? 'var(--bg-input)' : 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      transition: '0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
                    onMouseLeave={(e) => {
                      if (theme !== th.key) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{th.label}</span> {th.key.charAt(0).toUpperCase() + th.key.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LANG SELECTOR */}
          <div style={{ position: 'relative', flex: isCollapsed ? 'none' : 1 }}>
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
                setShowThemeMenu(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px' : '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🌍</span>
                {!isCollapsed && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{lang.toUpperCase()}</span>
                )}
              </div>
              {!isCollapsed && <span style={{ opacity: 0.5, fontSize: 10 }}>▲</span>}
            </button>

            {showLangMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  right: 0,
                  width: isCollapsed ? '150px' : '100%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 12,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  zIndex: 100,
                  boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
                }}
              >
                {langs.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => {
                      (setLang as any)(l.key);
                      setShowLangMenu(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: lang === l.key ? 'var(--bg-input)' : 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      transition: '0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-input)')}
                    onMouseLeave={(e) => {
                      if (lang !== l.key) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{l.flag}</span> {l.key.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ABOUT CLARY MODAL */}
      {showAboutModal && (
        <div
          onClick={() => setShowAboutModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 850,
              background: 'var(--bg-main)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 24,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '30px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(124,58,237,0.1), transparent)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: 'linear-gradient(135deg, #A78BFA, #4F46E5)',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 20px rgba(124,58,237,0.3)',
                  }}
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 12C2 12 8 13 12 22C16 13 22 12 22 12L12 2Z"
                      fill="#ffffff"
                      opacity="0.9"
                    />
                    <path d="M12 22C16 13 22 12 22 12L12 2V22Z" fill="#ffffff" />
                  </svg>
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      letterSpacing: '2px',
                      margin: 0,
                      color: 'var(--text-primary)',
                    }}
                  >
                    CLARY <span style={{ color: '#8b5cf6' }}>CLOUD SYSTEM</span>
                  </h2>
                  <p
                    style={{
                      margin: '5px 0 0',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Next-Generation HMS • Ver 2.4.0 (Enterprise)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 24,
                  cursor: 'pointer',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{
                padding: '30px',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 30,
              }}
            >
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
                <div>
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: '#8b5cf6',
                      marginBottom: 10,
                    }}
                  >
                    Bizning Missiyamiz
                  </h4>
                  <p
                    style={{
                      fontSize: 16,
                      lineHeight: '1.6',
                      color: 'var(--text-secondary)',
                      margin: 0,
                    }}
                  >
                    Sog'liqni saqlash tizimlarida innovatsion boshqaruv va raqamli transformatsiyani
                    joriy etish. Bemorlar tezligini oshirish va daromad shaffofligini ta'minlash.
                  </p>
                </div>

                <div>
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: '#8b5cf6',
                      marginBottom: 10,
                    }}
                  >
                    Klinikalarga Qanday Yordam Beramiz?
                  </h4>
                  <ul
                    style={{
                      paddingLeft: 20,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      color: 'var(--text-primary)',
                      fontSize: 15,
                    }}
                  >
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        100% Raqamlashtirish.
                      </strong>{' '}
                      Navbat kutish va qabul vaqtini 3 barobarga qisqartirish.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Advanced Fintech.</strong>{' '}
                      Click, Payme va kartali to'lovlar integratsiyali billing tizimi.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Kuchli Xavfsizlik.</strong>{' '}
                      Bank darajasidagi AES-256 shifrlash tizimlari yordamida himoya qilingan
                      bazalar.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: '#10b981',
                      marginBottom: 15,
                    }}
                  >
                    Litsenziyalar va Standartlar
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: '#10b981' }}>✓</span> SaaS License #UZ-2026-X19
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: '#10b981' }}>✓</span> SSV "E-Sog'liqni saqlash"
                      Tavsiyalari
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: '#10b981' }}>✓</span> HIPAA xalqaro standart talablari
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: '#10b981' }}>✓</span> Soliq.uz (Fiskal modul) tayyorligi
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '6px 12px',
                      background: 'rgba(59,130,246,0.1)',
                      color: '#3b82f6',
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    SLA 99.9% 24/7 Support
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '6px 12px',
                      background: 'rgba(245,158,11,0.1)',
                      color: '#f59e0b',
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    Google Cloud Partner
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '6px 12px',
                      background: 'rgba(139,92,246,0.1)',
                      color: '#8b5cf6',
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    Stripe Billing
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '15px 30px',
                background: 'var(--bg-card)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                fontSize: 12,
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>© {new Date().getFullYear()} Clary Lab. Barcha huquqlar himoyalangan.</span>
              <span style={{ fontWeight: 600 }}>Powered by Advanced Tech</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
