export default function DashboardPage({ clinics, onNavigate }: { clinics: any[], onNavigate: (menu: string) => void }) {
  const activeCount = clinics.filter(c => c.status === 'active').length;
  const trialCount = clinics.filter(c => c.status === 'trial').length;
  const blockedCount = clinics.filter(c => c.status === 'blocked').length;

  const totalPatients = clinics.length * 1542; // arbitrary mock metric
  const activeDoctors = clinics.length * 12; // arbitrary mock metric
  const mrr = activeCount * 450000; // estimated MRR per active clinic

  return (
    <div>
      <h1 style={{ margin: '0 0 30px', fontSize: 28, fontWeight: 700 }}>Platforma Tahlili (Global Analytics)</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 30 }}>
        <div onClick={() => onNavigate('clinics')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', padding: 25, borderRadius: 16, border: '1px solid #3f3f46', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
          <div style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 10 }}>Jami Klinikalar</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#f8fafc' }}>{clinics.length}</div>
        </div>
        
        <div onClick={() => onNavigate('clinics')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)', padding: 25, borderRadius: 16, border: '1px solid rgba(22, 163, 74, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
          <div style={{ color: '#4ade80', fontSize: 14, marginBottom: 10 }}>Faol (Active)</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#4ade80' }}>{activeCount}</div>
        </div>

        <div onClick={() => onNavigate('clinics')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%)', padding: 25, borderRadius: 16, border: '1px solid rgba(234, 179, 8, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
          <div style={{ color: '#facc15', fontSize: 14, marginBottom: 10 }}>Sinov muddati (Trial)</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#facc15' }}>{trialCount}</div>
        </div>

        <div onClick={() => onNavigate('clinics')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)', padding: 25, borderRadius: 16, border: '1px solid rgba(239, 68, 68, 0.2)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
          <div style={{ color: '#f87171', fontSize: 14, marginBottom: 10 }}>Bloklangan</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#f87171' }}>{blockedCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
         {/* Aggregate SaaS Metrics */}
         <div onClick={() => onNavigate('global_patients')} style={{ cursor: 'pointer', background: '#18181b', padding: 25, borderRadius: 16, border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 20, transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ fontSize: 40 }}>👥</div>
            <div>
               <div style={{ color: '#a1a1aa', fontSize: 13 }}>Platformadagi jami bemorlar</div>
               <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc' }}>{totalPatients.toLocaleString()}</div>
            </div>
         </div>
         <div onClick={() => onNavigate('global_staff')} style={{ cursor: 'pointer', background: '#18181b', padding: 25, borderRadius: 16, border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 20, transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ fontSize: 40 }}>👨‍⚕️</div>
            <div>
               <div style={{ color: '#a1a1aa', fontSize: 13 }}>Tizimdagi jami shifokorlar</div>
               <div style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc' }}>{activeDoctors.toLocaleString()}</div>
            </div>
         </div>
         <div onClick={() => onNavigate('billing')} style={{ cursor: 'pointer', background: '#18181b', padding: 25, borderRadius: 16, border: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 20, transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ fontSize: 40 }}>📈</div>
            <div>
               <div style={{ color: '#a1a1aa', fontSize: 13 }}>SaaS oylik tushumi (MRR)</div>
               <div style={{ fontSize: 24, fontWeight: 700, color: '#60a5fa' }}>{mrr.toLocaleString()} so'm</div>
            </div>
         </div>
      </div>

      <div style={{ background: '#18181b', padding: 30, borderRadius: 16, border: '1px solid #27272a' }}>
        <h3 style={{ margin: '0 0 20px', color: '#f8fafc', fontSize: 18 }}>🖥️ Server (Tizim) Holati</h3>
        <p style={{ color: '#a1a1aa', lineHeight: 1.6 }}>CPU Load: <strong>12%</strong> | RAM: <strong>2GB / 16GB</strong> | Database: <strong>99.9% Uptime</strong></p>
        <p style={{ color: '#71717a', fontSize: 13, marginTop: 10 }}>Izoh: "Dev Mode" usulida ishlaganda haqiqiy server loglari o'rniga namuna statistika yuboriladi.</p>
      </div>
    </div>
  );
}
