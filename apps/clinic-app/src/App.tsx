import React, { useState, useCallback, useEffect, useRef } from 'react';
import Layout from './components/layout/Layout';
import { useKeyboard } from './hooks/useKeyboard';
import { authStore } from './app/store';
import { PAGE_PERMISSIONS } from './utils/permissions';
import { toast } from 'react-hot-toast';
import { AppRoutes, PAGE_MAP } from './app/routes';
import Login from './features/auth/Login';
import QueueMonitor from './pages/QueueMonitor';
import { isSupabaseConfigured } from './lib/supabase';

const FKEY_NAV_MAP = {
  help: 'help',
  journal: 'journal',
  inpatient: 'inpatient',
  analytics: 'analytics',
  cashier: 'cashier',
  settings: 'settings',
  dashboard: 'dashboard',
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('clinic_theme') || 'dark'; }
    catch { return 'dark'; }
  });
  
  const [authState, setAuthState] = useState(authStore.getState());
  const receptionRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('clinic_theme', theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const unsub = authStore.subscribe(setAuthState);
    return () => unsub();
  }, []);

  const handleNavigate = useCallback((page) => {
    const target = FKEY_NAV_MAP[page] || page;
    if (!authStore.hasPermission(target) && !authStore.hasRole('super_admin')) {
      toast.error('Bu bo\'limga kirishga ruxsat yo\'q');
      return;
    }

    if (PAGE_MAP[target]) setActivePage(target);
  }, []);

  const handleAction = useCallback((action) => {
    switch (action) {
      case 'newPatient': handleNavigate('reception'); break;
      case 'queueTicket': handleNavigate('queue'); break;
      case 'addService':
        if (activePage === 'reception') receptionRef.current?.focusServiceSearch();
        else { handleNavigate('reception'); setTimeout(() => receptionRef.current?.focusServiceSearch(), 100); }
        break;
      case 'payment':
        if (activePage === 'reception' && receptionRef.current) {
          if (receptionRef.current.isCheckPreviewOpen?.()) receptionRef.current.handleSaveAndPrint();
          else receptionRef.current.openCheckPreview();
        }
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        break;
      default: break;
    }
  }, [activePage, handleNavigate]);

  useKeyboard({ onNavigate: handleNavigate, onAction: handleAction });

  const isMonitor = new URLSearchParams(window.location.search).get('page') === 'monitor';
  if (isMonitor) {
    return <QueueMonitor />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', color: '#e2e8f0', fontFamily: 'sans-serif', padding: 32, textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#f8fafc' }}>
          Supabase sozlanmagan
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: 24, maxWidth: 480, lineHeight: 1.6 }}>
          Ilovani ishga tushirish uchun <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, color: '#38bdf8' }}>.env</code> faylini yarating
          va Supabase credentials ni kiriting.
        </p>
        <div style={{
          background: '#1e293b', borderRadius: 8, padding: '16px 24px',
          textAlign: 'left', fontSize: 14, color: '#7dd3fc', lineHeight: 2
        }}>
          <div>1. <strong style={{ color: '#e2e8f0' }}>.env.example</strong> → <strong style={{ color: '#e2e8f0' }}>.env</strong> nusxa oling</div>
          <div>2. <strong style={{ color: '#e2e8f0' }}>VITE_SUPABASE_URL</strong> ni to'ldiring</div>
          <div>3. <strong style={{ color: '#e2e8f0' }}>VITE_SUPABASE_ANON_KEY</strong> ni to'ldiring</div>
          <div>4. Ilovani qayta ishga tushiring</div>
        </div>
      </div>
    );
  }

  if (authState.isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return <Login />;
  }

  // Safety check
  const allowedRoles = PAGE_PERMISSIONS[activePage];
  const isAllowed = !allowedRoles || authStore.hasRole(...allowedRoles);
  const effectivePage = isAllowed ? activePage : 'dashboard';

  return (
    <Layout activePage={effectivePage} onNavigate={handleNavigate} theme={theme} onThemeChange={setTheme}>
      <AppRoutes 
        activePage={effectivePage} 
        receptionRef={receptionRef} 
        handleNavigate={handleNavigate} 
      />
    </Layout>
  );
}
