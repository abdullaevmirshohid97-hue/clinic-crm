import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { db } from '../utils/db';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function Archive() {
  const { t } = useTranslation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('transactions'); // transactions, patients
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [archiveData, setArchiveData] = useState([]);

  useEffect(() => { loadArchivedData(); }, [activeTab, year]);

  async function loadArchivedData() {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const query = `
          SELECT t.*, p.fullName, p.phone, d.fullName as doctorName, s.name as serviceName
          FROM (
             SELECT id, patientId, 'outpatient' as type, item_name as description, amount, payment_type as paymentType, createdAt, doctor_id, service_id FROM appointments
             UNION ALL
             SELECT id, patientId, 'inpatient' as type, 'Statsionar' as description, amount, paymentType, createdAt, 0 as doctor_id, 0 as service_id FROM room_patients
          ) t
          LEFT JOIN patients p ON t.patientId = p.id
          LEFT JOIN doctors d ON t.doctor_id = d.id
          LEFT JOIN services s ON t.service_id = s.id
          WHERE strftime('%Y', t.createdAt) = ?
          ORDER BY t.createdAt DESC
          LIMIT 300
        `;
        const res = await db.query(query, [`${year}`]);
        setArchiveData(res);
      } else {
        const res = await db.query(`
          SELECT * FROM patients
          WHERE id NOT IN (SELECT DISTINCT patientId FROM appointments WHERE strftime('%Y', createdAt) > ?)
          AND id NOT IN (SELECT DISTINCT patientId FROM room_patients WHERE strftime('%Y', createdAt) > ?)
          LIMIT 150
        `, [`${year}`, `${year}`]);
        setArchiveData(res);
      }
    } catch(e) { toast.error(e.message); }
    setLoading(false);
  }

  async function triggerManualArchive() {
    toast.info("Tizim avtomatik arxivlash rejimida...");
    loadArchivedData();
  }

  function formatPrice(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

  return (
    <div className="page page-archive">
      <div className="page-header">
        <h1 style={{ fontSize: 32 }}>📂 Arxiv va Tarixiy Ma'lumotlar</h1>
        <div style={{display:'flex', gap: 10}}>
           <button className="btn btn-primary" style={{ padding:'12px 24px', fontSize:16 }} onClick={triggerManualArchive}>🔄 Ma'lumotlarni Arxivlash</button>
        </div>
      </div>

      <div className="settings-layout" style={{display: 'flex', gap: 20}}>
        {/* Sidebar Nav */}
        <div className="settings-sidebar card glass-card" style={{width: 320, alignSelf:'flex-start', padding: 25}}>
          <div className="settings-nav" style={{display:'flex', flexDirection:'column', gap: 14 }}>
             <button 
               onClick={() => setActiveTab('transactions')}
               style={{
                 textAlign:'left', transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', padding:'22px', 
                 borderRadius:'18px', border: activeTab==='transactions' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', 
                 background: activeTab==='transactions' ? 'var(--accent-primary-glow)' : 'var(--bg-input)', 
                 display:'flex', gap:15, alignItems:'center', cursor:'pointer', 
                 boxShadow: activeTab==='transactions' ? '0 10px 25px rgba(37,99,235,0.18)' : 'none'
               }}>
                <span style={{fontSize:40, padding:14, background:'rgba(255,255,255,0.1)', borderRadius:'16px'}}>📜</span>
                <div>
                  <div style={{fontWeight:900, fontSize:17, color: activeTab==='transactions' ? 'var(--accent-primary)' : 'var(--text-primary)'}}>Moliya Arxivi</div>
                  <div style={{fontSize:12, opacity:0.6, marginTop:5}}>O'tgan yillardagi daromad va tranzaksiyalar.</div>
                </div>
             </button>
             <button 
               onClick={() => setActiveTab('patients')}
               style={{
                 textAlign:'left', transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', padding:'22px', 
                 borderRadius:'18px', border: activeTab==='patients' ? '1px solid var(--accent-success)' : '1px solid var(--border-color)', 
                 background: activeTab==='patients' ? 'rgba(34,197,94,0.1)' : 'var(--bg-input)', 
                 display:'flex', gap:15, alignItems:'center', cursor:'pointer',
                 boxShadow: activeTab==='patients' ? '0 10px 25px rgba(34,197,94,0.18)' : 'none'
               }}>
                <span style={{fontSize:40, padding:14, background:'rgba(255,255,255,0.1)', borderRadius:'16px'}}>🗃️</span>
                <div>
                  <div style={{fontWeight:900, fontSize:17, color: activeTab==='patients' ? 'var(--accent-success)' : 'var(--text-primary)'}}>Passiv Baza</div>
                  <div style={{fontSize:12, opacity:0.6, marginTop:5}}>Klinikaga uzoq vaqt kelmagan bemorlar.</div>
                </div>
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="settings-content" style={{flex: 1, minWidth: 0}}>
           
           <div className="card glass-card mb-5 p-4" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
              <div style={{display:'flex', gap: 25, alignItems:'center' }}>
                 <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontWeight:800, fontSize:14, textTransform:'uppercase', opacity:0.7 }}>Yil:</div>
                    <input type="number" className="form-input" style={{ width:120, fontSize:16, fontWeight:800, textAlign:'center' }} value={year} onChange={e=>setYear(e.target.value)} />
                 </div>
                 
                 <div style={{ flex:1, display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontWeight:800, fontSize:14, textTransform:'uppercase', opacity:0.7 }}>Qidiruv:</div>
                    <input type="text" className="form-input" style={{ padding:12 }} placeholder="Ism, telefon yoki xizmat nomi orqali qidirish..." value={search} onChange={e=>setSearch(e.target.value)} />
                 </div>
              </div>
           </div>

           {activeTab === 'transactions' && (
              <div className="card glass-card">
                 <div className="table-wrapper">
                   <table className="data-table">
                     <thead style={{ background: 'var(--bg-input)' }}>
                       <tr style={{ height: 60 }}>
                         <th>Sana va Vaqt</th>
                         <th>Bemor F.I.O</th>
                         <th>Amaliyot / Xizmat</th>
                         <th>To'lov</th>
                         <th style={{ textAlign:'right' }}>Summa</th>
                       </tr>
                     </thead>
                     <tbody>
                       {archiveData.filter(x => (x.fullName||'').toLowerCase().includes(search.toLowerCase()) || (x.description||'').toLowerCase().includes(search.toLowerCase())).map(t => (
                         <tr key={t.id} style={{ height: 65, fontSize: 15 }}>
                           <td style={{ opacity:0.7, fontWeight:600 }}>{new Date(t.createdAt).toLocaleString('uz-UZ')}</td>
                           <td><div style={{fontWeight:800}}>{t.fullName || t.patient_name || '—'}</div></td>
                           <td><span className="badge badge-outline">{t.description || t.serviceName}</span></td>
                           <td><span className={`badge ${t.paymentType==='cash' ? 'badge-success' : 'badge-info'}`} style={{ textTransform:'uppercase' }}>{t.paymentType}</span></td>
                           <td style={{fontWeight:900, color:'var(--accent-primary)', textAlign:'right', fontSize:17}}>{formatPrice(t.amount)} so'm</td>
                         </tr>
                       ))}
                       {archiveData.length === 0 && !loading && <tr><td colSpan={5} className="p-10 text-center opacity-50">Joriy yilda arxivlangan xujjatlar topilmadi...</td></tr>}
                     </tbody>
                   </table>
                 </div>
              </div>
           )}

           {activeTab === 'patients' && (
              <div className="card glass-card">
                 <div className="p-4 bg-warning-glow" style={{fontSize: 14, borderBottom:'1px solid var(--border-color)', fontWeight: 600 }}>
                    ⚠️ Diqqat: Quyidagi bemorlar <b>{year}</b>-yildan buyon klinikaga murojaat qilishmagan.
                 </div>
                 <div className="table-wrapper">
                   <table className="data-table">
                     <thead style={{ background: 'var(--bg-input)' }}>
                       <tr style={{ height: 60 }}>
                         <th>F.I.O</th>
                         <th>Telefon</th>
                         <th>Ro'yxatga olingan sana</th>
                         <th style={{ textAlign:'center' }}>Amallar</th>
                       </tr>
                     </thead>
                     <tbody>
                       {archiveData.filter(x => (x.fullName||'').toLowerCase().includes(search.toLowerCase())).map(p => (
                         <tr key={p.id} style={{ height: 65, fontSize: 15 }}>
                           <td><div style={{fontWeight:800}}>{p.fullName}</div></td>
                           <td style={{ fontWeight: 600 }}>{p.phone || '—'}</td>
                           <td style={{ opacity:0.7 }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('uz-UZ') : '—'}</td>
                           <td style={{ textAlign:'center' }}>
                             <button className="btn btn-sm btn-outline text-success" style={{ borderColor:'var(--accent-success)', borderRadius:8, fontWeight:700 }}>♻️ Bazaga Qaytarish</button>
                           </td>
                         </tr>
                       ))}
                       {archiveData.length === 0 && !loading && <tr><td colSpan={4} className="p-10 text-center opacity-50">Filter bo'yicha ma'lumot topilmadi</td></tr>}
                     </tbody>
                   </table>
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
}
