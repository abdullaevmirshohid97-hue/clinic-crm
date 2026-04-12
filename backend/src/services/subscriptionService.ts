import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SubscriptionService {
  private supabase: SupabaseClient;

  constructor(authHeader: string) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
  }

  async getSubscription(clinicId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('clinic_id', clinicId)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error('Subscription fetch error:', error.message); return null; }
    return data;
  }

  static isExpired(sub: any): boolean {
    if (!sub || !sub.current_period_end) return true;
    if (sub.status === 'expired') return true;
    return new Date(sub.current_period_end).getTime() < Date.now();
  }

  static isBlocked(sub: any): boolean {
    return sub?.status === 'blocked';
  }

  static getMaxDoctors(sub: any): number | null {
    const v = sub.max_doctors ?? sub.plans?.max_doctors ?? null;
    return v;
  }

  static getMaxPatients(sub: any): number | null {
    const v = sub.max_patients ?? sub.plans?.max_patients ?? null;
    return v;
  }

  async canAddDoctor(clinicId: string, limit: number | null): Promise<boolean> {
    if (limit === null) return false;
    if (limit === -1) return true;
    const { count, error } = await this.supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('role', 'doctor');
    if (error) { console.error('DB count error:', error.message); return false; }
    if (typeof count !== 'number') { return false; }
    return count < limit;
  }

  async canAddPatient(clinicId: string, limit: number | null): Promise<boolean> {
    if (limit === null) return false;
    if (limit === -1) return true;
    const { count, error } = await this.supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId);
    if (error) { console.error('DB count error:', error.message); return false; }
    if (typeof count !== 'number') { return false; }
    return count < limit;
  }
}
