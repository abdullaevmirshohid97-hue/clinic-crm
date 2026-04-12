import { supabase } from '../../config/supabase';

export class AnalyticsService {
  static async getDashboardStats(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: patientsToday, error: queueErr } = await supabase
      .from('queues')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', today.toISOString());

    if (queueErr) throw queueErr;

    const { data: rooms, error: roomErr } = await supabase
      .from('rooms')
      .select('capacity')
      .eq('clinic_id', clinicId);

    const { count: currentlyAssigned, error: occErr } = await supabase
      .from('room_patients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (roomErr || occErr) throw roomErr || occErr;

    const totalCapacity = rooms?.reduce((sum, r) => sum + (r.capacity || 2), 0) || 0;
    const occupancyRate = totalCapacity > 0 ? ((currentlyAssigned || 0) / totalCapacity) * 100 : 0;

    const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: onlineStaff, error: onlineErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('last_seen', onlineThreshold);

    if (onlineErr) throw onlineErr;

    return {
      revenue_today: 0,
      patients_today: patientsToday || 0,
      occupancy_rate: Number(occupancyRate.toFixed(2)),
      online_staff: onlineStaff || 0,
    };
  }
}
