import React, { useState, useEffect, useRef } from 'react';
import { db } from '../utils/db';

export default function QueueMonitor() {
  const [waiting, setWaiting] = useState<any[]>([]);
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const prevInProgressIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [audioEnabled]);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const rows = await db.query(
        `SELECT q.*, d.fullName as doctorName, d.prefix as doctorPrefix, d.roomNumber
         FROM queue q
         LEFT JOIN doctors d ON q.doctorId = d.id
         WHERE date(q.createdAt) = ? AND q.status != 'completed'
         ORDER BY q.id ASC`,
        [today]
      );

      const newWaiting = rows.filter((r: any) => r.status === 'waiting');
      const newInProgress = rows.filter((r: any) => r.status === 'in_progress');

      setWaiting(newWaiting);
      setInProgress(newInProgress);

      if (audioEnabled) {
        const currentInProgressIds = new Set(newInProgress.map((r: any) => r.id));
        newInProgress.forEach((ticket: any) => {
          if (!prevInProgressIds.current.has(ticket.id)) {
            playVoice(ticket);
          }
        });
        prevInProgressIds.current = currentInProgressIds;
      } else {
        prevInProgressIds.current = new Set(newInProgress.map((r: any) => r.id));
      }
    } catch (e) {
      console.error('Queue load failed:', e);
    }
  };

  const playVoice = (ticket: any) => {
    if (!window.speechSynthesis) return;
    const roomText = ticket.roomNumber ? `${ticket.roomNumber}-xonaga` : 'shifokor xonasiga';
    const text = `Diqqat! ${ticket.prefix} ${ticket.number} raqamli bemor. Marhamat, ${roomText} kiring.`;
    const ut = new SpeechSynthesisUtterance(text);
    ut.lang = 'uz-UZ';
    ut.rate = 0.85;
    ut.pitch = 1.1; // Smooth voice tone
    window.speechSynthesis.speak(ut);
  };

  const handleStart = () => {
    setAudioEnabled(true);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // Light Ice Theme Colors
  const theme = {
    bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', // Frosty sky gradient
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    waitText: '#0369a1',
    waitBg: 'rgba(255, 255, 255, 0.8)',
    activeText: '#0284c7',
    activeBg: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
    border: 'rgba(14, 165, 233, 0.2)',
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.45)', // Frozen glass
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: `1px solid rgba(255, 255, 255, 0.7)`,
    boxShadow: '0 25px 50px -12px rgba(2, 132, 199, 0.15)',
  };

  if (!audioEnabled) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.bg,
          color: theme.textPrimary,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <img
          src="/logo.png"
          alt="Logo"
          style={{ width: 140, marginBottom: 40, borderRadius: 16, opacity: 0.9 }}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <h1 style={{ fontSize: 44, marginBottom: 40, fontWeight: 700, letterSpacing: '-1px' }}>
          Klinika Tv Monitori
        </h1>
        <button
          onClick={handleStart}
          style={{
            padding: '24px 56px',
            fontSize: 24,
            fontWeight: 600,
            borderRadius: 20,
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 40px rgba(14, 165, 233, 0.4)',
            transition: 'transform 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 15,
          }}
        >
          <span style={{ fontSize: 32 }}>▶</span> Monitor va Ovozni Yoqish
        </button>
        <p
          style={{
            marginTop: 30,
            color: theme.textSecondary,
            fontSize: 16,
            maxWidth: 500,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Bu oynani televizorga yoki ikkinchi ekranga o'tkazing va "Start" ni bosing. Oyna fonda
          bemalol ishlashni davom etadi.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        background: theme.bg,
        color: theme.textPrimary,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header bar */}
      <header
        style={{
          padding: '30px 60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid rgba(255,255,255, 0.8)`,
          background: 'rgba(255,255,255,0.6)',
          boxShadow: '0 4px 20px rgba(14, 165, 233, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: 60, height: 60, borderRadius: 12 }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', color: '#0f172a' }}>
            Clary Clinic
          </div>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            color: theme.activeText,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {currentTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 40, gap: 40 }}>
        {/* Waiting column */}
        <div
          style={{
            ...glassStyle,
            flex: 1,
            borderRadius: 32,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '35px 40px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 36, color: theme.waitText, fontWeight: 700 }}>
              Navbat (Kutmoqda)
            </h2>
            <div
              style={{
                background: '#0284c7',
                color: '#ffffff',
                padding: '6px 20px',
                borderRadius: 30,
                fontSize: 24,
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              {waiting.length}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              padding: 40,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 25,
              alignContent: 'start',
            }}
          >
            {waiting.map((w) => (
              <div
                key={w.id}
                className="ticket-anim"
                style={{
                  background: theme.waitBg,
                  borderRadius: 24,
                  padding: '35px 0',
                  textAlign: 'center',
                  fontSize: 56,
                  fontWeight: 700,
                  color: '#0f172a',
                  border: `1px solid ${theme.border}`,
                  boxShadow: '0 8px 24px rgba(2, 132, 199, 0.08)',
                }}
              >
                {w.prefix}-{w.number}
              </div>
            ))}
            {waiting.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  marginTop: 100,
                  fontSize: 24,
                  color: theme.textSecondary,
                }}
              >
                Kutayotgan mijozlar yo'q
              </div>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div
          style={{
            ...glassStyle,
            flex: 1.2,
            borderRadius: 32,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '35px 40px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 36,
                color: theme.activeText,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 15,
              }}
            >
              <span className="pulse-dot"></span>Hozir Qabulda
            </h2>
          </div>
          <div
            style={{
              flex: 1,
              padding: 40,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 30,
            }}
          >
            {inProgress.map((p, idx) => (
              <div
                key={p.id}
                className="ticket-slide-anim"
                style={{
                  background: theme.activeBg,
                  borderRadius: 24,
                  padding: '45px 50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: `2px solid rgba(14, 165, 233, 0.4)`,
                  boxShadow: '0 15px 35px rgba(2, 132, 199, 0.15)',
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                <div
                  style={{
                    fontSize: 100,
                    fontWeight: 900,
                    color: '#0f172a',
                    lineHeight: 1,
                    letterSpacing: '-2px',
                  }}
                >
                  {p.prefix}-{p.number}
                </div>
                <div
                  style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div
                    style={{
                      fontSize: 44,
                      color: theme.activeText,
                      fontWeight: 800,
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {p.doctorName}
                  </div>
                  <div style={{ fontSize: 28, color: theme.textSecondary, fontWeight: 500 }}>
                    {p.roomNumber ? `${p.roomNumber}-xona` : 'Shifokor xonasi'}
                  </div>
                </div>
              </div>
            ))}
            {inProgress.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  margin: 'auto',
                  fontSize: 32,
                  color: theme.textSecondary,
                }}
              >
                Ayni vaqtda qabul qilinayotganlar yo'q
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .pulse-dot {
          width: 16px; height: 16px; background: #0ea5e9; border-radius: 50%;
          box-shadow: 0 0 15px #0ea5e9;
          animation: pulseFade 2s infinite;
        }
        @keyframes pulseFade {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        .ticket-anim {
          animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ticket-slide-anim {
          animation: slideLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideLeft {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        
        /* Thin Scrollbar for TV */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(14, 165, 233, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
}
