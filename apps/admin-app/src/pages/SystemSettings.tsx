import React, { useState } from 'react';

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('security');

  const logs = [
    { id: 1, action: "Med City obunasi tarifini uzaytirdi (Base -> Pro)", admin: "Admin Sanjar", time: "2026-04-12 10:45", type: 'warning' },
    { id: 2, action: "Yangi tenant (Shifo Nur) yaratildi", admin: "Admin Sarvinoz", time: "2026-04-11 16:30", type: 'success' },
    { id: 3, action: "Administratsiya nomidan (Impersonate) ulandi [Family Clinic]", admin: "Super Admin", time: "2026-04-10 09:20", type: 'danger' },
    { id: 4, action: "Bemorlar bazasi (S3 Storage) ulanishi tekshirildi", admin: "Tizim (Avtomat)", time: "2026-04-09 00:00", type: 'info' },
  ];

  return (
    <div>
      <h1 style={{ margin: '0 0 30px', fontSize: 26, fontWeight: 700 }}>Tizim Sozlamalari (CTO Control)</h1>

      <div style={{ display: 'flex', gap: 15, marginBottom: 30, borderBottom: '1px solid #27272a', paddingBottom: 15 }}>
        {['security', 'gateways', 'database', 'audit'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              background: activeTab === tab ? '#3b82f6' : 'transparent', 
              color: activeTab === tab ? '#fff' : '#a1a1aa', 
              border: activeTab === tab ? '1px solid #3b82f6' : '1px solid #3f3f46', 
              padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' 
            }}>
            {tab === 'security' ? '🔐 Xavfsizlik' : tab === 'gateways' ? '📡 Shlyuzlar (Webhooks)' : tab === 'database' ? '💾 Baza & Xotira' : '📜 Harakatlar Jurnali'}
          </button>
        ))}
      </div>

      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
          <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a' }}>
            <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 20 }}>Ruxsatlar va Autentifikatsiya</h2>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, padding: '15px 20px', background: '#27272a', borderRadius: 8 }}>
              <span>Barcha uchun 2FA (Ikki qadamli tekshiruv) so'rash</span>
              <input type="checkbox" style={{ transform: 'scale(1.5)' }} />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#27272a', borderRadius: 8 }}>
              <span>Yangi qurilmalarni tasdiqlash rejimini yoqish</span>
              <input type="checkbox" defaultChecked style={{ transform: 'scale(1.5)' }} />
            </label>
          </div>
          <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a' }}>
            <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 20 }}>IP Himoyasi (Oq Ro'yxat)</h2>
            <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 15 }}>Faqat ushbu IP manzillardan Super Admin paneliga ulanish mumkin.</p>
            <div style={{ padding: '10px 15px', background: '#27272a', borderRadius: 8, fontFamily: 'monospace', marginBottom: 10 }}>195.12.34.56 (Asosiy Ofis)</div>
            <div style={{ padding: '10px 15px', background: '#27272a', borderRadius: 8, fontFamily: 'monospace', marginBottom: 15 }}>88.29.112.99 (CTO Uyi)</div>
            <button style={{ width: '100%', padding: 10, background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px dashed #60a5fa', borderRadius: 8, cursor: 'pointer' }}>+ Yangi IP qo'shish</button>
          </div>
        </div>
      )}

      {activeTab === 'gateways' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
          <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a' }}>
            <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 20 }}>SMS Shlyuzi (Eskiz.uz)</h2>
            <label style={{ display: 'block', marginBottom: 15 }}>
              <span style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 5 }}>API Email:</span>
              <input type="text" value="admin@clary.uz" readOnly style={{ width: '100%', background: '#27272a', border: 'none', padding: 12, borderRadius: 8, color: '#fff' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 15 }}>
              <span style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 5 }}>Secret Token:</span>
              <input type="password" value="************************" readOnly style={{ width: '100%', background: '#27272a', border: 'none', padding: 12, borderRadius: 8, color: '#fff' }} />
            </label>
            <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>Yangilash</button>
          </div>
          <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a' }}>
            <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 20 }}>Webhooks (Tashqi Ulanish)</h2>
            <p style={{ color: '#a1a1aa', fontSize: 13 }}>To'lov qilingani yoki mijoz qo'shilganini boshqa tizimga avtomat jo'natish.</p>
            <div style={{ padding: '15px', background: '#27272a', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span>POST /api/webhooks/billing (Active)</span>
               <div style={{ width: 10, height: 10, background: '#4ade80', borderRadius: '50%' }}></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a' }}>
           <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 20 }}>☁️ Supabase & AWS Xotira Holati</h2>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
              <div style={{ background: '#27272a', padding: 25, borderRadius: 12 }}>
                 <p style={{ color: '#a1a1aa', margin: '0 0 10px' }}>PostgreSQL Baza hajmi</p>
                 <strong style={{ fontSize: 28 }}>245 MB</strong> <span style={{ color: '#a1a1aa' }}>/ 8 GB (Boshlang'ich)</span>
                 <div style={{ width: '100%', height: 6, background: '#3f3f46', marginTop: 15, borderRadius: 3 }}><div style={{ width: '4%', height: '100%', background: '#4ade80', borderRadius: 3 }}></div></div>
              </div>
              <div style={{ background: '#27272a', padding: 25, borderRadius: 12 }}>
                 <p style={{ color: '#a1a1aa', margin: '0 0 10px' }}>Storage (Rasm/Fayl) AWS S3</p>
                 <strong style={{ fontSize: 28 }}>1.2 GB</strong> <span style={{ color: '#a1a1aa' }}>/ 100 GB</span>
                 <div style={{ width: '100%', height: 6, background: '#3f3f46', marginTop: 15, borderRadius: 3 }}><div style={{ width: '2%', height: '100%', background: '#3b82f6', borderRadius: 3 }}></div></div>
              </div>
              <div style={{ background: '#27272a', padding: 25, borderRadius: 12 }}>
                 <p style={{ color: '#a1a1aa', margin: '0 0 10px' }}>API Latency (Jonli)</p>
                 <strong style={{ fontSize: 28, color: '#4ade80' }}>14 ms</strong>
                 <p style={{ margin: '15px 0 0', fontSize: 13, color: '#a1a1aa' }}>Holat: Juda barqaror</p>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div style={{ background: '#18181b', borderRadius: 16, border: '1px solid #27272a', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#27272a' }}>
                <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Vaqti</th>
                <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Boshqaruvchi Admin</th>
                <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500 }}>Bajarilgan Amal</th>
              </tr>
            </thead>
            <tbody>
               {logs.map(log => (
                 <tr key={log.id} style={{ borderBottom: '1px solid #27272a' }}>
                   <td style={{ padding: '18px 25px', color: '#a1a1aa', fontSize: 14 }}>{log.time}</td>
                   <td style={{ padding: '18px 25px', fontWeight: 600 }}>{log.admin}</td>
                   <td style={{ padding: '18px 25px' }}>
                      <span style={{ 
                        color: log.type === 'warning' ? '#facc15' : log.type === 'danger' ? '#f87171' : log.type === 'success' ? '#4ade80' : '#60a5fa' 
                      }}>
                        {log.action}
                      </span>
                   </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
