import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { db } from '../utils/db';
import { toast } from 'react-hot-toast';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'staff' });

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      toast.error("Xodimlarni yuklashda xatolik");
    }
  }

  async function handleCreateStaff(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Call Edge Function to create Auth User
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: form
      });

      if (error) throw error;

      toast.success("Xodim muvaffaqiyatli qo'shildi!");
      setForm({ email: '', password: '', fullName: '', role: 'staff' });
      loadStaff();
    } catch (err) {
      toast.error(err.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Xodimlar boshqaruvi</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Yangi xodim qo'shish</h2>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">F.I.Sh</label>
              <input 
                className="form-input w-full" 
                required 
                value={form.fullName}
                onChange={e => setForm({...form, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input 
                type="email" 
                className="form-input w-full" 
                required 
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Parol</label>
              <input 
                type="password" 
                className="form-input w-full" 
                required 
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lavozim</label>
              <select 
                className="form-input w-full"
                value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}
              >
                <option value="staff">Xodim</option>
                <option value="doctor">Shifokor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Yaratilmoqda...' : 'Xodimni yaratish'}
            </button>
          </form>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4">Mavjud xodimlar</h2>
          <div className="space-y-2">
            {staff.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-bold">{s.fullName}</div>
                  <div className="text-sm text-gray-500">{s.role}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {s.isActive ? 'Faol' : 'Nofaol'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
