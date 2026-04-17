import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../utils/supabase';

export default function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    revenue_today: 0,
    patients_today: 0,
    occupancy_rate: 0,
    online_staff: 0,
  });

  const loadAll = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59.999`;

      const [txnResult, apptResult, activeRoomResult, totalRoomResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount')
          .gte('createdAt', startOfDay)
          .lte('createdAt', endOfDay),
        supabase
          .from('appointments')
          .select('id, doctorId')
          .gte('createdAt', startOfDay)
          .lte('createdAt', endOfDay),
        supabase.from('room_patients').select('id').eq('status', 'active'),
        supabase.from('rooms').select('id'),
      ]);

      const revenueToday = (txnResult.data ?? []).reduce(
        (sum, r) => sum + (Number(r.amount) || 0),
        0
      );

      const patientsToday = (apptResult.data ?? []).length;

      const activeRooms = (activeRoomResult.data ?? []).length;
      const totalRooms = (totalRoomResult.data ?? []).length;
      const occupancyRate = totalRooms > 0 ? Math.round((activeRooms / totalRooms) * 100) : 0;

      const uniqueDoctors = new Set((apptResult.data ?? []).map((r) => r.doctorId).filter(Boolean))
        .size;

      setStats({
        revenue_today: revenueToday,
        patients_today: patientsToday,
        occupancy_rate: occupancyRate,
        online_staff: uniqueDoctors,
      });
    } catch (e) {
      console.error(e);
      toast.error("Bosh sahifa ma'lumotlari yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAll, 15000);
    return () => clearInterval(iv);
  }, [loadAll]);

  function formatPrice(num: number | string | null | undefined) {
    return Number(num || 0).toLocaleString('uz-UZ');
  }

  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="page-loader">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h1>📊 {t('dashboard.title') || 'Glavniy (Live CRM)'}</h1>
      </div>

      <div className="hms-metrics-grid">
        <div className="metric-card bg-primary-glow">
          <div className="metric-icon">💰</div>
          <div className="metric-data">
            <div className="metric-title">Kassa (Naqd)</div>
            <div className="metric-value">{formatPrice(stats.revenue_today)} so'm</div>
          </div>
        </div>

        <div className="metric-card bg-success-glow">
          <div className="metric-icon">💳</div>
          <div className="metric-data">
            <div className="metric-title">Tibbiy ko'riklar</div>
            <div className="metric-value">{stats.patients_today} ta</div>
          </div>
        </div>

        <div className="metric-card bg-warning-glow">
          <div className="metric-icon">🛏️</div>
          <div className="metric-data">
            <div className="metric-title">Bandlik (Stasionar)</div>
            <div className="metric-value">{stats.occupancy_rate}%</div>
          </div>
        </div>

        <div className="metric-card bg-info-glow">
          <div className="metric-icon">👥</div>
          <div className="metric-data">
            <div className="metric-title">Faol shifokorlar</div>
            <div className="metric-value">{stats.online_staff} kishi</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="card glass-card">
          <div className="card-header">Tizim holati (Supabase Live)</div>
          <div className="card-body">
            <p>
              <strong>Status:</strong> Barcha ko'rsatkichlar to'g'ridan-to'g'ri Supabase'dan
              olinmoqda.
            </p>
            <p>Real-time statistika {new Date().toLocaleTimeString('uz-UZ')} da yuklandi.</p>
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => onNavigate?.('reception')}>
                📝 Registratura
              </button>{' '}
              <button className="btn btn-secondary" onClick={() => onNavigate?.('pharmacy')}>
                💊 Dorixona
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
