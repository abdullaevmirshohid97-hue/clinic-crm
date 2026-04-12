export interface Clinic {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'blocked' | 'trial';
  createdAt: string;
}

export interface User {
  id: string;
  clinicId: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'doctor' | 'receptionist' | 'cashier' | 'pharmacist' | 'lab_tech';
  status: 'active' | 'inactive';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
