import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';

export default function ClinicDetails({ clinicId, onBack }: { clinicId: string, onBack: () => void }) {
  const [clinic, setClinic] = useState<any>(null);

  useEffect(() => {
    fetchClinic();
  }, [clinicId]);

  async function fetchClinic() {
    const res = await db.getAll('clinics');
    if (res.success) {
      const found = res.data.find((c: any) => String(c.id) === clinicId);
      setClinic(found);
    }
  }

  async function toggleModule(moduleKey: string) {
    if (!clinic) return;
    const newModules = { ...clinic.modules, [moduleKey]: !clinic.modules?.[moduleKey] };
    const res = await db.update('clinics', clinic.id, { modules: newModules });
    if (res.success) {
      setClinic({ ...clinic, modules: newModules });
    }
  }

  async function updateLimit(limitKey: string, val: number) {
    if (!clinic) return;
    const newLimits = { ...(clinic.limits || {}), [limitKey]: val };
    const res = await db.update('clinics', clinic.id, { limits: newLimits });
    if (res.success) {
      setClinic({ ...clinic, limits: newLimits });
    }
  }

  if (!clinic) return <div style={{ color: '#a1a1aa' }}>Yuklanmoqda...</div>;

  const modulesOpt = [
    { key: 'pharmacy', icon: '💊', name: 'Dorixona (Pharmacy)' },
    { key: 'inpatient', icon: '🛏️', name: 'Statsionar (Inpatient)' },
    { key: 'finance', icon: '💰', name: 'Moliyaviy Analitika (Finance)' },
    { key: 'lab', icon: '🔬', name: 'Laboratoriya (Lab)' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
        <button onClick={onBack} style={{ background: '#27272a', border: 'none', color: '#f8fafc', padding: '10px 15px', borderRadius: 8, cursor: 'pointer' }}>
          ← Orqaga
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{clinic.name}</h1>
          <span style={{ color: '#a1a1aa', fontSize: 14 }}>{clinic.slug}.clary.uz | Holati: <strong style={{ color: clinic.status === 'active' ? '#4ade80' : '#f87171' }}>{clinic.status.toUpperCase()}</strong></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
        
        {/* Module Flags Section */}
        <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#f8fafc' }}>Modullar & Xizmatlar (Feature Flags)</h2>
          <p style={{ color: '#71717a', fontSize: 13, marginBottom: 20 }}>Klinika uchun tegishli modullarni yoqish/o'chirish. O'chirilgan holatda modullar klinika foydalanuvchisi uchun yashirinadi.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {modulesOpt.map(m => {
              const isActive = clinic.modules?.[m.key] || false;
              return (
                <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: isActive ? 'rgba(59, 130, 246, 0.1)' : '#27272a', borderRadius: 12, border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <span style={{ fontSize: 24 }}>{m.icon}</span>
                    <span style={{ fontWeight: 600, color: isActive ? '#60a5fa' : '#f8fafc' }}>{m.name}</span>
                  </div>
                  <button 
                    onClick={() => toggleModule(m.key)}
                    style={{
                      background: isActive ? '#ef4444' : '#10b981',
                      color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    {isActive ? 'O\'chirish' : 'Yoqish'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Live Telemetry Section */}
        <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#f8fafc' }}>Tirik Telemetriya (Real-time Stats)</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'center' }}>
             <div style={{ background: '#27272a', padding: 25, borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#a1a1aa' }}>Bugungi Qabullar:</span>
               <strong style={{ fontSize: 20 }}>142 ta</strong>
             </div>
             <div style={{ background: '#27272a', padding: 25, borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#a1a1aa' }}>Tarmoq tezligi (API Latency):</span>
               <strong style={{ fontSize: 20, color: '#10b981' }}>12ms</strong>
             </div>
             <div style={{ background: '#27272a', padding: 25, borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
               <span style={{ color: '#a1a1aa' }}>Faol shifokorlar (Online):</span>
               <strong style={{ fontSize: 20, color: '#3b82f6' }}>8 kishi</strong>
             </div>
             
             <button onClick={() => window.open(`http://localhost:5200/?impersonate_clinic_id=${clinic.id}`, '_blank')} style={{ marginTop: 'auto', background: '#eab308', color: '#000', padding: 15, borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}>
               🛡️ Administratsiya nomidan kirish (Impersonate)
             </button>
          </div>
        </div>

        {/* System Limits Section */}
        <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#f8fafc' }}>Tizim Limitlari (Usage Limits)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#27272a', padding: '15px 20px', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ color: '#f8fafc', display: 'block' }}>Ruxsat etilgan shifokorlar</strong>
                <span style={{ color: '#71717a', fontSize: 12 }}>Asosiy bazaga qo'shiladigan maksimal doktorlar soni</span>
              </div>
              <input type="number" 
                value={clinic.limits?.max_doctors || 0} 
                onChange={e => updateLimit('max_doctors', parseInt(e.target.value))}
                style={{ background: '#18181b', border: '1px solid #3f3f46', color: '#fff', padding: '8px', borderRadius: 6, width: 80, textAlign: 'center' }} 
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
