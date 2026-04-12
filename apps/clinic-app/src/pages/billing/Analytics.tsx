import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { db } from '../../utils/db';
import { supabase } from '../../utils/supabase';
import { printReceipt } from '../../utils/printer';

export default function Analytics() {
  const { t } = useTranslation();
  const toast = useToast();

  const [period, setPeriod] = useState('today');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalPatients: 0, totalAppointments: 0, totalPayouts: 0 });
  const [doctorStats, setDoctorStats] = useState<any[]>([]);
  const [showDoctorModal, setShowDoctorModal] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState({ percentage: 50, note: '' });
  const [serviceStats, setServiceStats] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [debtStats, setDebtStats] = useState<any>({ total: 0, patients: 0, avg: 0, recent: [] });
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingStats, setLoadingStats] = useState(false);
  const [doctorPayouts, setDoctorPayouts] = useState<any[]>([]);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [statsionarStats, setStatsionarStats] = useState({ totalRevenue: 0, patientCount: 0, avgStay: 0, mealRevenue: 0 });
  const [statsionarRevenue, setStatsionarRevenue] = useState(0);
  const [serviceRevenue, setServiceRevenue] = useState(0);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [averageCheck, setAverageCheck] = useState(0);
  const [statsionarDetails, setStatsionarDetails] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'Rent', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  // ===== NEW: Advanced Analytics State =====
  const [comparisonData, setComparisonData] = useState<any>({ current: 0, previous: 0, currentPatients: 0, previousPatients: 0 });
  const [retentionData, setRetentionData] = useState<any>({ newPatients: 0, returningPatients: 0 });
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [expensePieData, setExpensePieData] = useState<any[]>([]);

  // ===== PHARMACY ANALYTICS TYPES =====
  interface PharmData {
    totalMeds: number;
    lowStock: number;
    expirySoon: number;
    totalStockVal: number;
    totalRevenue: number;
    totalProfit: number;
    topSellers: any[];
    slowSellers: any[];
    mostProfit: any[];
    hourly: { h: number; qty: number; revenue: number; }[];
    daily: { d: string; qty: number; revenue: number; }[];
    journal: any[];
  }

  const [pharmPeriod, setPharmPeriod] = useState('week'); // hour|day|week|month|year|custom
  const [pharmFrom,   setPharmFrom]   = useState('');
  const [pharmTo,     setPharmTo]     = useState('');
  const [pharmData, setPharmData] = useState<PharmData>({
    totalMeds: 0, lowStock: 0, expirySoon: 0,
    totalStockVal: 0, totalRevenue: 0, totalProfit: 0,
    topSellers: [], slowSellers: [], mostProfit: [],
    hourly: [], daily: [], journal: [],
  });
  const [pharmLoading, setPharmLoading] = useState(false);

  function getPeriodCondition() {
    const d1 = dateFrom || new Date().toISOString().split('T')[0];
    const d2 = dateTo || new Date().toISOString().split('T')[0];
    if (period === 'custom') {
      return `date(a.createdAt) >= '${d1}' AND date(a.createdAt) <= '${d2}'`;
    }
    
    const now = new Date();
    if (period === 'today') return `date(a.createdAt) = '${now.toISOString().split('T')[0]}'`;
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return `date(a.createdAt) >= '${weekAgo.toISOString().split('T')[0]}' AND date(a.createdAt) <= '${now.toISOString().split('T')[0]}'`;
    }
    if (period === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return `date(a.createdAt) >= '${monthAgo.toISOString().split('T')[0]}' AND date(a.createdAt) <= '${now.toISOString().split('T')[0]}'`;
    }
    return `date(a.createdAt) = '${now.toISOString().split('T')[0]}'`;
  }

  useEffect(() => { 
    loadStats(); 
    loadPharmStats();
  }, [period, dateFrom, dateTo]);

  useEffect(() => { 
    if (activeTab === 'pharmacy') loadPharmStats(); 
  }, [activeTab, pharmPeriod, pharmFrom, pharmTo]);

  async function loadPharmStats() {
    setPharmLoading(true);
    try {
      const meds = await db.getAllRows('pharmacy');
      const today = new Date().toISOString().split('T')[0];
      const soon  = new Date(); soon.setDate(soon.getDate() + 30);
      const soonStr = soon.toISOString().split('T')[0];
 
      const totalMeds   = meds.length;
      const lowStock    = meds.filter(m => m.qty <= 10).length;
      const expirySoon  = meds.filter(m => m.expiry && m.expiry <= soonStr).length;
      const totalStockVal = meds.reduce((s,m) => s + (m.qty||0)*(m.price||0), 0);
 
      // Time filter for journal
      let jFromTime = 0;
      const now = new Date();
      if (pharmPeriod === 'hour') jFromTime = now.getTime() - 3600000;
      else if (pharmPeriod === 'day') jFromTime = new Date().setHours(0,0,0,0);
      else if (pharmPeriod === 'week') jFromTime = new Date().setDate(now.getDate()-7);
      else if (pharmPeriod === 'month') jFromTime = new Date().setMonth(now.getMonth()-1);
      else if (pharmPeriod === 'year') jFromTime = new Date().setFullYear(now.getFullYear()-1);
      else if (pharmPeriod === 'custom' && pharmFrom && pharmTo) jFromTime = new Date(pharmFrom).getTime();
 
      const allJnl = await db.getAllRows('pharmacy_journal');
      const journal = allJnl
        .filter(j => {
          if (j.entry_type !== 'chiqim') return false;
          const ct = new Date(j.created_at).getTime();
          if (jFromTime && ct < jFromTime) return false;
          if (pharmPeriod === 'custom' && pharmTo && ct > new Date(pharmTo + 'T23:59:59').getTime()) return false;
          return true;
        })
        .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Aggregate by medicine name
      const agg: any = {};
      journal.forEach((j: any) => {
        if (!agg[j.name]) agg[j.name] = { name: j.name, category: j.category||'Boshqa', soldQty:0, revenue:0, txCount:0 };
        agg[j.name].soldQty  += j.qty_out || 0;
        agg[j.name].revenue  += (j.qty_out||0)*(j.price||0);
        agg[j.name].txCount  += 1;
      });
      const aggArr = Object.values(agg).sort((a: any, b: any) => b.soldQty - a.soldQty);

      // Profit calc (using cost_price from meds)
      const profitArr = aggArr.map((a: any) => {
        const med = meds?.find((m: any) => m.name === a.name);
        const cp  = med?.cost_price || 0;
        return { ...a, profit: a.soldQty*(( a.revenue/Math.max(a.soldQty,1)) - cp) };
      }).sort((a: any, b: any) => b.profit - a.profit);

      // Hourly distribution (last 24h)
      const hourly = Array.from({length:24}, (_,h) => ({ h, qty:0, revenue:0 }));
      journal.forEach((j: any) => {
        const h = new Date(j.created_at).getHours();
        hourly[h].qty     += j.qty_out||0;
        hourly[h].revenue += (j.qty_out||0)*(j.price||0);
      });

      // Daily distribution
      const dailyMap: any = {};
      journal.forEach((j: any) => {
        const d = j.created_at?.split('T')[0] || '';
        if (!d) return;
        if (!dailyMap[d]) dailyMap[d] = { d, qty:0, revenue:0 };
        dailyMap[d].qty     += j.qty_out||0;
        dailyMap[d].revenue += (j.qty_out||0)*(j.price||0);
      });
      const dailyArr = Object.values(dailyMap).sort((a: any, b: any) => a.d > b.d ? 1 : -1).slice(-30);

      const totalRevenue = aggArr.reduce((s: number, a: any) => s + (a.revenue || 0), 0) as number;
      const totalProfit  = profitArr.reduce((s: number, a: any) => s + (a.profit || 0), 0) as number;

      setPharmData({
        totalMeds, lowStock, expirySoon, totalStockVal, totalRevenue, totalProfit,
        topSellers:  aggArr.slice(0,10),
        slowSellers: [...aggArr].sort((a: any, b: any) => a.soldQty - b.soldQty).slice(0, 10),
        mostProfit:  profitArr.slice(0,10),
        hourly, daily: dailyArr as any[], journal: journal.slice(0,100),
      });
    } catch(e: any) { toast.error(e.message); }
    setPharmLoading(false);
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const dFrom = new Date(dateFrom).getTime();
      const dTo = new Date(dateTo + 'T23:59:59').getTime();
      
      const [apps, txs, docs, svcs, pats, rps, payouts, exp] = await Promise.all([
        db.getAllRows('appointments'),
        db.getAllRows('transactions'),
        db.getAllRows('doctors'),
        db.getAllRows('services'),
        db.getAllRows('patients'),
        db.getAllRows('room_patients'),
        db.getAllRows('doctor_payouts'),
        db.getAllRows('expenses')
      ]);

      // Filtered Data
      const filteredApps = apps.filter((a: any) => {
        const ct = new Date(a.createdAt).getTime();
        return ct >= dFrom && ct <= dTo;
      });
      
      const filteredTxs = txs.filter((t: any) => {
        const ct = new Date(t.createdAt).getTime();
        return ct >= dFrom && ct <= dTo;
      });

      // Overview Stats
      const revenueTxs = filteredTxs.filter((t: any) => t.type === 'payment' || t.type === 'pharmacy_sale');
      const totalRevenue = revenueTxs.reduce((s, t: any) => s + (t.amount || 0), 0);
      const totalPatients = new Set(filteredApps.map((a: any) => a.patientId)).size;
      const totalAppointments = filteredApps.length;
      
      const periodPayouts = payouts.filter((p: any) => {
        const ct = new Date(p.created_at).getTime();
        return ct >= dFrom && ct <= dTo;
      }).reduce((s, p: any) => s + (p.amount || 0), 0);

      setStats({
        totalRevenue,
        totalPatients,
        totalAppointments,
        totalPayouts: periodPayouts
      });

      setAverageCheck(totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0);

      // Category Stats
      const catMap: any = {};
      filteredApps.forEach((a: any) => {
        const s = svcs.find((x: any) => x.id === a.serviceId);
        const cat = s ? (s as any).category : 'Boshqa';
        if (!catMap[cat]) catMap[cat] = { name: cat, cnt: 0, revenue: 0 };
        catMap[cat].cnt++;
        const t = txs.find((tx: any) => tx.appointmentId === a.id && tx.type === 'payment');
        if (t) catMap[cat].revenue += (t.amount || 0);
      });
      setCategoryStats(Object.values(catMap).sort((a:any, b:any) => b.cnt - a.cnt));

      // Doctor Payouts Calculated Stats
      const doctorPayoutData = docs.map((d: any) => {
        const dApps = filteredApps.filter((a: any) => a.doctorId === d.id);
        const dTxs = txs.filter((t: any) => t.type === 'payment' && dApps.some((a: any) => a.id === t.appointmentId));
        const rev = dTxs.reduce((s: number, t: any) => s + (t.amount || 0), 0);
        return {
          id: d.id,
          fullName: d.fullName,
          specialty: d.specialty,
          commission_rate: d.commission_rate,
          totalRevenue: rev,
          appointmentCount: dApps.length
        };
      }).filter((d: any) => d.totalRevenue > 0 || docs.find((x: any) => x.id === d.id)?.isActive);
      setDoctorPayouts(doctorPayoutData);

      // History
      const hist = payouts
        .filter((p: any) => {
          const ct = new Date(p.created_at).getTime();
          return ct >= dFrom && ct <= dTo;
        })
        .map((p: any) => {
          const d = docs.find((x: any) => x.id === p.doctor_id);
          return { ...p, doctorName: d ? (d as any).fullName : 'Noma\'lum', specialty: d ? (d as any).specialty : '' };
        })
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPayoutHistory(hist);

      // Doctor Distribution
      const dStatMap: any = {};
      filteredApps.forEach((a: any) => {
        const d = docs.find((x: any) => x.id === a.doctorId);
        const name = d ? (d as any).fullName : 'Noma\'lum';
        if (!dStatMap[a.doctorId]) dStatMap[a.doctorId] = { id: a.doctorId, fullName: name, cnt: 0, revenue: 0 };
        dStatMap[a.doctorId].cnt++;
        const t = txs.find((tx: any) => tx.appointmentId === a.id && tx.type === 'payment');
        if (t) dStatMap[a.doctorId].revenue += (t.amount || 0);
      });
      setDoctorStats(Object.values(dStatMap).sort((a:any, b:any) => b.revenue - a.revenue));

      // Service Stats
      const sStatMap: any = {};
      filteredApps.forEach((a: any) => {
        const s = svcs.find((x: any) => x.id === a.serviceId);
        const name = s ? (s as any).name : 'Noma\'lum';
        if (!sStatMap[a.serviceId]) sStatMap[a.serviceId] = { name, cnt: 0, revenue: 0 };
        sStatMap[a.serviceId].cnt++;
        const t = txs.find((tx: any) => tx.appointmentId === a.id && tx.type === 'payment');
        if (t) sStatMap[a.serviceId].revenue += (t.amount || 0);
      });
      setServiceStats(Object.values(sStatMap).sort((a:any, b:any) => b.cnt - a.cnt).slice(0, 10));

      // Payment Types
      const pStatMap: any = {};
      filteredApps.forEach((a: any) => {
        const pt = (a as any).paymentType || 'Noma\'lum';
        if (!pStatMap[pt]) pStatMap[pt] = { paymentType: pt, cnt: 0, revenue: 0 };
        pStatMap[pt].cnt++;
        const t = txs.find((tx: any) => tx.appointmentId === a.id && tx.type === 'payment');
        if (t) pStatMap[pt].revenue += (t.amount || 0);
      });
      setPaymentStats(Object.values(pStatMap));

      // Daily Revenue (Last 30 days)
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dailyMap2: any = {};
      txs.filter((t: any) => t.type === 'payment' && new Date(t.createdAt) >= thirtyDaysAgo).forEach((t: any) => {
        const day = t.createdAt.split('T')[0];
        dailyMap2[day] = (dailyMap2[day] || 0) + (t.amount || 0);
      });
      setDailyRevenue(Object.entries(dailyMap2).map(([day, revenue]) => ({ day, revenue })).sort((a: any, b: any) => a.day.localeCompare(b.day)));

      // Debts
      const debts = filteredApps.filter((a: any) => (a as any).paymentType === 'debt');
      setDebtStats({
        total: debts.reduce((s, a: any) => s + (a.amount * (a.quantity || 1)), 0),
        patients: new Set(debts.map((a: any) => a.patientId)).size,
        avg: debts.length > 0 ? Math.round(debts.reduce((s, a: any) => s + (a.amount * (a.quantity || 1)), 0) / debts.length) : 0,
        recent: debts.slice(-5).map((a: any) => {
          const p = pats.find((x: any) => x.id === a.patientId);
          const s = svcs.find((x: any) => x.id === a.serviceId);
          return { amount: a.amount * (a.quantity || 1), createdAt: a.createdAt, patientName: p ? (p as any).fullName : 'Noma\'lum', serviceName: s ? (s as any).name : '—' };
        }).reverse()
      });

      // Statsionar
      const dischargedRp = rps.filter((rp: any) => {
        if (rp.status !== 'discharged') return false;
        const et = new Date(rp.exitDate).getTime();
        return et >= dFrom && et <= dTo;
      });
      // Need rooms for department stats
      const rooms = await db.getAllRows('rooms');
      const stDeptMap: any = {};
      dischargedRp.forEach((rp: any) => {
        const rm = rooms.find((r: any) => r.id === rp.roomId);
        const dept = rm ? (rm as any).department : 'Boshqa';
        if (!stDeptMap[dept]) stDeptMap[dept] = { department: dept, totalPatients: 0, revenue: 0 };
        stDeptMap[dept].totalPatients++;
        stDeptMap[dept].revenue += (rp.totalCost || 0);
      });
      setStatsionarDetails(Object.values(stDeptMap));
      setStatsionarStats({
        totalRevenue: dischargedRp.reduce((s, rp) => s + (rp.totalCost || 0), 0),
        patientCount: dischargedRp.length,
        avgStay: dischargedRp.length > 0 ? Math.round(dischargedRp.reduce((s, rp) => s + (rp.days || 0), 0) / dischargedRp.length) : 0,
        mealRevenue: 0
      });

      setServiceRevenue(revenueTxs.filter((t: any) => filteredApps.some((a: any) => a.id === t.appointmentId)).reduce((s: number, t: any) => s + (t.amount || 0), 0));
      setStatsionarRevenue(dischargedRp.reduce((s: number, rp: any) => s + (rp.totalCost || 0), 0));

      setExpenses(exp.filter((e: any) => {
        const et = new Date(e.expenseDate).getTime();
        return et >= dFrom && et <= dTo;
      }).sort((a: any, b: any) => (b.expenseDate || '').localeCompare(a.expenseDate || '')));

      // Comparison & Insights
      const diff = dTo - dFrom;
      const pFrom = dFrom - diff;
      const pTo = dFrom - 1;
      const prevApps = apps.filter((a: any) => {
        const ct = new Date(a.createdAt).getTime();
        return ct >= pFrom && ct <= pTo;
      });
      const prevTxs = txs.filter((t: any) => {
        const ct = new Date(t.createdAt).getTime();
        return ct >= pFrom && ct <= pTo && (t.type === 'payment' || t.type === 'pharmacy_sale');
      });
      setComparisonData({
        current: totalRevenue,
        previous: prevTxs.reduce((s: number, t: any) => s + (t.amount || 0), 0),
        currentPatients: totalPatients,
        previousPatients: new Set(prevApps.map((a: any) => a.patientId)).size
      });

      const returningCount = new Set(filteredApps.filter((a: any) => apps.some((old: any) => old.patientId === a.patientId && new Date(old.createdAt).getTime() < dFrom)).map((a: any) => a.patientId)).size;
      setRetentionData({ newPatients: totalPatients - returningCount, returningPatients: returningCount });

      // Heatmap
      const hm: any = {};
      apps.filter((a: any) => new Date(a.createdAt) >= thirtyDaysAgo).forEach((a: any) => {
        const d = new Date(a.createdAt);
        const dow = d.getDay();
        const hr = d.getHours();
        const key = `${dow}-${hr}`;
        hm[key] = (hm[key] || 0) + 1;
      });
      setHeatmapData(Object.entries(hm).map(([key, cnt]) => {
        const [dow, hr] = key.split('-').map(Number);
        return { dow, hr, cnt };
      }));

      // Expense Pie
      const pieMap: any = {};
      exp.filter((e: any) => {
        const et = new Date(e.expenseDate).getTime();
        return et >= dFrom && et <= dTo;
      }).forEach((e: any) => {
        pieMap[e.category] = (pieMap[e.category] || 0) + (e.amount || 0);
      });
      const pieArr:any[] = Object.entries(pieMap).map(([category, total]) => ({ category, total }));
      if (periodPayouts > 0) pieArr.push({ category: 'Shifokor ulushi', total: periodPayouts });
      setExpensePieData(pieArr.sort((a: any, b: any) => b.total - a.total));

      // Insights logic
      const insightsList:any[] = [];
      const retPct = returningCount / Math.max(totalPatients, 1) * 100;
      if (retPct < 20) insightsList.push({ type: 'warn', text: `Qayta keluvchi bemorlar atigi ${retPct.toFixed(0)}%.`, color: 'var(--accent-warning)' });
      if (totalRevenue > 0 && totalRevenue > (prevTxs.reduce((s, t) => s + (t.amount || 0), 0) * 1.1)) insightsList.push({ type: 'up', text: 'Tushum sezirarli darajada oshdi! 🚀', color: 'var(--accent-success)' });
      setInsights(insightsList.length > 0 ? insightsList : [{ type: 'ok', text: 'Ko\'rsatkichlar barqaror.', color: 'var(--accent-success)' }]);

    } catch (err: any) {
      toast.error(err?.message ?? 'Xatolik');
    } finally {
      setLoadingStats(false);
    }
  }

  async function saveExpense() {
    if (!expenseForm.amount) return;
    try {
      await db.insert('expenses', {
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        expenseDate: expenseForm.date
      });
      toast.success("Xarajat saqlandi");
      setExpenseForm({ category: 'Rent', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
      loadStats();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteExpense(id: any) {
    try {
      await db.delete('expenses', id);
      toast.success("O'chirildi");
      loadStats();
    } catch (e: any) { toast.error(e.message); }
  }

  async function loadDoctorAppointments(doctorId: any) {
    try {
      const dFrom = new Date(dateFrom).getTime();
      const dTo = new Date(dateTo + 'T23:59:59').getTime();
      const [apps, pt, svc, tx] = await Promise.all([
        db.getAllRows('appointments'),
        db.getAllRows('patients'),
        db.getAllRows('services'),
        db.getAllRows('transactions')
      ]);

      const rows = apps.filter((a: any) => {
        const ct = new Date(a.createdAt).getTime();
        return a.doctorId === doctorId && ct >= dFrom && ct <= dTo;
      }).map((a: any) => {
        const p = pt.find((x: any) => x.id === a.patientId);
        const s = svc.find((x: any) => x.id === a.serviceId);
        const t = tx.find((x: any) => x.appointmentId === a.id && x.type === 'payment');
        return {
          ...a,
          patientName: p ? (p as any).fullName : 'Noma\'lum',
          serviceName: s ? (s as any).name : '—',
          transactionAmount: t ? (t as any).amount : 0,
          paymentType: t ? (t as any).paymentType : a.paymentType
        };
      });
      setDoctorAppointments(rows);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleSavePayout() {
    if (!showDoctorModal) return;
    const revenue = Number((showDoctorModal as any).revenue);
    const share = Math.round(revenue * (payoutForm.percentage / 100));

    try {
      await db.insert('doctor_payouts', {
        doctor_id: showDoctorModal.id,
        amount: share,
        percentage: payoutForm.percentage,
        period_type: period,
        note: payoutForm.note || ''
      });

      await printReceipt({
        type: 'payout',
        doctorName: (showDoctorModal as any).fullName,
        specialty: (showDoctorModal as any).specialty,
        amount: share,
        revenue: revenue,
        percentage: payoutForm.percentage,
        note: payoutForm.note || ''
      });

      toast.success("To'lov saqlandi va chek chiqarildi.");
      setShowDoctorModal(null);
      setPayoutForm({ percentage: 50, note: '' });
      loadStats();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleDeletePayout(id: any) {
    if (!window.confirm("Ushbu to'lovni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await db.delete('doctor_payouts', id);
      toast.success("To'lov o'chirildi.");
      loadStats();
    } catch(e: any) {
      toast.error(e.message);
    }
  }

  function formatPrice(n: any) {
    return Number(n || 0).toLocaleString('uz-UZ');
  }

  const maxDailyRevenue = dailyRevenue.length > 0 ? Math.max(...dailyRevenue.map((d: any) => d.revenue), 1) : 1;

  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = stats.totalRevenue - totalExpenses;

  const statCards = [
    { icon: '💰', label: t('analytics.dailyRevenue') || 'Umumiy tushum', value: formatPrice(stats.totalRevenue), color: 'var(--accent-primary)', sub: t('analytics.period') },
    { icon: '🏥', label: t('analytics.statsionarRevenue') || 'Statsionar tushumi', value: formatPrice(statsionarRevenue), color: 'var(--accent-warning)', sub: 'Inpatient' },
    { icon: '🩺', label: t('analytics.serviceRevenue') || 'Xizmat tushumi', value: formatPrice(serviceRevenue), color: 'var(--accent-info)', sub: 'Outpatient' },
    { icon: '👥', label: t('analytics.totalPatients') || 'Bemorlar soni', value: stats.totalPatients, color: '#8b5cf6', sub: 'Nafari' },
    { icon: '🎫', label: t('analytics.averageCheck') || "O'rtacha chek", value: formatPrice(averageCheck), color: 'var(--accent-success)', sub: "so'm" },
    { icon: '📉', label: t('analytics.expenses') || 'Xarajatlar', value: formatPrice(totalExpenses), color: 'var(--accent-danger)', sub: 'Davriy' },
    { icon: '💊', label: 'Dorixona foydasi', value: formatPrice(pharmData.totalProfit), color: '#06b6d4', sub: 'Soffoyda' },
    { icon: '📈', label: t('analytics.netProfit') || 'Klinika sof foydasi', value: formatPrice(netProfit + (pharmData.totalProfit || 0)), color: 'var(--accent-success)', sub: 'Jami' },
  ];

  function paymentLabel(type: any) {
    if (type === 'cash') return '💵 ' + t('reception.cash');
    if (type === 'card') return '💳 ' + t('reception.card');
    if (type === 'transfer') return '🔄 ' + t('reception.transfer');
    if (type === 'debt') return '📝 ' + t('reception.debt');
    return type || '—';
  }

  function paymentColor(type: any) {
    if (type === 'cash') return 'var(--accent-success)';
    if (type === 'card') return 'var(--accent-info)';
    if (type === 'transfer') return 'var(--accent-primary)';
    if (type === 'debt') return 'var(--accent-danger)';
    return 'var(--text-muted)';
  }

  const totalPaymentRevenue = paymentStats.reduce((s, p: any) => s + p.revenue, 0);

  function buildDonutGradient() {
    if (paymentStats.length === 0) return 'var(--bg-input)';
    let currentPct = 0;
    const stops = paymentStats.map((p: any) => {
      const pct = (p.revenue / totalPaymentRevenue) * 100;
      const start = currentPct;
      currentPct += pct;
      return `${paymentColor(p.paymentType)} ${start}% ${currentPct}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  return (
    <div className="page page-analytics">
      <div className="page-header">
        <h1>📊 {t('analytics.title')}</h1>
        <div style={{display:'flex', gap: 10, flexWrap:'wrap'}}>
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setActiveTab('overview')}>📊 {t('analytics.overview')}</button>
          <button className={`btn ${activeTab === 'insights' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setActiveTab('insights')}>💡 Insights</button>
          <button className={`btn ${activeTab === 'heatmap' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setActiveTab('heatmap')}>🔥 Heatmap</button>
          <button className={`btn ${activeTab === 'retention' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setActiveTab('retention')}>👥 Retention</button>
          <button className={`btn ${activeTab === 'statsionar' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setActiveTab('statsionar')}>🏥 {t('inpatient.title')}</button>
          <button className={`btn ${activeTab === 'payouts' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setActiveTab('payouts')}>💸 {t('analytics.payouts')}</button>
          <button className={`btn ${activeTab === 'payout_history' ? 'btn-primary' : 'btn-ghost'}`} onClick={()=>setActiveTab('payout_history')}>📜 {t('common.history') || 'Tarix'}</button>
          <button
            className={`btn ${activeTab === 'pharmacy' ? 'btn-primary' : 'btn-ghost'}`}
            style={activeTab !== 'pharmacy' ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.12))', borderColor: '#7c3aed', color: '#7c3aed' } : {}}
            onClick={()=>setActiveTab('pharmacy')}>
            💊 {t('pharmacy.title') || 'Dorixona'}
          </button>
          <button className="btn btn-danger" onClick={()=>setShowExpenseModal(true)}>📅 {t('analytics.expensesPeriod')}</button>
        </div>
        <div className="page-header-actions" style={{display:'flex', gap: 10, alignItems:'center', flexWrap:'wrap'}}>
          {period === 'custom' && (
            <div style={{display:'flex', gap: 5, alignItems:'center'}}>
              <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span>—</span>
              <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          )}
          <select className="form-input" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="today">{t('analytics.today')}</option>
            <option value="week">{t('analytics.week')}</option>
            <option value="month">{t('analytics.month')}</option>
            <option value="custom">{t('analytics.custom')}</option>
          </select>
          <button className="btn btn-secondary" onClick={loadStats} disabled={loadingStats}>
            {loadingStats ? '🔄 Yuklanmoqda...' : `🔄 ${t('common.refresh')}`}
          </button>
        </div>
      </div>

      <div className="page-body">
        {activeTab === 'overview' ? (
          <>
            <div className="stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {statCards.map((card, i) => (
                <div key={i} className="card glass-card stat-card-v2" style={{ 
                  padding: '20px',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', marginBottom: 15 }}>
                     <div style={{ 
                       width: 44, 
                       height: 44, 
                       borderRadius: 12, 
                       background: `${card.color}15`, 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'center', 
                       fontSize: 22,
                       color: card.color
                     }}>
                       {card.icon}
                     </div>
                     <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{card.sub}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-main)', marginBottom: 4 }}>{card.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{card.label}</div>
                  </div>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    right: 0, 
                    width: '30%', 
                    height: '2px', 
                    background: card.color,
                    boxShadow: `0 0 10px ${card.color}`
                  }}></div>
                </div>
              ))}
            </div>

            {/* COMPARISON MODE BANNER */}
            {comparisonData.previous > 0 && (() => {
              const revDelta = comparisonData.current - comparisonData.previous;
              const revPct = Math.round((revDelta / comparisonData.previous) * 100);
              const ptsDelta = comparisonData.currentPatients - comparisonData.previousPatients;
              const ptsPct = comparisonData.previousPatients > 0 ? Math.round((ptsDelta / comparisonData.previousPatients) * 100) : 0;
              return (
                <div className="card glass-card" style={{ marginBottom: 30, padding: '20px 25px', borderLeft: revDelta >= 0 ? '5px solid var(--accent-success)' : '5px solid var(--accent-danger)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>📊 O'tgan davrga nisbatan solishtirma tahlil</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tushum o'zgarishi</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: revDelta >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {revDelta >= 0 ? '📈' : '📉'} {revPct >= 0 ? '+' : ''}{revPct}%
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatPrice(comparisonData.previous)} → {formatPrice(comparisonData.current)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Bemorlar o'zgarishi</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: ptsDelta >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {ptsDelta >= 0 ? '📈' : '📉'} {ptsPct >= 0 ? '+' : ''}{ptsPct}%
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {comparisonData.previousPatients} → {comparisonData.currentPatients} bemor
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {revenueTrends.length > 0 && (
              <div className="card glass-card" style={{marginBottom: 30}}>
                <div className="card-header">
                  <h3>〽️ {t('analytics.trendTitle')}</h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180, padding: '0 10px', borderBottom: '2px solid var(--border-color)' }}>
                    {revenueTrends.map((d, i) => {
                      const maxTrendRev = Math.max(...revenueTrends.map(x => x.serviceRev + x.statsionarRev), 1);
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
                          <div style={{
                            width: '100%',
                            height: `${(d.statsionarRev / maxTrendRev) * 160}px`,
                            background: 'var(--accent-warning)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          }} title={`Statsionar: ${formatPrice(d.statsionarRev)}`} />
                          <div style={{
                            width: '100%',
                            height: `${(d.serviceRev / maxTrendRev) * 160}px`,
                            background: 'var(--accent-primary)',
                            borderRadius: '4px 4px 0 0',
                            marginTop: 2,
                            transition: 'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          }} title={`Xizmatlar: ${formatPrice(d.serviceRev)}`} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                    <div style={{display:'flex', gap: 20, fontSize:12}}>
                      <span style={{display:'flex', alignItems:'center', gap:5}}><span style={{width:10, height:10, background:'var(--accent-primary)', borderRadius:2}}></span> {t('analytics.services')}</span>
                      <span style={{display:'flex', alignItems:'center', gap:5}}><span style={{width:10, height:10, background:'var(--accent-warning)', borderRadius:2}}></span> {t('analytics.statsionar')}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('analytics.last14Days')}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 30, marginBottom: 30 }}>
              {/* Top Doctors */}
              <div className="card glass-card">
                <div className="card-header">
                  <h3>👨‍⚕️ {t('analytics.doctorResults') || 'Top Shifokorlar'}</h3>
                </div>
                <div className="card-body">
                  {doctorStats.length === 0 ? (
                    <p className="empty-state">{t('common.noData')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      {doctorStats.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                          onClick={() => { setActiveTab('payouts'); }}
                          title={t('analytics.detailCalcHint')}>
                          <div style={{ minWidth: 140, fontWeight: 600, fontSize: 13 }}>{d.fullName}</div>
                          <div style={{ flex: 1, height: 26, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.max(5, (d.revenue / (doctorStats[0]?.revenue || 1)) * 100)}%`,
                              background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                              borderRadius: 4,
                              display: 'flex', alignItems: 'center', paddingLeft: 8,
                              fontSize: 11, color: '#fff', fontWeight: 700,
                            }}>
                              {formatPrice(d.revenue)}
                            </div>
                          </div>
                          <span className="badge badge-info" style={{fontSize:10, minWidth:60}}>{d.cnt} qabul</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Services */}
              <div className="card glass-card">
                <div className="card-header">
                  <h3>📊 {t('analytics.topServices') || 'Top Xizmatlar'}</h3>
                </div>
                <div className="card-body">
                  {serviceStats.length === 0 ? (
                    <p className="empty-state">{t('common.noData')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      {serviceStats.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ minWidth: 140, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                          <div style={{ flex: 1, height: 26, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.max(5, (s.cnt / (serviceStats[0]?.cnt || 1)) * 100)}%`,
                              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                              borderRadius: 4,
                              display: 'flex', alignItems: 'center', paddingLeft: 8,
                              fontSize: 11, color: '#fff', fontWeight: 700,
                            }}>
                              {s.cnt} ta
                            </div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 90, textAlign: 'right' }}>{formatPrice(s.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Direction Breakdown */}
              <div className="card glass-card">
                <div className="card-header">
                  <h3>🏢 {t('analytics.directionBreakdown') || 'Yo\'nalishlar'}</h3>
                </div>
                <div className="card-body">
                   {categoryStats.length === 0 ? <p className="empty-state">{t('common.noData')}</p> : (
                     <div style={{display:'flex', flexDirection:'column', gap: 18}}>
                        {categoryStats.map((c, i) => {
                          const total = categoryStats.reduce((s, x) => s + x.cnt, 0);
                          const pct = ((c.cnt / total) * 100).toFixed(1);
                          return (
                            <div key={i}>
                               <div style={{display:'flex', justifyContent:'space-between', marginBottom: 6, fontSize: 13}}>
                                  <span style={{fontWeight: 700}}>{c.name || 'Boshqa'}</span>
                                  <span style={{color: 'var(--text-secondary)'}}>{c.cnt} qabul ({pct}%)</span>
                               </div>
                               <div style={{height: 10, background:'var(--bg-input)', borderRadius: 10, overflow:'hidden'}}>
                                  <div style={{height:'100%', width: `${pct}%`, background: 'var(--accent-primary)', borderRadius: 10}}></div>
                               </div>
                            </div>
                          );
                        })}
                     </div>
                   )}
                </div>
              </div>

              {/* Payment Analysis */}
              <div className="card glass-card">
                <div className="card-header">
                  <h3>💳 {t('analytics.paymentAnalysis') || 'To\'lov turlari'}</h3>
                </div>
                <div className="card-body">
                  {paymentStats.length === 0 ? (
                    <p className="empty-state">{t('common.noData')}</p>
                  ) : (
                    <div style={{display:'flex', flexDirection:'column', gap: 20}}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', background: buildDonutGradient(), position: 'relative', flexShrink: 0 }}>
                           <div style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, background: 'var(--bg-card)', borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: 12, fontWeight: 900, textAlign:'center', lineHeight:1 }}>
                              {formatPrice(totalPaymentRevenue)}
                           </div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {paymentStats.map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: paymentColor(p.paymentType) }}></span>
                                <span>{paymentLabel(p.paymentType)}</span>
                              </div>
                              <span style={{ fontWeight: 700 }}>{((p.revenue / totalPaymentRevenue) * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <table className="data-table" style={{ fontSize: 11 }}>
                        <thead>
                          <tr>
                            <th>Tur</th>
                            <th>Soni</th>
                            <th style={{ textAlign: 'right' }}>Summa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentStats.map((p, i) => (
                            <tr key={i}>
                              <td>{paymentLabel(p.paymentType)}</td>
                              <td>{p.cnt} ta</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatPrice(p.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {debtStats.total > 0 && (
              <div className="card glass-card" style={{borderLeft: '5px solid var(--accent-danger)'}}>
                <div className="card-header">
                  <h3>⚠️ {t('analytics.debtMonitoring')}</h3>
                </div>
                <div className="card-body" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap: 20}}>
                  <div className="stat-card" style={{padding:20, background:'rgba(255, 69, 58, 0.05)', borderRadius:10, textAlign:'center'}}>
                    <div style={{fontSize:24, fontWeight:'bold', color:'var(--accent-danger)'}}>{formatPrice(debtStats.total)} {t('common.sum')}</div>
                    <div style={{fontSize:13, color:'var(--text-secondary)', marginTop:5}}>{t('analytics.totalDebt')}</div>
                  </div>
                  <div className="stat-card" style={{padding:20, background:'rgba(255, 69, 58, 0.05)', borderRadius:10, textAlign:'center'}}>
                    <div style={{fontSize:24, fontWeight:'bold'}}>{debtStats.patients}</div>
                    <div style={{fontSize:13, color:'var(--text-secondary)', marginTop:5}}>{t('analytics.debtors')}</div>
                  </div>
                  <div className="stat-card" style={{padding:20, background:'rgba(255, 69, 58, 0.05)', borderRadius:10, textAlign:'center'}}>
                    <div style={{fontSize:24, fontWeight:'bold'}}>{formatPrice(debtStats.avg)} {t('common.sum')}</div>
                    <div style={{fontSize:13, color:'var(--text-secondary)', marginTop:5}}>{t('analytics.avgDebtAmount')}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'insights' ? (
          <div>
            {/* SMART INSIGHTS */}
            <div className="card glass-card" style={{ marginBottom: 30, borderLeft: '5px solid var(--accent-warning)', padding: '20px 25px' }}>
              <h3 style={{ marginBottom: 15 }}>💡 Aqlli Xulosalar (AI Tavsiyalar)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 8, borderLeft: `4px solid ${ins.color}`, fontSize: 14 }}>
                    {ins.text}
                  </div>
                ))}
              </div>
            </div>

            {/* EXPENSE PIE CHART */}
            <div className="card glass-card" style={{ marginBottom: 30 }}>
              <div className="card-header"><h3>🥧 Xarajatlar Strukturasi</h3></div>
              <div className="card-body">
                {expensePieData.length === 0 ? (
                  <p className="empty-state">{t('common.noData')}</p>
                ) : (() => {
                  const totalExp = expensePieData.reduce((s, e) => s + (e.total || 0), 0);
                  const pieCatColors = ['var(--accent-primary)', 'var(--accent-danger)', 'var(--accent-warning)', 'var(--accent-info)', 'var(--accent-success)', 'var(--accent-secondary)', '#ff6b6b'];
                  let currentPct = 0;
                  const conicStops = expensePieData.map((e, i) => {
                    const pct = (e.total / totalExp) * 100;
                    const start = currentPct;
                    currentPct += pct;
                    return `${pieCatColors[i % pieCatColors.length]} ${start}% ${currentPct}%`;
                  });
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 40, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 200, height: 200, borderRadius: '50%', margin: '0 auto', position: 'relative', background: `conic-gradient(${conicStops.join(', ')})` }}>
                          <div style={{ position: 'absolute', top: 30, left: 30, right: 30, bottom: 30, background: 'var(--bg-card)', borderRadius: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 'bold' }}>{formatPrice(totalExp)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Jami xarajat</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {expensePieData.map((e, i) => {
                          const pct = ((e.total / totalExp) * 100).toFixed(1);
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 12, height: 12, borderRadius: 3, background: pieCatColors[i % pieCatColors.length], flexShrink: 0 }}></div>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.category}</span>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatPrice(e.total)} ({pct}%)</span>
                              <div style={{ width: 80, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pieCatColors[i % pieCatColors.length], borderRadius: 3 }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* SOURCE ANALYSIS */}
            <div className="card glass-card">
              <div className="card-header"><h3>📣 Bemor Kelish Manbalari (ROI)</h3></div>
              <div className="card-body">
                {sourceData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    📌 Hali bemorlarning kelish manbasi kiritilmagan. Qabulxonadan yangi bemor ro'yxatdan o'tkazilganda "Qayerdan eshitdi?" maydonini to'ldiring.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sourceData.map((s, i) => {
                      const avgPerPt = s.pts > 0 ? Math.round(s.rev / s.pts) : 0;
                      const maxRev = sourceData[0]?.rev || 1;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ minWidth: 130, fontWeight: 600, fontSize: 13 }}>📍 {s.source}</div>
                          <div style={{ flex: 1, height: 26, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.max(5, (s.rev / maxRev) * 100)}%`, background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, color: '#fff', fontWeight: 600 }}>
                              {formatPrice(s.rev)}
                            </div>
                          </div>
                          <span className="badge badge-info" style={{ fontSize: 10 }}>{s.pts} bemor</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 90 }}>O'rtacha: {formatPrice(avgPerPt)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'heatmap' ? (
          <div>
            <div className="card glass-card">
              <div className="card-header"><h3>🔥 Yuklama Xaritasi (Oxirgi 30 kun)</h3></div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                {(() => {
                  const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
                  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
                  const maxCnt = Math.max(...heatmapData.map((h: any) => h.cnt), 1);
                  const getVal = (dow: number, hr: number) => {
                    const cell = heatmapData.find((h: any) => h.dow === dow && h.hr === hr);
                    return cell ? cell.cnt : 0;
                  };
                  const getColor = (cnt: number) => {
                    if (cnt === 0) return 'var(--bg-input)';
                    const intensity = cnt / maxCnt;
                    if (intensity > 0.75) return '#FF453A';
                    if (intensity > 0.5) return '#FF9F0A';
                    if (intensity > 0.25) return '#FFD60A';
                    return '#30D158';
                  };
                  return (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${hours.length}, 1fr)`, gap: 3 }}>
                        <div></div>
                        {hours.map(h => <div key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{h}:00</div>)}
                        {days.map((d, di) => (
                          <React.Fragment key={di}>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{d}</div>
                            {hours.map(h => {
                              const val = getVal(di, h);
                              return (
                                <div key={h} title={`${d} ${h}:00 — ${val} ta qabul`} style={{
                                  height: 36, borderRadius: 4,
                                  background: getColor(val),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 700, color: val > 0 ? '#fff' : 'var(--text-muted)',
                                  cursor: 'default', transition: 'transform 0.15s',
                                }}
                                onMouseEnter={e => (e.target as any).style.transform = 'scale(1.1)'}
                                onMouseLeave={e => (e.target as any).style.transform = 'scale(1)'}
                                >{val > 0 ? val : ''}</div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 15, marginTop: 15, justifyContent: 'center', fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: '#30D158' }}></span> Kam (1-25%)</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: '#FFD60A' }}></span> O'rta (25-50%)</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: '#FF9F0A' }}></span> Ko'p (50-75%)</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: '#FF453A' }}></span> Eng band (75%+)</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : activeTab === 'retention' ? (
          <div>
            {/* RETENTION CARD */}
            <div className="card glass-card" style={{ marginBottom: 30 }}>
              <div className="card-header"><h3>👥 Bemorlar Sodiqlik Tahlili</h3></div>
              <div className="card-body">
                {(() => {
                  const total = retentionData.newPatients + retentionData.returningPatients;
                  const retPct = total > 0 ? ((retentionData.returningPatients / total) * 100).toFixed(1) : 0;
                  const newPct = total > 0 ? ((retentionData.newPatients / total) * 100).toFixed(1) : 0;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 40, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ width: 180, height: 180, borderRadius: '50%', margin: '0 auto', position: 'relative', background: total > 0 ? `conic-gradient(var(--accent-success) 0% ${retPct}%, var(--accent-primary) ${retPct}% 100%)` : 'var(--bg-input)' }}>
                          <div style={{ position: 'absolute', top: 25, left: 25, right: 25, bottom: 25, background: 'var(--bg-card)', borderRadius: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 'bold' }}>{total}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Jami bemorlar</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', gap: 30, marginBottom: 20 }}>
                          <div style={{ flex: 1, padding: 20, background: 'rgba(48, 209, 88, 0.08)', borderRadius: 12, textAlign: 'center', border: '1px solid rgba(48, 209, 88, 0.2)' }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-success)' }}>{retentionData.returningPatients}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>🔄 Qayta kelganlar ({retPct}%)</div>
                          </div>
                          <div style={{ flex: 1, padding: 20, background: 'rgba(10, 132, 255, 0.08)', borderRadius: 12, textAlign: 'center', border: '1px solid rgba(10, 132, 255, 0.2)' }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-primary)' }}>{retentionData.newPatients}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>🆕 Birinchi marta ({newPct}%)</div>
                          </div>
                        </div>
                        <div style={{ padding: 15, background: 'var(--bg-input)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
                          💡 <strong>Tavsiya:</strong> {Number(retPct) >= 30
                            ? `Ajoyib! ${retPct}% bemorlar qayta kelmoqda. Xizmat sifati yuqori darajada.`
                            : Number(retPct) >= 15
                            ? `Yaxshi. ${retPct}% sodiqlik. Xizmat sifatini yanada oshirishga harakat qiling.`
                            : `Diqqat! Faqat ${retPct}% qayta kelmoqda. Sabablarni aniqlash va xizmat sifatini oshirish zarur.`
                          }
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* SOURCE ANALYSIS TABLE */}
            <div className="card glass-card">
              <div className="card-header"><h3>📣 Reklama Kanallari ROI</h3></div>
              <div className="card-body p-0">
                {sourceData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>📌 Hali bemorlarning kelish manbasi kiritilmagan.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Manba</th>
                        <th>Bemorlar</th>
                        <th style={{ textAlign: 'right' }}>Jami tushum</th>
                        <th style={{ textAlign: 'right' }}>O'rtacha chek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceData.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>📍 {s.source}</td>
                          <td>{s.pts}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-success)' }}>{formatPrice(s.rev)}</td>
                          <td style={{ textAlign: 'right' }}>{formatPrice(s.pts > 0 ? Math.round(s.rev / s.pts) : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'statsionar' ? (
          <div className="statsionar-pro-view">
            <div className="stats-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:20, marginBottom:30}}>
              <div className="card glass-card" style={{padding:25, borderTop:'4px solid var(--accent-warning)'}}>
                <div style={{fontSize:14, color:'var(--text-secondary)'}}>{t('analytics.statsionarIncome')}</div>
                <div style={{fontSize:28, fontWeight:'bold', marginTop:8}}>{formatPrice(statsionarStats.totalRevenue)} {t('common.sum')}</div>
              </div>
              <div className="card glass-card" style={{padding:25, borderTop:'4px solid var(--accent-info)'}}>
                <div style={{fontSize:14, color:'var(--text-secondary)'}}>{t('analytics.recoveredPatients')}</div>
                <div style={{fontSize:28, fontWeight:'bold', marginTop:8}}>{statsionarStats.patientCount} {t('analytics.units')}</div>
              </div>
              <div className="card glass-card" style={{padding:25, borderTop:'4px solid var(--accent-success)'}}>
                <div style={{fontSize:14, color:'var(--text-secondary)'}}>{t('analytics.avgStayDuration')}</div>
                <div style={{fontSize:28, fontWeight:'bold', marginTop:8}}>{statsionarStats.avgStay} {t('analytics.day')}</div>
              </div>
            </div>

            <div className="card glass-card mb-5">
              <div className="card-header"><h3>🏢 {t('analytics.departmentAnalysis')}</h3></div>
              <div className="card-body p-0">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('analytics.departmentCol')}</th>
                        <th>{t('analytics.patientCount')}</th>
                        <th style={{textAlign:'right'}}>{t('analytics.totalIncome')}</th>
                      </tr>
                    </thead>
                    <tbody>
                       {statsionarDetails.length === 0 ? (
                         <tr><td colSpan={3} style={{textAlign:'center', padding:40, color:'var(--text-muted)'}}>{t('common.noData')}</td></tr>
                       ) : statsionarDetails.map((dt, i) => (
                         <tr key={i}>
                            <td style={{fontWeight: 600}}>🏥 {dt.department}</td>
                            <td>{dt.totalPatients} {t('analytics.units')}</td>
                            <td style={{textAlign:'right', fontWeight:700, color:'var(--accent-primary)'}}>{formatPrice(dt.revenue)} {t('common.sum')}</td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'payout_history' ? (
          <div className="payout-history-view">
            <div className="card glass-card">
              <div className="card-header">
                <h3>📜 {t('analytics.payoutJournal')}</h3>
                <span className="badge badge-info">{payoutHistory.length} {t('analytics.units')} {t('queue.journal')}</span>
              </div>
              <div className="card-body p-0">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('analytics.payoutDate')}</th>
                        <th>{t('analytics.payoutDoctor')}</th>
                        <th>{t('analytics.payoutAmount')}</th>
                        <th>{t('analytics.payoutPercent')}</th>
                        <th>{t('analytics.payoutNote')}</th>
                        <th>{t('analytics.payoutActions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutHistory.length === 0 ? (
                        <tr><td colSpan={6} style={{textAlign:'center', padding:40, color:'var(--text-muted)'}}>{t('common.noData')}</td></tr>
                      ) : payoutHistory.map(ph => (
                        <tr key={ph.id}>
                          <td>{new Date(ph.created_at).toLocaleString('uz-UZ')}</td>
                          <td>
                            <div style={{fontWeight:600}}>{ph.doctorName}</div>
                            <div style={{fontSize:11, color:'var(--text-muted)'}}>{ph.specialty}</div>
                          </td>
                          <td style={{fontWeight:'700', color:'var(--accent-success)'}}>{formatPrice(ph.amount)} {t('common.sum')}</td>
                          <td>{ph.percentage}%</td>
                          <td style={{fontSize:12}}>{ph.note || '—'}</td>
                          <td>
                            <button className="btn btn-icon-only danger" onClick={() => handleDeletePayout(ph.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card-footer" style={{padding:20, textAlign:'right', background:'rgba(255,255,255,0.02)'}}>
                <div style={{fontSize:18}}>
                   {t('analytics.totalPaid')}: <span style={{fontWeight:'bold', color:'var(--accent-success)'}}>
                    {formatPrice(payoutHistory.reduce((s, h) => s + h.amount, 0))} {t('common.sum')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="payout-view">
            <div className="card glass-card">
              <div className="card-header">
                <h3>👨‍⚕️ {t('analytics.calculations')}</h3>
                <span className="badge badge-info">{doctorPayouts.length} {t('common.all')}</span>
              </div>
              <div className="card-body p-0">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('analytics.doctorName')}</th>
                        <th>{t('analytics.direction')}</th>
                        <th style={{textAlign:'right'}}>{t('analytics.totalDoctorRevenue')}</th>
                        <th style={{textAlign:'center'}}>{t('analytics.doctorSharePercent')}</th>
                        <th style={{textAlign:'right'}}>{t('analytics.doctorShareAmount')}</th>
                        <th style={{textAlign:'center'}}>{t('analytics.actionsCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPayouts.length === 0 ? (
                        <tr><td colSpan={6} style={{textAlign:'center', padding:40, color:'var(--text-muted)'}}>{t('common.noData')}</td></tr>
                      ) : doctorPayouts.map(dp => {
                        const doctorShare = Math.round(dp.totalRevenue * (dp.commission_rate || 0) / 100);
                        return (
                          <tr key={dp.id}>
                            <td>
                              <div style={{fontWeight:600}}>{dp.fullName}</div>
                            </td>
                            <td>{dp.specialty}</td>
                            <td style={{textAlign:'right'}}>{formatPrice(dp.totalRevenue)} {t('common.sum')}</td>
                            <td style={{textAlign:'center'}}>
                              <span className="badge badge-primary" style={{fontWeight:700}}>{dp.commission_rate || 0}%</span>
                            </td>
                            <td style={{textAlign:'right', fontWeight:'bold', color:'var(--accent-success)', fontSize:14}}>
                              {formatPrice(doctorShare)} {t('common.sum')}
                            </td>
                            <td style={{textAlign:'center'}}>
                                <div style={{display:'flex', gap:8, justifyContent:'center'}}>
                                     <button className="btn btn-sm btn-info" onClick={() => {
                                        setShowDetailsModal(dp);
                                        loadDoctorAppointments(dp.id);
                                     }}>📋 {t('analytics.patients')}</button>
                                     <button className="btn btn-sm btn-primary" onClick={() => { 
                                        setShowDoctorModal({...dp, revenue: dp.totalRevenue, cnt: dp.appointmentCount}); 
                                        setPayoutForm({...payoutForm, percentage: dp.commission_rate || 0});
                                     }}>💸 {t('analytics.payment')}</button>
                                </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card-footer" style={{padding:'25px 20px', textAlign:'right', background:'rgba(255,255,255,0.02)', borderTop:'1px solid var(--border-color)'}}>
                <div style={{fontSize:20}}>
                   {t('analytics.totalPaid')}: <span style={{fontWeight:'bold', color:'var(--accent-success)', marginLeft:15}}>
                    {formatPrice(doctorPayouts.reduce((s, dp) => s + (dp.totalRevenue * (dp.commission_rate || 0) / 100), 0))} {t('common.sum')}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{marginTop: 30, padding: 20, borderRadius: 12, background:'rgba(10, 132, 255, 0.05)', border:'1px solid rgba(10, 132, 255, 0.2)', fontSize: 13, lineHeight: '1.6', color:'var(--text-secondary)'}}>
              💡 <b>{t('common.note')}:</b> {t('analytics.calcNote')} (<b>{period.toUpperCase()}</b>)
            </div>
          </div>
        )}

        {/* ══════════════════ PHARMACY ANALYTICS TAB ══════════════════ */}
        {activeTab === 'pharmacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 10 }}>
            {/* ── Period Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-card)', borderRadius: 16, padding: '12px 18px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginRight: 4 }}>⏱ Vaqt filtri:</div>
              {[
                { val:'hour',  label:'Soatlik' },
                { val:'day',   label:'Bugun' },
                { val:'week',  label:'Haftalik' },
                { val:'month', label:'Oylik' },
                { val:'year',  label:'Yillik' },
                { val:'custom',label:'Maxsus' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setPharmPeriod(opt.val)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `2px solid ${pharmPeriod === opt.val ? '#7c3aed' : 'var(--border-color)'}`,
                    background: pharmPeriod === opt.val ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'var(--bg-input)',
                    color: pharmPeriod === opt.val ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.18s',
                  }}>
                  {opt.label}
                </button>
              ))}
              {pharmPeriod === 'custom' && (
                <>
                  <input type="date" className="form-input" style={{ fontSize: 12, padding: '5px 10px' }} value={pharmFrom} onChange={e => setPharmFrom(e.target.value)} />
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                  <input type="date" className="form-input" style={{ fontSize: 12, padding: '5px 10px' }} value={pharmTo} onChange={e => setPharmTo(e.target.value)} />
                </>
              )}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={loadPharmStats}>
                {pharmLoading ? '⏳' : '🔄'} Yangilash
              </button>
            </div>

            {/* ── KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {[
                { icon: '💊', label: "Jami dorilar",         val: pharmData.totalMeds,      grad: 'linear-gradient(135deg,#7c3aed,#4f46e5)', sub: 'ta nom' },
                { icon: '⚠️', label: "Kam qolgan (≤10)",     val: pharmData.lowStock,       grad: 'linear-gradient(135deg,#f59e0b,#d97706)', sub: 'ta dori' },
                { icon: '🗓️', label: "Muddati yaqin",        val: pharmData.expirySoon,     grad: 'linear-gradient(135deg,#ef4444,#dc2626)', sub: '30 kun içida' },
                { icon: '📦', label: "Ombor qiymati",        val: pharmData.totalStockVal,  grad: 'linear-gradient(135deg,#0ea5e9,#0284c7)', sub: "so'm", isMoney: true },
                { icon: '💰', label: "Davr tushumi",         val: pharmData.totalRevenue,   grad: 'linear-gradient(135deg,#10b981,#059669)', sub: "so'm", isMoney: true },
                { icon: '📈', label: "Davr sof foyda",       val: pharmData.totalProfit,    grad: 'linear-gradient(135deg,#06b6d4,#0891b2)', sub: "so'm", isMoney: true },
              ].map((k, i) => (
                <div key={i} style={{ background: k.grad, borderRadius: 18, padding: '18px 20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{k.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: k.isMoney ? 16 : 30, marginBottom: 2, lineHeight: 1.1 }}>
                    {k.isMoney ? Number(k.val||0).toLocaleString('uz-UZ') : (k.val||0)}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>{k.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{k.sub}</div>
                  <div style={{ position: 'absolute', top: -18, right: -18, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                </div>
              ))}
            </div>

            {/* ── Sales Activity Chart */}
            {pharmData.daily.length > 0 && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border-color)', marginTop:24 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>📊 Kunlik savdo harakati</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, borderBottom: '2px solid var(--border-color)', overflowX: 'auto', paddingBottom:5 }}>
                   {pharmData.daily.map((d: any, i: number) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', minWidth: 32 }} title={`${d.d}: ${Number(d.revenue).toLocaleString()} so'm`}>
                        <div style={{ height: `${Math.max(Math.round((d.revenue/Math.max(...pharmData.daily.map((x: any) => x.revenue), 1)) * 100), 4)}%`, width: 24, borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,#7c3aed,#4f46e5)' }} />
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 5 }}>{d.d?.slice(5)}</div>
                      </div>
                   ))}
                </div>
              </div>
            )}

            {/* ── Hourly Heatmap */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border-color)', marginTop:24 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>⏰ Soatlik faollik</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {pharmData.hourly.map((h: any, i: number) => (
                  <div key={i} title={`${h.h}:00 — ${Number(h.revenue).toLocaleString()} so'm`} style={{
                      width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: h.revenue > 0 ? `rgba(124,58,237,${0.2 + (h.revenue / Math.max(...pharmData.hourly.map((x: any) => x.revenue), 1)) * 0.8})` : 'var(--bg-input)',
                      color: h.revenue > 0 ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: 11
                  }}>{h.h}</div>
                ))}
              </div>
            </div>

            {/* ── Top/Slow Sellers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop:24 }}>
              <div className="card glass-card p-4">
                <h4 style={{color:'#ef4444', marginBottom:15}}>🔥 TOP 10 Sotilgan</h4>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                   {pharmData.topSellers.map((s,i) => (
                     <div key={i}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4}}>
                           <span style={{fontWeight:600}}>{s.name}</span>
                           <span>{s.soldQty} ta</span>
                        </div>
                        <div style={{height:6, borderRadius:3, background:'rgba(239,68,68,0.1)', overflow:'hidden'}}>
                           <div style={{height:'100%', width:`${(s.soldQty/(pharmData.topSellers[0]?.soldQty||1))*100}%`, background:'#ef4444'}} />
                        </div>
                     </div>
                   ))}
                </div>
              </div>
              <div className="card glass-card p-4">
                <h4 style={{color:'#6366f1', marginBottom:15}}>🧊 Kam sotilgan</h4>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                   {pharmData.slowSellers.map((s: any, i: number) => (
                     <div key={i}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4}}>
                           <span style={{fontWeight:600}}>{s.name}</span>
                           <span>{s.soldQty} ta</span>
                        </div>
                        <div style={{height:6, borderRadius:3, background:'rgba(99,102,241,0.1)', overflow:'hidden'}}>
                           <div style={{height:'100%', width:`${(s.soldQty/(pharmData.slowSellers[0]?.soldQty || 1)) * 100}%`, background:'#6366f1'}} />
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* ── Journal */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '18px 20px', border: '1px solid var(--border-color)', marginTop:24 }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>📒 Savdo jurnali (so'nggi 100)</div>
              <div className="table-wrapper" style={{maxHeight: 400, overflow:'auto'}}>
                <table className="data-table" style={{fontSize:12}}>
                  <thead>
                    <tr><th>Vaqt</th><th>Dori</th><th style={{textAlign:'center'}}>Soni</th><th style={{textAlign:'right'}}>Summa</th><th>To'lov</th></tr>
                  </thead>
                  <tbody>
                    {pharmData.journal.map((j: any, i: number) => (
                      <tr key={i}>
                        <td>{new Date(j.created_at).toLocaleString('uz-UZ').slice(11, 16)}</td>
                        <td style={{fontWeight:600}}>{j.name}</td>
                        <td style={{textAlign:'center'}}>{j.qty_out}</td>
                        <td style={{textAlign:'right'}}>{formatPrice((j.qty_out || 0) * (j.price || 0))}</td>
                        <td>{j.payment_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!showDoctorModal} onClose={() => setShowDoctorModal(null)} title={t('analytics.calcAndPay')}>
        {showDoctorModal && (() => {
          const revenue = Number(showDoctorModal.revenue);
          const share = Math.round(revenue * (payoutForm.percentage / 100));

          return (
            <div className="form-grid">
              <div className="form-group full-width">
                <div style={{background:'var(--bg-card)', border:'1px solid var(--border-color)', padding:18, borderRadius:8, marginBottom: 15}}>
                  <div style={{fontSize:16, fontWeight:600, marginBottom:8}}>{showDoctorModal.fullName}</div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text-secondary)'}}>
                    <span>{t('analytics.periodRevenue')}:</span>
                    <span style={{fontWeight:600, color:'var(--text-main)'}}>{formatPrice(revenue)} {t('common.sum')}</span>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text-secondary)', marginTop:5}}>
                    <span>{t('analytics.visitCount')}:</span>
                    <span>{showDoctorModal.cnt} {t('analytics.units')}</span>
                  </div>
                </div>
              </div>
              <div className="form-group full-width">
                <label>{t('analytics.doctorSharePercent')}</label>
                <input type="number" className="form-input" min={0} max={100} value={payoutForm.percentage} 
                  onChange={e=>setPayoutForm({...payoutForm, percentage: Number(e.target.value)})} />
              </div>
              <div className="form-group full-width" style={{textAlign:'center', background:'rgba(48, 209, 88, 0.1)', padding:25, borderRadius:10, margin:'10px 0', border:'1px solid rgba(48, 209, 88, 0.2)'}}>
                <span style={{fontSize: 14, color:'var(--text-secondary)', fontWeight:500}}>{t('analytics.finalAmount')}:</span>
                <div style={{fontSize: 32, fontWeight:'bold', color:'var(--accent-success)', marginTop:8}}>{formatPrice(share)} {t('common.sum')}</div>
              </div>
              <div className="form-group full-width">
                <label>{t('analytics.payoutNote')}</label>
                <textarea className="form-input" rows={2} placeholder={t('analytics.notePlaceholder')} 
                  value={payoutForm.note} onChange={e=>setPayoutForm({...payoutForm, note: e.target.value})} />
              </div>
              <div className="form-actions" style={{marginTop: 20, display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:15}}>
                <button className="btn btn-ghost" onClick={() => setShowDoctorModal(null)} style={{height:45}}>{t('common.cancel')}</button>
                <button className="btn btn-primary" onClick={handleSavePayout} style={{height:45, fontSize:15}}>
                  🖨️ {t('analytics.payment')} & {t('reception.printCheck')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Detailed History Modal */}
      <Modal isOpen={!!showDetailsModal} onClose={() => setShowDetailsModal(null)} title={t('analytics.doctorJournal')} width={800}>
        {showDetailsModal && (
          <div className="details-view-container">
            <div className="details-header" style={{marginBottom:20}}>
                <h4 style={{margin:0}}>{showDetailsModal.fullName}</h4>
                <p style={{margin:0, fontSize:13, color:'var(--text-secondary)'}}>{period.toUpperCase()} — {t('analytics.serviceList')}</p>
            </div>
            <div className="table-wrapper" style={{maxHeight: 400, overflow:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('analytics.date')}</th>
                    <th>{t('analytics.patient')}</th>
                    <th>{t('analytics.service')}</th>
                    <th>{t('analytics.paymentType')}</th>
                    <th style={{textAlign:'right'}}>{t('analytics.sum')}</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorAppointments.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign:'center', padding:40}}>{t('common.noData')}</td></tr>
                  ) : doctorAppointments.map(da => (
                    <tr key={da.id}>
                      <td style={{fontSize:12}}>{new Date(da.createdAt).toLocaleString('uz-UZ').slice(0, 16)}</td>
                      <td>{da.patientName || t('analytics.unknown')}</td>
                      <td>{da.serviceName}</td>
                      <td><span className={`badge ${da.paymentType === 'cash' ? 'badge-success' : 'badge-info'}`}>{da.paymentType}</span></td>
                      <td style={{textAlign:'right', fontWeight:600}}>{formatPrice(da.transactionAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="details-footer" style={{marginTop:20, paddingTop:15, borderTop:'1px solid var(--border-color)', textAlign:'right'}}>
                 <div style={{fontSize:16, fontWeight:600}}>
                     {t('reception.total')}: {formatPrice(doctorAppointments.reduce((s, a) => s + (a.transactionAmount || 0), 0))} {t('common.sum')}
                 </div>
                 <button className="btn btn-ghost" style={{marginTop:15}} onClick={()=>setShowDetailsModal(null)}>{t('common.close')}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="📅 Davriy Xarajatlar (Jurnal)" width={1000}>
         <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:20}}>
            <div className="card glass-card p-4">
               <h3>➕ Yangi xarajat</h3>
               <div className="form-group mt-3">
                  <label>Kategoriya</label>
                  <select className="form-input" value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm, category:e.target.value})}>
                     <option value="Rent">🏢 Rent (Ijara)</option>
                     <option value="Salary">👥 Salary (Oyliklar)</option>
                     <option value="Electricity">⚡ Electricity (Tok)</option>
                     <option value="Water">💧 Water (Suv)</option>
                     <option value="Internet">🌐 Internet</option>
                     <option value="Maintenance">🛠️ Maintenance (Tuzatish)</option>
                     <option value="Others">📦 Boshqa</option>
                  </select>
               </div>
               <div className="form-group mt-3">
                  <label>Summa</label>
                  <input type="number" className="form-input" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm, amount:e.target.value})} />
               </div>
               <div className="form-group mt-3">
                  <label>Sana</label>
                  <input type="date" className="form-input" value={expenseForm.date} onChange={e=>setExpenseForm({...expenseForm, date:e.target.value})} />
                </div>
                <div className="form-group mt-3">
                   <label>Izoh</label>
                   <textarea className="form-input" rows={2} value={expenseForm.description} onChange={e=>setExpenseForm({...expenseForm, description:e.target.value})} />
                </div>
                <button className="btn btn-danger w-full mt-4" onClick={saveExpense}>💾 Saqlash</button>
             </div>
             <div className="card glass-card p-0" style={{maxHeight:500, overflowY:'auto'}}>
                <table className="data-table">
                   <thead>
                      <tr><th>Sana</th><th>Tur</th><th>Summa</th><th>Izoh</th><th></th></tr>
                   </thead>
                   <tbody>
                      {expenses.length === 0 ? (
                        <tr><td colSpan={5} className="empty-state">Xarajatlar yo'q</td></tr>
                      ) : expenses.map(e => (
                        <tr key={e.id}>
                           <td>{new Date(e.expenseDate).toLocaleDateString()}</td>
                           <td><span className="badge badge-info">{e.category}</span></td>
                           <td style={{fontWeight:700, color:'var(--accent-danger)'}}>{formatPrice(e.amount)}</td>
                           <td style={{fontSize:11}}>{e.description}</td>
                           <td><button className="btn-icon-only danger" onClick={()=>deleteExpense(e.id)}>✕</button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       </Modal>
    </div>
  );
}
