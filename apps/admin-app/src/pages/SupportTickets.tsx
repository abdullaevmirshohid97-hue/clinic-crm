import React, { useState } from 'react';

export default function SupportTickets() {
  const [activeChat, setActiveChat] = useState<any>(null);
  
  // Dummy data for global live chats
  const [chats, setChats] = useState([
    { id: 1, clinicName: 'MedCenter InnoClinic', clinicId: 'CL-24098', status: 'active', lastMsg: 'Tizim modulini xato berkitib qo\'ydik...', time: '10:45', unread: 1 },
    { id: 2, clinicName: 'Shifo Nur', clinicId: 'CL-10292', status: 'closed', lastMsg: 'Rahmat, tushunarli.', time: 'Kecha', unread: 0 },
    { id: 3, clinicName: 'DentaMed', clinicId: 'CL-88331', status: 'active', lastMsg: 'To\'lovlar bo\'limidan pul qanday yechiladi?', time: '09:12', unread: 3 },
  ]);

  const [messages, setMessages] = useState<any[]>([
    { id: 1, text: "Assalomu alaykum!", sender: 'clinic', time: '10:40' },
    { id: 2, text: "Va alaykum assalom. Yordam bera olamanmi?", sender: 'support', time: '10:41' },
    { id: 3, text: "Tizim modulini xato berkitib qo'ydik, qayta tiklamoqchi edik.", sender: 'clinic', time: '10:45' },
  ]);

  const [inputMsg, setInputMsg] = useState('');

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if(!inputMsg.trim() || !activeChat) return;
    setMessages([...messages, { id: Date.now(), text: inputMsg, sender: 'support', time: new Date().toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'}) }]);
    setInputMsg('');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 125px)', gap: 30 }}>
      {/* Sidebar: Chat ro'yxati */}
      <div style={{ width: 350, background: '#18181b', borderRadius: 16, border: '1px solid #27272a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #27272a' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f8fafc' }}>Klinikalar Murojaati (Helpdesk)</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chats.map(c => (
            <div 
              key={c.id} 
              onClick={() => { setActiveChat(c); setChats(chats.map(x => x.id === c.id ? {...x, unread: 0} : x)); }}
              style={{ padding: '15px 20px', borderBottom: '1px solid #27272a', cursor: 'pointer', background: activeChat?.id === c.id ? 'rgba(139, 92, 246, 0.1)' : 'transparent', borderLeft: activeChat?.id === c.id ? '3px solid #8b5cf6' : '3px solid transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <strong style={{ color: '#f8fafc' }}>{c.clinicName}</strong>
                <span style={{ fontSize: 12, color: '#a1a1aa' }}>{c.time}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{c.lastMsg}</span>
                {c.unread > 0 && <div style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 'bold', padding: '2px 8px', borderRadius: 10 }}>{c.unread}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Chat oynasi */}
      <div style={{ flex: 1, background: '#18181b', borderRadius: 16, border: '1px solid #27272a', display: 'flex', flexDirection: 'column' }}>
        {activeChat ? (
          <>
            <div style={{ padding: '20px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc' }}>{activeChat.clinicName}</h3>
                <span style={{ fontSize: 13, color: '#10b981' }}>ID: {activeChat.clinicId} • Faol</span>
              </div>
              <button onClick={() => window.open(`http://localhost:5200/?impersonate_clinic_id=${activeChat.clinicId}`, '_blank')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Tizimiga Kirish (Impersonate)</button>
            </div>
            
            <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 15 }}>
              {messages.map(m => (
                <div key={m.id} style={{ 
                  background: m.sender === 'support' ? '#8b5cf6' : '#27272a', 
                  color: '#fff', padding: '12px 18px', 
                  borderRadius: m.sender === 'support' ? '16px 16px 0 16px' : '16px 16px 16px 0', 
                  alignSelf: m.sender === 'support' ? 'flex-end' : 'flex-start',
                  maxWidth: '70%'
                }}>
                  <div style={{ fontSize: 15 }}>{m.text}</div>
                  <div style={{ fontSize: 11, textAlign: 'right', marginTop: 8, color: 'rgba(255,255,255,0.6)' }}>{m.time}</div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMsg} style={{ padding: 20, borderTop: '1px solid #27272a', display: 'flex', gap: 15 }}>
              <input 
                type="text" 
                value={inputMsg} 
                onChange={e => setInputMsg(e.target.value)} 
                placeholder="Xabar yozish..." 
                style={{ flex: 1, background: '#09090b', border: '1px solid #3f3f46', color: '#f8fafc', padding: '15px', borderRadius: 12, outline: 'none' }}
              />
              <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0 25px', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold' }}>Jo'natish</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 16 }}>
            Chap tomondan klinikani tanlang
          </div>
        )}
      </div>
    </div>
  );
}
