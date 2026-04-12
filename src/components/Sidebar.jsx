import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { db } from '../utils/db';

const NAV_GROUPS = [
  {
    title: 'Operations',
    items: [
      { key: 'dashboard', icon: '🏠', fKey: 'F1' },
      { key: 'reception', icon: '📝', fKey: 'F2' },
      { key: 'queue', icon: '🎫', fKey: 'F3' },
      { key: 'inpatient', icon: '🛌', fKey: 'F6' },
    ]
  },
  {
    title: 'Resources',
    items: [
      { key: 'laboratory', icon: '🧪', badge: 'lab' },
      { key: 'pharmacy', icon: '💊' },
    ]
  },
  {
    title: 'Finance',
    items: [
      { key: 'cashier', icon: '💰', fKey: 'F10' },
      { key: 'journal', icon: '🧾', fKey: 'F4' },
      { key: 'analytics', icon: '📊', fKey: 'F7' },
    ]
  },
  {
    title: 'System',
    items: [
      { key: 'marketing', icon: '📣' },
      { key: 'archive', icon: '📂' },
      { key: 'staff', icon: '👥' },
      { key: 'settings', icon: '⚙️', fKey: 'F9' },
    ]
  }
];

export default function Sidebar({ activePage, onNavigate, theme, onThemeChange }) {
  const { t, lang, setLang } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [clock, setClock] = useState('');
  const [badges, setBadges] = useState({ lab: 0, inv: 0, debt: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadBadges() {
      try {
        const { count: labCount } = await supabase.from('laboratory_tests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        // Note: Comparing currentStock to minStock column requires a more advanced filter or a view in Supabase.
        // For now we do a simple check or retrieve count.
        const { count: invCount } = await supabase.from('inventory').select('*', { count: 'exact', head: true }); 
        setBadges({ 
          lab: labCount || 0, 
          inv: invCount || 0 
        });
      } catch (e) { /* ignore */ }
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
        <div className="sidebar-logo">
          <div className="logo-icon">✚</div>
          {!isCollapsed && (
            <div className="logo-text">
              <span className="logo-title">Clinic PRO</span>
              <span className="logo-subtitle">HMS Edition</span>
            </div>
          )}
        </div>
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="sidebar-nav custom-scrollbar">
        {NAV_GROUPS.map(group => (
          <div key={group.title} className="nav-group">
            {!isCollapsed && <div className="nav-group-title">{group.title}</div>}
            {group.items.map(item => (
              <button
                key={item.key}
                className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                onClick={() => onNavigate(item.key)}
                title={isCollapsed ? t('sidebar.' + item.key) : ''}
              >
                <div className="nav-icon-wrapper">
                  <span className="nav-icon">{item.icon}</span>
                  {item.badge && badges[item.badge] > 0 && (
                    <span className="nav-badge">{badges[item.badge]}</span>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="nav-label">{t('sidebar.' + item.key) || item.key.charAt(0).toUpperCase() + item.key.slice(1)}</span>
                    {item.fKey && <span className="nav-fkey">{item.fKey}</span>}
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {!isCollapsed && <div className="sidebar-clock">{clock}</div>}
        
        <div className="sidebar-lang">
          {langs.map(l => (
            <button
              key={l.key}
              className={`lang-btn ${lang === l.key ? 'active' : ''}`}
              onClick={() => setLang(l.key)}
            >
              {l.flag}
            </button>
          ))}
        </div>

        <div className="sidebar-themes">
          {themes.map(th => (
            <button
              key={th.key}
              className={`theme-btn ${theme === th.key ? 'active' : ''}`}
              onClick={() => onThemeChange(th.key)}
            >
              {th.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
