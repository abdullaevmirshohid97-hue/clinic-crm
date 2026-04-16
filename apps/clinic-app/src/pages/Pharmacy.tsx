import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { db, DbRow } from '../utils/db';
import Modal from '../components/ui/Modal';
import * as XLSX from 'xlsx';
import { authStore } from '../app/store';

type MedRow = DbRow & { id: number; name: string; qty: number; price: number; category?: string; unit?: string; cost_price?: number; expiry?: string; serial?: string; supplier?: string };
type CartItem = MedRow & { cartQty: number };
interface BarcodeState {
  input: string; found: MedRow | null; addQty: string; price: string;
  expiry: string; serial: string; supplier: string; paymentType: string;
}
interface BcLogEntry { name: string; qty: number; total: number }
interface InpatientRow {
  rpId: number; patientId: number; roomId?: number;
  patientName: string; phone?: string; roomName?: string; bedIndex?: number;
}
interface ExcelImportRow {
  name: string; category: string; supplier: string; expiry: string;
  qty: number; price: number; unit: string; serial: string; paymentType: string;
}
interface HotMapEntry {
  name: string; category: string; soldQty: number; revenue: number;
  txCount: number; price: number; cost: number; profit?: number;
}

const UNITS = ['dona', 'quti', 'blister', 'ml', 'kg'];
const EMPTY_FORM = {
  id: null as number | null,
  name: '',
  category: '',
  unit: 'dona',
  qty: '',
  price: '',
  cost_price: '',
  expiry: '',
  serial: '',
  supplier: '',
};
const EMPTY_BC: BarcodeState = {
  input: '',
  found: null,
  addQty: '',
  price: '',
  expiry: '',
  serial: '',
  supplier: '',
  paymentType: 'naqd',
};

function fmt(n: number | string) {
  return Number(n || 0).toLocaleString('uz-UZ');
}

export default function Pharmacy() {
  const { t } = useTranslation();
  const toast = useToast();

  const [tab, setTab] = useState('stock'); // 'stock' | 'journal'
  const [medicines, setMedicines] = useState<MedRow[]>([]);
  const [journal, setJournal] = useState<DbRow[]>([]);
  const [patients, setPatients] = useState<DbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jSearch, setJSearch] = useState('');
  const [saleSearch, setSaleSearch] = useState(''); // quick search inside sale modal

  // Favorites (max 10) — stored in localStorage
  const [favorites, setFavorites] = useState<(number | string)[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ph_favs') || '[]');
    } catch {
      return [];
    }
  });
  function toggleFav(id: number | string) {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 10
          ? (toast.error('Maksimal 10 ta tezkor tugma!'), prev)
          : [...prev, id];
      try {
        localStorage.setItem('ph_favs', JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }
  const favMeds = favorites.map((id) => medicines.find((m) => m.id === id)).filter((m): m is MedRow => m !== undefined);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showSale, setShowSale] = useState(false);
  const [saleConfirmStep, setSaleConfirmStep] = useState(0); // 0=normal, 1=confirm(F10 pressed once)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [salePatientId, setSalePatientId] = useState('');
  const [salePayment, setSalePayment] = useState('cash');
  const [inpatientPats, setInpatientPats] = useState<InpatientRow[]>([]); // room_patients (active)

  // Prixod
  const [showChooser, setShowChooser] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [bc, setBc] = useState<BarcodeState>(EMPTY_BC);
  const [bcLog, setBcLog] = useState<BcLogEntry[]>([]);
  const [showExcel, setShowExcel] = useState(false);
  const [excelRows, setExcelRows] = useState<ExcelImportRow[]>([]);

  // Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [globalMargin, setGlobalMargin] = useState(''); // % foyda barchaga
  const [medMargins, setMedMargins] = useState<Record<number, number>>({}); // {id: cost_price}
  const [marginEdit, setMarginEdit] = useState<number | null>(null); // id of editing row

  const [stats, setStats] = useState({ total: 0, low: 0, exp: 0, val: 0 });
  const searchRef = useRef<HTMLInputElement>(null);
  const bcRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadAll();
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const medsRes = await db.getAllRows<MedRow>('pharmacy');
      const meds = medsRes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setMedicines(meds);

      const ptsRes = await db.getAllRows('patients');
      const pts = ptsRes.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      setPatients(pts);

      const jnlRes = await db.getAllRows('pharmacy_journal');
      const jnl = jnlRes
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 500);
      setJournal(jnl);

      // Init margins
      const m2: Record<number, number> = {};
      meds.forEach((m) => {
        if (m.cost_price) m2[m.id] = m.cost_price;
      });
      setMedMargins(m2);

      // Load active inpatient patients (Manual Join)
      try {
        const allRp = await db.getAllRows('room_patients');
        const activeRp = allRp.filter(
          (rp) => rp.status === 'active' || rp.status === 'reserved'
        );
        const allRooms = await db.getAllRows('rooms');

        const mappedInpat = activeRp.map((rp) => {
          const pt = pts.find((p) => p.id === rp.patientId);
          const rm = allRooms.find((r) => r.id === rp.roomId);
          return {
            rpId: rp.id,
            patientId: rp.patientId,
            roomId: rp.roomId,
            patientName: pt ? pt.fullName : "Noma'lum",
            phone: pt ? pt.phone : '',
            roomName: rm ? rm.name : "Noma'lum",
            bedIndex: rp.bedIndex,
          };
        });
        setInpatientPats(
          mappedInpat.sort((a, b) => a.patientName.localeCompare(b.patientName))
        );
      } catch {
        setInpatientPats([]);
      }

      let total = 0,
        low = 0,
        exp = 0,
        val = 0;
      meds.forEach((m) => {
        total++;
        if (m.qty <= 10) low++;
        if (m.expiry && m.expiry < today) exp++;
        val += (m.qty || 0) * (m.price || 0);
      });
      setStats({ total, low, exp, val });
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }

  // ─── CRUD
  async function saveForm() {
    if (!form.name || form.qty === '' || form.price === '') {
      toast.error('Nom, miqdor, narx kiriting!');
      return;
    }
    const clinic_id = authStore.getState().clinicId;
    const p = {
      clinic_id,
      name: form.name.trim(),
      category: form.category.trim(),
      unit: form.unit,
      qty: +form.qty,
      price: +form.price,
      cost_price: form.cost_price ? +form.cost_price : null,
      expiry: form.expiry || null,
      serial: form.serial || null,
      supplier: form.supplier || null,
    };

    try {
      if (form.id) {
        const res = await db.update('pharmacy', form.id, p);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await db.insert('pharmacy', p);
        if (!res.success) throw new Error(res.error);
      }
      toast.success('Saqlandi!');
      setShowForm(false);
      loadAll();
    } catch (e: unknown) {
      console.error('Save Form Error:', e);
      toast.error((e as Error).message);
    }
  }

  async function deleteMed(id: number | string) {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    const res = await db.delete('pharmacy', id);
    if (!res.success) throw new Error(res.error as string);
    toast.success("O'chirildi!");
    loadAll();
  }

  // ─── CART
  function addToCart(m: MedRow) {
    if (m.qty < 1) {
      toast.error('Stokda mavjud emas!');
      return;
    }
    setCart((prev) => {
      const ex = prev.find((c) => c.id === m.id);
      if (ex) {
        if (ex.cartQty >= m.qty) {
          toast.error('Stok yetarli emas!');
          return prev;
        }
        return prev.map((c) => (c.id === m.id ? { ...c, cartQty: c.cartQty + 1 } : c));
      }
      return [...prev, { ...m, cartQty: 1 }];
    });
  }
  function updCart(id: number | string, d: number) {
    setCart((prev) =>
      prev
        .map((c): CartItem | null => {
          if (c.id !== id) return c;
          const nq = c.cartQty + d;
          if (nq < 1) return null;
          const med = medicines.find((m) => m.id === id);
          if (nq > (med?.qty || 0)) {
            toast.error('Stok yetarli emas!');
            return c;
          }
          return { ...c, cartQty: nq };
        })
        .filter((item): item is CartItem => item !== null)
    );
  }
  const cartTotal = cart.reduce((s, c) => s + c.cartQty * c.price, 0);

  // ─── Print receipt
  function printReceipt() {
    const inpat = inpatientPats.find(
      (rp) =>
        String(rp.rpId) === String(salePatientId) || String(rp.patientId) === String(salePatientId)
    );
    const patName =
      inpat?.patientName ||
      patients.find((p) => String(p.id) === String(salePatientId))?.fullName ||
      'Oddiy savdo';
    const payLabels = {
      cash: 'Naqd',
      card: 'Plastik',
      transfer: "O'tkazma / Click",
      debt: 'Qarz',
      klik: 'Klik',
    };
    const w = window.open('', '_blank', 'width=360,height=600');
    if (!w) return;
    w.document.write(`<html><head><title>Chek</title><style>
      body{font-family:monospace;font-size:13px;padding:16px;width:320px}
      h2{text-align:center;margin:0 0 8px}hr{border:1px dashed #999}
      .row{display:flex;justify-content:space-between;margin:3px 0}
      .total{font-size:16px;font-weight:bold}
    </style></head><body>
      <h2>💊 DORIXONA CHEKI</h2>
      <div>${new Date().toLocaleString('uz-UZ')}</div><hr/>
      ${cart.map((c) => `<div class="row"><span>${c.name} x${c.cartQty}</span><span>${Number(c.cartQty * c.price).toLocaleString()} so'm</span></div>`).join('')}
      <hr/>
      <div class="row total"><span>JAMI:</span><span>${Number(cartTotal).toLocaleString()} so'm</span></div>
      <div class="row"><span>To'lov:</span><span>${(payLabels as Record<string, string>)[salePayment] || salePayment}</span></div>
      <div class="row"><span>Bemor:</span><span>${patName}</span></div>
      <hr/><div style="text-align:center;font-size:11px">Sog'lom keling! 😊</div>
    </body></html>`);
    w.document.close();
    w.print();
  }

  // ─── F10 / F12 keyboard handler (only when sale modal is open)
  useEffect(() => {
    if (!showSale) {
      setSaleConfirmStep(0);
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F10') {
        e.preventDefault();
        if (saleConfirmStep === 0) {
          setSaleConfirmStep(1); // ask confirm
        } else {
          // confirmed — process + print
          confirmSale(true);
          setSaleConfirmStep(0);
        }
      }
      if (e.key === 'F12') {
        e.preventDefault();
        // close without receipt
        setShowSale(false);
        setSaleConfirmStep(0);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSale, saleConfirmStep, cart, cartTotal]);

  async function confirmSale(withReceipt = false) {
    if (!cart.length) {
      toast.error("Savat bo'sh!");
      return;
    }
    try {
      // Find inpatient record if selected
      const inpat = inpatientPats.find(
        (rp) =>
          String(rp.rpId) === String(salePatientId) ||
          String(rp.patientId) === String(salePatientId)
      );
      const patient = patients.find(
        (p) => String(p.id) === String(inpat?.patientId || salePatientId)
      );
      const patName = inpat?.patientName || patient?.fullName || 'Oddiy savdo';
      const isDebt = salePayment === 'debt';
      const payType = salePayment; // cash | card | transfer | klik | debt

      const clinic_id = authStore.getState().clinicId;

      for (const item of cart) {
        const med = medicines.find((m) => m.id === item.id);
        const newQty = (med?.qty || 0) - item.cartQty;

        const updRes = await db.update('pharmacy', item.id, { qty: newQty });
        if (!updRes.success) throw new Error(updRes.error);

        const jrRes = await db.insert('pharmacy_journal', {
          clinic_id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          qty_in: 0,
          qty_out: item.cartQty,
          remaining: newQty,
          price: item.price,
          serial: item.serial || null,
          expiry: item.expiry || null,
          supplier: null,
          payment_type: payType,
          entry_type: 'chiqim',
          note: patName,
        });
        if (!jrRes.success) throw new Error(jrRes.error);
      }

      // 2. Write to local db transactions (asosiy jurnal)
      const txDesc = `Dorixona: ${cart.map((c) => `${c.name}×${c.cartQty}`).join(', ')}`;
      try {
        await db.insert('transactions', {
          patientId: inpat?.patientId || patient?.id || null,
          patient_name: patName,
          type: isDebt ? 'debt' : 'pharmacy_sale',
          paymentType: payType,
          amount: isDebt ? 0 : cartTotal,
          debt: isDebt ? cartTotal : 0,
          description: txDesc,
        });
      } catch (dbErr) {
        // Fallback: Supabase transactions table
        try {
          await supabase.from('transactions').insert([
            {
              type: isDebt ? 'debt' : 'payment',
              payment_type: payType,
              amount: isDebt ? 0 : cartTotal,
              debt: isDebt ? cartTotal : 0,
              patient_name: patName,
              patient_id: inpat?.patientId || patient?.id || null,
              description: txDesc,
            },
          ]);
        } catch {
          /* ignore */
        }
      }

      // 3. If inpatient — add to their treatment/service log
      if (inpat) {
        try {
          await db.insert('inpatient_treatments', {
            roomPatientId: inpat.rpId,
            title: `Dorixona: ${cart.map((c) => `${c.name} ×${c.cartQty}`).join(', ')} — ${Number(cartTotal).toLocaleString()} so'm (${payType})`,
            scheduledTime: new Date().toLocaleTimeString('uz-UZ').slice(0, 5),
            notes: `To'lov: ${payType}${isDebt ? ' (QARZ)' : ''}`,
            isDone: 1,
            doneAt: new Date().toISOString(),
          });
        } catch {
          /* silently ignore if table schema differs */
        }
      }

      if (withReceipt) printReceipt();
      setSaleConfirmStep(0);
      setCart([]);
      setSalePatientId('');
      setSalePayment('cash');
      setShowSale(false);
      loadAll();
    } catch (e: unknown) {
      console.error('Confirm Sale Error:', e);
      toast.error('Sotuvda xatolik: ' + (e as Error).message);
    }
  }

  // ─── BARCODE PRIXOD
  function openBarcode() {
    setShowChooser(false);
    setBc(EMPTY_BC);
    setBcLog([]);
    setShowBarcode(true);
    setTimeout(() => bcRef.current?.focus(), 100);
  }

  function bcSearch() {
    const q = bc.input.trim().toLowerCase();
    if (!q) return;
    const found = medicines.find(
      (m) => m.name.toLowerCase().includes(q) || String(m.id) === q
    );
    setBc((prev) => ({
      ...prev,
      found: found || {
        id: 0,
        name: bc.input.trim(),
        qty: 0,
        unit: 'dona',
        price: 0,
        category: '',
        serial: '',
        supplier: '',
      },
      price: String(found?.price || ''),
      expiry: String(found?.expiry || ''),
    }));
  }

  async function saveBcItem() {
    if (!bc.found || !bc.addQty || +bc.addQty <= 0) {
      toast.error('Miqdor kiriting!');
      return;
    }
    const bcFound = bc.found;
    const addQty = +bc.addQty;
    const clinic_id = authStore.getState().clinicId;

    try {
      if (bcFound.id) {
        const newQty = bcFound.qty + addQty;
        const data = {
          qty: newQty,
          price: bc.price ? +bc.price : bcFound.price,
          expiry: bc.expiry || bcFound.expiry,
          serial: bc.serial || bcFound.serial || null,
          supplier: bc.supplier || bcFound.supplier || null,
        };

        const journalData = {
          clinic_id,
          name: bcFound.name,
          category: bcFound.category,
          unit: bcFound.unit,
          qty_in: addQty,
          qty_out: 0,
          remaining: newQty,
          price: bc.price ? +bc.price : bcFound.price,
          serial: bc.serial || null,
          expiry: bc.expiry || bcFound.expiry || null,
          supplier: bc.supplier || null,
          payment_type: bc.paymentType,
          entry_type: 'kirim',
          note: '',
        };

        const updRes = await db.update('pharmacy', bcFound.id, data);
        if (!updRes.success) throw new Error(updRes.error as string);
        const jrRes = await db.insert('pharmacy_journal', journalData);
        if (!jrRes.success) throw new Error(jrRes.error as string);

        setBcLog((p) => [{ name: bcFound.name, qty: addQty, total: newQty }, ...p]);
        toast.success(`✅ ${bcFound.name}: +${addQty}`);
      } else {
        if (!bc.price || +bc.price <= 0) {
          toast.error('Yangi dori uchun narx kiriting!');
          return;
        }

        const data = {
          clinic_id,
          name: bcFound.name,
          category: '',
          unit: 'dona',
          qty: addQty,
          price: +bc.price,
          expiry: bc.expiry || null,
          serial: bc.serial || null,
          supplier: bc.supplier || null,
        };

        const journalData = {
          clinic_id,
          name: bcFound.name,
          category: '',
          unit: 'dona',
          qty_in: addQty,
          qty_out: 0,
          remaining: addQty,
          price: +bc.price,
          serial: bc.serial || null,
          expiry: bc.expiry || null,
          supplier: bc.supplier || null,
          payment_type: bc.paymentType,
          entry_type: 'kirim',
          note: 'Yangi dori',
        };

        const insRes = await db.insert('pharmacy', data);
        if (!insRes.success) throw new Error(insRes.error as string);
        const jrRes = await db.insert('pharmacy_journal', journalData);
        if (!jrRes.success) throw new Error(jrRes.error as string);

        setBcLog((p) => [{ name: bcFound.name, qty: addQty, total: addQty }, ...p]);
        toast.success(`✅ Yangi dori qo'shildi: ${bcFound.name}`);
      }
      setBc((prev) => ({
        ...EMPTY_BC,
        paymentType: prev.paymentType,
        supplier: prev.supplier,
      }));
      loadAll();
      setTimeout(() => bcRef.current?.focus(), 50);
    } catch (e: unknown) {
      console.error('Save Barcode Item Error:', e);
      toast.error((e as Error).message);
    }
  }

  // ─── EXCEL PRIXOD
  function openExcel() {
    setShowChooser(false);
    setExcelRows([]);
    setShowExcel(true);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const rows = [];
        let currentCategory = '';
        let headerIdx = -1;

        for (let i = 0; i < json.length; i++) {
          const rowStr = ((json[i] as unknown[]) || []).join('|').toLowerCase();
          if (rowStr.includes('препарат') || rowStr.includes('nomi')) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) {
          toast.error("Excel formati noto'g'ri (Препарат ustuni topilmadi)!");
          return;
        }

        const headers = (json[headerIdx] as unknown[]).map((h) =>
          String(h || '')
            .trim()
            .toLowerCase()
        );

        for (let i = headerIdx + 1; i < json.length; i++) {
          const row = json[i] as unknown[];
          if (!row || row.length === 0) continue;

          const filled = row.filter(
            (c) => c !== null && c !== undefined && String(c).trim() !== ''
          );
          if (filled.length === 1 && typeof row[1] !== 'number') {
            // Usually name is in 2nd col
            currentCategory = String(filled[0]).trim();
            continue;
          }

          const obj: Record<string, unknown> = {};
          headers.forEach((h, idx) => {
            if (h) obj[h] = row[idx];
          });

          const name = String(obj['препарат'] || obj['nomi'] || obj['name'] || '').trim();
          if (!name || name === 'Итого') continue;

          const rawExp = obj['срок годности'] || obj['muddat'] || obj['expiry'] || '';
          let exp: string;
          if (typeof rawExp === 'number') {
            const d = XLSX.SSF.parse_date_code(rawExp);
            exp = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          } else {
            exp = String(rawExp);
          }

          rows.push({
            name,
            category: String(currentCategory || obj['категория'] || obj['kategoriya'] || ''),
            supplier: String(obj['производитель'] || obj['firma'] || obj['supplier'] || '').trim(),
            expiry: exp,
            qty:
              parseFloat(String(obj['заказ'] || '')) || parseFloat(String(obj['miqdor'] || '')) || parseFloat(String(obj['qty'] || '')) || 0,
            price:
              parseFloat(String(obj['цена'] || '')) || parseFloat(String(obj['narx'] || '')) || parseFloat(String(obj['price'] || '')) || 0,
            unit: String(obj['birlik'] || 'dona'),
            serial: String(obj['серия'] || obj['seria'] || ''),
            paymentType: String(obj['tolov'] || 'naqd'),
          });
        }
        setExcelRows(rows);
      } catch (err: unknown) {
        toast.error("Faylni o'qishda xato: " + (err as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  function updExcelRow(i: number, f: string, v: string | number) {
    setExcelRows((p) =>
      p.map((r, idx) => (idx === i ? { ...r, [f]: f === 'qty' || f === 'price' ? +v : v } : r))
    );
  }

  async function importExcel() {
    if (!excelRows.length) return;
    let ok = 0,
      fail = 0;
    const clinic_id = authStore.getState().clinicId;

    for (const row of excelRows) {
      if (!row.name || row.qty <= 0) {
        fail++;
        continue;
      }
      try {
        const ex = medicines.find((m) => m.name.toLowerCase() === row.name.toLowerCase());
        const newQty = ex ? ex.qty + row.qty : row.qty;

        const mainData = {
          clinic_id,
          name: row.name,
          category: row.category || '',
          unit: row.unit || 'dona',
          qty: newQty,
          price: row.price || ex?.price || 0,
          expiry: row.expiry || ex?.expiry || null,
          serial: row.serial || ex?.serial || null,
          supplier: row.supplier || ex?.supplier || null,
        };

        const journalData = {
          clinic_id,
          name: row.name,
          category: row.category || '',
          unit: row.unit || 'dona',
          qty_in: row.qty,
          qty_out: 0,
          remaining: newQty,
          price: row.price,
          serial: row.serial || null,
          expiry: row.expiry || null,
          supplier: row.supplier || null,
          payment_type: row.paymentType || 'naqd',
          entry_type: 'kirim',
          note: 'Excel import',
        };

        if (ex) {
          const updRes = await db.update('pharmacy', ex.id, mainData);
          if (!updRes.success) throw new Error(updRes.error);
        } else {
          const insRes = await db.insert('pharmacy', mainData);
          if (!insRes.success) throw new Error(insRes.error as string);
        }
        const jrRes = await db.insert('pharmacy_journal', journalData);
        if (!jrRes.success) throw new Error(jrRes.error as string);

        ok++;
      } catch (err: unknown) {
        console.error('Import Row Error:', row, err);
        fail++;
      }
    }
    toast.success(`✅ ${ok} ta kiritildi${fail ? `, ${fail} xato` : ''}`);
    setShowExcel(false);
    setExcelRows([]);
    loadAll();
  }

  function downloadTemplate() {
    const csv =
      'nom,kategoriya,birlik,miqdor,narx,muddat,seria,firma,tolov\nParacetamol 500mg,Tabletka,dona,100,500,2026-12-31,SER001,Roche,naqd';
    const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'prixod_shablon.csv';
    a.click();
    URL.revokeObjectURL(u);
  }

  // ─── Analytics helpers
  function applyGlobalMargin() {
    if (!globalMargin || isNaN(+globalMargin)) {
      toast.error("To'g'ri foiz kiriting!");
      return;
    }
    const pct = +globalMargin / 100;
    const upd: Record<number, number> = {};
    medicines.forEach((m) => {
      upd[m.id] = +(m.price / (1 + pct)).toFixed(0);
    });
    setMedMargins(upd);
    toast.success(`✅ Barchaga ${globalMargin}% foyda belgilandi`);
  }
  async function saveMargin(m: MedRow) {
    const cp = medMargins[m.id];
    if (!cp || isNaN(+cp)) return;
    try {
      const res = await db.update('pharmacy', m.id, { cost_price: +cp });
      if (!res.success) throw new Error(res.error as string);
      toast.success(`${m.name} kirim narxi saqlandi`);
      setMarginEdit(null);
      loadAll();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    }
  }
  function catStats() {
    const cats: Record<string, { count: number; val: number; sold: number; income: number; profit: number }> = {};
    medicines.forEach((m) => {
      const cat = m.category || 'Boshqa';
      if (!cats[cat]) cats[cat] = { count: 0, val: 0, sold: 0, income: 0, profit: 0 };
      cats[cat].count++;
      cats[cat].val += (m.qty || 0) * (m.price || 0);
      const cp = medMargins[m.id] || m.cost_price || 0;
      const jEntries = journal.filter((j) => j.name === m.name);
      jEntries
        .filter((j) => j.entry_type === 'chiqim')
        .forEach((j) => {
          cats[cat].sold += j.qty_out || 0;
          cats[cat].income += (j.qty_out || 0) * (j.price || 0);
          cats[cat].profit += (j.qty_out || 0) * ((j.price || 0) - cp);
        });
    });
    return Object.entries(cats).map(([cat, d]) => ({ cat, ...d }));
  }
  const totalKirim = journal
    .filter((j) => j.entry_type === 'kirim')
    .reduce((s, j) => s + (j.qty_in || 0) * (j.price || 0), 0);
  const totalChiqim = journal
    .filter((j) => j.entry_type === 'chiqim')
    .reduce((s, j) => s + (j.qty_out || 0) * (j.price || 0), 0);
  const totalProfit = medicines.reduce((s, m) => {
    const cp = medMargins[m.id] || m.cost_price || 0;
    return (
      s +
      journal
        .filter((j) => j.name === m.name && j.entry_type === 'chiqim')
        .reduce((ss, j) => ss + (j.qty_out || 0) * ((j.price || 0) - cp), 0)
    );
  }, 0);

  // ─── helpers
  const stockColor = (qty: number, exp: string | null) => {
    if (exp && exp < today) return 'var(--accent-danger)';
    if (qty <= 0) return 'var(--accent-danger)';
    if (qty <= 10) return 'var(--accent-warning)';
    return 'var(--accent-success)';
  };
  const filtered = medicines.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredJ = journal.filter(
    (j) =>
      j.name?.toLowerCase().includes(jSearch.toLowerCase()) ||
      j.supplier?.toLowerCase().includes(jSearch.toLowerCase()) ||
      j.serial?.toLowerCase().includes(jSearch.toLowerCase())
  );

  // ─── Stat modal
  const [showStatModal, setShowStatModal] = useState<string | null>(null);
  const [showHotMap, setShowHotMap] = useState(false);
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const soonStr = soon.toISOString().split('T')[0];
  const statLists: Record<string, MedRow[]> = {
    all: medicines,
    low: medicines.filter((m) => m.qty <= 10),
    expiry: medicines.filter((m) => m.expiry && m.expiry <= soonStr),
  };
  const statTitles: Record<string, string> = {
    all: "💊 Barcha dorilar ro'yxati",
    low: '⚠️ Kam qolgan dorilar (≤10)',
    expiry: "🗓️ Muddati yaqin / O'tgan dorilar",
  };

  // Hotmap data: per-medicine sold qty & revenue from journal
  const hotMapData: HotMapEntry[] = React.useMemo(() => {
    const map: Record<string, HotMapEntry> = {};
    medicines.forEach((m) => {
      map[m.name] = {
        name: m.name,
        category: m.category || 'Boshqa',
        soldQty: 0,
        revenue: 0,
        txCount: 0,
        price: m.price,
        cost: medMargins[m.id] || m.cost_price || 0,
      };
    });
    journal
      .filter((j) => j.entry_type === 'chiqim')
      .forEach((j) => {
        if (!map[j.name])
          map[j.name] = {
            name: j.name,
            category: j.category || 'Boshqa',
            soldQty: 0,
            revenue: 0,
            txCount: 0,
            price: j.price || 0,
            cost: 0,
          };
        map[j.name].soldQty += j.qty_out || 0;
        map[j.name].revenue += (j.qty_out || 0) * (j.price || 0);
        map[j.name].txCount += 1;
      });
    return Object.values(map)
      .filter((d) => d.soldQty > 0)
      .sort((a, b) => b.soldQty - a.soldQty);
  }, [medicines, journal, medMargins]);
  const maxSold = hotMapData[0]?.soldQty || 1;
  const maxRevenue = hotMapData[0]?.revenue || 1;
  const hotTop10 = hotMapData.slice(0, 10);
  const hotBot10 = [...hotMapData].sort((a, b) => a.soldQty - b.soldQty).slice(0, 10);

  // ════════════════ RENDER ════════════════════════════════════════════════════
  return (
    <div className="page page-pharmacy">
      {/* Header */}
      <div className="page-header">
        <h1>💊 {t('pharmacy.title')}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {tab === 'stock' ? (
            <input
              ref={searchRef}
              type="text"
              className="form-input"
              style={{ width: 200 }}
              placeholder="🔍 Ombor qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="form-input"
              style={{ width: 200 }}
              placeholder="🔍 Jurnal qidirish..."
              value={jSearch}
              onChange={(e) => setJSearch(e.target.value)}
            />
          )}
          {/* Savdo — yangi buyurtma */}
          <button
            className="btn btn-success"
            style={{ fontWeight: 700 }}
            onClick={() => {
              setSaleSearch('');
              setShowSale(true);
            }}
          >
            🛒 Yangi Savdo
            {cart.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: 'rgba(255,255,255,0.35)',
                  borderRadius: 10,
                  padding: '0 8px',
                  fontSize: 12,
                }}
              >
                {cart.length}
              </span>
            )}
          </button>
          {/* Savdo tarixi — alohida */}
          <button
            className="btn btn-outline"
            style={{
              fontWeight: 700,
              borderColor: 'var(--accent-info)',
              color: 'var(--accent-info)',
            }}
            onClick={() => {
              setTab('journal');
              setJSearch('chiqim');
            }}
          >
            📋 Savdo tarixi
          </button>
          {/* Analitika */}
          <button
            className="btn btn-sm"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
            onClick={() => setShowHotMap(true)}
          >
            📈 Analitika
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
            }}
            onClick={() => setShowChooser(true)}
          >
            📥 Prixod
          </button>
          <button className="btn btn-ghost btn-sm" onClick={loadAll}>
            🔄
          </button>
          {tab === 'stock' && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setForm(EMPTY_FORM);
                setShowForm(true);
              }}
            >
              ➕ Yangi dori
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '0 0 16px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: 16,
        }}
      >
        {[
          { key: 'stock', label: '📦 Dorilar (Ombor)' },
          { key: 'journal', label: '📒 Kirim/Chiqim Jurnali' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              background: tab === t.key ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: tab === t.key ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-body">
        {/* Stats — clickable */}
        <div className="stats-grid" style={{ marginBottom: 12 }}>
          <div
            className="card glass-card stat-card"
            style={{ '--card-accent': 'var(--accent-primary)', cursor: 'pointer' } as React.CSSProperties}
            onClick={() => setShowStatModal('all')}
          >
            <div className="stat-icon">💊</div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Jami dorilar ↗</span>
            </div>
          </div>
          <div
            className="card glass-card stat-card"
            style={{ '--card-accent': 'var(--accent-warning)', cursor: 'pointer' } as React.CSSProperties}
            onClick={() => setShowStatModal('low')}
          >
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: 'var(--accent-warning)' }}>
                {stats.low}
              </span>
              <span className="stat-label">Kam qolgan (≤10) ↗</span>
            </div>
          </div>
          <div
            className="card glass-card stat-card"
            style={{ '--card-accent': 'var(--accent-danger)', cursor: 'pointer' } as React.CSSProperties}
            onClick={() => setShowStatModal('expiry')}
          >
            <div className="stat-icon">🗓️</div>
            <div className="stat-info">
              <span className="stat-value" style={{ color: 'var(--accent-danger)' }}>
                {stats.exp}
              </span>
              <span className="stat-label">Muddati yaqin / O'tgan ↗</span>
            </div>
          </div>
          <div
            className="card glass-card stat-card"
            style={{ '--card-accent': 'var(--accent-success)', cursor: 'pointer' } as React.CSSProperties}
            onClick={() => setShowAnalytics(true)}
          >
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-value" style={{ fontSize: 13 }}>
                {fmt(stats.val)} so'm
              </span>
              <span className="stat-label">Jami qiymat (tahlil ↗)</span>
            </div>
          </div>
        </div>

        {/* ─── TEZKOR PANEL: quick search + 10 favorite buttons ─── */}
        <div className="card glass-card" style={{ marginBottom: 14, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
              ⚡ Tezkor savdo:
            </span>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, maxWidth: 280 }}
              placeholder="Dori nomini yozing..."
              value={saleSearch}
              onChange={(e) => setSaleSearch(e.target.value)}
            />
            {saleSearch && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                {medicines
                  .filter(
                    (m) => m.qty > 0 && m.name.toLowerCase().includes(saleSearch.toLowerCase())
                  )
                  .slice(0, 8)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        addToCart(m);
                        setSaleSearch('');
                        setShowSale(true);
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        border: '1px solid var(--accent-success)',
                        background: 'rgba(34,197,94,0.1)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--accent-success)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      💊 {m.name} <span style={{ opacity: 0.7 }}>({m.qty})</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 10 tezkor tugmasi */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>
              Tezkor ({favMeds.length}/10):
            </span>
            {favMeds.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  addToCart(m);
                  setShowSale(true);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '2px solid var(--accent-primary)',
                  background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(37,99,235,0.05))',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.25)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(37,99,235,0.05))')
                }
              >
                💊 {m.name}
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 8,
                    background: m.qty <= 10 ? 'var(--accent-warning)' : 'var(--accent-success)',
                    color: '#fff',
                  }}
                >
                  {m.qty}
                </span>
              </button>
            ))}
            {favMeds.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Hali tezkor tugma yo'q — Ombor jadvalida ⭐ bosing
              </span>
            )}
          </div>
        </div>

        {/* ─── STOCK TAB */}
        {tab === 'stock' && (
          <div className="card glass-card" style={{ flex: 1 }}>
            <div className="card-header">
              <h3>📦 Ombor ro'yxati ({filtered.length} ta)</h3>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div
                    className="spinner"
                    style={{
                      width: 32,
                      height: 32,
                      margin: '0 auto 12px',
                      borderTopColor: 'var(--primary)',
                    }}
                  />
                  Yuklanmoqda...
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nomi</th>
                        <th>Turi</th>
                        <th style={{ textAlign: 'center' }}>Qoldiq</th>
                        <th>Birlik</th>
                        <th style={{ textAlign: 'right' }}>Narxi</th>
                        <th>Seriyasi</th>
                        <th>Muddati</th>
                        <th>Firma</th>
                        <th style={{ textAlign: 'center' }}>Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}
                          >
                            Dorilar yo'q
                          </td>
                        </tr>
                      )}
                      {filtered.map((m) => {
                        const isExp = !!(m.expiry && m.expiry < today);
                        return (
                          <tr key={m.id} style={{ opacity: isExp ? 0.65 : 1 }}>
                            <td>
                              <div style={{ fontWeight: 700 }}>{m.name}</div>
                              {isExp && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--accent-danger)',
                                    fontWeight: 700,
                                  }}
                                >
                                  ⚠️ MUDDAT O'TGAN
                                </span>
                              )}
                            </td>
                            <td>
                              {m.category ? (
                                <span className="badge badge-outline">{m.category}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: 16,
                                  color: stockColor(m.qty, m.expiry ?? null),
                                }}
                              >
                                {m.qty}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{m.unit || '—'}</td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: 'var(--accent-success)',
                              }}
                            >
                              {fmt(m.price)} so'm
                            </td>
                            <td
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                color: 'var(--text-muted)',
                              }}
                            >
                              {m.serial || '—'}
                            </td>
                            <td
                              style={{
                                color: isExp ? 'var(--accent-danger)' : 'var(--text-secondary)',
                                fontWeight: isExp ? 700 : 400,
                              }}
                            >
                              {m.expiry || '—'}
                            </td>
                            <td style={{ fontSize: 12 }}>{m.supplier || '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                                <button
                                  className="btn btn-sm btn-success"
                                  disabled={m.qty < 1 || isExp}
                                  onClick={() => addToCart(m)}
                                  title="Savdoga"
                                >
                                  🛒
                                </button>
                                <button
                                  title={
                                    favorites.includes(m.id)
                                      ? 'Tezkordan olib tashlash'
                                      : "Tezkor tugmalarga qo'shish (⭐)"
                                  }
                                  onClick={() => toggleFav(m.id)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${favorites.includes(m.id) ? '#f59e0b' : 'var(--border-color)'}`,
                                    background: favorites.includes(m.id)
                                      ? 'rgba(245,158,11,0.15)'
                                      : 'var(--bg-input)',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                  }}
                                >
                                  {favorites.includes(m.id) ? '⭐' : '☆'}
                                </button>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => {
                                    setForm({
                                      id: m.id,
                                      name: m.name || '',
                                      category: m.category || '',
                                      unit: m.unit || 'dona',
                                      qty: String(m.qty || ''),
                                      price: String(m.price || ''),
                                      cost_price: String(m.cost_price || ''),
                                      expiry: m.expiry || '',
                                      serial: m.serial || '',
                                      supplier: m.supplier || '',
                                    });
                                    setShowForm(true);
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => deleteMed(m.id)}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── JOURNAL TAB */}
        {tab === 'journal' && (
          <div className="card glass-card" style={{ flex: 1 }}>
            <div className="card-header">
              <h3>📒 Kirim / Chiqim Jurnali ({filteredJ.length} ta)</h3>
            </div>
            <div className="card-body p-0">
              <div className="table-wrapper">
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Sana / Vaqt</th>
                      <th>Nomi</th>
                      <th>Turi</th>
                      <th style={{ textAlign: 'center' }}>Miqdori (kirim)</th>
                      <th style={{ textAlign: 'center' }}>Soni (chiqim)</th>
                      <th style={{ textAlign: 'center' }}>Qoldiq</th>
                      <th style={{ textAlign: 'right' }}>Narxi</th>
                      <th>Seriyasi</th>
                      <th>Muddati</th>
                      <th>Qaysi firma</th>
                      <th>To'lov</th>
                      <th>Tur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJ.length === 0 && (
                      <tr>
                        <td
                          colSpan={12}
                          style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}
                        >
                          Jurnal bo'sh — prixod yoki savdo qiling
                        </td>
                      </tr>
                    )}
                    {filteredJ.map((j, i) => (
                      <tr
                        key={j.id || i}
                        style={{
                          background:
                            j.entry_type === 'kirim'
                              ? 'rgba(34,197,94,0.04)'
                              : 'rgba(239,68,68,0.04)',
                        }}
                      >
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            whiteSpace: 'nowrap',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {j.created_at
                            ? new Date(j.created_at).toLocaleString('uz-UZ', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{j.name}</div>
                        </td>
                        <td>
                          {j.category ? (
                            <span className="badge badge-outline" style={{ fontSize: 10 }}>
                              {j.category}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color: 'var(--accent-success)',
                          }}
                        >
                          {j.qty_in > 0 ? `+${j.qty_in}` : '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color: 'var(--accent-danger)',
                          }}
                        >
                          {j.qty_out > 0 ? `-${j.qty_out}` : '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800 }}>
                          {j.remaining ?? '—'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            color: 'var(--accent-primary)',
                            fontWeight: 600,
                          }}
                        >
                          {fmt(j.price)} so'm
                        </td>
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {j.serial || '—'}
                        </td>
                        <td style={{ fontSize: 12 }}>{j.expiry || '—'}</td>
                        <td style={{ fontSize: 12, fontWeight: 600 }}>{j.supplier || '—'}</td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 8,
                              background:
                                j.payment_type === 'naqd' || j.payment_type === 'cash'
                                  ? 'rgba(34,197,94,0.15)'
                                  : j.payment_type === 'perech' || j.payment_type === 'transfer'
                                    ? 'rgba(59,130,246,0.15)'
                                    : 'rgba(239,68,68,0.15)',
                              color:
                                j.payment_type === 'naqd' || j.payment_type === 'cash'
                                  ? 'var(--accent-success)'
                                  : j.payment_type === 'perech' || j.payment_type === 'transfer'
                                    ? 'var(--accent-info)'
                                    : 'var(--accent-danger)',
                            }}
                          >
                            {j.payment_type === 'naqd' || j.payment_type === 'cash'
                              ? '💵 Naqd'
                              : j.payment_type === 'perech' || j.payment_type === 'transfer'
                                ? '🔄 Perech'
                                : j.payment_type === 'card'
                                  ? '💳 Karta'
                                  : j.payment_type === 'debt'
                                    ? '📝 Qarz'
                                    : j.payment_type || '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${j.entry_type === 'kirim' ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: 10 }}
                          >
                            {j.entry_type === 'kirim' ? '📥 Kirim' : '📤 Chiqim'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ PRIXOD Chooser ═════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showChooser}
        onClose={() => setShowChooser(false)}
        title="📥 Prixod — Kirim usulini tanlang"
        width={520}
      >
        <div style={{ display: 'flex', gap: 14, padding: '8px 0 16px' }}>
          {[
            {
              icon: '📲',
              label: 'Bar-kod skaneri',
              sub: "Skanerdan yoki qo'lda birma-bir kiritish",
              color: 'var(--accent-primary)',
              action: openBarcode,
            },
            {
              icon: '📊',
              label: 'Excel / CSV Faktura',
              sub: 'Fakturani CSV fayl sifatida yuklab ommaviy kiritish',
              color: 'var(--accent-success)',
              action: openExcel,
            },
          ].map((opt, i) => (
            <button
              key={i}
              onClick={opt.action}
              style={{
                flex: 1,
                padding: '24px 14px',
                borderRadius: 14,
                border: `2px solid ${opt.color}`,
                background: `${opt.color}14`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 46 }}>{opt.icon}</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: opt.color }}>{opt.label}</span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {opt.sub}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* ══ BARCODE Modal ══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showBarcode}
        onClose={() => setShowBarcode(false)}
        title="📲 Prixod — Bar-kod orqali kiritish"
        width={700}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={bcRef}
              type="text"
              className="form-input"
              style={{ flex: 1, fontSize: 15 }}
              placeholder="🔍 Dori nomi yoki kod → Enter"
              value={bc.input}
              onChange={(e) => setBc((p) => ({ ...p, input: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && bcSearch()}
            />
            <button className="btn btn-primary" onClick={bcSearch}>
              Qidirish
            </button>
          </div>

          {bc.found && (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{bc.found.name}</div>
                  {bc.found.id ? (
                    <span className="badge badge-success">
                      ✅ Mavjud: {bc.found.qty} {bc.found.unit}
                    </span>
                  ) : (
                    <span className="badge badge-warning">🆕 Yangi dori</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div className="form-group">
                  <label style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                    Miqdori (kirim) *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ fontWeight: 800, fontSize: 17, borderColor: 'var(--accent-primary)' }}
                    min="1"
                    value={bc.addQty}
                    onChange={(e) => setBc((p) => ({ ...p, addQty: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && saveBcItem()}
                    autoFocus
                    placeholder="100"
                  />
                </div>
                <div className="form-group">
                  <label>Narxi (so'm)</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={bc.price}
                    onChange={(e) => setBc((p) => ({ ...p, price: e.target.value }))}
                    placeholder={String(bc.found?.price ?? '')}
                  />
                </div>
                <div className="form-group">
                  <label>Yaroqlilik muddati</label>
                  <input
                    type="date"
                    className="form-input"
                    value={bc.expiry}
                    onChange={(e) => setBc((p) => ({ ...p, expiry: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Seriya raqami</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="SER-001"
                    value={bc.serial}
                    onChange={(e) => setBc((p) => ({ ...p, serial: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Qaysi firmadan</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Roche, Pfizer..."
                    value={bc.supplier}
                    onChange={(e) => setBc((p) => ({ ...p, supplier: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>To'lov usuli</label>
                  <select
                    className="form-input"
                    value={bc.paymentType}
                    onChange={(e) => setBc((p) => ({ ...p, paymentType: e.target.value }))}
                  >
                    <option value="naqd">💵 Naqd</option>
                    <option value="perech">🔄 Perech (bank)</option>
                    <option value="qarz">📝 Qarzga</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setBc(EMPTY_BC)}>
                  Bekor
                </button>
                <button
                  className="btn btn-success"
                  style={{ flex: 1, fontWeight: 800 }}
                  onClick={saveBcItem}
                >
                  ✅ Kiritish → Keyingi
                </button>
              </div>
            </div>
          )}

          {bcLog.length > 0 && (
            <div
              style={{
                maxHeight: 190,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                Kiritilganlar ({bcLog.length})
              </div>
              {bcLog.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'var(--bg-input)',
                    padding: '7px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>💊 {l.name}</span>
                  <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>+{l.qty}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Qoldiq: {l.total}</span>
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              textAlign: 'right',
              borderTop: '1px solid var(--border-color)',
              paddingTop: 12,
            }}
          >
            <button className="btn btn-primary" onClick={() => setShowBarcode(false)}>
              Yakunlash ✓
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ EXCEL Modal ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showExcel}
        onClose={() => setShowExcel(false)}
        title="📊 Prixod — Excel / Faktura"
        width={1000}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              📂 Excel / CSV yuklash
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
              ⬇️ Shablon (.csv)
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Ustunlar: <b>nom, kategoriya, birlik, miqdor, narx, muddat, seria, firma, tolov</b>
            </span>
          </div>

          {excelRows.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Ko'rib chiqish ({excelRows.length} qator) — Kerak bo'lsa tahrirlang:
              </div>
              <div className="table-wrapper" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nomi *</th>
                      <th>Turi</th>
                      <th>Birlik</th>
                      <th>Miqdori *</th>
                      <th>Narxi</th>
                      <th>Muddati</th>
                      <th>Seriyasi</th>
                      <th>Firma</th>
                      <th>To'lov</th>
                      <th>Holat</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, idx) => {
                      const ex = medicines.find(
                        (m) => m.name.toLowerCase() === row.name.toLowerCase()
                      );
                      return (
                        <tr key={idx}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{idx + 1}</td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px', minWidth: 120 }}
                              value={row.name}
                              onChange={(e) => updExcelRow(idx, 'name', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px', width: 80 }}
                              value={row.category}
                              onChange={(e) => updExcelRow(idx, 'category', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px', width: 70 }}
                              value={row.unit || 'dona'}
                              onChange={(e) => updExcelRow(idx, 'unit', e.target.value)}
                            >
                              {UNITS.map((u) => (
                                <option key={u}>{u}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                padding: '3px 7px',
                                width: 70,
                                borderColor: row.qty <= 0 ? 'var(--accent-danger)' : '',
                              }}
                              value={row.qty}
                              onChange={(e) => updExcelRow(idx, 'qty', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px', width: 90 }}
                              value={row.price}
                              onChange={(e) => updExcelRow(idx, 'price', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px' }}
                              value={row.expiry || ''}
                              onChange={(e) => updExcelRow(idx, 'expiry', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px', width: 80 }}
                              value={row.serial || ''}
                              onChange={(e) => updExcelRow(idx, 'serial', e.target.value)}
                              placeholder="SER-001"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px', width: 90 }}
                              value={row.supplier || ''}
                              onChange={(e) => updExcelRow(idx, 'supplier', e.target.value)}
                              placeholder="Firma..."
                            />
                          </td>
                          <td>
                            <select
                              className="form-input"
                              style={{ fontSize: 12, padding: '3px 7px', width: 90 }}
                              value={row.paymentType || 'naqd'}
                              onChange={(e) => updExcelRow(idx, 'paymentType', e.target.value)}
                            >
                              <option value="naqd">💵 Naqd</option>
                              <option value="perech">🔄 Perech</option>
                              <option value="qarz">📝 Qarzga</option>
                            </select>
                          </td>
                          <td>
                            {ex ? (
                              <span className="badge badge-info" style={{ fontSize: 10 }}>
                                📦 +{row.qty}
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: 10 }}>
                                🆕 Yangi
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setExcelRows((p) => p.filter((_, i) => i !== idx))}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>
                  📦 Yangilash:{' '}
                  <b>
                    {
                      excelRows.filter((r) =>
                        medicines.some((m) => m.name.toLowerCase() === r.name.toLowerCase())
                      ).length
                    }
                  </b>
                </span>
                <span>
                  🆕 Yangi:{' '}
                  <b>
                    {
                      excelRows.filter(
                        (r) =>
                          !medicines.some((m) => m.name.toLowerCase() === r.name.toLowerCase())
                      ).length
                    }
                  </b>
                </span>
              </div>
            </>
          )}

          <div
            className="form-actions"
            style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}
          >
            <button className="btn btn-ghost" onClick={() => setShowExcel(false)}>
              Yopish
            </button>
            <button
              className="btn btn-success"
              style={{ fontWeight: 800 }}
              disabled={!excelRows.length}
              onClick={importExcel}
            >
              ✅ {excelRows.length} ta dori kiritish
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ Add/Edit Modal ══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? '✏️ Dori tahrirlash' : "➕ Yangi dori qo'shish"}
        width={560}
      >
        <div className="form-grid" style={{ padding: '4px 0' }}>
          <div className="form-group full-width">
            <label>Dori nomi *</label>
            <input
              type="text"
              className="form-input"
              autoFocus
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Paracetamol 500mg..."
            />
          </div>
          <div className="form-group">
            <label>Kategoriya (Turi)</label>
            <input
              type="text"
              className="form-input"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="Tabletka, Sirop..."
            />
          </div>
          <div className="form-group">
            <label>Birlik</label>
            <select
              className="form-input"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Miqdori (Qoldiq) *</label>
            <input
              type="number"
              className="form-input"
              min="0"
              value={form.qty}
              onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Kirim narxi (so'm)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              value={form.cost_price}
              onChange={(e) => setForm((p) => ({ ...p, cost_price: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Sotuv narxi (so'm) *</label>
            <input
              type="number"
              className="form-input"
              min="0"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Seriya raqami</label>
            <input
              type="text"
              className="form-input"
              value={form.serial}
              onChange={(e) => setForm((p) => ({ ...p, serial: e.target.value }))}
              placeholder="SER-001"
            />
          </div>
          <div className="form-group">
            <label>Qaysi firmadan</label>
            <input
              type="text"
              className="form-input"
              value={form.supplier}
              onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}
              placeholder="Roche, Pfizer..."
            />
          </div>
          <div className="form-group full-width">
            <label>Yaroqlilik muddati</label>
            <input
              type="date"
              className="form-input"
              value={form.expiry || ''}
              onChange={(e) => setForm((p) => ({ ...p, expiry: e.target.value }))}
            />
          </div>
          <div className="form-actions full-width">
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Bekor
            </button>
            <button className="btn btn-primary" onClick={saveForm}>
              💾 Saqlash
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ BIG Sales Modal ══════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showSale}
        onClose={() => setShowSale(false)}
        title="🛒 Savdoni rasmiylashtirish"
        width={1100}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '72vh' }}>
          {/* LEFT: dorilar tanlash */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, fontSize: 15 }}
                placeholder="🔍 Dori nomini yozing..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                autoFocus
              />
              {saleSearch && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSaleSearch('')}>
                  ✕
                </button>
              )}
            </div>
            {favMeds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: '100%' }}>
                  ⭐ Tezkor dorilar:
                </span>
                {favMeds.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addToCart(m)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: '2px solid var(--accent-primary)',
                      background: 'rgba(37,99,235,0.12)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    💊 {m.name} <span style={{ opacity: 0.7 }}>({m.qty})</span>
                  </button>
                ))}
              </div>
            )}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
              }}
            >
              <table className="data-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Nomi</th>
                    <th>Turi</th>
                    <th style={{ textAlign: 'center' }}>Qoldiq</th>
                    <th style={{ textAlign: 'right' }}>Narxi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {medicines
                    .filter(
                      (m) =>
                        m.qty > 0 &&
                        (!saleSearch || m.name.toLowerCase().includes(saleSearch.toLowerCase()))
                    )
                    .map((m) => (
                      <tr
                        key={m.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => addToCart(m)}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'rgba(37,99,235,0.08)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <td style={{ fontWeight: 700 }}>{m.name}</td>
                        <td>
                          {m.category ? (
                            <span className="badge badge-outline" style={{ fontSize: 10 }}>
                              {m.category}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, color: stockColor(m.qty, m.expiry ?? null) }}>
                            {m.qty}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>
                            {m.unit}
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color: 'var(--accent-success)',
                          }}
                        >
                          {fmt(m.price)} so'm
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(m);
                            }}
                          >
                            ➕
                          </button>
                        </td>
                      </tr>
                    ))}
                  {medicines.filter(
                    (m) =>
                      m.qty > 0 &&
                      (!saleSearch || m.name.toLowerCase().includes(saleSearch.toLowerCase()))
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}
                      >
                        Topilmadi...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: savat + to'lov */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: 16,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: 'var(--text-secondary)',
                paddingBottom: 6,
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              🧾 Savat
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {!cart.length && (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    padding: 30,
                    fontSize: 13,
                  }}
                >
                  Savat bo'sh…
                  <br />
                  Chap tomondagi dorilarni bosing
                </div>
              )}
              {cart.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ width: 28, height: 28 }}
                      onClick={() => updCart(c.id, -1)}
                    >
                      −
                    </button>
                    <span
                      style={{ fontWeight: 800, fontSize: 15, minWidth: 28, textAlign: 'center' }}
                    >
                      {c.cartQty}
                    </span>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ width: 28, height: 28 }}
                      onClick={() => updCart(c.id, +1)}
                    >
                      +
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.unit}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontWeight: 700,
                        color: 'var(--accent-success)',
                      }}
                    >
                      {fmt(c.cartQty * c.price)} so'm
                    </span>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ width: 24, height: 24, padding: 0, fontSize: 11 }}
                      onClick={() => setCart((p) => p.filter((x) => x.id !== c.id))}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {fmt(c.price)} so'm × {c.cartQty}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Mahsulotlar: {cart.reduce((s, c) => s + c.cartQty, 0)} ta
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Pozitsiya: {cart.length}
                </span>
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontWeight: 700, fontSize: 15 }}>JAMI:</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--accent-success)' }}>
                  {fmt(cartTotal)} so'm
                </span>
              </div>
            </div>
            {/* Patient selector — inpatient first, then ordinary */}
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700 }}>🏥 Bemor</label>
              <select
                className="form-input"
                value={salePatientId}
                onChange={(e) => {
                  setSalePatientId(e.target.value);
                  setSaleConfirmStep(0);
                }}
              >
                <option value="">-- Oddiy savdo (kassa) --</option>
                {inpatientPats.length > 0 && (
                  <optgroup label="🏥 Statsionardagi bemorlar">
                    {inpatientPats.map((rp) => (
                      <option key={`inp-${rp.rpId}`} value={rp.rpId}>
                        🛏 {rp.patientName} — {rp.roomName}
                        {rp.bedIndex ? ` (${rp.bedIndex})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {patients.length > 0 && (
                  <optgroup label="👤 Oddiy bemorlar">
                    {patients.map((p) => (
                      <option key={`pt-${p.id}`} value={p.id}>
                        {p.fullName} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {salePatientId &&
                inpatientPats.find((rp) => String(rp.rpId) === String(salePatientId)) && (
                  <div style={{ fontSize: 11, color: 'var(--accent-info)', marginTop: 3 }}>
                    ✅ Statsionar bemori — xizmat ro'yxatiga avtomatik qo'shiladi
                  </div>
                )}
            </div>

            {/* Payment type */}
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700 }}>💳 To'lov usuli</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { val: 'cash', icon: '💵', label: 'Naqd' },
                  { val: 'card', icon: '💳', label: 'Plastik' },
                  { val: 'klik', icon: '📱', label: 'Klik' },
                  { val: 'transfer', icon: '🔄', label: "O'tkazma" },
                  ...(salePatientId ? [{ val: 'debt', icon: '📝', label: 'Qarzga' }] : []),
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => {
                      setSalePayment(opt.val);
                      setSaleConfirmStep(0);
                    }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: 10,
                      border: `2px solid ${salePayment === opt.val ? (opt.val === 'debt' ? 'var(--accent-danger)' : 'var(--accent-primary)') : 'var(--border-color)'}`,
                      background:
                        salePayment === opt.val
                          ? opt.val === 'debt'
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(37,99,235,0.15)'
                          : 'var(--bg-input)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        salePayment === opt.val
                          ? opt.val === 'debt'
                            ? 'var(--accent-danger)'
                            : 'var(--accent-primary)'
                          : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
              {salePayment === 'debt' && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--accent-danger)',
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Qarz — bemorning hisob-kitobiga qo'shiladi
                </div>
              )}
            </div>

            {/* F10 confirm step banner */}
            {saleConfirmStep === 1 && (
              <div
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '2px solid var(--accent-warning)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent-warning)' }}>
                  ⚡ Tasdiqlash kerak!
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Chek bilan tasdiqlash uchun <b>F10</b> ni yana bosing
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Yoki cheksiz qabul qilish uchun quyidagi tugmani bosing
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 'auto' }}>
              {saleConfirmStep === 0 ? (
                <button
                  className="btn btn-success"
                  style={{ fontSize: 15, padding: '11px 0', fontWeight: 800, letterSpacing: 0.3 }}
                  onClick={() => setSaleConfirmStep(1)}
                >
                  🛒 Savdoni yakunlash — {fmt(cartTotal)} so'm
                  <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 8 }}>[F10]</span>
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-success"
                    style={{ fontSize: 15, padding: '11px 0', fontWeight: 800 }}
                    onClick={() => confirmSale(true)}
                  >
                    🖨️ Chek bilan qabul qilish
                    <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6 }}>[F10×2]</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 13, padding: '9px 0', fontWeight: 700 }}
                    onClick={() => confirmSale(false)}
                  >
                    ✅ Cheksiz qabul qilish
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSaleConfirmStep(0)}>
                    ← Orqaga
                  </button>
                </>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1, fontSize: 11 }}
                  onClick={() => {
                    setShowSale(false);
                    setSaleConfirmStep(0);
                  }}
                >
                  ✕ Yopish <span style={{ opacity: 0.6 }}>[F12]</span>
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11 }}
                  onClick={printReceipt}
                  title="Faqat chek chiqarish (savdosiz)"
                >
                  🖨️ Chek
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      {/* ══ STAT LIST MODAL ════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!showStatModal}
        onClose={() => setShowStatModal(null)}
        title={showStatModal ? statTitles[showStatModal] : ''}
        width={820}
      >
        {showStatModal &&
          (() => {
            const list = statLists[showStatModal];
            const totalVal = list.reduce(
              (s: number, m: MedRow) => s + (m.qty || 0) * (m.price || 0),
              0
            );
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="table-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nomi</th>
                        <th>Turi</th>
                        <th style={{ textAlign: 'center' }}>Qoldiq</th>
                        <th>Birlik</th>
                        <th style={{ textAlign: 'right' }}>Narxi</th>
                        <th style={{ textAlign: 'right' }}>Jami qiymat</th>
                        <th>Seriyasi</th>
                        <th>Muddati</th>
                        <th>Firma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}
                          >
                            Ro'yxat bo'sh
                          </td>
                        </tr>
                      )}
                      {list.map((m: MedRow, idx: number) => {
                        const isExp = !!(m.expiry && m.expiry < today);
                        const isSoon = m.expiry && m.expiry >= today && m.expiry <= soonStr;
                        const rowVal = (m.qty || 0) * (m.price || 0);
                        return (
                          <tr
                            key={m.id}
                            style={{
                              background: isExp
                                ? 'rgba(239,68,68,0.06)'
                                : isSoon
                                  ? 'rgba(245,158,11,0.06)'
                                  : 'transparent',
                            }}
                          >
                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{m.name}</div>
                              {isExp && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--accent-danger)',
                                    fontWeight: 700,
                                  }}
                                >
                                  ⛔ MUDDAT O'TGAN
                                </span>
                              )}
                              {isSoon && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--accent-warning)',
                                    fontWeight: 700,
                                  }}
                                >
                                  ⚠️ Muddat yaqin
                                </span>
                              )}
                            </td>
                            <td>
                              {m.category ? (
                                <span className="badge badge-outline" style={{ fontSize: 10 }}>
                                  {m.category}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: 15,
                                  color: stockColor(m.qty, m.expiry ?? null),
                                }}
                              >
                                {m.qty}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{m.unit || '—'}</td>
                            <td
                              style={{
                                textAlign: 'right',
                                color: 'var(--accent-primary)',
                                fontWeight: 600,
                              }}
                            >
                              {fmt(m.price)} so'm
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
                                color: 'var(--accent-success)',
                              }}
                            >
                              {fmt(rowVal)} so'm
                            </td>
                            <td
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 11,
                                color: 'var(--text-muted)',
                              }}
                            >
                              {m.serial || '—'}
                            </td>
                            <td
                              style={{
                                fontSize: 12,
                                color: isExp
                                  ? 'var(--accent-danger)'
                                  : isSoon
                                    ? 'var(--accent-warning)'
                                    : 'var(--text-secondary)',
                                fontWeight: isExp || isSoon ? 700 : 400,
                              }}
                            >
                              {m.expiry || '—'}
                            </td>
                            <td style={{ fontSize: 12 }}>{m.supplier || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Footer totals */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '2px solid var(--border-color)',
                    padding: '14px 16px',
                    background: 'var(--bg-card)',
                    borderRadius: '0 0 12px 12px',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', gap: 24 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Jami: <b style={{ color: 'var(--text-primary)' }}>{list.length} ta dori</b>
                    </span>
                    {showStatModal === 'expiry' && (
                      <>
                        <span style={{ fontSize: 13, color: 'var(--accent-danger)' }}>
                          ⛔ Muddati o'tgan:{' '}
                          <b>{list.filter((m: MedRow) => m.expiry && m.expiry < today).length}</b>
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--accent-warning)' }}>
                          ⚠️ 30 kun ichida tugaydi:{' '}
                          <b>{list.filter((m: MedRow) => m.expiry && m.expiry >= today).length}</b>
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-success)' }}>
                    Ombordagi jami qiymat: {fmt(totalVal)} so'm
                  </div>
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* ══ ANALYTICS Modal ═══════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="📊 Moliyaviy tahlil — Savdo / Kirim / Foyda"
        width={1050}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { l: '📥 Jami kirim', v: fmt(totalKirim), c: 'var(--accent-primary)' },
              { l: '📤 Jami chiqim', v: fmt(totalChiqim), c: 'var(--accent-warning)' },
              { l: '💰 Sof foyda', v: fmt(totalProfit), c: 'var(--accent-success)' },
              { l: '🏦 Ombor qiymati', v: fmt(stats.val), c: 'var(--accent-info)' },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  border: `1px solid ${s.c}22`,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {s.l}
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, color: s.c }}>{s.v} so'm</div>
              </div>
            ))}
          </div>

          {/* Global margin setter */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              background: 'var(--bg-input)',
              borderRadius: 10,
              padding: '10px 14px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13 }}>⚡ Barchaga foyda foizi:</span>
            <input
              type="number"
              className="form-input"
              style={{ width: 100 }}
              min="0"
              max="1000"
              value={globalMargin}
              onChange={(e) => setGlobalMargin(e.target.value)}
              placeholder="20"
            />
            <span style={{ color: 'var(--text-muted)' }}>%</span>
            <button className="btn btn-primary btn-sm" onClick={applyGlobalMargin}>
              ➡️ Barcha dorilar uchun qo'llash
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Kirim narxi = Sotuv narx ÷ (1 + foiz/100)
            </span>
          </div>

          {/* Category breakdown */}
          <div style={{ fontWeight: 700, fontSize: 13 }}>Kategoriyalar bo'yicha:</div>
          <div className="table-wrapper" style={{ maxHeight: 160, overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Kategoriya</th>
                  <th style={{ textAlign: 'center' }}>Dori soni</th>
                  <th style={{ textAlign: 'right' }}>Ombor qiymati</th>
                  <th style={{ textAlign: 'right' }}>Sotildi (so'm)</th>
                  <th style={{ textAlign: 'right' }}>Sof foyda</th>
                </tr>
              </thead>
              <tbody>
                {catStats().map((c, i) => (
                  <tr key={i}>
                    <td>
                      <span className="badge badge-outline">{c.cat}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{c.count}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                      }}
                    >
                      {fmt(c.val)} so'm
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: 'var(--accent-warning)',
                        fontWeight: 600,
                      }}
                    >
                      {fmt(c.income)} so'm
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 800,
                        color: c.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                      }}
                    >
                      {fmt(c.profit)} so'm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-medicine margin table */}
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            Dorilar bo'yicha kirim narx / sotuv narx / foyda:
          </div>
          <div className="table-wrapper" style={{ maxHeight: 280, overflowY: 'auto' }}>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Nomi</th>
                  <th>Kat.</th>
                  <th style={{ textAlign: 'right' }}>Kirim narxi</th>
                  <th style={{ textAlign: 'right' }}>Sotuv narxi</th>
                  <th style={{ textAlign: 'right' }}>Foyda</th>
                  <th style={{ textAlign: 'right' }}>Foyda %</th>
                  <th style={{ textAlign: 'center' }}>Tahrir</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const cp = medMargins[m.id] || m.cost_price || 0;
                  const profit = m.price - cp;
                  const pct = cp > 0 ? ((profit / cp) * 100).toFixed(1) : '—';
                  const isEditing = marginEdit === m.id;
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 700 }}>{m.name}</td>
                      <td>
                        {m.category ? (
                          <span className="badge badge-outline" style={{ fontSize: 9 }}>
                            {m.category}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: 90, padding: '3px 6px', fontSize: 12 }}
                            value={medMargins[m.id] || ''}
                            onChange={(e) =>
                              setMedMargins((p) => ({ ...p, [m.id]: Number(e.target.value) }))
                            }
                            onKeyDown={(e) => e.key === 'Enter' && saveMargin(m)}
                          />
                        ) : (
                          <span
                            style={{ color: cp > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                          >
                            {cp > 0 ? fmt(cp) + " so'm" : '—'}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(m.price)} so'm
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                        }}
                      >
                        {cp > 0 ? fmt(profit) + " so'm" : '—'}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--accent-warning)',
                        }}
                      >
                        {pct}
                        {pct !== '—' ? '%' : ''}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => saveMargin(m)}
                            >
                              ✓
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => setMarginEdit(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setMarginEdit(m.id)}
                          >
                            ✏️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              textAlign: 'right',
              borderTop: '1px solid var(--border-color)',
              paddingTop: 12,
            }}
          >
            <button className="btn btn-primary" onClick={() => setShowAnalytics(false)}>
              Yopish
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ HOTMAP / ANALYTICS Modal ══════════════════════════════════════════════ */}
      <Modal isOpen={showHotMap} onClose={() => setShowHotMap(false)} title="" width={1140}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ── Title bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: -8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              📈
            </div>
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 20,
                  background: 'linear-gradient(90deg,#7c3aed,#06b6d4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Dorixona Analitikasi
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Sotuvlar tahlili • Hot Map • Foizlar
              </div>
            </div>
          </div>

          {/* ── KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              {
                emoji: '🔥',
                label: "Eng ko'p sotilgan",
                val: hotTop10[0]?.name || '—',
                sub: `${hotTop10[0]?.soldQty || 0} dona`,
                grad: 'linear-gradient(135deg,#ef4444,#f97316)',
              },
              {
                emoji: '⚡',
                label: 'Eng tez sotilgan',
                val: hotTop10[0]
                  ? hotTop10.reduce((a, b) => (a.txCount > b.txCount ? a : b)).name
                  : '—',
                sub: `${hotTop10[0] ? hotTop10.reduce((a, b) => (a.txCount > b.txCount ? a : b)).txCount : 0} marta`,
                grad: 'linear-gradient(135deg,#f59e0b,#eab308)',
              },
              {
                emoji: '💰',
                label: "Eng ko'p daromad",
                val: hotTop10[0]
                  ? hotTop10.reduce((a, b) => (a.revenue > b.revenue ? a : b)).name
                  : '—',
                sub:
                  fmt(
                    hotTop10[0]
                      ? hotTop10.reduce((a, b) => (a.revenue > b.revenue ? a : b)).revenue
                      : 0
                  ) + " so'm",
                grad: 'linear-gradient(135deg,#10b981,#059669)',
              },
              {
                emoji: '🧊',
                label: 'Eng past sotuv',
                val: hotBot10[hotBot10.length - 1]?.name || '—',
                sub: `${hotBot10[hotBot10.length - 1]?.soldQty || 0} dona`,
                grad: 'linear-gradient(135deg,#6366f1,#4f46e5)',
              },
            ].map((k, i) => (
              <div
                key={i}
                style={{
                  background: k.grad,
                  borderRadius: 16,
                  padding: '14px 16px',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 4 }}>{k.emoji}</div>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2, lineHeight: 1.2 }}>
                  {k.val}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 700 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Two columns: Hot & Cold */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* HOT — top 10 */}
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: '16px 18px',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#ef4444' }}>
                  TOP 10 — Eng ko'p sotilgan
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hotTop10.length === 0 && (
                  <div
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      textAlign: 'center',
                      padding: 20,
                    }}
                  >
                    Hali savdo yo'q
                  </div>
                )}
                {hotTop10.map((d, i) => {
                  const pct = Math.round((d.soldQty / maxSold) * 100);
                  const revPct = Math.round(
                    (d.revenue / (hotMapData.reduce((s, x) => s + x.revenue, 0) || 1)) * 100
                  );
                  const hue = Math.round(0 + (i / 9) * 30); // red → orange
                  return (
                    <div key={d.name} style={{ position: 'relative' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: '#ef4444',
                              fontSize: 11,
                              minWidth: 18,
                            }}
                          >
                            #{i + 1}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {d.name}
                          </span>
                          {d.category && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: '1px 5px',
                                borderRadius: 6,
                                background: 'rgba(239,68,68,0.12)',
                                color: '#ef4444',
                              }}
                            >
                              {d.category}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#ef4444' }}>
                            {d.soldQty} dona
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--accent-success)',
                              fontSize: 11,
                            }}
                          >
                            {revPct}%
                          </span>
                        </div>
                      </div>
                      {/* Bar */}
                      <div
                        style={{
                          height: 8,
                          borderRadius: 6,
                          background: 'rgba(239,68,68,0.12)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 6,
                            background: `linear-gradient(90deg, hsl(${hue},90%,50%), hsl(${hue + 20},85%,55%))`,
                            transition: 'width 0.6s ease',
                            boxShadow: `0 0 8px hsl(${hue},90%,60%)`,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {fmt(d.revenue)} so'm daromad • {d.txCount} tranzaksiya
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLD — least sold */}
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: '16px 18px',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 20 }}>🧊</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#6366f1' }}>
                  BOTTOM 10 — Eng past sotuv
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hotBot10.length === 0 && (
                  <div
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      textAlign: 'center',
                      padding: 20,
                    }}
                  >
                    Hali savdo yo'q
                  </div>
                )}
                {hotBot10.map((d, i) => {
                  const pct = Math.round(
                    (d.soldQty / (hotMapData[hotMapData.length - 1]?.soldQty || 1)) * 100
                  );
                  return (
                    <div key={d.name}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: '#6366f1',
                              fontSize: 11,
                              minWidth: 18,
                            }}
                          >
                            #{i + 1}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {d.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: 800, color: '#6366f1' }}>{d.soldQty} dona</span>
                      </div>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 6,
                          background: 'rgba(99,102,241,0.12)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(pct, 5)}%`,
                            borderRadius: 6,
                            background: 'linear-gradient(90deg,#6366f1,#818cf8)',
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        {fmt(d.revenue)} so'm • {d.txCount} tranzaksiya
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Revenue heatmap grid (all medicines) */}
          {hotMapData.length > 0 && (
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: 16,
                padding: '16px 18px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>🗺️</span> Daromad Heat Map (barcha dorilar)
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    marginLeft: 4,
                  }}
                >
                  qizilroq = ko'proq daromad
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[...hotMapData]
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((d) => {
                    const intensity = d.revenue / (maxRevenue || 1);
                    const r = Math.round(255 * intensity);
                    const g = Math.round(60 * intensity);
                    const revSharePct = (
                      (d.revenue /
                        (hotMapData.reduce((s: number, x) => s + x.revenue, 0) || 1)) *
                      100
                    ).toFixed(1);
                    return (
                      <div
                        key={d.name}
                        title={`${d.name}: ${d.soldQty} dona, ${fmt(d.revenue)} so'm (${revSharePct}%)`}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 8,
                          background: `rgba(${r},${g},30,${0.15 + intensity * 0.65})`,
                          border: `1px solid rgba(${r},${g},30,0.3)`,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'default',
                          whiteSpace: 'nowrap',
                          transition: 'transform 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                      >
                        {d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name}
                        <span style={{ marginLeft: 5, opacity: 0.8 }}>{revSharePct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div
            style={{
              textAlign: 'right',
              borderTop: '1px solid var(--border-color)',
              paddingTop: 12,
            }}
          >
            <button className="btn btn-primary" onClick={() => setShowHotMap(false)}>
              Yopish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
