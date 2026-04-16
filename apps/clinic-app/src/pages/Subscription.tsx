import React, { useState, useEffect, useRef } from 'react';

export default function Subscription() {
  const [activePayment, setActivePayment] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string>('Baza');
  const [chatMessage, setChatMessage] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  const [messages, setMessages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('support_chat');
      if (saved) return JSON.parse(saved);
    } catch(e) { /* storage unavailable */ }
    return [
      { id: 1, text: "Assalomu alaykum! Tizim modullarini kengaytirish yuzasidan yordam kerakmi yoki texnik muammomi?", sender: 'support', time: '10:00' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('support_chat', JSON.stringify(messages));
  }, [messages]);

  const autoReply = (msg: string) => {
    const l = msg.toLowerCase();
    if (l.includes('narx') || l.includes('tarif') || l.includes('qancha') || l.includes('pul')) return "Tariflar haqida: Baza tarifimiz 250,000 so'm, Pro esa 600,000 so'm. Oylik chegirma ham mavjud.";
    if (l.includes('ulanish') || l.includes('integratsiya') || l.includes('api')) return "API integratsiya faqat Pro va Korxona tariflarida mavjud. Batafsil hujjatlarni taqdim qilamiz.";
    if (l.includes('qotib') || l.includes('xato') || l.includes('ishlamayapti') || l.includes('muammo')) return "Noqulaylik uchun uzr. Mutaxassislarimiz buni darhol tekshirishadi. Iltimos qisqacha ma'lumot qoldiring.";
    if (l.includes('rahmat') || l.includes('tushunarli') || l.includes('zor') || l.includes('yaxshi')) return "Sizga xizmat qilishdan mamnunmiz! Yana savollar bo'lsa chat orqali yozishingiz mumkin.";
    if (l.includes('mastercard') || l.includes('visa') || l.includes('plastik') || l.includes('tolov')) return "Xalqaro plastik kartalar (Visa, Mastercard) yordamida tezkor to'lov qilishingiz mumkin. O'tkazmalar 100% himoyalangan.";
    if (l.includes('salom') || l.includes('assalom')) return "Va alaykum assalom! Sizga qanday yordam bera olaman?";
    return "Xabaringiz qabul qilindi. Tez orada operatorimiz siz bilan bog'lanadi. 😊";
  };

  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Mock billing ID for generation
  const mockBillingId = "TRN-" + Math.floor(100000 + Math.random() * 900000);

  const planRates: any = {
    'Baza': 250000,
    'Pro': 600000,
    'Korxona': 'Aloqasi bilan'
  };

  const baseRate = planRates[selectedPlan];
  let discount = 0;
  if (duration === 3) discount = 0.05;
  if (duration === 6) discount = 0.10;
  if (duration === 12) discount = 0.20;

  const totalPayable = typeof baseRate === 'number' ? (baseRate * duration) * (1 - discount) : 0;

  return (
    <div className="page-container" style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <header style={{ marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
        <h1 style={{ fontSize: 28, margin: '0 0 10px' }}>Mening Obunam (SaaS Billing)</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Klari tizimidagi joriy tarifingiz, hisoblaringiz va qo'llab-quvvatlash bo'limi.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          
          {/* Current Plan Card */}
          <div style={{ background: 'var(--bg-secondary)', padding: 30, borderRadius: 16, border: '1px solid var(--primary)', position: 'relative' }}>
             <span style={{ position: 'absolute', top: 20, right: 30, background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '5px 15px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>FAOL</span>
             
             <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                {['Baza', 'Pro', 'Korxona'].map(plan => (
                  <button 
                    key={plan} 
                    onClick={() => setSelectedPlan(plan)}
                    style={{ 
                      flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                      background: selectedPlan === plan ? 'var(--primary)' : 'var(--bg-main)',
                      color: selectedPlan === plan ? '#000' : 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {plan}
                  </button>
                ))}
             </div>

             <h2 style={{ margin: '0 0 5px', fontSize: 22, fontWeight: 700 }}>Kelgusi Davr: {selectedPlan} Tarifi</h2>
             <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px', fontSize: 14 }}>Tizimning barcha imkoniyatlari obuna rejangizga qarab chegaralanadi.</p>
             
             <div style={{ marginBottom: 20 }}>
               {selectedPlan === 'Baza' && (
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                   <li><strong style={{color:'#10b981'}}>✔️</strong> Shifokorlar soni: 2 gacha</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Bemorlar bazasi</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Moliya va Kassa</li>
                 </ul>
               )}
               {selectedPlan === 'Pro' && (
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                   <li><strong style={{color:'#10b981'}}>✔️</strong> Shifokorlar soni: 10 gacha</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Bemorlar bazasi</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Moliya va Kassa</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Dorixona Boshqaruvi</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> API integratsiyasi</li>
                 </ul>
               )}
               {selectedPlan === 'Korxona' && (
                 <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                   <li><strong style={{color:'#10b981'}}>✔️</strong> Shifokorlar soni: Cheksiz</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Bemorlar bazasi</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Moliya va Kassa</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Dorixona Boshqaruvi</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> API integratsiyasi</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Stasionar</li>
                   <li><strong style={{color:'#3b82f6'}}>➕</strong> Oq Yorliq (Oq yorliq)</li>
                 </ul>
               )}
             </div>
             <div style={{ display: 'flex', gap: 40, marginTop: 15, paddingBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
               <div>
                 <span style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'block' }}>Joriy to'lov sanasi tugaydi:</span>
                 <strong style={{ fontSize: 18, color: '#ef4444' }}>15-Aprel, 2026 y.</strong>
               </div>
               <div>
                 <span style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'block' }}>Keyingi uzaytirilgan sana gacha:</span>
                 <strong style={{ fontSize: 18, color: '#4ade80' }}>
                   {duration === 1 ? '15-May, 2026 y.' : duration === 3 ? '15-Iyul, 2026 y.' : duration === 6 ? '15-Okt, 2026 y.' : '15-Aprel, 2027 y.'}
                 </strong>
               </div>
             </div>

             <div style={{ marginTop: 20 }}>
               <span style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'block', marginBottom: 10 }}>Muddatni tanlang (Ko'proq oylarga oldindan to'lov qilsangiz, avtomatik chegirma olinadi):</span>
               <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                 <button onClick={() => setDuration(1)} style={{ flex: 1, padding: 12, background: duration === 1 ? 'var(--primary)' : 'var(--bg-main)', color: duration === 1 ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>1 Oy</button>
                 <button onClick={() => setDuration(3)} style={{ flex: 1, padding: 12, background: duration === 3 ? 'var(--primary)' : 'var(--bg-main)', color: duration === 3 ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>3 Oy (-5%)</button>
                 <button onClick={() => setDuration(6)} style={{ flex: 1, padding: 12, background: duration === 6 ? 'var(--primary)' : 'var(--bg-main)', color: duration === 6 ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>6 Oy (-10%)</button>
                 <button onClick={() => setDuration(12)} style={{ flex: 1, padding: 12, background: duration === 12 ? 'var(--primary)' : 'var(--bg-main)', color: duration === 12 ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>1 Yil (-20%)</button>
               </div>
               
               <div style={{ background: 'var(--bg-main)', padding: '15px 20px', borderRadius: 8, border: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ color: 'var(--text-primary)', fontSize: 16 }}>Jami to'lanadigan qat'iy summa:</span>
                 <strong style={{ fontSize: 24, color: 'var(--primary)' }}>{typeof baseRate === 'number' ? totalPayable.toLocaleString() + ' UZS' : 'Kelishilgan'}</strong>
               </div>
             </div>
          </div>

          {/* Payment Gateways */}
          <div style={{ background: 'var(--bg-secondary)', padding: 30, borderRadius: 16, border: '1px solid var(--border-color)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Obunani Uzaytirish (Kassasiz to'lovlar)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>Tizim uchun istalgan bank ilovasidan avtomatik obuna yangilash uchun to'lov qiling.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
               <button onClick={() => setActivePayment('Click')} style={{ background: '#0052FF', color: '#fff', border: 'none', padding: '15px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Click</button>
               <button onClick={() => setActivePayment('Payme')} style={{ background: '#14b8a6', color: '#fff', border: 'none', padding: '15px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Payme</button>
               <button onClick={() => setActivePayment('Visa')} style={{ background: '#1d4ed8', color: '#fff', border: 'none', padding: '15px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>VISA</button>
               <button onClick={() => setActivePayment('Mastercard')} style={{ background: '#ff5f00', color: '#fff', border: 'none', padding: '15px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>Mastercard</button>
               <button onClick={() => setActivePayment('GooglePay')} style={{ background: '#111', color: '#fff', border: 'none', padding: '15px 10px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><span>G</span> Pay</button>
            </div>

            {activePayment && !isPaid && (
              <div style={{ padding: 25, background: 'var(--bg-main)', border: '1px dashed var(--primary)', borderRadius: 12, textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 18 }}>{activePayment} orqali to'lov kutilmoqda</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 15px' }}>{activePayment} ilovasiga kirib, "To'lovlar -&gt; Clary CRM" bo'limini qidiring va quyidagi ID ni kiriting.</p>
                <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: 2 }}>{mockBillingId}</div>
                <p style={{ fontSize: 13, color: '#f59e0b', marginTop: 15 }}>Ushbu kod orqali pul o'tkazilgach, obunangiz avtomatik ravishda yangilanadi!</p>
                <button onClick={() => setIsPaid(true)} style={{ marginTop: 20, background: '#10b981', color: '#fff', border: 'none', padding: '10px 30px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Tizim orqali To'landi (Mock Simulyatsiya)</button>
              </div>
            )}

            {isPaid && (
              <div style={{ padding: 25, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <h3 style={{ margin: '0 0 10px', fontSize: 18, color: '#10b981' }}>To'lov Muvaffaqiyatli Amalga Oshirildi!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 0' }}>Elektron chek (Invoice) va tasdiqlash xati sizning <strong style={{color:'#fff'}}>Gmail</strong> pochtangizga hamda telefoningizga <strong style={{color:'#fff'}}>SMS</strong> tariqasida yuborildi.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Chat & Support Support */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ padding: 20, background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 40, height: 40, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>C</div>
            <div>
              <div style={{ fontWeight: 600 }}>Clary Support</div>
              <div style={{ fontSize: 12, color: '#10b981' }}>Online</div>
            </div>
          </div>
          
          <div ref={chatRef} style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 15, overflowY: 'auto' }}>
            {messages.map((m: any) => (
              <div key={m.id} style={{ 
                background: m.sender === 'user' ? 'var(--primary)' : 'var(--bg-main)', 
                color: m.sender === 'user' ? '#000' : 'var(--text-primary)',
                padding: '10px 15px', 
                borderRadius: m.sender === 'user' ? '15px 15px 0 15px' : '15px 15px 15px 0', 
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', 
                maxWidth: '80%' 
              }}>
                <div style={{ fontWeight: m.sender === 'user' ? 600 : 400 }}>{m.text}</div>
                <div style={{ fontSize: 10, textAlign: 'right', marginTop: 5, color: m.sender === 'user' ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)' }}>
                  {m.time} {m.sender === 'user' && ( <span style={{ color: m.status === 'read' ? '#000' : 'rgba(0,0,0,0.4)', marginLeft: 5, fontWeight: 900 }}>{m.status === 'read' ? '✓✓' : '✓'}</span> )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (!chatMessage.trim()) return;
            const newMsg = { id: Date.now(), text: chatMessage, sender: 'user', time: new Date().toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'}), status: 'sent' };
            setMessages(prev => [...prev, newMsg]);
            setChatMessage('');
            
            // simulate delivery
            setTimeout(() => {
              setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'delivered' } : m));
              // simulate read
              setTimeout(() => {
                setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'read' } : m));
                
                // Execute Smart Auto Reply
                setTimeout(() => {
                  const aiMsg = { id: Date.now(), text: autoReply(chatMessage), sender: 'support', time: new Date().toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'}) };
                  setMessages(prev => [...prev, aiMsg]);
                }, 1000);
                
              }, 1500);
            }, 800);

          }} style={{ padding: 15, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
            <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Xabaringizni yozing..." style={{ flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '10px 15px', borderRadius: 20, color: 'var(--text-primary)', outline: 'none' }} />
            <button type="submit" style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0 20px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700 }}>Yuborish ➔</button>
          </form>
        </div>
      </div>
    </div>
  );
}
