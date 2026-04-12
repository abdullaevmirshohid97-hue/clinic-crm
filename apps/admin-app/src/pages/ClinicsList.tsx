import React, { useState } from 'react';
import { db } from '../utils/db';
import AddClinicModal from '../components/AddClinicModal';

export default function ClinicsList({ clinics, fetchClinics, onSelectClinic }: { clinics: any[], fetchClinics: () => void, onSelectClinic: (id: string) => void }) {
  const [showModal, setShowModal] = useState(false);
  
  async function toggleStatus(clinicId: string, currentStatus: string) {
    let newStatus = 'active';
    if (currentStatus === 'active') newStatus = 'trial';
    else if (currentStatus === 'trial') newStatus = 'blocked';
    else if (currentStatus === 'blocked') newStatus = 'active';

    const res = await db.update('clinics', clinicId, { status: newStatus });
    if (res.success) {
      fetchClinics();
    } else {
      alert("Xatolik: " + res.error);
    }
  }

  async function handleAddClinic(newClinic: any) {
    // Generate a temporary integer ID (since mock db string IDs are sorting poorly in frontend DB currently, but we'll use a random hex)
    const newId = Math.random().toString(36).substring(2, 9);
    const dbPayload = { ...newClinic, id: newId };
    
    // Direct DB insert logic inside the UI just for mock presentation
    const currentList = db._getMockData('clinics');
    db._setMockData('clinics', [dbPayload, ...currentList]);
    
    setShowModal(false);
    fetchClinics();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Barcha Klinikalar</h1>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
        >
          + Yangi Klinika Qo'shish
        </button>
      </div>

      <div style={{ background: '#18181b', borderRadius: 16, border: '1px solid #27272a', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #27272a', background: '#27272a' }}>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500, fontSize: 14 }}>Tashkilot nomi</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500, fontSize: 14 }}>Domen (Slug)</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500, fontSize: 14 }}>Holati (Status)</th>
              <th style={{ padding: '15px 25px', color: '#a1a1aa', fontWeight: 500, fontSize: 14, textAlign: 'right' }}>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {clinics.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #27272a', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#27272a'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '20px 25px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '20px 25px', color: '#94a3b8' }}>{c.slug}.clary.uz</td>
                <td style={{ padding: '20px 25px' }}>
                  <span style={{ 
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: c.status === 'active' ? 'rgba(22, 163, 74, 0.2)' : c.status === 'trial' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: c.status === 'active' ? '#4ade80' : c.status === 'trial' ? '#facc15' : '#f87171'
                  }}>
                    {c.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '20px 25px', textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => toggleStatus(c.id, c.status)}
                    style={{ padding: '8px 16px', background: '#3f3f46', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                  >
                    Holat
                  </button>
                  <button 
                    onClick={() => onSelectClinic(c.id)}
                    style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                  >
                    Tahlil
                  </button>
                </td>
              </tr>
            ))}
            {clinics.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>Kompaniyalar topilmadi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && <AddClinicModal onClose={() => setShowModal(false)} onSuccess={handleAddClinic} />}
    </div>
  );
}
