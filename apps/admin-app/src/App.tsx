import React, { useState, useEffect } from 'react';
import { db } from './utils/db';
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/Dashboard';
import ClinicsList from './pages/ClinicsList';
import ClinicDetails from './pages/ClinicDetails';
import GlobalDoctorsList from './pages/GlobalDoctorsList';
import GlobalPatientsList from './pages/GlobalPatientsList';
import BillingDashboard from './pages/BillingDashboard';
import SystemSettings from './pages/SystemSettings';
import SupportTickets from './pages/SupportTickets';

export default function AdminApp() {
  const [clinics, setClinics] = useState<any[]>([]);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  useEffect(() => {
    fetchClinics();
  }, []);

  async function fetchClinics() {
    const res = await db.getAll('clinics');
    if (res.success) {
      setClinics(res.data);
    }
  }

  return (
    <AdminLayout 
      activeMenu={activeMenu} 
      onMenuChange={(m) => { setActiveMenu(m); setSelectedClinicId(null); }}
    >
      {selectedClinicId ? (
        <ClinicDetails clinicId={selectedClinicId} onBack={() => setSelectedClinicId(null)} />
      ) : (
        <>
          {activeMenu === 'dashboard' && <DashboardPage clinics={clinics} onNavigate={m => setActiveMenu(m)} />}
          {activeMenu === 'clinics' && (
            <ClinicsList 
              clinics={clinics} 
              fetchClinics={fetchClinics} 
              onSelectClinic={(id) => setSelectedClinicId(id)} 
            />
          )}
          {activeMenu === 'billing' && <BillingDashboard />}
          {activeMenu === 'global_staff' && <GlobalDoctorsList />}
          {activeMenu === 'global_patients' && <GlobalPatientsList />}
          {activeMenu === 'support' && <SupportTickets />}
          {activeMenu === 'settings' && <SystemSettings />}
        </>
      )}
    </AdminLayout>
  );
}
