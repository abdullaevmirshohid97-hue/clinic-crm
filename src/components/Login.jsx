import React, { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { useToast } from './Toast';
import { authStore } from '../store/auth.store';
import '../App.css';

export default function Login() {
  const { t } = useTranslation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        toast.success('Local Dev: Kirdingiz (Supabase ulanmagan)');
        localStorage.setItem('clinic_token', 'local_mock_token');
        authStore.setMockAuthenticated();
        return;
      }
      await authStore.login(email, password);
      toast.success(t('Kasbi ro\'yxatdan o\'tdi') || 'Muvaffaqiyatli kirdingiz');
    } catch (err) {
      toast.error(err.message || 'Kirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="card glass-card" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div className="logo-icon" style={{ fontSize: 40, color: 'var(--primary)', marginBottom: 10 }}>✚</div>
          <h2 style={{ color: 'var(--text-main)', margin: 0 }}>Clinic PRO</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Tizimga kirish</div>
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 20 }}>
          <div className="form-group">
            <label>Email / Foydalanuvchi</label>
            <input 
              type="text" 
              className="form-control" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@clinic.com"
              required 
            />
          </div>
          <div className="form-group">
            <label>Parol</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 16 }} disabled={loading}>
            {loading ? 'Kirish...' : 'Tizimga kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}
