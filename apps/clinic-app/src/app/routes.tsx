import React from 'react';
import type { ReceptionHandle } from '../types/clinic';
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
import DoctorWorkspace from '../pages/doctor/DoctorWorkspace';
import NurseWorkspace from '../pages/nurse/NurseWorkspace';

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
  doctor_workspace: DoctorWorkspace,
  nurse_workspace: NurseWorkspace,
  super_admin_panel: SuperAdmin,
  subscription: Subscription,
};

export type PageKey = keyof typeof PAGE_MAP;

interface PageSharedProps {
  ref?: React.Ref<ReceptionHandle | null>;
  onNavigate?: (page: string) => void;
}

export function AppRoutes({
  activePage,
  receptionRef,
  handleNavigate,
}: {
  activePage: string;
  receptionRef: React.RefObject<ReceptionHandle | null>;
  handleNavigate: (page: string) => void;
}) {
  const key: PageKey = activePage in PAGE_MAP ? (activePage as PageKey) : 'dashboard';
  const PageComponent = PAGE_MAP[key] as React.ComponentType<Partial<PageSharedProps>>;

  return (
    <PageComponent
      ref={activePage === 'reception' ? receptionRef : undefined}
      onNavigate={['dashboard', 'journal'].includes(activePage) ? handleNavigate : undefined}
    />
  );
}
