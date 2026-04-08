import { clinicQuery, supabase } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { Patient, PaginationQuery } from '../types';

export async function listPatients(
  clinicId: string,
  { page = 1, limit = 20 }: PaginationQuery,
): Promise<{ patients: Patient[]; total: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return { patients: (data as Patient[]) ?? [], total: count ?? 0 };
}

export async function getPatient(clinicId: string, patientId: string): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('id', patientId)
    .single();

  if (error || !data) throw new NotFoundError('Patient');

  return data as Patient;
}

export async function createPatient(
  clinicId: string,
  input: Omit<Patient, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>,
): Promise<Patient> {
  const { data, error } = await clinicQuery(clinicId)
    .insert('patients', input)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create patient');

  return data as Patient;
}

export async function updatePatient(
  clinicId: string,
  patientId: string,
  updates: Partial<Omit<Patient, 'id' | 'clinic_id' | 'created_at'>>,
): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('clinic_id', clinicId)
    .eq('id', patientId)
    .select()
    .single();

  if (error || !data) throw new NotFoundError('Patient');

  return data as Patient;
}

export async function deletePatient(clinicId: string, patientId: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('id', patientId);

  if (error) throw new NotFoundError('Patient');
}
