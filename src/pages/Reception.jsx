import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { db } from '../utils/db';
import { printReceipt } from '../utils/printer';

const EMPTY_PATIENT = { fullName: '', phone: '', birthDate: '', gender: 'male', address: '', source: '' };

const PATIENT_SOURCES = [
  { value: '', label: '— Tanlanmagan —' },
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'telegram', label: '📱 Telegram' },
  { value: 'recommendation', label: '👥 Tavsiya (Do\'stlar)' },
  { value: 'banner', label: '🏢 Ko\'cha banneri' },
  { value: 'google', label: '🔍 Google qidiruv' },
  { value: 'website', label: '🌐 Veb-sayt' },
  { value: 'tv', label: '📺 Televizor' },
  { value: 'repeat', label: '🔄 Qayta kelish' },
  { value: 'other', label: '📌 Boshqa' },
];

const Reception = forwardRef(function Reception(props, ref) {
  const { t } = useTranslation();
  const toast = useToast();

  const [patient, setPatient] = useState({ ...EMPTY_PATIENT });
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [paymentType, setPaymentType] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [existingPatients, setExistingPatients] = useState([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientStatsionarInfo, setPatientStatsionarInfo] = useState(null);
  const [notes, setNotes] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [showCheckPreview, setShowCheckPreview] = useState(false);
  const [highlightedServiceId, setHighlightedServiceId] = useState(null);
  const [highlightedDoctorIndex, setHighlightedDoctorIndex] = useState(0);
  const [activeShift, setActiveShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [serviceViewMode, setServiceViewMode] = useState('grid'); // 'grid' or 'list'
  const [serviceSortOrder, setServiceSortOrder] = useState('manual'); // 'manual' or 'az'
  const [isLoaded, setIsLoaded] = useState(false);

  const serviceSearchRef = useRef(null);
  const serviceGridRef = useRef(null);
  const doctorGridRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const svcRows = await db.query('SELECT * FROM services WHERE isActive = 1 ORDER BY orderIndex, name');
      setServices(svcRows);
      const docRows = await db.query('SELECT * FROM doctors WHERE isActive = 1 ORDER BY fullName');
      setDoctors(docRows);

      // Load active shift
      await getOrStartShift();

      // Load draft
      const draft = localStorage.getItem('reception_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.patient) setPatient(parsed.patient);
          if (parsed.selectedServices) setSelectedServices(parsed.selectedServices);
          if (parsed.selectedDoctor) setSelectedDoctor(parsed.selectedDoctor);
          if (parsed.paymentType) setPaymentType(parsed.paymentType);
          if (parsed.discount) setDiscount(parsed.discount);
          if (parsed.selectedPatientId) setSelectedPatientId(parsed.selectedPatientId);
          if (parsed.patientStatsionarInfo) setPatientStatsionarInfo(parsed.patientStatsionarInfo);
          if (parsed.notes) setNotes(parsed.notes);
        } catch(e) {}
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoaded(true);
    }
  }

  // Real-time shift check
  useEffect(() => {
    const checkTimer = setInterval(() => {
      getOrStartShift();
    }, 30000); // Check every 30s
    return () => clearInterval(checkTimer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('reception_draft', JSON.stringify({
      patient, selectedServices, selectedDoctor, paymentType, discount, selectedPatientId, patientStatsionarInfo, notes
    }));
  }, [isLoaded, patient, selectedServices, selectedDoctor, paymentType, discount, selectedPatientId, patientStatsionarInfo, notes]);

  async function searchPatients(query) {
    if (!query || query.length < 2) { setExistingPatients([]); return; }
    try {
      const rows = await db.query(`
        SELECT p.*, rp.id as activeRoomId, r.name as roomName
        FROM patients p
        LEFT JOIN room_patients rp ON p.id = rp.patientId AND rp.status = 'active'
        LEFT JOIN rooms r ON rp.roomId = r.id
        WHERE p.fullName LIKE ? OR p.phone LIKE ?
        ORDER BY p.id DESC LIMIT 20
      `, [`%${query}%`, `%${query}%`]);
      setExistingPatients(rows);
    } catch (err) {
      toast.error(err.message);
    }
  }

  function selectExistingPatient(p) {
    setSelectedPatientId(p.id);
    setPatient({ fullName: p.fullName, phone: p.phone || '', birthDate: p.birthDate || '', gender: p.gender || 'male', address: p.address || '' });
    if (p.activeRoomId) {
      setPatientStatsionarInfo(p.roomName);
    } else {
      setPatientStatsionarInfo(null);
    }
    setShowPatientSearch(false);
    setSearchPatient('');
  }

  const sortedServices = [...services].sort((a, b) => {
    if (serviceSortOrder === 'az') return a.name.localeCompare(b.name);
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });

  const filteredServices = sortedServices.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  function addService(svc) {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === svc.id);
      if (exists) {
        return prev.map(s => s.id === svc.id ? { ...s, quantity: s.quantity + 1 } : s);
      }
      return [...prev, { ...svc, quantity: 1 }];
    });
    setHighlightedServiceId(svc.id);
  }

  function removeService(svcId) {
    setSelectedServices(prev => {
      const item = prev.find(s => s.id === svcId);
      if (!item) return prev;
      if (item.quantity <= 1) return prev.filter(s => s.id !== svcId);
      return prev.map(s => s.id === svcId ? { ...s, quantity: s.quantity - 1 } : s);
    });
  }

  function removeServiceFull(svcId) {
    setSelectedServices(prev => prev.filter(s => s.id !== svcId));
  }

  async function getOrStartShift() {
    try {
      const active = await db.query('SELECT * FROM shifts WHERE status = \'active\' ORDER BY id DESC LIMIT 1');
      if (active.length > 0) {
        setActiveShift(active[0]);
        return active[0];
      }
      
      const now = new Date();
      const hour = now.getHours();
      const type = (hour >= 8 && hour < 17) ? 'day' : 'night';
      
      const res = await db.insertReturn('shifts', { type, status: 'active' });
      const newShift = { ...res, type, status: 'active', id: res.id };
      setActiveShift(newShift);
      return newShift;
    } catch(e) {
      // toast error suppressed here to avoid noise in auto-check
    }
  }

  async function startManualShift(type) {
    try {
      const res = await db.insertReturn('shifts', { type, status: 'active' });
      const newShift = { ...res, type, status: 'active', id: res.id };
      setActiveShift(newShift);
      setShiftSummary(null);
      toast.success(`${type === 'day' ? 'Kunduzgi' : 'Kechki'} smena boshlandi.`);
    } catch(e) {
      toast.error(e.message);
    }
  }

  async function handleCloseShift() {
    if (!activeShift) return;
    try {
      const stats = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN paymentType = 'cash' THEN amount ELSE 0 END), 0) as cash,
          COALESCE(SUM(CASE WHEN paymentType = 'card' THEN amount ELSE 0 END), 0) as card,
          COALESCE(SUM(CASE WHEN paymentType = 'transfer' THEN amount ELSE 0 END), 0) as transfer,
          COALESCE(SUM(CASE WHEN paymentType = 'debt' THEN amount ELSE 0 END), 0) as debt
        FROM transactions WHERE shift_id = ?
      `, [activeShift.id]);
      
      const s = stats[0] || { cash: 0, card: 0, transfer: 0, debt: 0 };
      
      await db.run('UPDATE shifts SET status = \'closed\', endTime = datetime(\'now\',\'localtime\'), totalCash = ?, totalCard = ?, totalTransfer = ?, totalDebt = ? WHERE id = ?', [
        s.cash, s.card, s.transfer, s.debt, activeShift.id
      ]);
      
      setShiftSummary(s);
      setActiveShift(null);
    } catch(e) {
      toast.error(e.message);
    }
  }

  function focusServiceSearch() {
    serviceSearchRef.current?.focus();
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (showDoctorModal) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedDoctorIndex(prev => Math.min(prev + 1, doctors.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedDoctorIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (doctors[highlightedDoctorIndex]) {
            setSelectedDoctor(doctors[highlightedDoctorIndex]);
            setShowDoctorModal(false);
          }
        }
        return;
      }

      const targetTag = (e.target.tagName || '').toUpperCase();
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || e.target.isContentEditable) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        if (highlightedServiceId) {
          const svc = services.find(s => s.id === highlightedServiceId);
          if (svc) addService(svc);
        }
      }
      if (e.key === '-') {
        e.preventDefault();
        if (highlightedServiceId) {
          removeService(highlightedServiceId);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [highlightedServiceId, services, showDoctorModal, highlightedDoctorIndex, doctors]);

  useEffect(() => {
    if (showDoctorModal && doctorGridRef.current) {
      const container = doctorGridRef.current;
      const items = container.querySelectorAll('.doctor-select-item');
      const target = items[highlightedDoctorIndex];
      if (target) {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedDoctorIndex, showDoctorModal]);

  const totalAmount = selectedServices.reduce((sum, s) => sum + s.price * s.quantity, 0);
  const discountAmount = Math.round(totalAmount * discount / 100);
  const finalAmount = totalAmount - discountAmount;

  function openDoctorSelect() {
    setShowDoctorModal(true);
    setHighlightedDoctorIndex(0);
  }

  function openCheckPreview() {
    if (selectedServices.length === 0) {
      toast.error('Kamida bitta xizmat tanlang!');
      return;
    }
    setShowCheckPreview(true);
  }

  useImperativeHandle(ref, () => ({
    openDoctorSelect,
    openCheckPreview,
    handleSaveAndPrint,
    handleSaveOnly,
    focusServiceSearch,
    isCheckPreviewOpen: () => showCheckPreview,
  }));

  async function handleSaveAndPrint() {
    if (selectedServices.length === 0) {
      toast.error('Kamida bitta xizmat tanlang!');
      return;
    }

    try {
      let patientId = selectedPatientId;
      const hasPatientData = patient.fullName.trim().length > 0;

      if (!patientId && hasPatientData) {
        const pResult = await db.insertReturn('patients', {
          fullName: patient.fullName.trim(),
          phone: patient.phone,
          birthDate: patient.birthDate,
          gender: patient.gender,
          address: patient.address,
          source: patient.source || '',
        });
        patientId = pResult.id;
      }

      let firstApptId = null;
      const servicesForPrint = [];
      for (const svc of selectedServices) {
        const apptResult = await db.insertReturn('appointments', {
          patientId: patientId || null,
          doctorId: selectedDoctor ? selectedDoctor.id : null,
          serviceId: svc.id,
          status: 'completed',
          paymentType,
          amount: svc.price,
          quantity: svc.quantity,
          discount,
          notes: notes || '',
          shift_id: activeShift?.id || null,
        });

        if (!firstApptId) firstApptId = apptResult.id;

        await db.insert('transactions', {
          appointmentId: apptResult.id,
          patientId: patientId || null,
          patient_name: patientId ? undefined : patient.fullName.trim(),
          doctor_id: selectedDoctor ? selectedDoctor.id : null,
          service_id: svc.id,
          type: 'payment',
          amount: Math.round(svc.price * svc.quantity * (1 - discount / 100)),
          paymentType,
          description: svc.quantity > 1 ? `${svc.name} x${svc.quantity}` : svc.name,
          shift_id: activeShift?.id || null,
        });

        // ----- INVENTORY BOM DEDUCTION -----
        const maps = await db.query("SELECT * FROM consumables_mapping WHERE serviceId=?", [svc.id]);
        for (const m of maps) {
          const totalQty = m.quantity * svc.quantity;
          await db.run("UPDATE inventory SET currentStock = currentStock - ? WHERE id=?", [totalQty, m.itemId]);
          await db.insert('inventory_transactions', {
            itemId: m.itemId,
            type: 'exit',
            quantity: totalQty,
            note: `Auto-sarf: ${svc.name} (${patientId ? patientId : patient.fullName})`
          });
        }

        servicesForPrint.push({ ...svc, name: svc.quantity > 1 ? `${svc.name} x${svc.quantity}` : svc.name, price: svc.price * svc.quantity });
      }

      if (selectedDoctor) {
        const today = new Date().toISOString().split('T')[0];
        const lastTicket = await db.query(
          `SELECT MAX(number) as maxNum FROM queue WHERE doctorId = ? AND date(createdAt) = ?`,
          [selectedDoctor.id, today]
        );
        const nextNum = (lastTicket[0]?.maxNum || 0) + 1;
        const prefix = selectedDoctor.prefix || 'A';

        await db.insert('queue', {
          appointmentId: firstApptId,
          doctorId: selectedDoctor.id,
          patientId: patientId || null,
          number: nextNum,
          prefix: prefix,
          status: 'waiting',
        });
      }

      await printReceipt({
        type: 'service',
        patientName: patient.fullName.trim() || '',
        doctorName: selectedDoctor?.fullName || '',
        services: servicesForPrint,
        discount: discount,
        total: finalAmount,
        paymentType: paymentType,
      });

      toast.success(t('common.success'));
      setShowCheckPreview(false);
      resetForm();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleSaveOnly() {
    if (selectedServices.length === 0) {
      toast.error('Kamida bitta xizmat tanlang!');
      return;
    }

    try {
      let patientId = selectedPatientId;
      const hasPatientData = patient.fullName.trim().length > 0;

      if (!patientId && hasPatientData) {
        const pResult = await db.insertReturn('patients', {
          fullName: patient.fullName.trim(),
          phone: patient.phone,
          birthDate: patient.birthDate,
          gender: patient.gender,
          address: patient.address,
        });
        patientId = pResult.id;
      }

      let firstApptId = null;
      for (const svc of selectedServices) {
        const apptResult = await db.insertReturn('appointments', {
          patientId: patientId || null,
          doctorId: selectedDoctor ? selectedDoctor.id : null,
          serviceId: svc.id,
          status: 'completed',
          paymentType,
          amount: svc.price,
          quantity: svc.quantity,
          discount,
          notes: notes || '',
          shift_id: activeShift?.id || null,
        });

        if (!firstApptId) firstApptId = apptResult.id;

        await db.insert('transactions', {
          appointmentId: apptResult.id,
          patientId: patientId || null,
          patient_name: patientId ? undefined : patient.fullName.trim(),
          doctor_id: selectedDoctor ? selectedDoctor.id : null,
          service_id: svc.id,
          type: 'payment',
          amount: Math.round(svc.price * svc.quantity * (1 - discount / 100)),
          paymentType,
          description: svc.quantity > 1 ? `${svc.name} x${svc.quantity}` : svc.name,
          shift_id: activeShift?.id || null,
        });

        // ----- INVENTORY BOM DEDUCTION -----
        const maps = await db.query("SELECT * FROM consumables_mapping WHERE serviceId=?", [svc.id]);
        for (const m of maps) {
          const totalQty = m.quantity * svc.quantity;
          await db.run("UPDATE inventory SET currentStock = currentStock - ? WHERE id=?", [totalQty, m.itemId]);
          await db.insert('inventory_transactions', {
            itemId: m.itemId,
            type: 'exit',
            quantity: totalQty,
            note: `Auto-sarf: ${svc.name} (${patientId ? patientId : patient.fullName})`
          });
        }
      }

      if (selectedDoctor) {
        const today = new Date().toISOString().split('T')[0];
        const lastTicket = await db.query(
          `SELECT MAX(number) as maxNum FROM queue WHERE doctorId = ? AND date(createdAt) = ?`,
          [selectedDoctor.id, today]
        );
        const nextNum = (lastTicket[0]?.maxNum || 0) + 1;
        const prefix = selectedDoctor.prefix || 'A';

        await db.insert('queue', {
          appointmentId: firstApptId,
          doctorId: selectedDoctor.id,
          patientId: patientId || null,
          number: nextNum,
          prefix: prefix,
          status: 'waiting',
        });
      }

      toast.success(t('common.success'));
      setShowCheckPreview(false);
      resetForm();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function resetForm() {
    setPatient({ ...EMPTY_PATIENT });
    setSelectedServices([]);
    setSelectedDoctor(null);
    setPaymentType('cash');
    setDiscount(0);
    setSelectedPatientId(null);
    setPatientStatsionarInfo(null);
    setNotes('');
    setServiceSearch('');
    setHighlightedServiceId(null);
    localStorage.removeItem('reception_draft');
  }

  function formatPrice(n) {
    return Number(n).toLocaleString('uz-UZ');
  }

  function paymentIcon(type) {
    if (type === 'cash') return '💵';
    if (type === 'card') return '💳';
    if (type === 'transfer') return '🔄';
    return '📝';
  }

  return (
    <div className="page page-reception">
      <div className="page-header">
        <h1>{t('reception.title')}</h1>
        <div className="page-header-actions">
          <div className="shift-indicator" onClick={() => { setShowShiftModal(true); setShiftSummary(null); }} style={{cursor:'pointer'}}>
            {activeShift ? (
              <span className={`badge ${activeShift.type === 'day' ? 'badge-success' : 'badge-warning'}`}>
                {activeShift.type === 'day' ? `☀️ ${t('reception.dayShift')}` : `🌙 ${t('reception.nightShift')}`}
              </span>
            ) : (
              <span className="badge badge-danger">🚪 {t('reception.shiftClosed')}</span>
            )}
          </div>
          <button className="btn btn-secondary" onClick={() => setShowPatientSearch(true)}>
            🔍 {t('reception.searchPatient')}
          </button>
          <button className="btn btn-primary" onClick={openCheckPreview}>
            🖨️ {t('reception.printCheck')}
            <span className="btn-shortcut">F10</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="reception-grid">
          <div className="reception-left">
            {/* Patient Form */}
            <div className="card glass-card">
              <div className="card-header">
                <h3>👤 {selectedPatientId ? t('common.edit') : t('reception.newPatient')}</h3>
                {selectedPatientId && (
                  <div style={{display:'flex', gap: 8, alignItems:'center'}}>
                    {patientStatsionarInfo && (
                      <span className="badge badge-warning" style={{marginRight: 10}}>{t('reception.statsionarBadge')} ({patientStatsionarInfo})</span>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={() => { setSelectedPatientId(null); setPatientStatsionarInfo(null); setPatient({...EMPTY_PATIENT}); }}>
                      + {t('reception.newPatient')}
                    </button>
                  </div>
                )}
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>{t('reception.fullName')}</label>
                    <input type="text" className="form-input" value={patient.fullName || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setPatient(prev => ({...prev, fullName: val}));
                      }}
                      placeholder={t('reception.fullName')} autoFocus />
                  </div>
                  <div className="form-group">
                    <label>{t('reception.phone')}</label>
                    <input type="tel" className="form-input" value={patient.phone || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setPatient(prev => ({...prev, phone: val}));
                      }} placeholder="+998" />
                  </div>
                  <div className="form-group">
                    <label>{t('reception.birthDate')}</label>
                    <input type="date" className="form-input" value={patient.birthDate || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setPatient(prev => ({...prev, birthDate: val}));
                      }} />
                  </div>
                  <div className="form-group">
                    <label>{t('reception.gender')}</label>
                    <select className="form-input" value={patient.gender}
                      onChange={e => {
                        const val = e.target.value;
                        setPatient(prev => ({...prev, gender: val}));
                      }}>
                      <option value="male">{t('reception.male')}</option>
                      <option value="female">{t('reception.female')}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('reception.address')}</label>
                    <input type="text" className="form-input" value={patient.address || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setPatient(prev => ({...prev, address: val}));
                      }}
                      placeholder={t('reception.address')} />
                  </div>
                  <div className="form-group">
                    <label>📣 Qayerdan eshitdi?</label>
                    <select className="form-input" value={patient.source || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setPatient(prev => ({...prev, source: val}));
                      }}>
                      {PATIENT_SOURCES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="card glass-card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="btn-group btn-group-sm">
                    <button className={`btn-icon-only ${serviceSortOrder === 'az' ? 'active' : ''}`} 
                      onClick={() => setServiceSortOrder(serviceSortOrder === 'az' ? 'manual' : 'az')} title={t('reception.sortAZ')}>🔤</button>
                    <button className={`btn-icon-only ${serviceViewMode === 'grid' ? 'active' : ''}`} 
                      onClick={() => setServiceViewMode('grid')} title={t('reception.gridView')}>🔳</button>
                    <button className={`btn-icon-only ${serviceViewMode === 'list' ? 'active' : ''}`} 
                      onClick={() => setServiceViewMode('list')} title={t('reception.listView')}>📝</button>
                  </div>
                  <div className="service-search-box">
                    <input
                      ref={serviceSearchRef}
                      type="text"
                      className="form-input service-search-input"
                      placeholder="🔍 F5"
                      value={serviceSearch}
                      onChange={e => setServiceSearch(e.target.value)}
                    />
                    {serviceSearch && (
                      <button className="service-search-clear" onClick={() => setServiceSearch('')}>✕</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-body">
                {services.length === 0 ? (
                  <p className="empty-state">{t('common.noData')} — {t('settings.addService')}</p>
                ) : filteredServices.length === 0 ? (
                  <p className="empty-state">"{serviceSearch}" — {t('reception.notFound')}</p>
                ) : (
                  <div className={`${serviceViewMode === 'grid' ? 'service-select-grid' : 'service-select-list'} service-scroll-grid`} ref={serviceGridRef}>
                    {filteredServices.map(svc => {
                      const sel = selectedServices.find(s => s.id === svc.id);
                      return (
                        <div key={svc.id}
                          className={`service-select-item ${sel ? 'selected' : ''} ${highlightedServiceId === svc.id ? 'highlighted' : ''}`}
                          onClick={() => setHighlightedServiceId(svc.id)}>
                          <div className="service-item-name">{svc.name}</div>
                          <div className="service-item-price">{formatPrice(svc.price)} {t('common.sum')}</div>
                          {sel && <div className="service-qty-badge">x{sel.quantity}</div>}
                          <div className="service-item-actions" onClick={e => e.stopPropagation()}>
                            <button className="qty-btn qty-minus" onClick={() => removeService(svc.id)} title="-">−</button>
                            <button className="qty-btn qty-plus" onClick={() => addService(svc)} title="+ (=)">+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="reception-right">
            {/* Doctor */}
            <div className="card glass-card">
              <div className="card-header">
                <h3>👨‍⚕️ {t('reception.selectDoctor')}</h3>
                <button className="btn btn-sm btn-primary" onClick={openDoctorSelect}>
                  {t('reception.selectDoctor')}
                  <span className="btn-shortcut">F8</span>
                </button>
              </div>
              <div className="card-body">
                {selectedDoctor ? (
                  <div className="service-item">
                    <div className="service-item-info">
                      <div className="service-item-name">{selectedDoctor.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedDoctor.specialty} {selectedDoctor.prefix ? `[${selectedDoctor.prefix}]` : ''}</div>
                    </div>
                    <button className="btn-icon-only danger" onClick={() => setSelectedDoctor(null)}>✕</button>
                  </div>
                ) : (
                  <p className="empty-state">{t('reception.selectDoctor')}</p>
                )}
              </div>
            </div>

            {/* Selected Services Summary */}
            {selectedServices.length > 0 && (
              <div className="card glass-card">
                <div className="card-header">
                  <h3>📋 {t('reception.selectedServices')}</h3>
                </div>
                <div className="card-body">
                  <div className="service-list">
                    {selectedServices.map(svc => (
                      <div key={svc.id} className={`service-item ${highlightedServiceId === svc.id ? 'highlighted' : ''}`}
                        onClick={() => setHighlightedServiceId(svc.id)}>
                        <div className="service-item-info">
                          <div className="service-item-name">{svc.name}</div>
                          <div className="service-item-price">{formatPrice(svc.price)} × {svc.quantity} = {formatPrice(svc.price * svc.quantity)} {t('common.sum')}</div>
                        </div>
                        <div className="qty-controls">
                          <button className="qty-btn qty-minus" onClick={(e) => { e.stopPropagation(); removeService(svc.id); }}>−</button>
                          <span className="qty-value">{svc.quantity}</span>
                          <button className="qty-btn qty-plus" onClick={(e) => { e.stopPropagation(); addService(svc); }}>+</button>
                          <button className="btn-icon-only danger" onClick={(e) => { e.stopPropagation(); removeServiceFull(svc.id); }} style={{ marginLeft: 4 }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="card glass-card">
              <div className="card-header">
                <h3>💰 {t('reception.payment')}</h3>
              </div>
              <div className="card-body">
                <div className="payment-types">
                  {['cash', 'card', 'transfer', 'debt'].map(type => (
                    <button key={type}
                      className={`payment-btn ${paymentType === type ? 'active' : ''} ${type === 'debt' ? 'payment-btn-debt' : ''}`}
                      onClick={() => setPaymentType(type)}>
                      {paymentIcon(type)} {t(`reception.${type}`)}
                    </button>
                  ))}
                </div>
                <div className="discount-row">
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t('reception.discount')}:</label>
                  <input type="number" className="form-input" value={discount} min={0} max={100}
                    onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))} />
                  <span style={{ color: 'var(--text-muted)' }}>%</span>
                  {discountAmount > 0 && (
                    <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>-{formatPrice(discountAmount)} {t('common.sum')}</span>
                  )}
                </div>
                <div className="form-group" style={{marginTop: 15}}>
                  <label>{t('reception.notes')}</label>
                  <textarea className="form-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('reception.noteEnter')} style={{resize:'vertical'}}></textarea>
                </div>
                <div className="payment-total" style={{marginTop: 15}}>
                  <span>{t('reception.total')}:</span>
                  <span className="total-amount">{formatPrice(finalAmount)} {t('common.sum')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Select Modal */}
      <Modal isOpen={showDoctorModal} onClose={() => setShowDoctorModal(false)} title={t('reception.selectDoctor')} width={600}>
        {doctors.length === 0 ? (
          <p className="empty-state">{t('common.noData')}</p>
        ) : (
          <div className="doctor-select-grid" ref={doctorGridRef}>
            {doctors.map((doc, idx) => (
              <button key={doc.id}
                className={`doctor-select-item ${highlightedDoctorIndex === idx ? 'highlighted' : ''} ${selectedDoctor?.id === doc.id ? 'selected' : ''}`}
                onClick={() => { setSelectedDoctor(doc); setShowDoctorModal(false); }}>
                <div style={{ fontWeight: 600 }}>{doc.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.specialty}</div>
                {doc.prefix && <div style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{t('reception.prefix')}: {doc.prefix}</div>}
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Patient Search Modal */}
      <Modal isOpen={showPatientSearch} onClose={() => setShowPatientSearch(false)} title={t('reception.searchPatient')} width={600}>
        <div style={{ marginBottom: 16 }}>
          <input type="text" className="form-input" style={{ width: '100%' }}
            placeholder={t('reception.searchPatient')} autoFocus
            value={searchPatient}
            onChange={e => { setSearchPatient(e.target.value); searchPatients(e.target.value); }} />
        </div>
        {existingPatients.length > 0 ? (
          <div className="service-list">
            {existingPatients.map(p => (
              <button key={p.id} className="service-select-item" style={{ width: '100%', borderLeft: p.activeRoomId ? '4px solid var(--accent-warning)' : '' }}
                onClick={() => selectExistingPatient(p)}>
                <div style={{ fontWeight: 600 }}>{p.fullName} {p.activeRoomId ? <span className="badge badge-warning" style={{marginLeft:8, fontSize:10}}>{t('reception.statsionarBadge')}: {p.roomName}</span> : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.phone} {p.birthDate ? `| ${p.birthDate}` : ''}</div>
              </button>
            ))}
          </div>
        ) : searchPatient.length >= 2 ? (
          <p className="empty-state">{t('common.noData')}</p>
        ) : null}
      </Modal>

      {/* Check Preview Modal */}
      <Modal isOpen={showCheckPreview} onClose={() => setShowCheckPreview(false)} title={t('reception.checkPreview')} width={520}>
        <div className="check-preview">
          {patient.fullName.trim() && (
            <div className="check-preview-row">
              <span className="check-label">{t('reception.patient')}:</span>
              <span className="check-value">{patient.fullName}</span>
            </div>
          )}
          {selectedDoctor && (
            <div className="check-preview-row">
              <span className="check-label">{t('reception.doctor')}:</span>
              <span className="check-value">{selectedDoctor.fullName}</span>
            </div>
          )}
          <div className="check-preview-divider" />
          <div className="check-preview-services">
            {selectedServices.map(svc => (
              <div key={svc.id} className="check-preview-svc">
                <span>{svc.name} {svc.quantity > 1 ? `× ${svc.quantity}` : ''}</span>
                <span>{formatPrice(svc.price * svc.quantity)} {t('common.sum')}</span>
              </div>
            ))}
          </div>
          <div className="check-preview-divider" />
          {discount > 0 && (
            <div className="check-preview-row">
              <span className="check-label">{t('reception.discount')} ({discount}%):</span>
              <span className="check-value" style={{ color: 'var(--accent-danger)' }}>-{formatPrice(discountAmount)} {t('common.sum')}</span>
            </div>
          )}
          <div className="check-preview-row check-preview-total">
            <span>{t('reception.total')}:</span>
            <span>{formatPrice(finalAmount)} {t('common.sum')}</span>
          </div>
          <div className="check-preview-row">
            <span className="check-label">{t('reception.payment')}:</span>
            <span className="check-value">{paymentIcon(paymentType)} {t(`reception.${paymentType}`)}</span>
          </div>
          <div className="check-preview-divider" />
          <div className="check-preview-actions">
            <button className="btn btn-primary" onClick={handleSaveAndPrint}>
              🖨️ {t('reception.printAndSave')}
              <span className="btn-shortcut">F10</span>
            </button>
            <button className="btn btn-secondary" onClick={handleSaveOnly}>
              💾 {t('reception.saveWithoutCheck')}
              <span className="btn-shortcut">F12</span>
            </button>
          </div>
          <div className="check-preview-hint">
            {t('reception.checkHint')}
          </div>
        </div>
      </Modal>
      {/* Shift Modal */}
      <Modal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} title={activeShift ? t('reception.closeShift') : t('reception.startShift')} width={450}>
        <div style={{textAlign:'center', padding: 10}}>
          {activeShift ? (
            <>
              <div style={{fontSize: 50, marginBottom: 15}}>{activeShift.type === 'day' ? '☀️' : '🌙'}</div>
              <p style={{marginBottom: 10}}><b>{activeShift.type === 'day' ? t('reception.dayShiftBtn') : t('reception.nightShiftBtn')}</b> {t('reception.closeShiftConfirm')}</p>
              <p style={{fontSize: 12, color:'var(--text-muted)', marginBottom: 20}}>{t('reception.closeShiftHint')}</p>
              <div className="form-actions" style={{justifyContent:'center'}}>
                <button className="btn btn-ghost" onClick={() => setShowShiftModal(false)}>{t('reception.exit')}</button>
                <button className="btn btn-danger" onClick={handleCloseShift}>🔒 {t('reception.closeShift')}</button>
              </div>
            </>
          ) : shiftSummary ? (
            <div className="shift-summary-view">
              <div style={{fontSize: 40, marginBottom: 10}}>✅</div>
              <h3 style={{marginBottom: 15, color:'var(--success)'}}>{t('reception.shiftClosed2')}</h3>
              <div className="card glass-card" style={{padding:15, textAlign:'left', marginBottom: 20}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 8}}>
                  <span>💵 {t('reception.cashAmount')}:</span>
                  <span style={{fontWeight:'bold'}}>{formatPrice(shiftSummary.cash)} som</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 8}}>
                  <span>💳 {t('reception.cardAmount')}:</span>
                  <span style={{fontWeight:'bold'}}>{formatPrice(shiftSummary.card)} som</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 8}}>
                  <span>🔄 {t('reception.transferAmount')}:</span>
                  <span style={{fontWeight:'bold'}}>{formatPrice(shiftSummary.transfer)} som</span>
                </div>
                <div className="check-preview-divider" />
                <div style={{display:'flex', justifyContent:'space-between', marginTop: 10, fontSize: 18}}>
                  <span style={{fontWeight:600}}>{t('reception.totalAmount')}:</span>
                  <span style={{fontWeight:'bold', color:'var(--accent-success)'}}>
                    {formatPrice(shiftSummary.cash + shiftSummary.card + shiftSummary.transfer)} som
                  </span>
                </div>
              </div>
              <p style={{fontSize: 12, color:'var(--text-muted)', marginBottom: 15}}>{t('reception.selectNewShift')}</p>
              <div className="form-actions" style={{justifyContent:'center', gap: 15}}>
                <button className="btn btn-success" onClick={() => startManualShift('day')}>☀️ {t('reception.dayShiftBtn')}</button>
                <button className="btn btn-warning" onClick={() => startManualShift('night')}>🌙 {t('reception.nightShiftBtn')}</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{fontSize: 50, marginBottom: 15}}>📋</div>
              <p style={{marginBottom: 20}}>{t('reception.noActiveShift')}<br />{t('reception.startShiftHint')}</p>
              <div className="form-actions" style={{justifyContent:'center', gap: 15}}>
                <button className="btn btn-success" onClick={() => startManualShift('day')}>☀️ {t('reception.dayShiftFull')}</button>
                <button className="btn btn-warning" onClick={() => startManualShift('night')}>🌙 {t('reception.nightShiftFull')}</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
});

export default Reception;
