import React, { useState } from 'react';

export default function AddClinicModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (newClinic: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Simulate Supabase API provisioning delay
    await new Promise(r => setTimeout(r, 1000));

    const newClinic = {
      name: formData.name,
      slug: formData.slug,
      status: 'trial',
      modules: { pharmacy: true, inpatient: false, finance: false, lab: false },
      created_at: new Date().toISOString()
    };
    
    onSuccess(newClinic);
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
      <div style={{ background: '#18181b', padding: '30px', borderRadius: '16px', width: '500px', border: '1px solid #27272a' }}>
        <h2 style={{ margin: '0 0 20px', color: '#f8fafc', fontSize: 22 }}>Yangi SaaS Klinika qo'shish</h2>
        <p style={{ color: '#a1a1aa', fontSize: 13, marginBottom: 25 }}>Bu jarayon markaziy Supabase orqali Auth (Ro'yxatdan o'tkazish) va izolyatsiya qilingan yangi Tenantni yaratadi.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#f8fafc', fontSize: 14 }}>
            Klinika nomi:
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ background: '#27272a', border: 'none', padding: '12px', borderRadius: 8, color: '#fff', fontSize: 16 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#f8fafc', fontSize: 14 }}>
            Chegara Domen (Slug):
            <div style={{ display: 'flex', alignItems: 'center', background: '#27272a', borderRadius: 8, paddingRight: 15 }}>
              <input required type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} style={{ background: 'transparent', border: 'none', padding: '12px', color: '#fff', fontSize: 16, outline: 'none', flex: 1 }} />
              <span style={{ color: '#71717a' }}>.clary.uz</span>
            </div>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#f8fafc', fontSize: 14, marginTop: 10 }}>
            Tashkilot Admin E-mail:
            <input required type="email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} style={{ background: '#27272a', border: 'none', padding: '12px', borderRadius: 8, color: '#fff', fontSize: 16 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: '#f8fafc', fontSize: 14 }}>
            Admin Vaqtinchalik Paroli:
            <input required type="text" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} minLength={6} style={{ background: '#27272a', border: 'none', padding: '12px', borderRadius: 8, color: '#fff', fontSize: 16 }} />
          </label>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: 'transparent', color: '#a1a1aa', border: 'none', cursor: 'pointer', borderRadius: 8, fontWeight: 600 }}>Bekor qilish</button>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 8, fontWeight: 600 }}>
              {loading ? 'Yaratilmoqda...' : 'Yangi Klinikani yaratish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
