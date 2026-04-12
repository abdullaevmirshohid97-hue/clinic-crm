import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';

export default function GlobalPatientsList() {
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      let res = await db.getAll('patients');
      let data = res.success ? res.data : [];
      
      if (data.length === 0 && import.meta.env.DEV) {
        // Generate robust mock data for patients
        data = Array.from({length: 12}).map((_, i) => ({
          id: `p${i}`, 
          fullName: `Bemor Ismi ${i+1}`, 
          phone: `+998 90 123 45 ${10+i}`,
          created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0],
          clinic_name: i % 3 === 0 ? 'Shifo Nur' : i % 3 === 1 ? 'Med City' : 'Family Clinic'
        }));
      }
      setPatients(data);
    }
    load();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
         <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Platformadagi Jami Bemorlar</h1>
         <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '10px 15px', borderRadius: 8, fontSize: 13, border: '1px solid rgba(239,68,68,0.2)' }}>
            Diqqat: Bemorlarning nomlari va raqamlari (GDPR/HIPAA) maxfiylik standartiga asosan keyingi bosqichda yashirilishi (***) kerak.
         </div>
      </div>
      
      <div style={{ background: '#18181b', borderRadius: 16, border: '1px solid #27272a', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#27272a' }}>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>F.I.SH</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Telefon raqami</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Ro'yxatdan o'tgan sana</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Texnik Klinika (Tenant)</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
               <tr key={p.id} style={{ borderBottom: '1px solid #27272a' }}>
                 <td style={{ padding: '18px 25px', fontWeight: 500 }}>{p.fullName}</td>
                 <td style={{ padding: '18px 25px', color: '#a1a1aa', fontFamily: 'monospace' }}>{p.phone}</td>
                 <td style={{ padding: '18px 25px', color: '#94a3b8' }}>{p.created_at}</td>
                 <td style={{ padding: '18px 25px' }}>
                    <span style={{ background: '#3f3f46', color: '#f8fafc', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>
                      {p.clinic_name || p.clinic_id || 'Noma\'lum'}
                    </span>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
