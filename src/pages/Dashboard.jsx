import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { db } from '../utils/db';
import { useToast } from '../components/Toast';

export default function Dashboard({ onNavigate }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Live Metrics
  const [metrics, setMetrics] = useState({
    cashBalance: 0,
    cardBalance: 0,
    totalIncome: 0,
    expectedDebt: 0,
    occupiedBeds: 0,
    totalBeds: 0,
    queueWaiting: 0,
    queueInProgress: 0
  });

  // Widgets
  const [trendData, setTrendData] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [roomMap, setRoomMap] = useState([]);
  const [recentJournal, setRecentJournal] = useState([]);
  const [shiftStatus, setShiftStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAll, 15000); // 15 seconds real-time update
    return () => clearInterval(iv);
  }, []);

  async function loadAll() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Live Metrics
      const incomeRes = await db.query(`
        SELECT paymentType, SUM(amount) as total 
        FROM transactions 
        WHERE date(createdAt)=date(?) AND type='payment'
        GROUP BY paymentType
      `, [today]);
      
      let cash = 0, card = 0, debt = 0;
      incomeRes.forEach(r => {
        if (r.paymentType === 'cash') cash += r.total;
        if (r.paymentType === 'card' || r.paymentType === 'transfer') card += r.total;
        if (r.paymentType === 'debt') debt += r.total;
      });

      const bedsRes = await db.query("SELECT SUM(capacity) as totalBeds FROM rooms WHERE isActive=1");
      const occupiedRes = await db.query("SELECT COUNT(*) as occupied FROM room_patients WHERE status='active'");
      
      const qWaitingRes = await db.query("SELECT COUNT(*) as cnt FROM queue WHERE status='waiting' AND date(createdAt)=date(?)", [today]);
      const qProgRes = await db.query("SELECT COUNT(*) as cnt FROM queue WHERE status='in_progress' AND date(createdAt)=date(?)", [today]);

      setMetrics({
        cashBalance: cash,
        cardBalance: card,
        totalIncome: cash + card, // real money
        expectedDebt: debt,
        totalBeds: bedsRes[0]?.totalBeds || 0,
        occupiedBeds: occupiedRes[0]?.occupied || 0,
        queueWaiting: qWaitingRes[0]?.cnt || 0,
        queueInProgress: qProgRes[0]?.cnt || 0
      });

      // 2. Trend Data (7 Days)
      const trend = [];
      const d = new Date();
      for (let i = 6; i >= 0; i--) {
        const pastDate = new Date(d);
        pastDate.setDate(d.getDate() - i);
        const dateStr = pastDate.toISOString().split('T')[0];
        const res = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date(createdAt)=? AND type='payment' AND paymentType != 'debt'", [dateStr]);
        trend.push({
          date: pastDate.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
          value: res[0]?.total || 0
        });
      }
      setTrendData(trend);

      // 3. Top Services
      const topSrv = await db.query(`
        SELECT s.name, COUNT(*) as cnt, SUM(a.amount) as total
        FROM appointments a
        JOIN services s ON a.serviceId = s.id
        WHERE date(a.createdAt)=date(?)
        GROUP BY s.id
        ORDER BY cnt DESC
        LIMIT 3
      `, [today]);
      setTopServices(topSrv);

      // 4. Room Map Mini
      const rooms = await db.query("SELECT id, name, capacity, department FROM rooms WHERE isActive=1 ORDER BY name ASC");
      const activeInpatients = await db.query("SELECT roomId, COUNT(*) as cnt FROM room_patients WHERE status='active' GROUP BY roomId");
      
      const rMap = rooms.map(r => {
        const occ = activeInpatients.find(ip => ip.roomId === r.id)?.cnt || 0;
        return { ...r, occupied: occ };
      });
      setRoomMap(rMap);

      // 5. Recent Journal
      const jt = await db.query(`
        SELECT t.*, p.fullName as patientName 
        FROM transactions t 
        LEFT JOIN patients p ON t.patientId=p.id 
        WHERE t.type='payment' 
        ORDER BY t.createdAt DESC LIMIT 5
      `);
      setRecentJournal(jt);

      // 6. Shift Status
      const activeShift = await db.query("SELECT * FROM shifts WHERE status='open' LIMIT 1");
      setShiftStatus(activeShift[0] || null);

      // 7. Smart Alerts
      const smartAlerts = [];
      if (debt > 0) smartAlerts.push({ id: 1, type: 'warning', icon: '⚠️', text: `Bugun ${formatPrice(debt)} so'm qarz qayd etildi.` });
      if (qWaitingRes[0]?.cnt > 5) smartAlerts.push({ id: 2, type: 'danger', icon: '🚨', text: `Navbatda ${qWaitingRes[0]?.cnt} bemor yig'ildi, tezlashtiring!` });
      if (activeShift[0] && new Date() - new Date(activeShift[0].openedAt) > 12*60*60*1000) {
         smartAlerts.push({ id: 3, type: 'danger', icon: '⏰', text: `Smena yopilmaganiga 12 soatdan oshdi!` });
      }
      setAlerts(smartAlerts);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Global Search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const sr = await db.query(`
          SELECT id, fullName, phone, 'navbat' as source FROM patients WHERE fullName LIKE ? OR phone LIKE ? LIMIT 5
        `, [`%${searchQuery}%`, `%${searchQuery}%`]);
        setSearchResults(sr);
      } catch(e) {}
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);


  function formatPrice(n) { return Number(n || 0).toLocaleString('uz-UZ'); }
  const maxTrend = Math.max(...trendData.map(t => t.value), 1);

  if (loading) return <div className="page"><div className="page-loader"><div className="spinner"></div></div></div>;

  return (
    <div className="page dashboard-hms">
      
      {/* GLOBAL SEARCH & HEADER */}
      <div className="hms-top-bar">
        <div className="hms-branding">
          <h1>🧠 HIS Command Center</h1>
          <span className="live-pulse">🟢 Tizim faol</span>
        </div>
        <div className="hms-search-container">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder={t('dashboard.globalSearch')} 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="hms-search-input"
          />
          {searchResults.length > 0 && (
            <div className="hms-search-dropdown">
              {searchResults.map(r => (
                 <div key={r.id} className="search-result-item" onClick={() => { onNavigate('reception'); setSearchQuery(''); }}>
                    <div className="sr-icon">👤</div>
                    <div className="sr-info">
                       <div className="sr-name">{r.fullName}</div>
                       <div className="sr-meta">{r.phone}</div>
                    </div>
                 </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="page-body hms-body">
         
         {/* LEFT COLUMN: Main Metrics & Widgets */}
         <div className="hms-main-col">
            
            {/* 1. LIVE METRICS ROW */}
            <div className="hms-metrics-grid">
               <div className="metric-card bg-primary-glow" onClick={() => onNavigate('cashier')}>
                  <div className="metric-icon">💰</div>
                  <div className="metric-data">
                     <div className="metric-title">{t('dashboard.kassaBalance')}</div>
                     <div className="metric-value">{formatPrice(metrics.totalIncome)}</div>
                     <div className="metric-sub text-success">Naqd: {formatPrice(metrics.cashBalance)}</div>
                  </div>
               </div>
               
               <div className="metric-card bg-warning-glow" onClick={() => onNavigate('inpatient')}>
                  <div className="metric-icon">🛌</div>
                  <div className="metric-data">
                     <div className="metric-title">{t('dashboard.occupiedBeds')}</div>
                     <div className="metric-value">{metrics.occupiedBeds} / {metrics.totalBeds}</div>
                     <div className="metric-sub opacity-70">band xonalar</div>
                  </div>
               </div>
               
               <div className="metric-card bg-info-glow" onClick={() => onNavigate('queue')}>
                  <div className="metric-icon">🎫</div>
                  <div className="metric-data">
                     <div className="metric-title">{t('dashboard.queueWaiting')}</div>
                     <div className="metric-value">{metrics.queueWaiting} <span style={{fontSize:16,fontWeight:500,opacity:0.7}}>kutmoqda</span></div>
                     <div className="metric-sub text-info">{metrics.queueInProgress} tajribada</div>
                  </div>
               </div>
               
               <div className="metric-card bg-danger-glow" onClick={() => onNavigate('analytics')}>
                  <div className="metric-icon">⚠️</div>
                  <div className="metric-data">
                     <div className="metric-title">{t('dashboard.expectedRevenue')} (Qarz)</div>
                     <div className="metric-value text-danger">{formatPrice(metrics.expectedDebt)}</div>
                     <div className="metric-sub text-danger">undirilishi kerak</div>
                  </div>
               </div>
            </div>

            {/* 2. INTERACTIVE WIDGETS */}
            <div className="hms-widgets-grid">
               
               {/* 7-Day Trend Chart */}
               <div className="card glass-card widget-card">
                  <div className="card-header">
                     <h3>📈 {t('dashboard.sevenDayTrend')}</h3>
                  </div>
                  <div className="card-body trend-chart-container">
                     {trendData.map((t, i) => {
                        const hPct = t.value > 0 ? (t.value / maxTrend) * 100 : 5;
                        return (
                           <div key={i} className="trend-bar-group">
                              <div className="trend-tooltip">{formatPrice(t.value)} sum</div>
                              <div className="trend-bar" style={{ height: `${hPct}%` }}></div>
                              <div className="trend-label">{t.date}</div>
                           </div>
                        )
                     })}
                  </div>
               </div>

               {/* Top Services */}
               <div className="card glass-card widget-card">
                  <div className="card-header">
                     <h3>⭐ {t('dashboard.topServices')}</h3>
                  </div>
                  <div className="card-body">
                     {topServices.length === 0 ? <div className="p-4 text-center opacity-50">Bugun xizmatlar ko'rsatilmadi</div> : (
                        <div className="top-services-list">
                           {topServices.map((srt, i) => (
                              <div key={i} className="top-service-item">
                                 <div className="ts-rank">#{i+1}</div>
                                 <div className="ts-info">
                                    <div className="ts-name">{srt.name}</div>
                                    <div className="ts-meta">{srt.cnt} ta ko'rik</div>
                                 </div>
                                 <div className="ts-total">{formatPrice(srt.total)}</div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               {/* Inpatient Map */}
               <div className="card glass-card widget-card col-span-full">
                  <div className="card-header" style={{cursor:'pointer'}} onClick={() => onNavigate('inpatient')}>
                     <h3>🏥 {t('dashboard.roomMapMini')}</h3>
                     <span className="badge badge-warning">{metrics.occupiedBeds} bemor</span>
                  </div>
                  <div className="card-body">
                     <div className="mini-room-grid">
                        {roomMap.map(r => {
                           const isFull = r.occupied >= r.capacity;
                           const isEmpty = r.occupied === 0;
                           return (
                              <div key={r.id} className={`mini-room ${isFull?'full':(isEmpty?'empty':'partial')}`} title={`${r.name} - ${r.occupied}/${r.capacity}`} style={{cursor:'pointer'}} onClick={() => onNavigate('inpatient')}>
                                 <div className="mr-name">{r.name}</div>
                                 <div className="mr-occ">{r.occupied}/{r.capacity}</div>
                              </div>
                           )
                        })}
                     </div>
                  </div>
               </div>

            </div>
         </div>

         {/* RIGHT COLUMN: Quick Ops, Alerts, Journal */}
         <div className="hms-side-col">
            
            {/* Quick Actions / F-Keys */}
            <div className="card glass-card quick-ops-card">
               <div className="card-header"><h3>⚡ {t('dashboard.quickActions.title')}</h3></div>
               <div className="card-body quick-ops-grid">
                  <button className="ops-btn op-new" onClick={() => onNavigate('reception')}>
                     <span>➕</span> Yangi (F2)
                  </button>
                  <button className="ops-btn op-pay" onClick={() => onNavigate('cashier')}>
                     <span>💸</span> Kassa (F10)
                  </button>
                  <button className="ops-btn op-bed" onClick={() => onNavigate('inpatient')}>
                     <span>🛏️</span> Statsionar (F6)
                  </button>
                  <button className="ops-btn op-jrnl" onClick={() => onNavigate('journal')}>
                     <span>📋</span> Jurnal (F4)
                  </button>
               </div>
            </div>

            {/* Smart Alerts & Status */}
            <div className="card glass-card alerts-card">
               <div className="card-header">
                  <h3>🛎️ Status & Alerts</h3>
               </div>
               <div className="card-body p-0">
                  <div className="status-row">
                     <div className="status-label">🔋 {t('dashboard.shiftStatus')}</div>
                     <div className={`status-val ${shiftStatus ? 'text-success' : 'text-danger'}`}>
                        {shiftStatus ? `Ochiq (${new Date(shiftStatus.openedAt).toLocaleTimeString().slice(0,5)})` : 'Shift yopiq'}
                     </div>
                  </div>
                  <div className="status-row">
                     <div className="status-label">💾 {t('dashboard.backupStatus')}</div>
                     <div className="status-val opacity-70">Avto-zaxira yoqilgan</div>
                  </div>
                  
                  {alerts.length > 0 && (
                     <div className="alerts-list">
                        {alerts.map(a => (
                           <div key={a.id} className={`hms-alert alert-${a.type}`}>
                              <span className="al-icon">{a.icon}</span>
                              <span className="al-text">{a.text}</span>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* Mini Journal (Recent) */}
            <div className="card glass-card mini-journal-card">
               <div className="card-header" style={{cursor:'pointer'}} onClick={() => onNavigate('journal')}>
                  <h3>🧾 {t('dashboard.recentJournal')}</h3>
               </div>
               <div className="card-body p-0">
                  {recentJournal.length === 0 ? <div className="p-4 text-center opacity-50">Amaliyotlar yo'q</div> : (
                     <div className="mini-jrnl-list">
                        {recentJournal.map(tj => (
                           <div key={tj.id} className="mj-item">
                              <div className="mj-left">
                                 <div className="mj-name">{tj.patientName}</div>
                                 <div className="mj-time">{new Date(tj.createdAt).toLocaleTimeString('uz-UZ').slice(0,5)}</div>
                              </div>
                              <div className={`mj-right ${tj.paymentType === 'debt' ? 'text-danger' : 'text-success'}`}>
                                 {tj.paymentType==='debt'?'-':'+'}{formatPrice(tj.amount)}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
               <div className="mj-footer" onClick={() => onNavigate('journal')}>Barcha tarixni ko'rish →</div>
            </div>

         </div>

      </div>
    </div>
  );
}
