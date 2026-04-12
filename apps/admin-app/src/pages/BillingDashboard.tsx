import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { supabase } from '../utils/supabase';

type ClinicBilling = {
  id: string;
  name: string;
  status: string;
  subscription: any;
  doctors_count: number;
  patients_count: number;
};

type Plan = { id: string; name: string; price: number; max_doctors: number; max_patients: number };

export default function BillingDashboard() {
  const [clinics, setClinics] = useState<ClinicBilling[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ type: string; clinic: ClinicBilling } | null>(null);
  const [formDays, setFormDays] = useState(30);
  const [formPlanId, setFormPlanId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      // Fetch clinics with billing info
      const res = await db.getAll('clinics');
      if (res.success) {
        // Enrich with subscriptions data
        const enriched = await Promise.all(res.data.map(async (clinic: any) => {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('id, status, amount, current_period_start, current_period_end, max_doctors, max_patients, plans(name, price)')
            .eq('clinic_id', clinic.id)
            .order('current_period_end', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count: dc } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id).eq('role', 'doctor');
          const { count: pc } = await supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinic.id);

          return { ...clinic, subscription: sub, doctors_count: dc || 0, patients_count: pc || 0 };
        }));
        setClinics(enriched);
      }

      // Fetch plans
      const { data: plansData } = await supabase.from('plans').select('*').order('price', { ascending: true });
      if (plansData) {
        setPlans(plansData);
        if (plansData.length > 0 && !formPlanId) setFormPlanId(plansData[0].id);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  }

  async function performAction(type: string, clinicId: string) {
    setActionLoading(true);
    try {
      if (type === 'activate') {
        // Expire old
        await supabase.from('subscriptions')
          .update({ status: 'expired' })
          .eq('clinic_id', clinicId)
          .in('status', ['active', 'trial']);

        const plan = plans.find(p => p.id === formPlanId);
        if (!plan) { alert('Plan topilmadi'); return; }

        const start = new Date();
        const end = new Date(start.getTime() + formDays * 86400000);

        await supabase.from('subscriptions').insert({
          clinic_id: clinicId,
          plan_id: formPlanId,
          status: 'active',
          amount: plan.price,
          max_doctors: plan.max_doctors,
          max_patients: plan.max_patients,
          current_period_start: start.toISOString(),
          current_period_end: end.toISOString(),
        });
      } else if (type === 'extend') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, current_period_end')
          .eq('clinic_id', clinicId)
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub) {
          const curr = new Date(sub.current_period_end);
          const base = curr.getTime() > Date.now() ? curr : new Date();
          const newEnd = new Date(base.getTime() + formDays * 86400000);
          await supabase.from('subscriptions').update({ current_period_end: newEnd.toISOString(), status: 'active' }).eq('id', sub.id);
        }
      } else if (type === 'block') {
        await supabase.from('subscriptions')
          .update({ status: 'blocked' })
          .eq('clinic_id', clinicId)
          .in('status', ['active', 'trial']);
      } else if (type === 'unblock') {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('clinic_id', clinicId)
          .order('current_period_end', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub) {
          const newEnd = new Date(Date.now() + 30 * 86400000);
          await supabase.from('subscriptions').update({ status: 'active', current_period_end: newEnd.toISOString() }).eq('id', sub.id);
        }
      }

      setActionModal(null);
      await fetchAll();
    } catch (err) {
      console.error('Action error:', err);
      alert('Xatolik yuz berdi');
    }
    setActionLoading(false);
  }

  function getStatusBadge(sub: any) {
    if (!sub) return <span style={{ ...badgeBase, background: 'rgba(161,161,170,0.2)', color: '#a1a1aa' }}>OBUNA YO'Q</span>;
    const s = sub.status;
    const isExpiredByDate = sub.current_period_end && new Date(sub.current_period_end).getTime() < Date.now();
    const effectiveStatus = s === 'active' && isExpiredByDate ? 'expired' : s;

    const colors: Record<string, { bg: string; fg: string }> = {
      active: { bg: 'rgba(22,163,74,0.2)', fg: '#4ade80' },
      trial: { bg: 'rgba(234,179,8,0.2)', fg: '#facc15' },
      expired: { bg: 'rgba(239,68,68,0.2)', fg: '#f87171' },
      blocked: { bg: 'rgba(239,68,68,0.3)', fg: '#ef4444' },
    };
    const c = colors[effectiveStatus] || colors.expired;
    return <span style={{ ...badgeBase, background: c.bg, color: c.fg }}>{effectiveStatus.toUpperCase()}</span>;
  }

  const badgeBase: React.CSSProperties = { padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 };
  const btnStyle = (bg: string): React.CSSProperties => ({ padding: '6px 12px', background: bg, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 });
  const inputStyle: React.CSSProperties = { background: '#27272a', border: '1px solid #3f3f46', padding: '10px 14px', borderRadius: 8, color: '#fff', fontSize: 14, width: '100%' };

  if (loading) return <div style={{ color: '#a1a1aa', padding: 40 }}>Yuklanmoqda...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Obuna Boshqaruvi (Billing)</h1>
          <p style={{ margin: '5px 0 0', color: '#a1a1aa' }}>Klinikalarning obunalarini qo'lda boshqaring — aktivlashtirish, uzaytirish, bloklash.</p>
        </div>
        <button onClick={fetchAll} style={{ ...btnStyle('#3b82f6'), padding: '10px 20px', fontSize: 14 }}>🔄 Yangilash</button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 30 }}>
        {[
          { label: 'Jami Klinikalar', val: clinics.length, icon: '🏥' },
          { label: 'Aktiv Obunalar', val: clinics.filter(c => c.subscription?.status === 'active').length, icon: '✅' },
          { label: 'Muddati O\'tgan', val: clinics.filter(c => !c.subscription || c.subscription?.status === 'expired').length, icon: '⏰' },
          { label: 'Bloklangan', val: clinics.filter(c => c.subscription?.status === 'blocked').length, icon: '🚫' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: '#18181b', padding: '20px 24px', borderRadius: 14, border: '1px solid #27272a' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>{kpi.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{kpi.val}</div>
            <div style={{ color: '#a1a1aa', fontSize: 13, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Clinics Table */}
      <div style={{ background: '#18181b', borderRadius: 16, border: '1px solid #27272a', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#27272a' }}>
              {['Klinika', 'Tarif', 'Holat', 'Muddati', 'Shifokorlar', 'Bemorlar', 'Amallar'].map(h => (
                <th key={h} style={{ padding: '14px 18px', color: '#a1a1aa', fontWeight: 500, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clinics.map(clinic => (
              <tr key={clinic.id} style={{ borderBottom: '1px solid #27272a' }}>
                <td style={{ padding: '16px 18px', fontWeight: 600 }}>{clinic.name}</td>
                <td style={{ padding: '16px 18px', color: '#94a3b8' }}>{clinic.subscription?.plans?.name || '—'}</td>
                <td style={{ padding: '16px 18px' }}>{getStatusBadge(clinic.subscription)}</td>
                <td style={{ padding: '16px 18px', color: '#94a3b8', fontSize: 13 }}>
                  {clinic.subscription?.current_period_end
                    ? new Date(clinic.subscription.current_period_end).toLocaleDateString('uz-UZ')
                    : '—'}
                </td>
                <td style={{ padding: '16px 18px', fontWeight: 600 }}>{clinic.doctors_count}</td>
                <td style={{ padding: '16px 18px', fontWeight: 600 }}>{clinic.patients_count}</td>
                <td style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => { setFormDays(30); setActionModal({ type: 'activate', clinic }); }} style={btnStyle('#3b82f6')}>Aktivlashtirish</button>
                    <button onClick={() => { setFormDays(30); setActionModal({ type: 'extend', clinic }); }} style={btnStyle('#8b5cf6')}>Uzaytirish</button>
                    {clinic.subscription?.status === 'blocked' ? (
                      <button onClick={() => performAction('unblock', clinic.id)} style={btnStyle('#16a34a')}>Ochish</button>
                    ) : (
                      <button onClick={() => performAction('block', clinic.id)} style={btnStyle('#dc2626')}>Bloklash</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#18181b', padding: 30, borderRadius: 16, width: 440, border: '1px solid #27272a' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>
              {actionModal.type === 'activate' ? '🚀 Obunani Aktivlashtirish' : '📅 Muddatni Uzaytirish'}
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 24 }}>Klinika: <strong style={{ color: '#f8fafc' }}>{actionModal.clinic.name}</strong></p>

            {actionModal.type === 'activate' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, color: '#e2e8f0', fontSize: 14 }}>
                Tarif tanlang:
                <select value={formPlanId} onChange={e => setFormPlanId(e.target.value)} style={inputStyle}>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString()} so'm</option>
                  ))}
                </select>
              </label>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24, color: '#e2e8f0', fontSize: 14 }}>
              Muddat (kunlar):
              <input type="number" value={formDays} onChange={e => setFormDays(Number(e.target.value))} min={1} style={inputStyle} />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setActionModal(null)} style={{ padding: '10px 20px', background: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', borderRadius: 8, fontWeight: 600 }}>Bekor qilish</button>
              <button
                onClick={() => performAction(actionModal.type, actionModal.clinic.id)}
                disabled={actionLoading}
                style={{ ...btnStyle('#3b82f6'), padding: '10px 24px', fontSize: 14, opacity: actionLoading ? 0.5 : 1 }}
              >
                {actionLoading ? 'Yuklanmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
