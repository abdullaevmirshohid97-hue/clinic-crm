import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { db } from '../../utils/db';
import { printReceipt } from '../../utils/printer';

// ACL Roles mapped for translation / UI
const ROLES = [
  { id: 'admin', label: 'Admin (Boshqaruvchi)' },
  { id: 'cashier', label: 'Kassir' },
  { id: 'doctor', label: 'Shifokor' },
  { id: 'nurse', label: 'Hamshira' }
];

// Available features
const FEATURES = [
  { id: 'reception', label: 'Registratura' },
  { id: 'queue', label: 'Navbat & Qabul' },
  { id: 'inpatient', label: 'Statsionar' },
  { id: 'journal', label: 'Jurnal & Moliya' },
  { id: 'analytics', label: 'Analitika' },
  { id: 'settings', label: 'Sozlamalar' }
];

export default function Settings() {
  const { t } = useTranslation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // profile, staff, finance, system
  const [searchQuery, setSearchQuery] = useState('');

  // TABS & DATA STATES
  const [clinic, setClinic] = useState({ 
    clinicName: '', clinicAddress: '', clinicPhone: '', clinicSlogan: '', 
    receiptWidth: '80', mealPrice: '0', receiptNote: '', receiptHeader: '', receiptFooter: '',
    backupTime: '23:00', telegramBotToken: '', telegramChatId: ''
  });

  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [permissions, setPermissions] = useState([]); // Array of {role, feature, canAccess}

  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printersLoading, setPrintersLoading] = useState(false);
  const [serviceViewMode, setServiceViewMode] = useState('list');
  const [qrPath, setQrPath] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');

  // Modals & Form states
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editDoctor, setEditDoctor] = useState(null);
  const [editService, setEditService] = useState(null);

  const [doctorForm, setDoctorForm] = useState({ fullName: '', specialty: '', prefix: '', phone: '', role: 'doctor', commission_rate: 0 });
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', category: '', duration: '' });
  const [sidebarEditMode, setSidebarEditMode] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  const [auditLogs, setAuditLogs] = useState([]);

  async function loadAuditLogs() {
    try {
      const rows = await db.getAllRows('audit_log');
      // local sort descending
      rows.sort((a,b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
      setAuditLogs(rows.slice(0, 100));
    } catch(e) { console.error('Audit Load Error', e); }
  }

  const loadPrinters = useCallback(async () => {
    if (!window.electronAPI?.print?.getPrinters) return;
    setPrintersLoading(true);
    try {
      const result = await window.electronAPI.print.getPrinters();
      if (result.success) setPrinters(result.data || []);
    } catch { /* ignore */ }
    setPrintersLoading(false);
  }, []);

  useEffect(() => { loadAll(); loadPrinters(); }, [loadPrinters]);

  async function loadAll() {
    try {
      const settingsRows = await db.getAllRows('settings');
      const obj = {};
      settingsRows.forEach(r => { obj[r.key] = r.value; });
      setClinic({
        clinicName: obj.clinicName || '',
        clinicAddress: obj.clinicAddress || '',
        clinicPhone: obj.clinicPhone || '',
        clinicSlogan: obj.clinicSlogan || '',
        receiptWidth: obj.receiptWidth || '80',
        mealPrice: obj.mealPrice || '0',
        receiptNote: obj.receiptNote || '',
        receiptHeader: obj.receiptHeader || '',
        receiptFooter: obj.receiptFooter || '',
        backupTime: obj.backupTime || '23:00',
        telegramBotToken: obj.telegramBotToken || '',
        telegramChatId: obj.telegramChatId || ''
      });
      setSelectedPrinter(obj.printerName || '');
      setSidebarEditMode(obj.sidebarEditMode === '1');
      setQrPath(obj.printerQrPath || '');
      
      const savedPin = localStorage.getItem('clinic_admin_pin');
      setAdminPin(savedPin || '');

      setDoctors(await db.getAllRows('doctors'));
      
      const allServices = await db.getAllRows('services');
      // Sort in JS instead of DB
      allServices.sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      setServices(allServices);
      
      try {
        const perms = await db.getAllRows('permissions');
        setPermissions(perms);
      } catch (e) {
        // Migration might not have run if previously opened
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ==== SEARCH FILTERING ====
  const showSection = (keywords) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return keywords.some(k => k.toLowerCase().includes(q));
  };

  // ==== SETTINGS ACTIONS ====
  async function saveClinicSettings() {
    try {
      for (const [key, value] of Object.entries(clinic)) {
         await db.setSetting(key, value);
      }
      toast.success(t('common.success'));
    } catch (err) {
      toast.error(err.message);
    }
  }

  function saveAdminPin() {
    if (adminPin.trim() === '') {
      localStorage.removeItem('clinic_admin_pin');
      toast.success('Parol o\'chirildi (Endi kod soralmaydi)');
    } else {
      localStorage.setItem('clinic_admin_pin', adminPin.trim());
      toast.success('Yangi parol saqlandi!');
    }
  }

  async function savePrinter(name) {
    setSelectedPrinter(name);
    try {
      await db.setSetting('printerName', name);
      toast.success(t('common.success'));
    } catch (err) { toast.error(err.message); }
  }

  async function handleTestPrint() {
    try {
      await printReceipt({
        type: 'service', patientName: 'Test Bemor', doctorName: 'Test Shifokor',
        services: [{ name: 'Test Xizmat', price: 50000 }], total: 50000,
        paymentType: 'cash',
      });
      toast.success('Test chek yuborildi');
    } catch { toast.error('Printer xatosi'); }
  }

  // QR Upload
  function handleQrFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Fayl 2MB dan oshmasligi kerak'); return; }
    setQrFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setQrPreview(ev.target?.result || '');
    reader.readAsDataURL(file);
  }

  async function handleQrUpload() {
    if (!qrFile) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result?.split(',')[1];
        if (!base64) return;
        const result = await window.electronAPI.qr.upload(base64, qrFile.name);
        if (result.success) {
          setQrPath(result.path);
          toast.success('QR yuklandi!');
        } else { toast.error(result.error); }
      };
      reader.readAsDataURL(qrFile);
    } catch (err) { toast.error(err.message); }
  }

  // Doctors & Services (CRUD)
  /* ... skipping exhaustive implementations for brevity, copied from old Settings ... */
  function openDoctorModal(doc = null) {
    if (doc) { setEditDoctor(doc); setDoctorForm({ fullName: doc.fullName, specialty: doc.specialty || '', prefix: doc.prefix || '', phone: doc.phone || '', role: doc.role || 'doctor', commission_rate: doc.commission_rate || 0 }); }
    else { setEditDoctor(null); setDoctorForm({ fullName: '', specialty: '', prefix: '', phone: '', role: 'doctor', commission_rate: 0 }); }
    setShowDoctorModal(true);
  }
  async function saveDoctor() {
    if (!doctorForm.fullName.trim()) return;
    try {
      if (editDoctor) await db.update('doctors', editDoctor.id, doctorForm);
      else await db.insert('doctors', doctorForm);
      setShowDoctorModal(false); await loadAll(); toast.success(t('common.success'));
    } catch (err) { toast.error(err.message); }
  }
  async function deleteDoctor(id) { try { await db.delete('doctors', id); await loadAll(); toast.success(t('common.success')); } catch (err) { toast.error(err.message); } }

  function openServiceModal(svc = null) {
    if (svc) { setEditService(svc); setServiceForm({ name: svc.name, price: String(svc.price), category: svc.category || '', duration: svc.duration ? String(svc.duration) : '' }); }
    else { setEditService(null); setServiceForm({ name: '', price: '', category: '', duration: '' }); }
    setShowServiceModal(true);
  }
  async function saveService() {
    if (!serviceForm.name.trim() || !serviceForm.price) return;
    const data = { ...serviceForm, price: Number(serviceForm.price), duration: serviceForm.duration ? Number(serviceForm.duration) : null };
    try {
      if (editService) await db.update('services', editService.id, data);
      else await db.insert('services', { ...data, isActive: 1 });
      setShowServiceModal(false); await loadAll(); toast.success(t('common.success'));
    } catch (err) { toast.error(err.message); }
  }
  async function deleteService(id) { try { await db.delete('services', id); await loadAll(); toast.success(t('common.success')); } catch (err) { toast.error(err.message); } }

  // ACL Permissions
  async function togglePermission(role, feature, currentState) {
    const newVal = currentState ? 0 : 1;
    try {
      const exists = permissions.find(p => p.role === role && p.feature === feature);
      if (exists) {
         await db.update('permissions', exists.id, { canAccess: newVal });
      } else {
         await db.insert('permissions', { role, feature, canAccess: newVal });
      }
      await loadAll();
    } catch (e) { toast.error(e.message); }
  }

  function checkPermission(role, feature) {
    if (role === 'admin') return true; // Admin has hardcoded access visually
    const p = permissions.find(p => p.role === role && p.feature === feature);
    return p ? p.canAccess === 1 : false;
  }

  // Backup & Telegram
  async function handleTelegramTest() {
    if (!clinic.telegramBotToken || !clinic.telegramChatId) {
      return toast.error("Token va Chat ID kiritilishi kerak!");
    }
    toast.info("Yuborilmoqda...");
    try {
      const res = await window.electronAPI.invoke('backup:testTelegram', clinic.telegramBotToken, clinic.telegramChatId);
      if (res.success) toast.success("Telegram'ga muvaffaqiyatli yuborildi!");
      else toast.error("Xatolik: " + res.error);
    } catch (e) { toast.error(e.message); }
  }

  function formatPrice(n) { return Number(n).toLocaleString('uz-UZ'); }

  return (
    <div className="page page-settings" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with Global Search */}
      <div className="page-header" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>⚙️ {t('settings.title')}</h1>
        <div style={{ width: '300px' }}>
          <input 
            type="text" 
            className="form-input w-full" 
            placeholder="🔍 Sozlamalardan qidirish (Masalan: Printer, Chek...)" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 20, overflow: 'hidden' }}>
        {/* Sidebar Tabs - Pro Level */}
        <div className="settings-sidebar" style={{ width: 300, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 20 }}>
          <div style={{ padding: '0 12px 10px', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Konfiguratsiya Paneli</div>
          
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} style={{ border: 'none', background: activeTab === 'profile' ? 'var(--bg-input)' : 'transparent', textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: '0.2s' }} onClick={() => setActiveTab('profile')}>
            <div style={{ fontWeight: 700, fontSize: 15, color: activeTab === 'profile' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>🏥 Umumiy Ma'lumotlar</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Klinika nomi, aloqa, manzil, rekvizitlar</div>
          </button>

          <button className={`nav-item ${activeTab === 'staff' ? 'active' : ''}`} style={{ border: 'none', background: activeTab === 'staff' ? 'var(--bg-input)' : 'transparent', textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: '0.2s' }} onClick={() => setActiveTab('staff')}>
            <div style={{ fontWeight: 700, fontSize: 15, color: activeTab === 'staff' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>👥 Ruxsatlar va Huquqlar</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rollarni chegaralash, xodimlar royxati</div>
          </button>

          <button className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`} style={{ border: 'none', background: activeTab === 'finance' ? 'var(--bg-input)' : 'transparent', textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: '0.2s' }} onClick={() => setActiveTab('finance')}>
            <div style={{ fontWeight: 700, fontSize: 15, color: activeTab === 'finance' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>🖨️ Uskunalar va Chek</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Xizmat narxlari, printer va kvitansiya logikasi</div>
          </button>

          <button className={`nav-item ${activeTab === 'system' ? 'active' : ''}`} style={{ border: 'none', background: activeTab === 'system' ? 'var(--bg-input)' : 'transparent', textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: '0.2s' }} onClick={() => setActiveTab('system')}>
            <div style={{ fontWeight: 700, fontSize: 15, color: activeTab === 'system' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>⚙️ Tizim Xavfsizligi</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pin-kodlar, Zaxiralash, Telegram auto-backup</div>
          </button>

          <button className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} style={{ border: 'none', background: activeTab === 'audit' ? 'var(--bg-input)' : 'transparent', textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, transition: '0.2s' }} onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: activeTab === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>📜 Harakatlar Jurnali (Audit)</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin/SaaS platforma xavfsizlik audit loglari</div>
          </button>
        </div>

        {/* Settings Content */}
        <div className="settings-content" style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>
          
            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div className="settings-section" style={{ paddingLeft: 10 }}>
                <div style={{ marginBottom: 30 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 5 }}>Tashkilot Profili</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Klinikaning asosiy ma'lumotlari, brending va rekvizitlari.</p>
                </div>
                {showSection(['klinika', 'profil', 'manzil', 'telefon', 'shior']) && (
                  <div className="card glass-card mb-4" style={{border: '1px solid var(--border-color)', background: 'var(--bg-card)'}}>
                    <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 15 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700 }}>Umumiy Ma'lumotlar</h3>
                    </div>
                  <div className="card-body">
                    <div className="form-grid">
                      <div className="form-group"><label>{t('settings.clinicName')}</label><input className="form-input" value={clinic.clinicName} onChange={e => setClinic({...clinic, clinicName: e.target.value})} /></div>
                      <div className="form-group"><label>{t('settings.address')}</label><input className="form-input" value={clinic.clinicAddress} onChange={e => setClinic({...clinic, clinicAddress: e.target.value})} /></div>
                      <div className="form-group"><label>{t('settings.phone')}</label><input className="form-input" value={clinic.clinicPhone} onChange={e => setClinic({...clinic, clinicPhone: e.target.value})} /></div>
                      <div className="form-group"><label>Shior</label><input className="form-input" value={clinic.clinicSlogan} onChange={e => setClinic({...clinic, clinicSlogan: e.target.value})} /></div>
                    </div>
                    <button className="btn btn-primary mt-3" onClick={saveClinicSettings}>💾 Saqlash</button>
                  </div>
                </div>
              )}
            </div>
          )}

            {/* TAB: STAFF & ACL */}
            {activeTab === 'staff' && (
              <div className="settings-section" style={{ paddingLeft: 10 }}>
                <div style={{ marginBottom: 30 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 5 }}>Xodimlar va Huquqlar (ACL)</h2>
                  <p style={{ color: 'var(--text-muted)' }}>SaaS xavfsizlik modeli, modullarga kirish huquqlarini chegaralash va komissiyalar konfiguratsiyasi.</p>
                </div>
                 {showSection(['shifokor', 'xodim', 'komissiya']) && (
                   <div className="card glass-card mb-4" style={{border: '1px solid var(--border-color)', background: 'var(--bg-card)'}}>
                    <div className="card-header" style={{display:'flex', justifyContent:'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 15}}>
                      <h3 style={{ fontSize: 18, fontWeight: 700 }}>👨‍⚕️ Shifokorlar va Ulushlar</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => openDoctorModal()}>+ Shifokor</button>
                  </div>
                  <div className="card-body p-0">
                    <table className="data-table">
                      <thead>
                        <tr><th>F.I.Sh</th><th>Mutaxassisligi</th><th>Ulush (%)</th><th>Amallar</th></tr>
                      </thead>
                      <tbody>
                        {doctors.map(d=><tr key={d.id}><td>{d.fullName}</td><td>{d.specialty}</td><td style={{color:'var(--accent-primary)', fontWeight:700}}>{d.commission_rate||0}%</td><td><button className="btn-icon-only" onClick={()=>openDoctorModal(d)}>✏️</button></td></tr>)}
                      </tbody>
                    </table>
                  </div>
                 </div>
               )}

               {showSection(['rol', 'huquq', 'ruxsat', 'acl', 'permissions']) && (
                 <div className="card glass-card mb-4">
                  <div className="card-header">
                    <h3>🛡️ Rollar Iyerarxiyasi (ACL)</h3>
                  </div>
                  <div className="card-body">
                    <p style={{fontSize:12, color:'var(--text-muted)', marginBottom:15}}>Har bir rol qaysi modullarga kira olishini belgilang. (Admin barcha ruxsatlarga ega).</p>
                    <div style={{overflowX:'auto'}}>
                      <table className="data-table">
                         <thead>
                           <tr>
                             <th>Modul / Rol</th>
                             {ROLES.map(r => <th key={r.id}>{r.label}</th>)}
                           </tr>
                         </thead>
                         <tbody>
                           {FEATURES.map(feat => (
                             <tr key={feat.id}>
                               <td style={{fontWeight:600}}>{feat.label}</td>
                               {ROLES.map(role => {
                                 const isAllowed = checkPermission(role.id, feat.id);
                                 return (
                                   <td key={role.id} style={{textAlign:'center'}}>
                                     <input 
                                       type="checkbox" 
                                       style={{transform: 'scale(1.3)', cursor: role.id==='admin'?'not-allowed':'pointer'}} 
                                       checked={role.id === 'admin' ? true : isAllowed}
                                       disabled={role.id === 'admin'}
                                       onChange={() => togglePermission(role.id, feat.id, isAllowed)}
                                     />
                                   </td>
                                 );
                               })}
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    </div>
                  </div>
                 </div>
               )}
            </div>
          )}

            {/* TAB: FINANCE & RECEIPT */}
            {activeTab === 'finance' && (
              <div className="settings-section" style={{ paddingLeft: 10 }}>
                <div style={{ marginBottom: 30 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 5 }}>Uskunalar va Cheklar</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Kvitansiya dizayner interfeysi, termal printerlarni ulash hamda xizmatlar narxnomasi.</p>
                </div>
                 {showSection(['xizmat', 'narx', 'kategoriya']) && (
                   <div className="card glass-card mb-4" style={{border: '1px solid var(--border-color)', background: 'var(--bg-card)'}}>
                     <div className="card-header" style={{display:'flex', justifyContent:'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 15}}>
                      <h3 style={{ fontSize: 18, fontWeight: 700 }}>🩺 Xizmatlar va Katta Narxnoma</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => openServiceModal()}>+ Xizmat</button>
                   </div>
                   <div className="card-body p-0">
                     <table className="data-table">
                       <thead><tr><th>Xizmat</th><th>Kategoriya</th><th>Narxi</th><th></th></tr></thead>
                       <tbody>
                         {services.slice(0,10).map(s=><tr key={s.id}><td>{s.name}</td><td>{s.category||'—'}</td><td>{formatPrice(s.price)} so'm</td><td><button className="btn-icon-only" onClick={()=>openServiceModal(s)}>✏️</button></td></tr>)}
                         {services.length > 10 && <tr><td colSpan={4} style={{textAlign:'center', fontSize:11, opacity:0.6}}>... va yana {services.length - 10} ta xizmat</td></tr>}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {showSection(['chek', 'dizayn', 'printer', 'qr', 'kvitansiya']) && (
                 <div className="card glass-card mb-4" style={{borderLeft:'4px solid var(--accent-success)'}}>
                   <div className="card-header">
                     <h3>📝 Chek dizayneri va Printer</h3>
                     <div style={{display:'flex', gap:10}}>
                       <button className="btn btn-sm btn-ghost" onClick={loadPrinters}>🔄 {t('settings.selectPrinter')}</button>
                       <button className="btn btn-sm btn-secondary" onClick={handleTestPrint}>🖨️ Test Chek</button>
                     </div>
                   </div>
                   <div className="card-body">
                     <div className="form-grid mb-4">
                       <div className="form-group">
                         <label>Asosiy Printer</label>
                         <select className="form-input" value={selectedPrinter} onChange={e => savePrinter(e.target.value)}>
                           <option value="">- Tizim standart printeri -</option>
                           {printers.map(p => <option key={p.name} value={p.name}>{p.displayName || p.name}</option>)}
                         </select>
                       </div>
                       <div className="form-group">
                         <label>Qog'oz o'lchami</label>
                         <select className="form-input" value={clinic.receiptWidth} onChange={e => setClinic({...clinic, receiptWidth:e.target.value})}>
                           <option value="58">Tor (58mm)</option><option value="80">Keng (80mm)</option>
                         </select>
                       </div>
                     </div>

                     <div className="form-grid">
                       <div className="form-group full-width">
                         <label>Chek yuqorisi (Header) matni — izoh, aksiya yozuvlari</label>
                         <textarea className="form-input" rows={2} value={clinic.receiptHeader} onChange={e=>setClinic({...clinic, receiptHeader:e.target.value})} placeholder="Masalan: Klinikada bugun aksiya..."></textarea>
                       </div>
                       <div className="form-group full-width">
                         <label>Chek pastki qismi (Footer) matni — Qoida, minnatdorchilik</label>
                         <textarea className="form-input" rows={2} value={clinic.receiptFooter} onChange={e=>setClinic({...clinic, receiptFooter:e.target.value})} placeholder="Masalan: Shifokor qabuliga navbat kuting..."></textarea>
                       </div>
                     </div>

                     <div style={{ marginTop: 20, padding: 15, border: '1px dashed var(--border-color)', borderRadius: 8, background:'rgba(255,255,255,0.02)' }}>
                       <div style={{display:'flex', gap: 20, alignItems:'center'}}>
                         <div style={{flex: 1}}>
                            <h4>📲 QR-kod integratsiyasi</h4>
                            <p style={{fontSize:11, color:'var(--text-muted)', marginBottom:10}}>Chekning quyi qismida rasmiy sayt yoki Telegram botga olib chiquvchi JPG QR yuklang. (Faqat JPG, max 1MB).</p>
                            <input type="file" accept="image/jpeg" onChange={handleQrFileChange} />
                            <div style={{marginTop:10}}>
                              <button className="btn btn-sm btn-primary" onClick={handleQrUpload} disabled={!qrFile}>Yuklash va Saqlash</button>
                            </div>
                         </div>
                         <div>
                            {(qrPreview || qrPath) ? (
                              <img src={qrPreview || qrPath} alt="QR" style={{width: 100, height: 100, objectFit:'contain', background:'#fff', borderRadius:4, padding:5}} />
                            ) : (
                              <div style={{width:100, height:100, display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed var(--border-color)', color:'var(--text-muted)'}}>Yo'q</div>
                            )}
                         </div>
                       </div>
                     </div>

                     <button className="btn btn-primary mt-4" onClick={saveClinicSettings}>💾 Dizayn va sozlamalarni saqlash</button>
                   </div>
                 </div>
               )}
            </div>
          )}

            {/* TAB: SYSTEM & BACKUP */}
            {activeTab === 'system' && (
               <div className="settings-section" style={{ paddingLeft: 10 }}>
                  <div style={{ marginBottom: 30 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 5 }}>Platforma Xavfsizligi</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Lokal xavfsizlik cheklovlari (PIN kodlar) va Bulutli Avtomatik zaxiralash tizimi.</p>
                  </div>
                  {showSection(['xavfsizlik', 'parol', 'pin']) && (
                    <div className="card glass-card mb-4" style={{border: '1px solid var(--border-color)', background: 'var(--bg-card)'}}>
                      <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 15 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>🔐 Super Admin Xavfsizlik kodi</h3>
                      </div>
                    <div className="card-body">
                      <div className="form-group full-width" style={{maxWidth: 300}}>
                        <input type="text" className="form-input" value={adminPin} placeholder="PIN o'rnatish..." onChange={e => setAdminPin(e.target.value)} />
                        <div style={{display:'flex', gap:10, marginTop:10}}>
                          <button className="btn btn-primary" onClick={saveAdminPin}>Saqlash</button>
                          <button className="btn btn-ghost" onClick={() => { setAdminPin(''); localStorage.removeItem('clinic_admin_pin'); toast.success('Tozalandi'); }}>O'chirish</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showSection(['zaxira', 'backup', 'telegram', 'avtomatik']) && (
                  <div className="card glass-card mb-4" style={{borderLeft:'4px solid #0088CC'}}>
                    <div className="card-header">
                      <h3>☁️ Avtomatik Zaxiralash (Auto Backup)</h3>
                    </div>
                    <div className="card-body">
                      <p style={{fontSize:13, color:'var(--text-secondary)', marginBottom:20}}>Ma'lumotlar bazasini har kuni avtomatik nusxalash va uni xavfsiz tarzda Telegram orqali yuborish mexanizmi.</p>
                      
                      <div className="form-grid mb-4">
                        <div className="form-group">
                          <label>Avto-zaxiralash vaqti</label>
                          <input type="time" className="form-input" value={clinic.backupTime} onChange={e=>setClinic({...clinic, backupTime:e.target.value})} />
                        </div>
                        <div className="form-group full-width"><p style={{fontSize:11, color:'var(--text-muted)'}}>* Dastur fonda ishlab turganda belgilangan vaqtda bazani arxivlaydi.</p></div>
                      </div>

                      <div style={{padding: 15, background:'rgba(0, 136, 204, 0.05)', border:'1px solid rgba(0, 136, 204, 0.2)', borderRadius: 8}}>
                        <h4 style={{color:'#0088CC', marginBottom:10}}>✈️ Telegram Bulutli Sinxronizatsiya</h4>
                        <div className="form-grid">
                          <div className="form-group full-width">
                            <label>Bot Token (BotFather'dan)</label>
                            <input className="form-input" type="password" value={clinic.telegramBotToken} onChange={e=>setClinic({...clinic, telegramBotToken:e.target.value})} placeholder="123456789:ABCdefGHI..." />
                          </div>
                          <div className="form-group full-width">
                            <label>Chat ID (Kanal yoki Guruh)</label>
                            <input className="form-input" value={clinic.telegramChatId} onChange={e=>setClinic({...clinic, telegramChatId:e.target.value})} placeholder="-1001234567890" />
                          </div>
                        </div>
                        <div style={{display:'flex', gap: 10, marginTop:15}}>
                          <button className="btn btn-primary" onClick={saveClinicSettings}>Sozlamalarni saqlash</button>
                          <button className="btn btn-secondary" onClick={handleTelegramTest}>📤 Telegram'ga Test Yuborish</button>
                        </div>
                      </div>

                      <div className="backup-actions" style={{marginTop:30, paddingTop:20, borderTop:'1px solid var(--border-color)'}}>
                        <h4 style={{marginBottom:10}}>Lokal zaxira arxivlari</h4>
                        <div style={{display:'flex', gap:10}}>
                          <button className="btn btn-secondary" onClick={async () => {
                            try {
                              const result = await window.electronAPI.backup.export();
                              if (result.success) toast.success('Backup saqlandi: ' + result.path);
                              else if (result.error !== 'Cancelled') toast.error(result.error);
                            } catch (err) { toast.error(err.message); }
                          }}>📤 Hozirgi holatni eksport qilish</button>
                          <button className="btn btn-ghost" style={{color:'var(--accent-danger)'}} onClick={async () => {
                            try {
                              const result = await window.electronAPI.backup.import();
                              if (result.success) {
                                toast.success('Backup tiklandi! Dastur qayta yuklanadi...');
                                setTimeout(() => window.location.reload(), 1500);
                              } else if (result.error !== 'Cancelled') toast.error(result.error);
                            } catch (err) { toast.error(err.message); }
                          }}>📥 Tiklash (Barcha eski ma'lumotlar o'chadi)</button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
             </div>
          )}

            {/* TAB: AUDIT LOG */}
            {activeTab === 'audit' && (
               <div className="settings-section" style={{ paddingLeft: 10 }}>
                  <div style={{ marginBottom: 30 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 5 }}>Xavfsizlik Jurnali (Audit Log)</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Dastur ichidagi barcha modifikatsiya (kiritish, tahrirlash, o'chirish) harakatlari kancelyariyasi.</p>
                  </div>
                  <div className="card glass-card mb-4" style={{border: '1px solid var(--border-color)', background: 'var(--bg-card)'}}>
                    <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 15 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700 }}>📜 Harakatlar Jurnali Yozuvlari</h3>
                    </div>
                  <div className="card-body p-0">
                    <table className="data-table">
                       <thead>
                         <tr>
                            <th>Vaqti</th>
                            <th>Foydalanuvchi</th>
                            <th>Harakat turi</th>
                            <th>Jadval / Joylashuv</th>
                            <th>Izoh</th>
                         </tr>
                       </thead>
                       <tbody>
                         {auditLogs.map((log, i) => (
                           <tr key={i}>
                             <td style={{fontSize:12}}>{new Date(log.timestamp || log.createdAt).toLocaleString('uz-UZ')}</td>
                             <td><span className="badge badge-outline">{log.userName || log.user_id || 'Tizim / Admin'}</span></td>
                             <td style={{fontWeight:600, color: log.action==='delete'?'var(--accent-danger)':log.action==='update'?'var(--accent-warning)':'var(--accent-primary)'}}>{(log.action || '').toUpperCase()}</td>
                             <td>{log.tableName || log.table_name || 'Noma\'lum'}</td>
                             <td style={{fontSize:12, whiteSpace:'pre-wrap'}}>{log.reason || log.details || '-'}</td>
                           </tr>
                         ))}
                         {auditLogs.length === 0 && <tr><td colSpan={5} className="text-center p-4">Hozircha jurnal bo'sh</td></tr>}
                       </tbody>
                    </table>
                  </div>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* CRUD Modals preserved but simplified for focus */}
      <Modal isOpen={showDoctorModal} onClose={() => setShowDoctorModal(false)} title={editDoctor ? "Shifokorni tahrirlash" : "Yangi Shifokor"}>
         <div className="form-grid">
           <div className="form-group full-width"><label>F.I.Sh</label><input className="form-input" value={doctorForm.fullName} onChange={e=>setDoctorForm({...doctorForm, fullName:e.target.value})} autoFocus/></div>
           <div className="form-group"><label>Mutaxassislik</label><input className="form-input" value={doctorForm.specialty} onChange={e=>setDoctorForm({...doctorForm, specialty:e.target.value})}/></div>
           <div className="form-group"><label>Ulush (Komissiya %)</label><input type="number" className="form-input" value={doctorForm.commission_rate} onChange={e=>setDoctorForm({...doctorForm, commission_rate:Number(e.target.value)})}/></div>
         </div>
         <div className="form-actions mt-4">
           {editDoctor && <button className="btn btn-danger" onClick={()=>deleteDoctor(editDoctor.id)}>🗑️ O'chirish</button>}
           <span style={{flex:1}}></span>
           <button className="btn btn-primary" onClick={saveDoctor}>Saqlash</button>
         </div>
      </Modal>

      <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} title={editService ? "Xizmatni tahrirlash" : "Yangi xizmat"}>
         <div className="form-grid">
           <div className="form-group full-width"><label>Xizmat nomi</label><input className="form-input" value={serviceForm.name} onChange={e=>setServiceForm({...serviceForm, name:e.target.value})} autoFocus/></div>
           <div className="form-group"><label>Kategoriya</label><input className="form-input" value={serviceForm.category} onChange={e=>setServiceForm({...serviceForm, category:e.target.value})}/></div>
           <div className="form-group"><label>Narxi</label><input type="number" className="form-input" value={serviceForm.price} onChange={e=>setServiceForm({...serviceForm, price:e.target.value})}/></div>
         </div>
         <div className="form-actions mt-4">
           {editService && <button className="btn btn-danger" onClick={()=>deleteService(editService.id)}>🗑️ O'chirish</button>}
           <span style={{flex:1}}></span>
           <button className="btn btn-primary" onClick={saveService}>Saqlash</button>
         </div>
      </Modal>
    </div>
  );
}
