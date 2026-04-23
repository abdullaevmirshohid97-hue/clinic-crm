import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../utils/supabase';

interface AppointmentRow {
  id: number;
  createdAt?: string;
  amount: number | null;
  patients?: { fullName?: string; full_name?: string } | null;
  services?: { name?: string } | null;
  patient_name?: string | null;
  service_name?: string | null;
  doctorId?: string | null;
  doctor_id?: string | null;
  timestamp?: string | null;
  date?: string | null;
}

interface TransactionRow {
  id: number;
  createdAt: string;
  amount: number | null;
  patient_name: string | null;
  paymentType: string | null;
  type: string | null;
}

export default function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    revenue_today: 0,
    patients_today: 0,
    active_inpatients: 0,
    online_staff: 0,
  });

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [txnResult, apptResult, activeRoomResult] =
        await Promise.all([
          supabase.from('transactions').select('*').order('id', { ascending: false }).limit(300),
          supabase.from('appointments').select('*').order('id', { ascending: false }).limit(300),
          supabase.from('room_patients').select('id').eq('status', 'active'),
        ]);

      if (txnResult.error) throw new Error(`Transactions: ${txnResult.error.message}`);
      if (apptResult.error) throw new Error(`Appointments: ${apptResult.error.message}`);
      if (activeRoomResult.error)
        throw new Error(`Room patients: ${activeRoomResult.error.message}`);

      const txRowsRaw = (txnResult.data as Array<Record<string, unknown>> | null) ?? [];
      const todayTransactions = txRowsRaw.filter((r) => {
        const stamp = r.createdAt || r.created_at || r.timestamp || r.date;
        if (!stamp || typeof stamp !== 'string') return false;
        return stamp.startsWith(today);
      });
      const revenueToday = todayTransactions.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      const appointmentsRaw = (apptResult.data as AppointmentRow[] | null) ?? [];
      const todayAppointments = appointmentsRaw.filter((a) => {
        const stamp = a.createdAt || (a as any).created_at || a.timestamp || a.date;
        return typeof stamp === 'string' ? stamp.startsWith(today) : false;
      });
      const patientsToday = todayAppointments.length;
      const activeInpatients = (activeRoomResult.data ?? []).length;
      const uniqueDoctors = new Set(
        todayAppointments.map((r) => r.doctorId || r.doctor_id).filter(Boolean)
      ).size;

      setStats({
        revenue_today: revenueToday,
        patients_today: patientsToday,
        active_inpatients: activeInpatients,
        online_staff: uniqueDoctors,
      });

      const normalizedAppointments = todayAppointments.slice(0, 10).map((row: any) => ({
        ...row,
        createdAt: row.createdAt || row.created_at || row.timestamp || row.date,
      }));
      setAppointments(normalizedAppointments);
      const normalized = todayTransactions.slice(0, 10).map((row: any) => ({
          ...row,
          createdAt: row.createdAt || row.created_at || row.timestamp || row.date,
          paymentType: row.paymentType || row.payment_type,
          patient_name: row.patient_name || row.fullName || row.patientName || null,
        }));
      setTransactions(normalized as TransactionRow[]);
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

  function formatTime(iso?: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }

  function paymentLabel(type: string | null) {
    if (!type) return '—';
    const map: Record<string, string> = {
      cash: 'Naqd',
      card: 'Karta',
      transfer: "O'tkazma",
      debt: 'Nasiya',
    };
    return map[type] ?? type;
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
            <div className="metric-title">Kassa (Bugun)</div>
            <div className="metric-value">{formatPrice(stats.revenue_today)} so'm</div>
          </div>
        </div>

        <div className="metric-card bg-success-glow">
          <div className="metric-icon">💳</div>
          <div className="metric-data">
            <div className="metric-title">Tibbiy ko'riklar (Bugun)</div>
            <div className="metric-value">{stats.patients_today} ta</div>
          </div>
        </div>

        <div className="metric-card bg-warning-glow">
          <div className="metric-icon">🛏️</div>
          <div className="metric-data">
            <div className="metric-title">Faol Statsionar</div>
            <div className="metric-value">{stats.active_inpatients} bemor</div>
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
        <div className="dashboard-tables-grid">
          <div className="card glass-card">
            <div className="card-header">📋 Bugungi so'nggi ko'riklar</div>
            <div className="card-body" style={{ padding: 0 }}>
              {appointments.length === 0 ? (
                <p
                  style={{ padding: '16px', color: 'var(--text-muted, #888)', textAlign: 'center' }}
                >
                  Bugun ko'rik yo'q
                </p>
              ) : (
                <div className="dashboard-mini-table-wrapper">
                  <table className="dashboard-mini-table">
                    <thead>
                      <tr>
                        <th>Vaqt</th>
                        <th>Bemor</th>
                        <th>Xizmat</th>
                        <th style={{ textAlign: 'right' }}>Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((row) => (
                        <tr key={row.id}>
                          <td className="time-cell">{formatTime(row.createdAt)}</td>
                          <td>{row.patients?.fullName ?? row.patients?.full_name ?? row.patient_name ?? '—'}</td>
                          <td>{row.services?.name ?? row.service_name ?? '—'}</td>
                          <td style={{ textAlign: 'right' }}>
                            {row.amount != null ? `${formatPrice(row.amount)} so'm` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card glass-card">
            <div className="card-header">💵 Bugungi so'nggi to'lovlar</div>
            <div className="card-body" style={{ padding: 0 }}>
              {transactions.length === 0 ? (
                <p
                  style={{ padding: '16px', color: 'var(--text-muted, #888)', textAlign: 'center' }}
                >
                  Bugun to'lov yo'q
                </p>
              ) : (
                <div className="dashboard-mini-table-wrapper">
                  <table className="dashboard-mini-table">
                    <thead>
                      <tr>
                        <th>Vaqt</th>
                        <th>Bemor</th>
                        <th>To'lov turi</th>
                        <th style={{ textAlign: 'right' }}>Summa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((row) => (
                        <tr key={row.id}>
                          <td className="time-cell">{formatTime(row.createdAt)}</td>
                          <td>{row.patient_name ?? '—'}</td>
                          <td>{paymentLabel(row.paymentType)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {row.amount != null ? `${formatPrice(row.amount)} so'm` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card glass-card" style={{ marginTop: '16px' }}>
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
