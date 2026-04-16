import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { db } from '../utils/db';
import { supabase } from '../lib/supabase';
import type {
  ClinicDoctor,
  RoomRecord,
  RoomPatientRecord,
  InpatientTreatmentRecord,
  VitalsRecord,
  DischargeInvoice,
  ExistingPatient,
} from '../types/clinic';

const DIET_TYPES = {
  standard: 'inpatient.diets.standard',
  diet5: 'inpatient.diets.diet5',
  diet9: 'inpatient.diets.diet9',
  no_salt: 'inpatient.diets.no_salt',
  liquid: 'inpatient.diets.liquid',
};

export default function Inpatient() {
  const { t } = useTranslation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('map');
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [roomPatients, setRoomPatients] = useState<RoomPatientRecord[]>([]);
  const [inpatientTreatments, setInpatientTreatments] = useState<InpatientTreatmentRecord[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState<RoomRecord | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: '',
    department: '',
    floor: 1,
    capacity: 2,
    type: 'shared',
    pricePerDay: '',
    mealPrice: '',
    cleaningStatus: 'clean',
  });

  const [showPlaceModal, setShowPlaceModal] = useState<RoomRecord | null>(null);
  const [placeForm, setPlaceForm] = useState({
    patientName: '',
    age: '',
    gender: 'm',
    phone: '',
    doctorId: '',
    tariffId: '',
    hasMeals: false,
    dietType: 'standard',
    bedIndex: '',
    deposit: '0',
    notes: '',
    arrivalTime: new Date().toLocaleTimeString('uz-UZ').slice(0, 5),
    status: 'active',
  });
  const [isEditingPatient, setIsEditingPatient] = useState<RoomPatientRecord | null>(null);

  const [showTreatmentModal, setShowTreatmentModal] = useState<number | null>(null);
  const [treatmentForm, setTreatmentForm] = useState({
    title: '',
    scheduledTime: '09:00',
    notes: '',
  });

  const [showDepositModal, setShowDepositModal] = useState<RoomPatientRecord | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const [showDischargeModal, setShowDischargeModal] = useState<RoomPatientRecord | null>(null);
  const [dischargeInvoice, setDischargeInvoice] = useState<DischargeInvoice | null>(null);

  const [draggedPatient, setDraggedPatient] = useState<RoomPatientRecord | null>(null);

  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showVitalsModal, setShowVitalsModal] = useState<RoomPatientRecord | null>(null);
  const [vitalsForm, setVitalsForm] = useState({ temperature: '', bp: '', pulse: '', weight: '' });
  const [vitalsHistory, setVitalsHistory] = useState<VitalsRecord[]>([]);

  const [filterNurseStatus, setFilterNurseStatus] = useState('all');
  const [handoverNote, setHandoverNote] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const rm = await db.getAllRows<RoomRecord>('rooms');
      setRooms(
        rm
          .filter((r) => r.isActive !== 0)
          .sort(
            (a, b) => (a.floor || 1) - (b.floor || 1) || (a.name || '').localeCompare(b.name || '')
          )
      );

      const docs = await db.getAllRows<ClinicDoctor>('doctors');
      setDoctors(docs.filter((d) => d.isActive !== 0));

      const allRp = await db.getAllRows<RoomPatientRecord>('room_patients');
      const allP = await db.getAllRows<ExistingPatient>('patients');
      type RoomTariffRow = { id: number; name?: string; pricePerDay?: number };
      const allTariffs = await db.getAllRows<RoomTariffRow>('room_tariffs');

      const activePats: RoomPatientRecord[] = allRp
        .filter((rp) => rp.status === 'active' || rp.status === 'reserved')
        .map((rp) => {
          const p = allP.find((pat) => pat.id === rp.patientId);
          const d = docs.find((doc) => doc.id === rp.doctorId);
          const r = rm.find((rom) => rom.id === rp.roomId);
          const rt = allTariffs.find((t) => t.id === rp.tariffId);
          return {
            ...rp,
            patientName: p ? p.fullName : "Noma'lum",
            doctorName: d ? d.fullName : "Noma'lum",
            roomName: r ? r.name : "Noma'lum",
            defaultRoomPrice: r ? r.pricePerDay : 0,
            roomMealPrice: r ? r.mealPrice : 0,
            tariffName: rt ? rt.name : '',
            tariffPrice: rt ? rt.pricePerDay : 0,
          };
        });

      setRoomPatients(activePats);
      loadTreatments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadTreatments() {
    setTreatmentsLoading(true);
    try {
      const allT = await db.getAllRows<InpatientTreatmentRecord>('inpatient_treatments');
      const trms = allT
        .filter((t) => {
          const rp = roomPatients.find((x) => x.id === t.roomPatientId);
          return rp && rp.status === 'active';
        })
        .map((t) => {
          const rp = roomPatients.find((x) => x.id === t.roomPatientId);
          return {
            ...t,
            patientName: rp ? rp.patientName : "Noma'lum",
            roomName: rp ? rp.roomName : "Noma'lum",
          };
        })
        .sort((a, b) =>
          ((a.scheduledTime as string) || '').localeCompare((b.scheduledTime as string) || '')
        );
      setInpatientTreatments(trms as InpatientTreatmentRecord[]);
    } catch (_err: unknown) {
      /* ignore load errors */
    } finally {
      setTreatmentsLoading(false);
    }
  }

  useEffect(() => {
    if (roomPatients.length > 0) loadTreatments();
  }, [roomPatients]);

  function formatPrice(n: number | string) {
    return Number(n || 0).toLocaleString('uz-UZ');
  }

  const handleDragStart = (e: React.DragEvent, rp: RoomPatientRecord) => {
    setDraggedPatient(rp);
    e.dataTransfer.setData('text/plain', rp.id.toString());
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent, targetRoom: RoomRecord, targetBedIndex: string) => {
    e.preventDefault();
    if (!draggedPatient) return;
    if (draggedPatient.roomId === targetRoom.id && draggedPatient.bedIndex === targetBedIndex) {
      setDraggedPatient(null);
      return;
    }
    try {
      await db.update('room_patients', draggedPatient.id, {
        roomId: targetRoom.id,
        bedIndex: targetBedIndex,
      });
      toast.success(`${draggedPatient.patientName} o'tkazildi: ${targetRoom.name}`);
      await loadAll();
    } catch (err: unknown) {
      toast.error("O'tkazishda xatolik: " + (err instanceof Error ? err.message : String(err)));
    }
    setDraggedPatient(null);
  };

  async function saveTreatment() {
    if (!treatmentForm.title || !showTreatmentModal) return;
    try {
      await db.insert('inpatient_treatments', {
        roomPatientId: showTreatmentModal,
        title: treatmentForm.title,
        scheduledTime: treatmentForm.scheduledTime,
        notes: treatmentForm.notes || '',
      });
      toast.success("Muolaja qo'shildi");
      setShowTreatmentModal(null);
      setTreatmentForm({ title: '', scheduledTime: '09:00', notes: '' });
      loadTreatments();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function loadVitals(rpId: string | number) {
    try {
      const allV = await db.getAllRows<VitalsRecord>('vital_signs');
      const res = allV
        .filter((v) => v.roomPatientId === rpId)
        .sort(
          (a, b) => new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime()
        );
      setVitalsHistory(res);
    } catch (_e: unknown) {
      /* ignore load errors */
    }
  }

  async function saveVitals() {
    if (!showVitalsModal) return;
    try {
      await db.insert('vital_signs', {
        roomPatientId: showVitalsModal.id,
        temperature: Number(vitalsForm.temperature),
        bp: vitalsForm.bp,
        pulse: Number(vitalsForm.pulse),
        weight: Number(vitalsForm.weight),
      });
      toast.success(t('inpatient.vitals.save_success'));
      loadVitals(showVitalsModal.id);
      setVitalsForm({ temperature: '', bp: '', pulse: '', weight: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function toggleTreatmentDone(treatmentId: string | number, isDone: boolean) {
    try {
      await db.update('inpatient_treatments', treatmentId, {
        isDone: isDone ? 1 : 0,
        doneAt: isDone ? new Date().toISOString() : null,
      });
      loadTreatments();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function generateDischargeInvoice(rp: RoomPatientRecord) {
    const entryDate = new Date(rp.entryDate ?? '');
    const autoDays = Math.max(
      1,
      Math.ceil((new Date().getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const days = rp.days || autoDays;

    const roomPrice = Number(rp.tariffId ? rp.tariffPrice : rp.defaultRoomPrice) || 0;
    const mealPrice = rp.hasMeals ? Number(rp.roomMealPrice) || 0 : 0;
    const roomTotal = days * roomPrice;
    const mealTotal = days * mealPrice;
    const baseTotal = roomTotal + mealTotal;

    let additionalDebt = 0;
    try {
      const { data: tx } = await supabase
        .from('transactions')
        .select('debt, amount, type, payment_type, description')
        .eq('patient_id', rp.patientId);
      if (tx) {
        type TxRow = {
          debt: number | null;
          amount: number | null;
          type: string | null;
          payment_type: string | null;
        };
        (tx as TxRow[]).forEach((t) => {
          if (t.type === 'debt') additionalDebt += Number(t.debt || t.amount || 0);
          if (t.type === 'pharmacy_sale' && t.payment_type === 'debt')
            additionalDebt += Number(t.amount || 0);
        });
      }
    } catch (e: unknown) {
      console.error(e);
    }

    const deposit = Number(rp.depositBalance || 0);
    const grandTotal = baseTotal + additionalDebt;
    const toPay = grandTotal - deposit;

    setDischargeInvoice({
      rp,
      days,
      roomPrice,
      roomTotal,
      mealPrice,
      mealTotal,
      additionalDebt,
      grandTotal,
      deposit,
      toPay,
    });
    setShowDischargeModal(rp);
  }

  async function confirmDischarge() {
    if (!dischargeInvoice) return;
    const { rp, days, grandTotal, deposit, toPay } = dischargeInvoice;
    try {
      await db.update('room_patients', rp.id, {
        status: 'discharged',
        exitDate: new Date().toISOString(),
        days,
        totalCost: grandTotal,
      });
      if (deposit > 0) {
        await db.insert('transactions', {
          patientId: rp.patientId,
          patient_name: rp.patientName,
          type: 'payment',
          paymentType: 'cash',
          amount: Math.min(deposit, grandTotal),
          description: `${t('inpatient.discharge.deposit_deduction')}: Statsionar ${rp.roomName}`,
        });
      }
      if (toPay > 0) {
        await db.insert('transactions', {
          patientId: rp.patientId,
          patient_name: rp.patientName,
          type: 'debt',
          paymentType: 'debt',
          debt: toPay,
          amount: toPay,
          description: `${t('inpatient.discharge.title')}: ${rp.roomName} (${days} ${t('inpatient.days')})`,
        });
      }
      await db.update('rooms', rp.roomId, { cleaningStatus: 'cleaning' });
      toast.success(`${rp.patientName} ${t('inpatient.discharge.success')}`);
      setShowDischargeModal(null);
      await loadAll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const extractKitchenData = () => {
    const data: {
      total: number;
      byDiet: Record<string, number>;
      byRoom: Array<{ rp: RoomPatientRecord; dietLabel: string }>;
    } = { total: 0, byDiet: {}, byRoom: [] };
    roomPatients
      .filter((rp) => rp.hasMeals)
      .forEach((rp) => {
        data.total++;
        const dt = (rp.dietType || 'standard') as keyof typeof DIET_TYPES;
        data.byDiet[dt] = (data.byDiet[dt] || 0) + 1;
        data.byRoom.push({ rp, dietLabel: t(DIET_TYPES[dt] ?? dt) || dt });
      });
    return data;
  };
  const kitchenData = extractKitchenData();

  const groupedRooms: Record<number, RoomRecord[]> = {};
  rooms.forEach((room) => {
    const f = room.floor || 1;
    if (!groupedRooms[f]) groupedRooms[f] = [];
    groupedRooms[f].push(room);
  });
  const floors = Object.keys(groupedRooms)
    .map(Number)
    .sort((a: number, b: number) => b - a);

  return (
    <div className="page page-inpatient">
      <div className="page-header">
        <h1>🏥 Statsionar Maxsus</h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => loadAll()}>
            🔄 Yangilash
          </button>
        </div>
      </div>

      <div
        className="tabs mb-4"
        style={{
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 15,
          display: 'flex',
          gap: 10,
        }}
      >
        <button
          className={`btn btn-sm ${activeTab === 'map' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('map')}
        >
          🗺️ Xonalar xaritasi
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'nurse' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('nurse')}
        >
          👩‍⚕️ Hamshira posti
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'kitchen' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('kitchen')}
        >
          🍲 Oshxona
        </button>

        {activeTab === 'map' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <select
              className="form-input"
              style={{ width: 130, padding: 4 }}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Barcha xonalar</option>
              <option value="luxury">🌟 Lyuks</option>
              <option value="shared">🛌 Common</option>
            </select>
            <select
              className="form-input"
              style={{ width: 130, padding: 4 }}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Hammasi</option>
              <option value="empty">🟢 Bo'sh</option>
              <option value="occupied">🔴 Band</option>
              <option value="cleaning">🧹 Tozalash</option>
            </select>
          </div>
        )}
      </div>

      <div className="page-body">
        {activeTab === 'map' && (
          <div
            className="floor-plan-container"
            style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}
          >
            {floors.map((floor: number) => {
              const floorRooms = (groupedRooms[floor] || []).filter((room) => {
                if (filterType !== 'all' && room.type !== filterType) return false;
                const occupants = roomPatients.filter((rp) => rp.roomId === room.id);
                if (filterStatus === 'empty' && occupants.length >= (room.capacity ?? 0))
                  return false;
                if (filterStatus === 'occupied' && occupants.length === 0) return false;
                return true;
              });
              if (floorRooms.length === 0) return null;
              return (
                <div key={floor} className="card glass-card mb-5">
                  <div className="card-header" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <h3>🏢 {floor}-qavat</h3>
                  </div>
                  <div className="card-body">
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 20,
                      }}
                    >
                      {floorRooms.map((room) => {
                        const occupants = roomPatients.filter((rp) => rp.roomId === room.id);
                        return (
                          <div
                            key={room.id}
                            className="card p-3"
                            style={{
                              border: `1px solid ${room.cleaningStatus === 'cleaning' ? 'var(--accent-warning)' : 'var(--border-color)'}`,
                              position: 'relative',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setPlaceForm((p) => ({
                                ...p,
                                patientName: '',
                                phone: '',
                                age: '',
                                gender: 'm',
                                doctorId: '',
                                bedIndex: '',
                                deposit: '0',
                                notes: '',
                                arrivalTime: new Date().toLocaleTimeString('uz-UZ').slice(0, 5),
                              }));
                              setShowPlaceModal(room);
                            }}
                          >
                            {room.cleaningStatus === 'cleaning' && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  background: 'var(--accent-warning)',
                                  color: '#000',
                                  fontSize: 10,
                                  padding: '2px 8px',
                                  borderBottomLeftRadius: 8,
                                }}
                              >
                                🧹 Tozalamoqda
                              </div>
                            )}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border-color)',
                                paddingBottom: 8,
                                marginBottom: 10,
                              }}
                            >
                              <div style={{ fontWeight: 800, fontSize: 18 }}>
                                {room.name}{' '}
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 400,
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {occupants.length}/{room.capacity} sig'im
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button
                                  className="btn btn-sm btn-ghost"
                                  style={{ padding: '2px 6px', fontSize: 12 }}
                                  onClick={() => {
                                    setPlaceForm((p) => ({ ...p, patientName: '' }));
                                    setShowPlaceModal(room);
                                  }}
                                >
                                  + Qo'shish
                                </button>
                              </div>
                            </div>
                            <div className="bed-grid">
                              {Array.from({ length: room.capacity ?? 0 }).map((_, i) => {
                                const bedLabel = `${room.name}-${String.fromCharCode(65 + i)}`;
                                const occupant =
                                  occupants.find((rp) => rp.bedIndex === bedLabel) ||
                                  (!occupants.some((o) => o.bedIndex) && occupants[i]);
                                if (occupant) {
                                  const days = Math.max(
                                    1,
                                    Math.ceil(
                                      (new Date().getTime() -
                                        new Date(occupant.entryDate ?? '').getTime()) /
                                        (1000 * 60 * 60 * 24)
                                    )
                                  );
                                  const lowDeposit =
                                    (occupant.depositBalance ?? 0) <
                                    (Number(room.pricePerDay) || 0);
                                  return (
                                    <div
                                      key={i}
                                      className={`bed-card ${occupant.status === 'reserved' ? 'bed-reserved' : 'bed-occupied'} ${lowDeposit && occupant.status !== 'reserved' ? 'bed-deposit-danger' : ''}`}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, occupant)}
                                    >
                                      <div className="bed-status-dot"></div>
                                      <div className="bed-title">
                                        {bedLabel} {room.type === 'luxury' && '🌟'}
                                      </div>
                                      <div
                                        className="bed-patient-name"
                                        title={`Doktor: ${occupant.doctorName}\nTashxis: ${occupant.notes || "Noma'lum"}`}
                                      >
                                        {occupant.patientName}
                                      </div>
                                      <div className="bed-days-badge">{days} kun</div>
                                      <div
                                        style={{
                                          fontSize: 10,
                                          color: lowDeposit
                                            ? 'var(--accent-danger)'
                                            : 'var(--text-secondary)',
                                          marginTop: 'auto',
                                        }}
                                      >
                                        💵 {formatPrice(occupant.depositBalance ?? 0)}
                                      </div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          marginTop: 4,
                                          gap: 4,
                                        }}
                                      >
                                        <button
                                          className="btn btn-sm btn-ghost"
                                          onClick={() => {
                                            setShowVitalsModal(occupant);
                                            loadVitals(occupant.id);
                                          }}
                                        >
                                          💓
                                        </button>
                                        <button
                                          className="btn btn-sm btn-ghost"
                                          onClick={() => setShowTreatmentModal(occupant.id)}
                                        >
                                          💉
                                        </button>
                                        <button
                                          className="btn btn-sm btn-ghost"
                                          onClick={() => setShowDepositModal(occupant)}
                                        >
                                          💵
                                        </button>
                                        <button
                                          className="btn btn-sm btn-danger"
                                          onClick={() => generateDischargeInvoice(occupant)}
                                        >
                                          🚪
                                        </button>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  const isCleaning = room.cleaningStatus === 'cleaning';
                                  return (
                                    <div
                                      key={i}
                                      className={`bed-card ${isCleaning ? 'bed-cleaning' : 'bed-empty'}`}
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e, room, bedLabel)}
                                    >
                                      <div className="bed-status-dot"></div>
                                      <div className="bed-title">
                                        {bedLabel} {room.type === 'luxury' && '🌟'}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: 'var(--text-muted)',
                                          marginTop: 10,
                                          textAlign: 'center',
                                        }}
                                      >
                                        {isCleaning ? '🧼 Tozalamoqda' : "🟢 Bo'sh"}
                                      </div>
                                      {isCleaning && (
                                        <button
                                          className="btn btn-sm btn-ghost mt-auto"
                                          style={{ fontSize: 9, padding: 2 }}
                                          onClick={async () => {
                                            await db.update('rooms', room.id, {
                                              cleaningStatus: 'clean',
                                            });
                                            loadAll();
                                          }}
                                        >
                                          Tayyor ✅
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'nurse' && (
          <div className="nurse-station-grid">
            <div className="nurse-column">
              <div className="nurse-column-header">
                <span>⌛ Bugungi muolajalar (Timeline)</span>
                <select
                  className="form-input btn-ghost"
                  style={{ fontSize: 10, padding: 2 }}
                  value={filterNurseStatus}
                  onChange={(e) => setFilterNurseStatus(e.target.value)}
                >
                  <option value="all">Hammasi</option>
                  <option value="pending">⌛ Kutilmoqda</option>
                  <option value="done">✅ Bajarildi</option>
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {inpatientTreatments
                  .filter(
                    (t) =>
                      filterNurseStatus === 'all' ||
                      (filterNurseStatus === 'done' ? t.isDone : !t.isDone)
                  )
                  .map((tr) => (
                    <div
                      key={tr.id}
                      className={`nurse-timeline-row ${tr.isDone ? 'nurse-treatment-done' : ''} ${(tr.title ?? '').toLowerCase().includes('tabletka') ? 'treatment-type-tablet' : (tr.title ?? '').toLowerCase().includes('cito') ? 'treatment-type-urgent' : 'treatment-type-injection'}`}
                    >
                      <div style={{ marginRight: 15 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(tr.isDone)}
                          onChange={(e) => toggleTreatmentDone(tr.id, e.target.checked)}
                          style={{ transform: 'scale(1.4)' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>
                          {tr.scheduledTime} — {tr.title}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          {tr.patientName} | <span className="badge">{tr.roomName}</span>
                        </div>
                      </div>
                      {tr.isDone && (
                        <div style={{ fontSize: 10, color: 'var(--accent-success)' }}>
                          ✅ {new Date(tr.doneAt ?? '').toLocaleTimeString().slice(0, 5)}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="nurse-column">
              <div className="nurse-column-header">📈 Monitoring (T°, BP, SpO2)</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {roomPatients.map((rp) => (
                  <div key={rp.id} className="nurse-vitals-card">
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}
                    >
                      <span style={{ fontWeight: 700 }}>
                        {rp.patientName} ({rp.roomName})
                      </span>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setShowVitalsModal(rp);
                          loadVitals(rp.id);
                        }}
                      >
                        + Kiritish
                      </button>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 15,
                        fontSize: 12,
                        background: 'rgba(255,255,255,0.02)',
                        padding: 8,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div>Harorat</div>
                        <div style={{ fontWeight: 800 }}>
                          {String(rp.temp || '36.6')}° <span className="vitals-trend-down">↓</span>
                        </div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div>Bosim</div>
                        <div style={{ fontWeight: 800 }}>{rp.lastBP || '120/80'}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div>Puls</div>
                        <div style={{ fontWeight: 800 }}>
                          {String(rp.pulse || '72')} <span className="vitals-trend-up">↑</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="nurse-column" style={{ background: 'transparent', border: 'none' }}>
              <div
                className="card glass-card mb-4"
                style={{ borderLeft: '4px solid var(--accent-danger)' }}
              >
                <div className="card-header">
                  <span style={{ color: 'var(--accent-danger)' }}>🆘 SOS Chaqiruvlar</span>
                </div>
                <div className="card-body">
                  <div className="sos-card">204-xona: Bemor isitma (Emergency!)</div>
                  <div style={{ fontSize: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Boshqa chaqiruvlar yo'q.
                  </div>
                </div>
              </div>
              <div className="card glass-card" style={{ flex: 1 }}>
                <div className="card-header">Smena topshirish (Handover)</div>
                <div className="card-body">
                  <textarea
                    className="form-input w-full"
                    rows={8}
                    placeholder="Keyingi smenaga izohlar..."
                    value={handoverNote}
                    onChange={(e) => setHandoverNote(e.target.value)}
                    style={{ fontSize: 13 }}
                  ></textarea>
                  <button
                    className="btn btn-primary w-full mt-3"
                    onClick={() => toast.success('Eslatma saqlandi')}
                  >
                    Saqlash
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'kitchen' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
            <div className="card glass-card">
              <div className="card-header">
                <h3>🍲 Umumiy Hisobot</h3>
              </div>
              <div className="card-body">
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    textAlign: 'center',
                    color: 'var(--accent-primary)',
                    marginBottom: 20,
                  }}
                >
                  {kitchenData.total} <span style={{ fontSize: 18 }}>ta</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(kitchenData.byDiet).map(([key, count]) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 10,
                        background: 'var(--bg-input)',
                        borderRadius: 8,
                      }}
                    >
                      <span>{t(DIET_TYPES[key as keyof typeof DIET_TYPES] ?? key) || key}</span>
                      <span style={{ fontWeight: 700 }}>{count} ta</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary w-full mt-5" onClick={() => window.print()}>
                  🖨️ Chiqarish
                </button>
              </div>
            </div>
            <div className="card glass-card">
              <div className="card-header">
                <h3>📄 Xonama-xona ro'yxat</h3>
              </div>
              <div className="card-body p-0" style={{ maxHeight: 500, overflow: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Joy</th>
                      <th>Bemor</th>
                      <th>Parhez</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kitchenData.byRoom.map(({ rp, dietLabel }, i: number) => (
                      <tr key={i}>
                        <td>
                          <span className="badge">{rp.bedIndex || rp.roomName}</span>
                        </td>
                        <td>{rp.patientName}</td>
                        <td style={{ color: '#FF9F0A', fontWeight: 600 }}>{dietLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={Boolean(showPlaceModal)}
        onClose={() => setShowPlaceModal(null)}
        title="Joylashtirish"
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Bemor F.I.Sh</label>
            <input
              className="form-input"
              placeholder="To'liq ismi..."
              value={placeForm.patientName}
              onChange={(e) => setPlaceForm({ ...placeForm, patientName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Telefon</label>
            <input
              className="form-input"
              placeholder="+998..."
              value={placeForm.phone}
              onChange={(e) => setPlaceForm({ ...placeForm, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Yosh</label>
            <input
              type="number"
              className="form-input"
              placeholder="30"
              value={placeForm.age}
              onChange={(e) => setPlaceForm({ ...placeForm, age: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Jins</label>
            <select
              className="form-input"
              value={placeForm.gender}
              onChange={(e) => setPlaceForm({ ...placeForm, gender: e.target.value })}
            >
              <option value="m">Erkak</option>
              <option value="f">Ayol</option>
            </select>
          </div>
          <div className="form-group">
            <label>Shifokor</label>
            <select
              className="form-input"
              value={placeForm.doctorId}
              onChange={(e) => setPlaceForm({ ...placeForm, doctorId: e.target.value })}
            >
              <option value="">— Tanlang —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>O'rin (Karavot)</label>
            <input
              className="form-input"
              placeholder="101-A"
              value={placeForm.bedIndex}
              onChange={(e) => setPlaceForm({ ...placeForm, bedIndex: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Depozit (so'm)</label>
            <input
              type="number"
              className="form-input"
              value={placeForm.deposit}
              onChange={(e) => setPlaceForm({ ...placeForm, deposit: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Holat</label>
            <select
              className="form-input"
              value={placeForm.status || 'active'}
              onChange={(e) => setPlaceForm({ ...placeForm, status: e.target.value })}
            >
              <option value="active">🔴 Band</option>
              <option value="reserved">🟡 Rezerv</option>
            </select>
          </div>
          <div className="form-group" style={{ marginTop: 10 }}>
            <label style={{ display: 'flex', gap: 10 }}>
              <input
                type="checkbox"
                checked={placeForm.hasMeals}
                onChange={(e) => setPlaceForm({ ...placeForm, hasMeals: e.target.checked })}
              />{' '}
              Ovqat bilan
            </label>
          </div>
          {placeForm.hasMeals && (
            <div className="form-group full-width">
              <label>Parhez</label>
              <select
                className="form-input"
                value={placeForm.dietType}
                onChange={(e) => setPlaceForm({ ...placeForm, dietType: e.target.value })}
              >
                {Object.entries(DIET_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {t(v)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group full-width">
            <label>Izoh</label>
            <input
              className="form-input"
              placeholder="Tashxis, eslatma..."
              value={placeForm.notes}
              onChange={(e) => setPlaceForm({ ...placeForm, notes: e.target.value })}
            />
          </div>
        </div>
        <button
          className="btn btn-primary w-full mt-4"
          onClick={async () => {
            if (!placeForm.patientName) return toast.error('Bemor ismini kiriting');
            try {
              // Find or create patient
              let patientId;
              const allPat = await db.getAllRows('patients');
              const existing = allPat.find((p) => p.fullName === placeForm.patientName);
              if (existing) {
                patientId = existing.id;
              } else {
                const p = await db.insertReturn('patients', {
                  fullName: placeForm.patientName,
                  phone: placeForm.phone || '',
                  gender: placeForm.gender || 'm',
                  birthDate: placeForm.age
                    ? String(new Date().getFullYear() - Number(placeForm.age))
                    : null,
                });
                patientId = p.id;
              }
              await db.insert('room_patients', {
                roomId: showPlaceModal?.id,
                patientId,
                doctorId: placeForm.doctorId || null,
                bedIndex: placeForm.bedIndex || '',
                hasMeals: placeForm.hasMeals ? 1 : 0,
                dietType: placeForm.dietType || 'standard',
                depositBalance: Number(placeForm.deposit) || 0,
                status: placeForm.status || 'active',
                notes: placeForm.notes || '',
                arrivalTime: placeForm.arrivalTime || '',
                age: placeForm.age || '',
                gender: placeForm.gender || 'm',
                phone: placeForm.phone || '',
              });
              setShowPlaceModal(null);
              loadAll();
              toast.success('Joylashtirildi!');
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Saqlash
        </button>
      </Modal>

      <Modal
        isOpen={Boolean(showTreatmentModal)}
        onClose={() => setShowTreatmentModal(null)}
        title="💉 Muolaja"
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Nomi</label>
            <input
              className="form-input"
              value={treatmentForm.title}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Vaqti</label>
            <input
              type="time"
              className="form-input"
              value={treatmentForm.scheduledTime}
              onChange={(e) =>
                setTreatmentForm({ ...treatmentForm, scheduledTime: e.target.value })
              }
            />
          </div>
          <div className="form-group full-width">
            <label>Izoh</label>
            <input
              className="form-input"
              value={treatmentForm.notes}
              onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
            />
          </div>
        </div>
        <button className="btn btn-primary w-full mt-4" onClick={saveTreatment}>
          O'rnatish
        </button>
      </Modal>

      <Modal
        isOpen={Boolean(showDepositModal)}
        onClose={() => setShowDepositModal(null)}
        title="💵 Depozit"
      >
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 10 }}>{showDepositModal?.patientName}</div>
          <input
            type="number"
            className="form-input w-full"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            autoFocus
          />
          <button
            className="btn btn-success w-full mt-4"
            onClick={async () => {
              if (Number(depositAmount) <= 0 || !showDepositModal) return;
              try {
                await db.update('room_patients', showDepositModal.id, {
                  depositBalance:
                    Number(showDepositModal.depositBalance || 0) + Number(depositAmount),
                });
                await db.insert('transactions', {
                  patientId: showDepositModal.patientId,
                  patient_name: showDepositModal.patientName,
                  type: 'payment',
                  amount: Number(depositAmount),
                  description: `Depozit: Statsionar`,
                });
                setShowDepositModal(null);
                loadAll();
                toast.success('Qabul qilindi!');
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Tasdiqlash
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(showDischargeModal)}
        onClose={() => setShowDischargeModal(null)}
        title="🚪 Chiqarish"
      >
        {dischargeInvoice && (
          <div>
            <div
              style={{
                border: '1px dashed var(--border-color)',
                padding: 15,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <h3 style={{ textAlign: 'center' }}>{dischargeInvoice.rp.patientName}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Xona va Ovqat puli:</span>
                <b>{formatPrice(dischargeInvoice.roomTotal + dischargeInvoice.mealTotal)} so'm</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Qarz / Dori Xarajatlari:</span>
                <b>{formatPrice(dischargeInvoice.additionalDebt)} so'm</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Jami:</span>
                <b>{formatPrice(dischargeInvoice.grandTotal)} so'm</b>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--success)',
                }}
              >
                <span>Depozit:</span>
                <b>-{formatPrice(dischargeInvoice.deposit)} so'm</b>
              </div>
              <div style={{ borderTop: '2px solid var(--text-main)', margin: '10px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20 }}>
                <span>Yakuniy Qoldiq (To'lanadigan summa):</span>
                <b>{formatPrice(Math.max(0, dischargeInvoice.toPay))} so'm</b>
              </div>
            </div>
            <button className="btn btn-danger w-full" onClick={confirmDischarge}>
              🚪{' '}
              {dischargeInvoice.toPay > 0 ? 'Qarzdorlik bilan Saqlash (Chiqarish)' : 'Tasdiqlash'}
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(showVitalsModal)}
        onClose={() => setShowVitalsModal(null)}
        title={`💓 Monitoring: ${showVitalsModal?.patientName}`}
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Harorat</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={vitalsForm.temperature}
              onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Bosim</label>
            <input
              className="form-input"
              value={vitalsForm.bp}
              onChange={(e) => setVitalsForm({ ...vitalsForm, bp: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Puls</label>
            <input
              type="number"
              className="form-input"
              value={vitalsForm.pulse}
              onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Vazn</label>
            <input
              type="number"
              className="form-input"
              value={vitalsForm.weight}
              onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
            />
          </div>
        </div>
        <button className="btn btn-primary w-full mt-4" onClick={saveVitals}>
          Saqlash
        </button>
      </Modal>
    </div>
  );
}
