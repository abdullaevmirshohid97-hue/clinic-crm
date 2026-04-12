import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { db } from '../../utils/db';
import { useToast } from '../../components/ui/Toast';

export default function PatientsToday() {
  const { t } = useTranslation();
  const toast = useToast();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [apps, pt, docs, svcs] = await Promise.all([
        db.getAllRows('appointments'),
        db.getAllRows('patients'),
        db.getAllRows('doctors'),
        db.getAllRows('services')
      ]);

      const rows = apps.filter((a: any) => {
        return a.createdAt && a.createdAt.startsWith(today);
      }).map((a: any) => {
        const p = pt.find((x: any) => x.id === a.patientId);
        const d = docs.find((x: any) => x.id === a.doctorId);
        const s = svcs.find((x: any) => x.id === a.serviceId);
        return {
          ...a,
          patientName: p ? p.fullName : 'Noma\'lum',
          patientPhone: p ? p.phone : '',
          doctorName: d ? d.fullName : '—',
          serviceName: s ? s.name : '—'
        };
      }).sort((a: any, b: any) => b.id - a.id);
      
      setPatients(rows);
    } catch (err: any) {
      console.error('Load patients error:', err);
      toast.error('Bemorlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(n: any) {
    return Number(n || 0).toLocaleString('uz-UZ');
  }

  return (
    <div className="page patients-today-page">
      <div className="page-header">
        <h1>👥 {t('dashboard.patientsToday')} — {new Date().toLocaleDateString('uz-UZ')}</h1>
        <div className="page-header-actions">
           <button className="btn btn-secondary" onClick={loadPatients}>🔄 {t('common.refresh')}</button>
        </div>
      </div>

      <div className="page-body">
        <div className="card glass-card">
          <div className="card-body">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('journal.patient')}</th>
                    <th>{t('reception.phone')}</th>
                    <th>{t('journal.doctor')}</th>
                    <th>{t('journal.service')}</th>
                    <th>{t('journal.amount')}</th>
                    <th>{t('journal.paymentType')}</th>
                    <th>{t('journal.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    patients.map((p, i) => (
                      <tr key={p.id}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{p.patientName}</td>
                        <td>{p.patientPhone || '—'}</td>
                        <td>{p.doctorName || '—'}</td>
                        <td style={{ fontSize: '13px' }}>{p.serviceName || '—'}</td>
                        <td>{formatPrice(p.amount * (p.quantity || 1))}</td>
                        <td>
                          <span className={`badge badge-info`}>
                            {p.paymentType === 'cash' ? '💵 Naqd' : 
                             p.paymentType === 'card' ? '💳 Karta' : 
                             p.paymentType === 'transfer' ? '🔄 Click' : '📝 Qarz'}
                          </span>
                        </td>
                        <td>{new Date(p.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
