import React, { useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { authStore } from '../../app/store';
import '../../styles/App.css';

export default function Login() {
  const { t } = useTranslation();
  const toast = useToast();
  // Pre-fill with mock credentials
  const [email, setEmail] = useState('admin@clinic.com');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authStore.login(email, password);
      toast.success(t('auth.loginSuccess') || 'Muvaffaqiyatli kirdingiz');
    } catch (err: any) {
      toast.error(err.message || 'Kirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      // Premium dark gradient background
      background: 'linear-gradient(135deg, #09090b 0%, #171723 50%, #0c0822 100%)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: 420, 
        padding: '40px 30px',
        // Glassmorphism effect
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        borderRadius: 24,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 35 }}>
          <div style={{ 
            width: 72, height: 72, margin: '0 auto 20px', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <span style={{fontSize: 32}}>✨</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px'}}>Clary SaaS</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, marginTop: 8, marginBottom: 0 }}>Raqamli klinika boshqaruvi</p>
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'grid', gap: 20 }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginLeft: 4 }}>Elektron pochta</label>
            <input 
              type="text" 
              className="form-control" 
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 15,
                transition: 'all 0.2s',
                outline: 'none'
              }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@clinic.com"
              required 
            />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginLeft: 4 }}>Parol</label>
            <input 
              type="password" 
              className="form-control" 
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 15,
                transition: 'all 0.2s',
                outline: 'none'
              }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '14px 0', 
              fontSize: 16,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 10,
              boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)'
            }} 
            disabled={loading}
          >
            {loading ? 'Tekshirilmoqda...' : 'Tizimga kirish'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Test uchun: admin@clinic.com / admin
          </span>
        </div>
      </div>
    </div>
  );
}
