import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { db } from '../../utils/db';
import type { JournalEntry } from '../../types/clinic';
import { supabase } from '../../lib/supabase';
import { authStore } from '../../app/store';

interface ActivityRow {
  id: string;
  action_type: string;
  actor_name: string | null;
  actor_role: string | null;
  patient_name: string | null;
  created_at: string;
}

export default function JournalPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    search: '',
    paymentType: '',
    category: '',
    minAmount: '',
    maxAmount: '',
  });
  const [stats, setStats] = useState({
    daily: { revenue: 0, debt: 0, expense: 0, recovered: 0 },
    weekly: { revenue: 0, debt: 0, expense: 0, recovered: 0 },
    monthly: { revenue: 0, debt: 0, expense: 0, recovered: 0 },
  });

  // Modals
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', discount: '', paymentType: 'cash' });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Xo'jalik",
    amount: '',
    description: '',
  });
  const [payingDebt, setPayingDebt] = useState<JournalEntry | null>(null);
  const [debtPayForm, setDebtPayForm] = useState({ paymentType: 'cash' });

  const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  function toggleExpand(groupKey: string) {
    setExpandedPatients((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }

  const loadStats = useCallback(async () => {
    try {
      const res = await window?.electronAPI?.journal?.getFinancialStats?.();
      if (res?.success && res.data) setStats(res.data as typeof stats);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadEntries = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const res = await window?.electronAPI?.journal?.getComprehensive?.(filters);
        if (res?.success) setEntries((res.data || []) as JournalEntry[]);
      } catch (err) {
        console.error(err);
      }
      if (showLoading) setLoading(false);
    },
    [filters]
  );

  useEffect(() => {
    loadEntries();
    loadStats();
    const interval = setInterval(() => {
      loadEntries(false);
      loadStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadEntries, loadStats]);

  useEffect(() => {
    const clinicId = authStore.clinicId;
    if (!clinicId) return;

    const loadActivity = async () => {
      const { data } = await supabase
        .from('activity_journal')
        .select('id, action_type, actor_name, actor_role, patient_name, created_at')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(10);
      setActivities((data as ActivityRow[]) ?? []);
    };

    loadActivity();
    const channel = supabase
      .channel(`activity-journal-${clinicId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_journal', filter: `clinic_id=eq.${clinicId}` },
        () => loadActivity()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatPrice = (n: number | string | null | undefined) => {
    return Number(n || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const filteredEntries = useMemo(() => {
    let data = entries;
    if (filters.paymentType) data = data.filter((e) => e.payment_type === filters.paymentType);
    if (filters.category)
      data = data.filter((e) =>
        (e.category || '').toLowerCase().includes(filters.category.toLowerCase())
      );
    if (filters.minAmount) data = data.filter((e) => Number(e.amount) >= Number(filters.minAmount));
    if (filters.maxAmount) data = data.filter((e) => Number(e.amount) <= Number(filters.maxAmount));
    return data;
  }, [entries, filters.paymentType, filters.category, filters.minAmount, filters.maxAmount]);

  const footerTotals = useMemo(() => {
    const total = filteredEntries.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const cash = filteredEntries
      .filter((e) => e.payment_type === 'cash')
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const card = filteredEntries
      .filter((e) => e.payment_type === 'card')
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const transfer = filteredEntries
      .filter((e) => e.payment_type === 'transfer')
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const debt = filteredEntries
      .filter((e) => e.payment_type === 'debt')
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    return {
      total,
      cash,
      card,
      transfer,
      debt,
      count: filteredEntries.length,
      patients: new Set(filteredEntries.map((e) => e.patient_name)).size,
    };
  }, [filteredEntries]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, JournalEntry[]> = {};
    const singles: JournalEntry[] = [];
    filteredEntries.forEach((e) => {
      const key = e.patient_name + '|' + (e.date || '').substring(0, 10);
      if (!e.patient_name || e.type === 'expense' || e.type === 'payout') {
        singles.push({ ...e, _group: null });
        return;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    const result: JournalEntry[] = [];
    Object.entries(groups).forEach(([key, items]) => {
      if (items.length > 1) {
        const totalAmount = items.reduce(
          (a: number, i: JournalEntry) => a + (Number(i.amount) || 0),
          0
        );
        result.push({
          ...items[0],
          _group: key,
          _children: items,
          _groupTotal: totalAmount,
          _groupCount: items.length,
        });
      } else {
        result.push({ ...items[0], _group: null });
      }
    });
    result.push(...singles);
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [filteredEntries]);

  async function handleAddExpense() {
    if (!expenseForm.amount) return toast.error('Summani kiriting');
    try {
      const res = await window.electronAPI?.journal?.addExpense?.(
        expenseForm.category,
        expenseForm.amount,
        expenseForm.description
      );
      if (res?.success) {
        toast.success('Xarajat saqlandi');
        setShowExpenseModal(false);
        setExpenseForm({ category: "Xo'jalik", amount: '', description: '' });
        loadEntries(false);
        loadStats();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handlePayDebt() {
    if (!payingDebt) return;
    try {
      const res = await window.electronAPI?.journal?.payDebt?.(
        payingDebt.type,
        payingDebt.id,
        debtPayForm.paymentType,
        payingDebt.amount
      );
      if (res?.success) {
        toast.success('Qarz yopildi');
        setPayingDebt(null);
        loadEntries(false);
        loadStats();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveEdit() {
    if (!editingEntry) return;
    try {
      const table = editingEntry.type === 'outpatient' ? 'appointments' : 'room_patients';
      const data = {
        amount: Number(editForm.amount),
        discount: Number(editForm.discount),
        paymentType: editForm.paymentType,
      };
      const res = await db.update(table, editingEntry.id, data);
      if (res.success) {
        toast.success('Saqlandi');
        setEditingEntry(null);
        loadEntries(false);
        loadStats();
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleZReport() {
    const confirm = window.confirm(
      'Diqqat! Bugungi smenani yopish va Z-Report chiqarishni tasdiqlaysizmi?'
    );
    if (!confirm) return;

    const summary = `
      <div style="font-family: sans-serif; padding: 20px; width: 300px; border: 1px solid #000;">
        <h2 style="text-align:center;">Z-REPORT (Shift Summary)</h2>
        <p style="text-align:center;">Sana: ${new Date().toLocaleDateString('uz-UZ')}</p>
        <hr/>
        <p><b>Jami Tushum:</b> ${formatPrice(stats.daily.revenue)} so'm</p>
        <p><b>Naqd:</b> ${formatPrice(footerTotals.cash)} so'm</p>
        <p><b>Karta:</b> ${formatPrice(footerTotals.card)} so'm</p>
        <p><b>Qarz:</b> ${formatPrice(stats.daily.debt)} so'm</p>
        <hr/>
        <p><b>Jami Xarajat:</b> ${formatPrice(stats.daily.expense)} so'm</p>
        <hr/>
        <h3 style="text-align:center;">SOF FOYDA: ${formatPrice(stats.daily.revenue - stats.daily.expense)} so'm</h3>
        <p style="margin-top: 50px; border-top: 1px dotted #ccc; text-align:center;">Imzo: __________</p>
      </div>
    `;
    try {
      await window.electronAPI?.print?.receipt?.(summary, { silent: false });
      toast.success('Smena yopildi va hisobot chiqarildi');
      // Optional: window.electronAPI.journal.closeShift(...)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function getRowStyle(e: JournalEntry) {
    if (e.type === 'expense') return { background: 'rgba(245, 158, 11, 0.05)' };
    if (e.payment_type === 'debt') return { background: 'rgba(239, 68, 68, 0.05)' };
    if (e.payment_type === 'cash') return { background: 'rgba(16, 185, 129, 0.05)' };
    if (e.payment_type === 'card') return { background: 'rgba(59, 130, 246, 0.05)' };
    return {};
  }

  function getBadgeClass(e: JournalEntry) {
    if (e.type === 'expense') return 'badge-warning';
    if (e.payment_type === 'debt') return 'badge-danger';
    if (e.payment_type === 'cash') return 'badge-success';
    if (e.payment_type === 'card') return 'badge-info';
    return 'badge-secondary';
  }

  function renderRow(e: JournalEntry, isChild = false) {
    const dt = new Date(e.date);
    const docShare = e.amount * ((e.commission_rate ?? 0) / 100);
    const rowStyle = getRowStyle(e);

    return (
      <tr
        key={`${e.type}-${e.id}${isChild ? '-c' : ''}`}
        style={{
          fontSize: 15,
          height: 65,
          borderBottom: '1px solid var(--border-color)',
          ...rowStyle,
        }}
      >
        <td style={{ fontWeight: 700 }}>{dt.toLocaleDateString('uz-UZ')}</td>
        <td style={{ opacity: 0.6, fontSize: 13 }}>
          {dt.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
        </td>
        <td style={{ fontWeight: 600 }}>{e.doctor_name || '—'}</td>
        <td>
          <span className="badge badge-outline">{e.category || '—'}</span>
        </td>
        <td style={{ fontWeight: isChild ? 400 : 800, fontSize: 16 }}>
          {!isChild && e._group && e._children ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className={`expand-btn ${expandedPatients[e._group ?? ''] ? 'open' : ''}`}
                style={{ fontSize: 20 }}
                onClick={() => toggleExpand(e._group ?? '')}
              >
                ▶
              </button>
              <span>{e.patient_name}</span>
              <span className="badge" style={{ fontSize: 10, opacity: 0.5 }}>
                {e._groupCount} xizmat
              </span>
            </div>
          ) : isChild ? (
            <span style={{ marginLeft: 25, opacity: 0.6 }}>↳ {e.patient_name}</span>
          ) : (
            e.patient_name
          )}
        </td>
        <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {e.item_name || e.description || '—'}
        </td>
        <td style={{ textAlign: 'right' }}>
          {docShare > 0 ? (
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
            >
              <span style={{ color: 'var(--accent-warning)', fontWeight: 800 }}>
                {formatPrice(docShare)}
              </span>
            </div>
          ) : (
            '—'
          )}
        </td>
        <td style={{ textAlign: 'center' }}>
          {e.room_name ? <span className="badge badge-info">{e.room_name}</span> : '—'}
        </td>
        <td
          style={{
            textAlign: 'right',
            fontWeight: 900,
            color: e.type === 'expense' ? 'var(--accent-warning)' : 'var(--accent-primary)',
            fontSize: 18,
          }}
        >
          {e.type === 'expense' ? '-' : ''}
          {!isChild && e._group ? formatPrice(e._groupTotal) : formatPrice(e.amount)}
        </td>
        <td>
          <span
            className={`badge ${getBadgeClass(e)}`}
            style={{ cursor: e.payment_type === 'debt' ? 'pointer' : 'default' }}
            onClick={() => e.payment_type === 'debt' && setPayingDebt(e)}
          >
            {e.payment_type === 'debt'
              ? t('journal.status.debt_pay')
              : (e.payment_type ?? '').toUpperCase()}
          </span>
        </td>
        <td style={{ textAlign: 'right', color: 'var(--accent-danger)' }}>
          {(e.discount ?? 0) > 0 ? formatPrice(e.discount) : '—'}
        </td>
        <td style={{ fontWeight: 600 }}>
          {e.status === 'refunded' ? t('journal.status.refunded') : t('journal.status.ok')}
        </td>
        <td style={{ fontSize: 12, opacity: 0.5 }}>{e.created_by || '—'}</td>
        <td>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-icon-link"
              title={t('common.edit') || 'Tahrirlash'}
              onClick={() => {
                setEditingEntry(e);
                setEditForm({
                  amount: String(e.amount),
                  discount: String(e.discount || 0),
                  paymentType: e.payment_type || 'cash',
                });
              }}
            >
              ✏️
            </button>
            <button
              className="btn-icon-link"
              title={t('reception.printCheck') || 'Chek chiqarish'}
              onClick={() => window.print()}
            >
              🖨️
            </button>
            {e.payment_type === 'debt' && (
              <button
                className="btn-icon-link text-success"
                title={t('common.pay') || 'Qarzni yopish'}
                onClick={() => setPayingDebt(e)}
              >
                💰
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div
      className="page page-journal"
      style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* HEADER */}
      <div className="page-header no-print">
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 900 }}>{t('journal.live_balance')}</h1>
          <p style={{ opacity: 0.6 }}>{t('journal.financial_control')}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary glass-btn"
            style={{
              background: 'var(--accent-danger-glow)',
              border: '1px solid var(--accent-danger)',
              color: 'var(--accent-danger)',
            }}
            onClick={() => handleZReport()}
          >
            {t('journal.z_report')}
          </button>
          <button
            className="btn btn-secondary glass-btn"
            style={{
              background: 'var(--accent-warning-glow)',
              border: '1px solid var(--accent-warning)',
            }}
            onClick={() => setShowExpenseModal(true)}
          >
            {t('journal.add_expense')}
          </button>
          <button
            className="btn btn-secondary glass-btn"
            onClick={() => setShowFilters(!showFilters)}
          >
            {t('journal.filters')}
          </button>
          <button className="btn btn-secondary glass-btn" onClick={() => loadEntries(true)}>
            {t('journal.refresh')}
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: 16, borderRadius: 12 }}
            onClick={() => onNavigate?.('reception')}
          >
            {t('journal.new_reception')}
          </button>
        </div>
      </div>

      <div className="card glass-card no-print">
        <div className="card-header">Live klinik amallari</div>
        <div className="card-body">
          {activities.length === 0 ? (
            <p>Hozircha live amallar yo'q</p>
          ) : (
            <div className="journal-live-list">
              {activities.map((activity) => (
                <div key={activity.id} className="journal-live-item">
                  <strong>{activity.action_type}</strong>
                  <span>{activity.patient_name || 'Noma`lum bemor'}</span>
                  <span>{activity.actor_role || 'unknown'}</span>
                  <span>{new Date(activity.created_at).toLocaleTimeString('uz-UZ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FINTECH WIDGETS */}
      <div
        className="stats-grid no-print"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, flexShrink: 0 }}
      >
        {[
          {
            label: t('journal.daily_revenue'),
            value: stats.daily.revenue,
            sub: `+ ${formatPrice(stats.daily.recovered)} qarzdan`,
            icon: '📈',
            color: 'var(--accent-success)',
          },
          {
            label: t('journal.daily_expense'),
            value: stats.daily.expense,
            icon: '📉',
            color: 'var(--accent-warning)',
          },
          {
            label: t('journal.net_revenue'),
            value: stats.daily.revenue + stats.daily.recovered - stats.daily.expense,
            icon: '💎',
            color: 'var(--accent-primary)',
          },
          {
            label: t('journal.current_debts'),
            value: stats.daily.debt,
            icon: '⏳',
            color: 'var(--accent-danger)',
          },
        ].map((s, i) => (
          <div
            key={i}
            className="card glass-card"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderLeft: `6px solid ${s.color}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>{s.label}</span>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>
              {formatPrice(s.value)} <small style={{ fontSize: 14 }}>so'm</small>
            </div>
            {s.sub && <div style={{ fontSize: 11, opacity: 0.6 }}>{s.sub}</div>}
            {i === 0 && s.value > 5000000 && (
              <div
                style={{
                  fontSize: 11,
                  background: 'var(--accent-danger-glow)',
                  color: 'var(--accent-danger)',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontWeight: 800,
                }}
              >
                {t('journal.inkassatsiya')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="card glass-card no-print" style={{ padding: '15px 20px' }}>
        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              {t('journal.period')}
            </label>
            <input
              type="date"
              className="form-input"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            />
            <span>—</span>
            <input
              type="date"
              className="form-input"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              style={{ padding: '10px 15px' }}
              placeholder={t('journal.search_placeholder')}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* TABLE AREA */}
      <div
        className="card glass-card"
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div className="card-body" style={{ overflow: 'auto', padding: 0 }}>
          <table
            className="data-table"
            style={{ width: '100%', minWidth: 1600, borderCollapse: 'separate', borderSpacing: 0 }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
              <tr style={{ height: 60 }}>
                <th>{t('journal.table.date')}</th>
                <th>{t('journal.table.time')}</th>
                <th>{t('journal.table.doctor')}</th>
                <th>{t('journal.table.category')}</th>
                <th>{t('journal.table.patient')}</th>
                <th>{t('journal.table.service')}</th>
                <th style={{ textAlign: 'right' }}>{t('journal.table.commission')}</th>
                <th>{t('journal.table.room')}</th>
                <th style={{ textAlign: 'right' }}>{t('journal.table.amount')}</th>
                <th>{t('journal.table.payment')}</th>
                <th style={{ textAlign: 'right' }}>{t('journal.table.discount')}</th>
                <th>{t('journal.table.status')}</th>
                <th>{t('journal.table.cashier')}</th>
                <th style={{ textAlign: 'center' }}>{t('journal.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-10 text-center">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : (
                groupedEntries.map((e) => {
                  const rows = [renderRow(e)];
                  if (e._group && e._children && expandedPatients[e._group]) {
                    e._children.forEach((child) => rows.push(renderRow(child, true)));
                  }
                  return rows;
                })
              )}
            </tbody>
          </table>
        </div>

        {/* STICKY FOOTER */}
        <div
          className="journal-sticky-footer"
          style={{
            borderTop: '2px solid var(--accent-primary)',
            background: 'var(--bg-card)',
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 30,
              padding: '15px 25px',
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            <div style={{ color: 'var(--accent-primary)' }}>
              {t('journal.footer.total')} {formatPrice(footerTotals.total)}
            </div>
            <div style={{ color: 'var(--accent-success)' }}>
              {t('journal.footer.cash')} {formatPrice(footerTotals.cash)}
            </div>
            <div style={{ color: 'var(--accent-info)' }}>
              {t('journal.footer.card')} {formatPrice(footerTotals.card)}
            </div>
            <div style={{ color: 'var(--accent-danger)' }}>
              {t('journal.footer.debt')} {formatPrice(footerTotals.debt)}
            </div>
            <div style={{ marginLeft: 'auto', opacity: 0.6 }}>
              {footerTotals.count} {t('journal.footer.count')}
            </div>
          </div>
        </div>
      </div>

      {/* EXPENSE MODAL */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={t('journal.expense_modal.title')}
      >
        <div className="form-grid p-4">
          <div className="form-group full-width">
            <label>{t('journal.expense_modal.category')}</label>
            <select
              className="form-input"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            >
              <option value="Xo'jalik">{t('journal.expense_modal.categories.household')}</option>
              <option value="Oylik">{t('journal.expense_modal.categories.salary')}</option>
              <option value="Ijara">{t('journal.expense_modal.categories.rent')}</option>
              <option value="Dori-darmon">{t('journal.expense_modal.categories.medicine')}</option>
              <option value="Marketing">{t('journal.expense_modal.categories.marketing')}</option>
              <option value="Boshqa">{t('journal.expense_modal.categories.other')}</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label>{t('journal.expense_modal.amount')}</label>
            <input
              type="number"
              className="form-input"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="form-group full-width">
            <label>{t('journal.expense_modal.description')}</label>
            <textarea
              className="form-input"
              rows={3}
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="Batafsil ma'lumot..."
            ></textarea>
          </div>
          <div
            className="form-actions"
            style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}
          >
            <button className="btn btn-ghost" onClick={() => setShowExpenseModal(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" onClick={handleAddExpense}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* QUICK DEBT PAY MODAL */}
      <Modal
        isOpen={!!payingDebt}
        onClose={() => setPayingDebt(null)}
        title={t('journal.pay_debt')}
      >
        {payingDebt && (
          <div className="form-grid p-4">
            <h2
              style={{
                fontSize: 24,
                fontWeight: 900,
                textAlign: 'center',
                color: 'var(--accent-danger)',
              }}
            >
              {formatPrice(payingDebt.amount)} so'm
            </h2>
            <p style={{ textAlign: 'center', opacity: 0.7 }}>Bemor: {payingDebt.patient_name}</p>
            <div className="form-group full-width" style={{ marginTop: 20 }}>
              <label>To'lov Turi</label>
              <select
                className="form-input"
                value={debtPayForm.paymentType}
                onChange={(e) => setDebtPayForm({ paymentType: e.target.value })}
              >
                <option value="cash">💵 Naqd pul</option>
                <option value="card">💳 Plastik karta</option>
                <option value="transfer">📲 Click / Payme</option>
              </select>
            </div>
            <div
              className="form-actions"
              style={{ marginTop: 30, display: 'flex', gap: 10, justifyContent: 'stretch' }}
            >
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: 15 }}
                onClick={handlePayDebt}
              >
                ✅ TO'LANDI
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title={t('common.edit') || 'Tahrirlash'}
      >
        {editingEntry && (
          <div className="form-grid p-4">
            <div className="form-group full-width">
              <label>{t('journal.table.amount') || 'Summa'}</label>
              <input
                type="number"
                className="form-input"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>
            <div className="form-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={saveEdit}>
                {t('common.save') || 'Saqlash'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
