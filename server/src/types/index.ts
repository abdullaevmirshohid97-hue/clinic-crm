import { Request } from 'express';

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  clinic_id: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'cashier';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── Clinic ───────────────────────────────────────────────────────────────

export interface Clinic {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// ─── Patient ──────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────

export interface SmsJobData {
  clinic_id: string;
  patient_id: string;
  phone: string;
  message: string;
  attempt?: number;
}

export interface BackupJobData {
  clinic_id: string;
  triggered_by?: string;
}

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface JobInfo {
  id: string;
  name: string;
  status: JobStatus;
  data: Record<string, unknown>;
  progress: number;
  attemptsMade: number;
  failedReason?: string;
  createdAt: number;
  processedAt?: number;
  finishedAt?: number;
}

// ─── API Responses ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
