import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { useToast } from '../components/ui/Toast';

const ROLES = [
  { value: 'admin',       label: '🛡️ Admin (Boshqaruvchi)' },
  { value: 'doctor',      label: '👨‍⚕️ Shifokor' },
  { value: 'receptionist',label: '📋 Qabulxona' },
  { value: 'cashier',     label: '💰 Kassir' },
  { value: 'lab_tech',    label: '🔬 Laborant' },
  { value: 'pharmacist',  label: '💊 Farmatsevt' },
  { value: 'nurse',       label: '🩺 Hamshira' },
  { value: 'staff',       label: '👤 Xodim' },
];

const EMPTY_FORM = { fullName: '', specialty: '', phone: '', role: 'staff', salary: '', hiredAt: '', isActive: 1 };

export default function StaffManagement() {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    setLoading(true);
    try {
      const data = await db.getAllRows('staff');
      setStaff(data);
    } catch (err) {
      toast.error('Xodimlarni yuklashda xatolik: ' + err.message);
    }
    setLoading(false);
  }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(s) {
    setEditId(s.id);
    setForm({
      fullName: s.fullName || '',
      specialty: s.specialty || '',
      phone: s.phone || '',
      role: s.role || 'staff',
      salary: s.salary ? String(s.salary) : '',
      hiredAt: s.hiredAt || '',
      isActive: s.isActive ?? 1,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.fullName.trim()) { toast.error("F.I.Sh kiriting!"); return; }
    setLoading(true);
    try {
      const data = {
        fullName: form.fullName.trim(),
        specialty: form.specialty.trim(),
        phone: form.phone.trim(),
        role: form.role,
        salary: form.salary ? Number(form.salary) : null,
        hiredAt: form.hiredAt || null,
        isActive: Number(form.isActive),
      };
      if (editId) {
        await db.update('staff', editId, data);
        toast.success("Xodim yangilandi!");
      } else {
        await db.insert('staff', data);
        toast.success("Xodim qo'shildi!");
      }
      setShowForm(false);
      await loadStaff();
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
      await db.delete('staff', id);
      toast.success("O'chirildi!");
      await loadStaff();
    } catch (err) { toast.error(err.message); }
  }

  const filtered = staff.filter(s =>
    s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    s.role?.toLowerCase().includes(search.toLowerCase())
  );

  const roleLabel = (r) => ROLES.find(x => x.value === r)?.label || r;

  return (
    <div className="page">
      <div className="page-header">
        <h1>👥 Xodimlar boshqaruvi</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text" className="form-input" style={{ width: 220 }}
            placeholder="🔍 Qidirish..." value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={openNew}>➕ Yangi xodim</button>
          <button className="btn btn-ghost" onClick={loadStaff}>🔄</button>
        </div>
      </div>

      <div className="page-body">
        <div className="card glass-card">
          <div className="card-body p-0">
            {loading && <div style={{ padding: 40, textAlign: 'center' }}>Yuklanmoqda...</div>}
            {!loading && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>F.I.Sh</th>
                    <th>Mutaxassislik</th>
                    <th>Lavozim</th>
                    <th>Telefon</th>
                    <th>Maosh</th>
                    <th>Holat</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      Xodimlar yo'q. ➕ Yangi xodim qo'shing.
                    </td></tr>
                  )}
                  {filtered.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{s.fullName}</td>
                      <td>{s.specialty || '—'}</td>
                      <td><span className="badge badge-outline" style={{ fontSize: 11 }}>{roleLabel(s.role)}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.phone || '—'}</td>
                      <td style={{ color: 'var(--accent-success)', fontWeight: 600 }}>
                        {s.salary ? Number(s.salary).toLocaleString('uz-UZ') + " so'm" : '—'}
                      </td>
                      <td>
                        <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>
                          {s.isActive ? '✅ Faol' : '❌ Nofaol'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(s)}>✏️</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editId ? '✏️ Xodimni tahrirlash' : '➕ Yangi xodim'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>F.I.Sh *</label>
                  <input className="form-input" autoFocus value={form.fullName}
                    onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Abdullayev Mirshohid..." />
                </div>
                <div className="form-group">
                  <label>Mutaxassislik</label>
                  <input className="form-input" value={form.specialty}
                    onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
                    placeholder="Terapevt, Stomatolog..." />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input className="form-input" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+998 90 000 00 00" />
                </div>
                <div className="form-group">
                  <label>Lavozim</label>
                  <select className="form-input" value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Maosh (so'm)</label>
                  <input type="number" className="form-input" value={form.salary}
                    onChange={e => setForm(p => ({ ...p, salary: e.target.value }))}
                    placeholder="5000000" />
                </div>
                <div className="form-group">
                  <label>Ishga qabul sanasi</label>
                  <input type="date" className="form-input" value={form.hiredAt}
                    onChange={e => setForm(p => ({ ...p, hiredAt: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Holat</label>
                  <select className="form-input" value={form.isActive}
                    onChange={e => setForm(p => ({ ...p, isActive: Number(e.target.value) }))}>
                    <option value={1}>✅ Faol</option>
                    <option value={0}>❌ Nofaol</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Bekor</button>
              <button className="btn btn-primary" disabled={loading} onClick={handleSave}>
                {loading ? 'Saqlanmoqda...' : '💾 Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
