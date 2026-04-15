import React, { useState, useCallback, useEffect, useRef } from 'react';
import Layout from './components/layout/Layout';
import { useKeyboard } from './hooks/useKeyboard';
import { authStore } from './app/store';
import { PAGE_PERMISSIONS } from './utils/permissions';
import { toast } from 'react-hot-toast';
import { AppRoutes, PAGE_MAP } from './app/routes';
import Login from './features/auth/Login';
import QueueMonitor from './pages/QueueMonitor';

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
