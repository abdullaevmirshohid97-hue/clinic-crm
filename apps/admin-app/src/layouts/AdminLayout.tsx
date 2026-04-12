import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

export default function AdminLayout({ children, activeMenu, onMenuChange }: LayoutProps) {
  const menus = [
    { id: 'dashboard', icon: '📊', label: 'Boshqaruv Paneli' },
    { id: 'clinics', icon: '🏥', label: 'Klinikalar' },
    { id: 'billing', icon: '💳', label: 'Obunalar / To\'lovlar' },
    { id: 'support', icon: '💬', label: 'Tarket / Qo\'llab-quvvatlash' },
    { id: 'settings', icon: '⚙️', label: 'Tizim Sozlamalari' }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#09090b', color: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 280, background: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '30px 20px', display: 'flex', alignItems: 'center', gap: 15, borderBottom: '1px solid #27272a' }}>
          <div style={{ width: 40, height: 40, background: '#8b5cf6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 'bold' }}>
            C
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>CLARY SaaS</h2>
            <span style={{ fontSize: 13, color: '#a1a1aa' }}>Super Admin Boshqaruvi</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {menus.map(m => (
            <button
              key={m.id}
              onClick={() => onMenuChange(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 15, width: '100%', padding: '15px 20px',
                borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500,
                background: activeMenu === m.id ? '#27272a' : 'transparent',
                color: activeMenu === m.id ? '#f8fafc' : '#a1a1aa',
                transition: 'all 0.2s', textAlign: 'left'
              }}
              onMouseEnter={(e) => { if(activeMenu !== m.id) e.currentTarget.style.background = 'rgba(39, 39, 42, 0.5)' }}
              onMouseLeave={(e) => { if(activeMenu !== m.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 20, borderTop: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            👤
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Asosiy Admin</div>
            <div style={{ fontSize: 12, color: '#a1a1aa' }}>admin@clary.uz</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '20px 40px', borderBottom: '1px solid #27272a', background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'flex-end' }}>
           <input type="text" placeholder="Klinikani slug orqali qidirish..." style={{ 
             background: '#27272a', border: '1px solid #3f3f46', padding: '10px 20px', borderRadius: 8, 
             color: '#fff', width: 300, fontSize: 14, outline: 'none' 
           }} />
        </header>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 40 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
