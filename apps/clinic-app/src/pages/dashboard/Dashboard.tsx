import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../utils/supabase';

interface AppointmentRow {
  id: number;
  createdAt: string;
  amount: number | null;
  patients: { fullName: string } | null;
  services: { name: string } | null;
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
      const startOfDay = `${today}T00:00:00`;
      const endOfDay = `${today}T23:59:59.999`;

      const [txnResult, apptResult, activeRoomResult, apptTableResult, txnTableResult] =
        await Promise.all([
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
          supabase
            .from('appointments')
            .select('id, createdAt, amount, patients(fullName), services(name)')
            .gte('createdAt', startOfDay)
            .lte('createdAt', endOfDay)
            .order('createdAt', { ascending: false })
            .limit(10),
          supabase
            .from('transactions')
            .select('id, createdAt, amount, patient_name, paymentType, type')
            .gte('createdAt', startOfDay)
            .lte('createdAt', endOfDay)
            .order('createdAt', { ascending: false })
            .limit(10),
        ]);

      if (txnResult.error) throw new Error(`Transactions: ${txnResult.error.message}`);
      if (apptResult.error) throw new Error(`Appointments: ${apptResult.error.message}`);
      if (activeRoomResult.error)
        throw new Error(`Room patients: ${activeRoomResult.error.message}`);

      const revenueToday = (txnResult.data ?? []).reduce(
        (sum, r) => sum + (Number(r.amount) || 0),
        0
      );

      const patientsToday = (apptResult.data ?? []).length;
      const activeInpatients = (activeRoomResult.data ?? []).length;
      const uniqueDoctors = new Set((apptResult.data ?? []).map((r) => r.doctorId).filter(Boolean))
        .size;

      setStats({
        revenue_today: revenueToday,
        patients_today: patientsToday,
        active_inpatients: activeInpatients,
        online_staff: uniqueDoctors,
      });

      if (!apptTableResult.error) {
        setAppointments((apptTableResult.data as unknown as AppointmentRow[]) ?? []);
      }
      if (!txnTableResult.error) {
        setTransactions((txnTableResult.data as unknown as TransactionRow[]) ?? []);
      }
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

  function formatTime(iso: string) {
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
                          <td>{row.patients?.fullName ?? '—'}</td>
                          <td>{row.services?.name ?? '—'}</td>
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
