import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import Layout from './components/Layout';
import { useKeyboard } from './hooks/useKeyboard';
import { useTranslation } from './i18n/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import { LanguageProvider } from './i18n/LanguageContext';

import Dashboard from './pages/Dashboard';
import PatientsToday from './pages/PatientsToday';
import Reception from './pages/Reception';
import Queue from './pages/Queue';
import Inpatient from './pages/Inpatient';
import Journal from './pages/Journal';
import Analytics from './pages/Analytics';
import Cashier from './pages/Cashier';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Laboratory from './pages/Laboratory';
import Marketing from './pages/Marketing';
import Archive from './pages/Archive';
import StaffManagement from './pages/StaffManagement';
import AuthMock from './components/AuthMock';

const PAGE_MAP = {
  dashboard: Dashboard,
  patientsToday: PatientsToday,
  reception: Reception,
  queue: Queue,
  inpatient: Inpatient,
  journal: Journal,
  analytics: Analytics,
  cashier: Cashier,
  settings: Settings,
  help: Help,
  laboratory: Laboratory,
  marketing: Marketing,
  archive: Archive,
  staff: StaffManagement,
};

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

  const receptionRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('clinic_theme', theme); } catch {}
  }, [theme]);

  const handleNavigate = useCallback((page) => {
    const target = FKEY_NAV_MAP[page] || page;
    if (PAGE_MAP[target]) setActivePage(target);
  }, []);

  const handleAction = useCallback((action) => {
    switch (action) {
      case 'newPatient':
        setActivePage('reception');
        break;
      case 'queueTicket':
        setActivePage('queue');
        break;
      case 'addService':
        if (activePage === 'reception') {
          receptionRef.current?.focusServiceSearch();
        } else {
          setActivePage('reception');
          setTimeout(() => receptionRef.current?.focusServiceSearch(), 100);
        }
        break;
      case 'selectDoctor':
        if (activePage === 'reception') {
          receptionRef.current?.openDoctorSelect();
        } else {
          setActivePage('reception');
          setTimeout(() => receptionRef.current?.openDoctorSelect(), 100);
        }
        break;
      case 'payment':
        if (activePage === 'reception' && receptionRef.current) {
          if (receptionRef.current.isCheckPreviewOpen?.()) {
            receptionRef.current.handleSaveAndPrint();
          } else {
            receptionRef.current.openCheckPreview();
          }
        }
        break;
      case 'closeRegister':
        if (activePage === 'reception' && receptionRef.current) {
          receptionRef.current.handleSaveOnly();
        }
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        break;
      default:
        break;
    }
  }, [activePage]);

  useKeyboard({ onNavigate: handleNavigate, onAction: handleAction });

  const PageComponent = PAGE_MAP[activePage] || Reception;

  return (
    <Layout activePage={activePage} onNavigate={handleNavigate} theme={theme} onThemeChange={setTheme}>
      <AuthMock />
      <PageComponent 
        ref={activePage === 'reception' ? receptionRef : undefined} 
        onNavigate={['dashboard', 'journal'].includes(activePage) ? handleNavigate : undefined} 
      />
    </Layout>
  );
}
