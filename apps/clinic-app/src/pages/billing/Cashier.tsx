import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../utils/db';
import Modal from '../../components/ui/Modal';
import type { TransactionRecord, ShiftRecord } from '../../types/clinic';

export default function Cashier() {
  const { t } = useTranslation();
  const toast = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, cash: 0, card: 0, transfer: 0, debt: 0, expense: 0 });
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', paymentType: 'cash' });
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);

  useEffect(() => {
    loadTransactions();
    loadActiveShift();
    // Live update every 10 seconds for real-time monitoring
    const interval = setInterval(() => { loadTransactions(); loadActiveShift(); }, 10000);
    return () => clearInterval(interval);
  }, [date]);

  async function loadActiveShift() {
    try {
      const active = await db.query<ShiftRecord>('SELECT * FROM shifts WHERE status = \'active\' ORDER BY id DESC LIMIT 1');
      if (active.length > 0) setActiveShift(active[0]);
    } catch(_e: unknown) { /* ignore load errors */ }
  }

  async function loadTransactions() {
    try {
      const rows = await db.query<TransactionRecord>(`
        SELECT t.*, 
               p.fullName as patientNameStr, p.phone as patientPhone,
               d.fullName as doctorNameStr, 
               sv.name as serviceName,
               s.type as shiftType,
               (SELECT r.name FROM room_patients rp JOIN rooms r ON rp.roomId = r.id WHERE rp.patientId = t.patientId AND rp.status = 'active' LIMIT 1) as activeRoom,
               (SELECT (COALESCE(SUM(debt), 0) - (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE patientId = t.patientId AND type = 'payment' AND paymentType != 'debt')) 
                FROM transactions WHERE patientId = t.patientId) as patientBalance
        FROM transactions t
        LEFT JOIN appointments a ON t.appointmentId = a.id
        LEFT JOIN services sv ON a.serviceId = sv.id
        LEFT JOIN patients p ON t.patientId = p.id
        LEFT JOIN doctors d ON t.doctor_id = d.id
        LEFT JOIN shifts s ON t.shift_id = s.id
        WHERE date(t.createdAt) = ?
        ORDER BY t.id DESC
      `, [date]);
      setTransactions(rows);

      // Calculate Stats
      let total = 0, cash = 0, card = 0, transfer = 0, debt = 0, expense = 0;
      rows.forEach(r => {
        const amt = r.amount || 0;
        if (r.type === 'expense' || r.type === 'payout') {
          expense += amt;
        } else if (r.paymentType === 'debt' || r.type === 'debt') {
          debt += (amt || r.debt || 0);
        } else {
          total += amt;
          if (r.paymentType === 'cash') cash += amt;
          if (r.paymentType === 'card') card += amt;
          if (r.paymentType === 'transfer') transfer += amt;
        }
      });
      setStats({ total, cash, card, transfer, debt, expense });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAddExpense() {
    if (!expenseForm.amount || !expenseForm.description) return;
    try {
      await db.insert('transactions', {
        type: 'expense',
        amount: Number(expenseForm.amount),
        paymentType: expenseForm.paymentType,
        description: expenseForm.description,
        shift_id: activeShift?.id || null
      });
      toast.success(t('common.success'));
      setShowExpenseModal(false);
      setExpenseForm({ amount: '', description: '', paymentType: 'cash' });
      loadTransactions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function formatPrice(n: number | string | null | undefined) {
    return Number(n || 0).toLocaleString('uz-UZ');
  }

  function getBadgeColor(type: string) {
    switch (type) {
      case 'cash': return 'var(--accent-success)';
      case 'card': return 'var(--accent-info)';
      case 'transfer': return 'var(--accent-primary)';
      case 'debt': return 'var(--accent-danger)';
      case 'expense': return 'var(--accent-warning)';
      case 'payout': return 'var(--accent-secondary)';
      default: return 'var(--text-muted)';
    }
  }

  const liveBalance = stats.total - stats.expense;

  return (
    <div className="page page-cashier">
      <div className="page-header">
        <h1>💵 {t('analytics.cashier') || 'Kassa'} (Live Monitor)</h1>
        <div className="page-header-actions" style={{display:'flex', gap: 10, alignItems:'center'}}>
          {activeShift && (
            <span className={`badge ${activeShift.type === 'day' ? 'badge-success' : 'badge-warning'}`}>
              {activeShift.type === 'day' ? '☀️ Kunduzgi smena' : '🌙 Kechki smena'}
            </span>
          )}
          <input type="date" className="form-input form-input-sm" value={date} onChange={e=>setDate(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setShowExpenseModal(true)}>+ Xarajat / Chiqim</button>
        </div>
      </div>

      <div className="page-body">
        {/* Live Balance Row */}
        <div className="card glass-card" style={{background: 'linear-gradient(135deg, var(--bg-card), var(--bg-hover))', marginBottom: 20}}>
          <div className="card-body" style={{textAlign:'center', padding: '20px'}}>
            <h3 style={{color:'var(--text-secondary)', marginBottom: 5}}>Joriy Live Balans ({date})</h3>
            <div style={{fontSize: 36, fontWeight: 'bold', color: liveBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}}>
              {formatPrice(liveBalance)} so'm
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="stats-grid" style={{marginBottom: 20}}>
          <div className="card glass-card stat-card" style={{'--card-accent':'var(--accent-success)'} as React.CSSProperties}>
            <div className="stat-icon">💵</div>
            <div className="stat-info">
              <span className="stat-value">{formatPrice(stats.cash)}</span>
              <span className="stat-label">Naqd tushum</span>
            </div>
          </div>
          <div className="card glass-card stat-card" style={{'--card-accent':'var(--accent-info)'} as React.CSSProperties}>
            <div className="stat-icon">💳</div>
            <div className="stat-info">
              <span className="stat-value">{formatPrice(stats.card)}</span>
              <span className="stat-label">Plastik Karta</span>
            </div>
          </div>
          <div className="card glass-card stat-card" style={{'--card-accent':'var(--accent-primary)'} as React.CSSProperties}>
            <div className="stat-icon">🔄</div>
            <div className="stat-info">
              <span className="stat-value">{formatPrice(stats.transfer)}</span>
              <span className="stat-label">Click/O'tkazma</span>
            </div>
          </div>
          <div className="card glass-card stat-card" style={{'--card-accent':'var(--accent-danger)'} as React.CSSProperties}>
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <span className="stat-value">{formatPrice(stats.debt)}</span>
              <span className="stat-label">Berilgan Qarzlar</span>
            </div>
          </div>
          <div className="card glass-card stat-card" style={{'--card-accent':'var(--accent-warning)'} as React.CSSProperties}>
            <div className="stat-icon">💸</div>
            <div className="stat-info">
              <span className="stat-value">{formatPrice(stats.expense)}</span>
              <span className="stat-label">Xarajat / Payout</span>
            </div>
          </div>
        </div>

        {/* Realtime Transactions Table */}
        <div className="card glass-card" style={{flex: 1}}>
          <div className="card-header">
            <h3>📑 Real-time Kassa amaliyotlari ({transactions.length} ta)</h3>
            <button className="btn btn-sm btn-ghost" onClick={loadTransactions}>🔄 Yangilash</button>
          </div>
          <div className="card-body p-0">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vaqt</th>
                    <th>To'lov</th>
                    <th>Bemor / Telefon</th>
                    <th>Shifokor</th>
                    <th>Xizmat</th>
                    <th>Xona</th>
                    <th>Qarzi</th>
                    <th>Izoh</th>
                    <th>Smena</th>
                    <th style={{textAlign:'right'}}>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={12} style={{textAlign:'center', padding:40, color:'var(--text-muted)'}}>Hech qanday tranzaksiya mavjud emas.</td></tr>
                  ) : transactions.map(t => (
                    <tr key={t.id} style={{background: t.type === 'expense' ? 'rgba(255, 69, 58, 0.05)' : t.type === 'payout' ? 'rgba(10, 132, 255, 0.05)' : 'transparent'}}>
                      <td>{new Date(t.createdAt ?? '').toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</td>
                      <td>
                        <span style={{fontWeight:600, color: getBadgeColor(t.paymentType ?? '')}}>{(t.paymentType ?? '').toUpperCase()}</span>
                      </td>
                      <td>
                        <div style={{fontWeight:600}}>{t.patient_name || t.patientNameStr || '—'}</div>
                        <div style={{fontSize:10, color:'var(--text-secondary)'}}>{t.patientPhone || ''}</div>
                      </td>
                      <td>{t.doctorNameStr || '—'}</td>
                      <td>{t.serviceName || (t.type === 'expense' ? '💸 Chiqim' : (t.type === 'payout' ? '👨‍⚕️ Payout' : '—'))}</td>
                      <td>{t.activeRoom ? <span className="badge badge-info" style={{fontSize:10}}>🏥 {t.activeRoom}</span> : '—'}</td>
                      <td>
                        <b style={{color: (t.patientBalance && t.patientBalance > 0) ? 'var(--accent-danger)' : 'var(--accent-success)'}}>
                          {t.patientBalance ? formatPrice(t.patientBalance) : '0'}
                        </b>
                      </td>
                      <td style={{maxWidth: 120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={t.description || ''}>{t.description || '—'}</td>
                      <td>
                        {t.shiftType ? (
                          <span className={`badge ${t.shiftType === 'day' ? 'badge-success' : 'badge-warning'}`} style={{fontSize: 10, padding: '2px 5px'}}>
                            {t.shiftType === 'day' ? '☀️ Kunduzgi' : '🌙 Kechki'}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{textAlign:'right', fontWeight: 'bold', fontSize:15, color: (t.type === 'expense' || t.type === 'payout') ? 'var(--accent-danger)' : 'var(--accent-primary)'}}>
                        {(t.type === 'expense' || t.type === 'payout') ? '-' : '+'}{formatPrice(t.amount || t.debt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Xarajat (Chiqim) qo'shish">
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Summa</label>
            <input type="number" className="form-input" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm, amount: e.target.value})} autoFocus />
          </div>
          <div className="form-group full-width">
            <label>Qaysi hisobdan (Kassa)</label>
            <select className="form-input" value={expenseForm.paymentType} onChange={e=>setExpenseForm({...expenseForm, paymentType: e.target.value})}>
              <option value="cash">Naqd</option>
              <option value="card">Karta</option>
              <option value="transfer">Click/O'tkazma</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label>Xarajat sababi (Izoh)</label>
            <input type="text" className="form-input" value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm, description: e.target.value})} />
          </div>
          <div className="form-actions" style={{marginTop: 15}}>
            <button className="btn btn-ghost" onClick={() => setShowExpenseModal(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={handleAddExpense}>Tasdiqlash</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
