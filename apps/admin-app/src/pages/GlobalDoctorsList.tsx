import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';

export default function GlobalDoctorsList() {
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      // In DEV mock mode, automatically generate some fake cross-tenant doctors if empty
      let res = await db.getAll('staff');
      let data = res.success ? res.data.filter((s:any) => s.role === 'doctor') : [];
      
      if (data.length === 0 && import.meta.env.DEV) {
        data = [
          { id: 'd1', fullName: 'Dr. Azizov Alisher', specialty: 'Kardiolog', clinic_name: 'Shifo Nur' },
          { id: 'd2', fullName: 'Dr. Karimova Nargiza', specialty: 'Nevropatolog', clinic_name: 'Med City' },
          { id: 'd3', fullName: 'Dr. Umarov Jasur', specialty: 'Jarroh', clinic_name: 'Family Clinic' },
          { id: 'd4', fullName: 'Dr. Tursunova Malika', specialty: 'Pediatr', clinic_name: 'Shifo Nur' },
          { id: 'd5', fullName: 'Dr. Qodirov Rustam', specialty: 'Stomatolog', clinic_name: 'Med City' },
        ];
      }
      setDoctors(data);
    }
    load();
  }, []);

  return (
    <div>
      <h1 style={{ margin: '0 0 30px', fontSize: 24, fontWeight: 700 }}>Platformadagi Jami Shifokorlar</h1>
      
      <div style={{ background: '#18181b', borderRadius: 16, border: '1px solid #27272a', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#27272a' }}>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>F.I.SH</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Mutaxassisligi</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Texnik Klinika (Tenant)</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map(d => (
               <tr key={d.id} style={{ borderBottom: '1px solid #27272a' }}>
                 <td style={{ padding: '20px 25px', fontWeight: 500 }}>{d.fullName}</td>
                 <td style={{ padding: '20px 25px', color: '#94a3b8' }}>{d.specialty}</td>
                 <td style={{ padding: '20px 25px' }}>
                    <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '5px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                      {d.clinic_name || d.clinic_id || 'Noma\'lum'}
                    </span>
                 </td>
               </tr>
            ))}
            {doctors.length === 0 && <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>Ma'lumot topilmadi.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
