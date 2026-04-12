/**
 * Page permission configuration.
 * Defines which roles can access which pages.
 */
export const PAGE_PERMISSIONS = {
  dashboard: ['super_admin', 'admin', 'doctor', 'receptionist', 'cashier'],
  reception: ['super_admin', 'admin', 'receptionist'],
  queue: ['super_admin', 'admin', 'doctor', 'receptionist'],
  inpatient: ['super_admin', 'admin', 'doctor', 'receptionist'],
  laboratory: ['super_admin', 'admin', 'doctor', 'lab_tech'],
  pharmacy: ['super_admin', 'admin', 'pharmacist', 'doctor'],
  cashier: ['super_admin', 'admin', 'cashier'],
  journal: ['super_admin', 'admin', 'cashier', 'doctor'],
  analytics: ['super_admin', 'admin'],
  marketing: ['super_admin', 'admin'],
  archive: ['super_admin', 'admin'],
  staff: ['super_admin', 'admin'],
  settings: ['super_admin', 'admin'],
  subscription: ['super_admin', 'admin'],
  help: ['super_admin', 'admin', 'doctor', 'receptionist', 'cashier'],
};
