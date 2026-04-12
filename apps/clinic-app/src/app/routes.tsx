import React from 'react';
import Dashboard from '../pages/dashboard/Dashboard';
import PatientsToday from '../pages/patients/PatientsToday';
import Reception from '../pages/patients/Reception';
import Queue from '../pages/Queue';
import Inpatient from '../pages/Inpatient';
import Journal from '../pages/billing/Journal';
import Analytics from '../pages/billing/Analytics';
import Cashier from '../pages/billing/Cashier';
import Settings from '../pages/settings/Settings';
import Help from '../pages/Help';
import Laboratory from '../pages/Laboratory';
import Marketing from '../pages/Marketing';
import Archive from '../pages/Archive';
import StaffManagement from '../pages/StaffManagement';
import Pharmacy from '../pages/Pharmacy';
import SuperAdmin from '../pages/dashboard/SuperAdmin';
import Subscription from '../pages/Subscription';

export const PAGE_MAP = {
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
  pharmacy: Pharmacy,
  super_admin_panel: SuperAdmin,
  subscription: Subscription,
};

export function AppRoutes({ activePage, receptionRef, handleNavigate }: { activePage: string, receptionRef: any, handleNavigate: any }) {
  const PageComponent = (PAGE_MAP as any)[activePage] || Dashboard;
  
  return (
    <PageComponent 
      ref={activePage === 'reception' ? receptionRef : undefined} 
      onNavigate={['dashboard', 'journal'].includes(activePage) ? handleNavigate : undefined} 
    />
  );
}
