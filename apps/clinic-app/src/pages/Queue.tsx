import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { db } from '../utils/db';
import { supabase } from '../utils/supabase';
import type { QueueTicket, Doctor } from '../types/clinic';
import { printReceipt } from '../utils/printer';

export default function Queue() {
  const { t } = useTranslation();
  const toast = useToast();

  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [patientName, setPatientName] = useState('');
  const [previewTicket, setPreviewTicket] = useState<Partial<QueueTicket> | null>(null);
  const [activeTab, setActiveTab] = useState('board'); // 'board' or 'journal'
  const [history, setHistory] = useState<QueueTicket[]>([]);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const targetDate = activeTab === 'journal' ? journalDate : today;
      const startOfDay = `${targetDate}T00:00:00`;
      const endOfDay = `${targetDate}T23:59:59.999`;

      const { data: queueData, error: queueErr } = await supabase
        .from('queue')
        .select('*, patients(fullName), doctors(fullName, prefix)')
        .gte('createdAt', startOfDay)
        .lte('createdAt', endOfDay)
        .order('id', { ascending: true });

      if (queueErr) throw queueErr;

      const rows = (queueData ?? []).map((r) => ({
        ...r,
        patientName: (r.patients as { fullName?: string } | null)?.fullName,
        doctorName: (r.doctors as { fullName?: string } | null)?.fullName,
        doctorPrefix: (r.doctors as { prefix?: string } | null)?.prefix,
      }));

      if (activeTab === 'board') {
        setTickets(rows as QueueTicket[]);
      } else {
        setHistory([...rows].reverse() as QueueTicket[]);
      }

      const { data: docData, error: docErr } = await supabase
        .from('doctors')
        .select('id, fullName, specialty, prefix')
        .eq('isActive', 1)
        .order('fullName');

      if (docErr) throw docErr;
      setDoctors((docData ?? []) as Doctor[]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [activeTab, journalDate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const isToday = journalDate === new Date().toISOString().split('T')[0];
    const timer = setInterval(() => {
      if (activeTab === 'board' || (activeTab === 'journal' && isToday)) {
        loadData();
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [activeTab, journalDate, loadData]);

  async function prepareTicket() {
    if (!selectedDoctor) {
      toast.error('Shifokorni tanlang!');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: lastTicket } = await supabase
        .from('queue')
        .select('number')
        .eq('doctorId', selectedDoctor.id)
        .gte('createdAt', `${today}T00:00:00`)
        .lte('createdAt', `${today}T23:59:59.999`)
        .order('number', { ascending: false })
        .limit(1);
      const nextNum = ((lastTicket?.[0]?.number as number) || 0) + 1;
      const prefix = selectedDoctor.prefix || 'A';

      setPreviewTicket({
        prefix,
        number: nextNum,
        doctorName: selectedDoctor.fullName,
        doctorId: selectedDoctor.id,
        patientName: patientName.trim(),
      });
      setShowNewTicket(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function finalPrintTicket() {
    if (!previewTicket) return;
    try {
      let patientId = null;
      if (previewTicket.patientName) {
        const { data: existing } = await supabase
          .from('patients')
          .select('id')
          .eq('fullName', previewTicket.patientName)
          .limit(1);
        if (existing && existing.length > 0) {
          patientId = existing[0].id;
        } else {
          const pResult = await db.insertReturn('patients', {
            fullName: previewTicket.patientName,
          });
          patientId = pResult.id;
        }
      }

      await db.insert('queue', {
        doctorId: previewTicket.doctorId,
        patientId,
        number: previewTicket.number,
        prefix: previewTicket.prefix,
        status: 'waiting',
      });

      try {
        await printReceipt({
          type: 'queue',
          prefix: previewTicket.prefix,
          number: previewTicket.number,
          doctorName: previewTicket.doctorName,
          patientName: previewTicket.patientName,
        });
      } catch (err: unknown) {
        console.error('Print error:', err);
      }

      toast.success(`${previewTicket.prefix}-${previewTicket.number} navbat chiqarildi!`);
      setPreviewTicket(null);
      setSelectedDoctor(null);
      setPatientName('');
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function updateStatus(ticketId: number | string, newStatus: string) {
    try {
      await db.update('queue', ticketId, { status: newStatus });
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function callNext(doctorId: number | string) {
    const waiting = tickets.filter((t) => t.doctorId === doctorId && t.status === 'waiting');
    if (waiting.length === 0) {
      toast.info("Navbatda bemor yo'q");
      return;
    }
    await updateStatus(waiting[0].id, 'in_progress');
    toast.success(`${waiting[0].prefix}-${waiting[0].number} chaqirildi`);
  }

  const waiting = tickets.filter((t) => t.status === 'waiting');
  const inProgress = tickets.filter((t) => t.status === 'in_progress');
  const completed = tickets.filter((t) => t.status === 'completed');

  function TicketCard({ ticket, actions }: { ticket: QueueTicket; actions: React.ReactNode }) {
    return (
      <div className="queue-ticket">
        <div className="queue-ticket-number">
          {ticket.prefix}-{ticket.number}
        </div>
        <div className="queue-ticket-info">
          <div className="queue-ticket-patient">{ticket.patientName || "Noma'lum"}</div>
          <div className="queue-ticket-service">{ticket.doctorName}</div>
          <div className="queue-ticket-time">
            {new Date(ticket.createdAt).toLocaleTimeString('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="queue-ticket-actions">{actions}</div>
      </div>
    );
  }

  return (
    <div className="page page-queue">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <h1>{t('queue.title')}</h1>
          <div className="btn-group">
            <button
              className={`btn ${activeTab === 'board' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('board')}
            >
              📋 Monitor
            </button>
            <button
              className={`btn ${activeTab === 'journal' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('journal')}
            >
              📜 Jurnal
            </button>
            <button
              className="btn btn-special"
              style={{ background: '#8b5cf6', color: '#fff' }}
              onClick={() => window.open('/?page=monitor', '_blank')}
            >
              📺 TV Mode (Voice)
            </button>
          </div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowNewTicket(true)}>
            🎫 {t('queue.ticket')}
            <span className="btn-shortcut">F3</span>
          </button>
        </div>
      </div>

      <div className="page-body">
        {activeTab === 'board' ? (
          <>
            {/* Doctor queue buttons */}
            {doctors.length > 0 && (
              <div className="card glass-card">
                <div className="card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {doctors.map((doc) => {
                    const docWaiting = tickets.filter(
                      (t) => t.doctorId === doc.id && t.status === 'waiting'
                    ).length;
                    return (
                      <button
                        key={doc.id}
                        className="btn btn-secondary"
                        onClick={() => callNext(doc.id)}
                      >
                        📢 {doc.prefix || '?'} — {doc.fullName}
                        {docWaiting > 0 && (
                          <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                            {docWaiting}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="queue-grid">
              {/* Waiting */}
              <div className="card glass-card queue-column">
                <div className="card-header">
                  <h3>⏳ {t('queue.waiting')}</h3>
                  <span className="badge badge-warning">{waiting.length}</span>
                </div>
                <div className="card-body">
                  {waiting.length === 0 ? (
                    <p className="empty-state">{t('common.noData')}</p>
                  ) : (
                    <div className="queue-ticket-list">
                      {waiting.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          actions={
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => updateStatus(ticket.id, 'in_progress')}
                              title="Qabul qilish"
                            >
                              Qabul qilish
                            </button>
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* In Progress */}
              <div className="card glass-card queue-column">
                <div className="card-header">
                  <h3>🔄 {t('queue.inProgress')}</h3>
                  <span className="badge badge-info">{inProgress.length}</span>
                </div>
                <div className="card-body">
                  {inProgress.length === 0 ? (
                    <p className="empty-state">{t('common.noData')}</p>
                  ) : (
                    <div className="queue-ticket-list">
                      {inProgress.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          actions={
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => updateStatus(ticket.id, 'completed')}
                              title="Yakunlash"
                            >
                              Yakunlash
                            </button>
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Completed */}
              <div className="card glass-card queue-column">
                <div className="card-header">
                  <h3>✅ {t('queue.completed')}</h3>
                  <span className="badge badge-success">{completed.length}</span>
                </div>
                <div className="card-body">
                  {completed.length === 0 ? (
                    <p className="empty-state">{t('common.noData')}</p>
                  ) : (
                    <div className="queue-ticket-list">
                      {completed.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} actions={null} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="queue-journal-view">
            <div className="card glass-card">
              <div
                className="card-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3>📜 Navbat jurnali</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {journalDate === new Date().toISOString().split('T')[0] && (
                    <div
                      className="live-indicator"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: 'var(--accent-success)',
                        fontWeight: 600,
                      }}
                    >
                      <span
                        className="pulse-dot"
                        style={{
                          width: 8,
                          height: 8,
                          background: 'var(--accent-success)',
                          borderRadius: '50%',
                          boxShadow: '0 0 8px var(--accent-success)',
                        }}
                      ></span>
                      LIVE
                    </div>
                  )}
                  <input
                    type="date"
                    className="form-input"
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                  />
                  <span className="badge badge-info">{history.length} ta yozuv</span>
                </div>
              </div>

              {/* Journal Stats Dashboard */}
              <div
                style={{
                  padding: '20px 20px 0 20px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 15,
                }}
              >
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: 15,
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('common.all')}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', marginTop: 4 }}>
                    {history.length}
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(255, 159, 10, 0.1)',
                    padding: 15,
                    borderRadius: 12,
                    border: '1px solid rgba(255, 159, 10, 0.2)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('queue.waiting')}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: 'var(--accent-warning)',
                      marginTop: 4,
                    }}
                  >
                    {history.filter((h) => h.status === 'waiting').length}
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(10, 132, 255, 0.1)',
                    padding: 15,
                    borderRadius: 12,
                    border: '1px solid rgba(10, 132, 255, 0.2)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('queue.inProgress')}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: 'var(--accent-primary)',
                      marginTop: 4,
                    }}
                  >
                    {history.filter((h) => h.status === 'in_progress').length}
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(48, 209, 88, 0.1)',
                    padding: 15,
                    borderRadius: 12,
                    border: '1px solid rgba(48, 209, 88, 0.2)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('queue.completed')}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                      color: 'var(--accent-success)',
                      marginTop: 4,
                    }}
                  >
                    {history.filter((h) => h.status === 'completed').length}
                  </div>
                </div>
              </div>

              <div className="card-body p-0">
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sana / Vaqt</th>
                        <th>Raqam</th>
                        <th>Bemor</th>
                        <th>Shifokor</th>
                        <th>Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}
                          >
                            {t('common.noData')}
                          </td>
                        </tr>
                      ) : (
                        history.map((h) => (
                          <tr key={h.id}>
                            <td>{new Date(h.createdAt).toLocaleString('uz-UZ').slice(0, 16)}</td>
                            <td style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                              {h.prefix}-{h.number}
                            </td>
                            <td>{h.patientName || "Noma'lum"}</td>
                            <td>{h.doctorName}</td>
                            <td>
                              <span
                                className={`badge ${
                                  h.status === 'waiting'
                                    ? 'badge-warning'
                                    : h.status === 'in_progress'
                                      ? 'badge-info'
                                      : 'badge-success'
                                }`}
                              >
                                {h.status === 'waiting'
                                  ? 'Kutmoqda'
                                  : h.status === 'in_progress'
                                    ? 'Qabulda'
                                    : 'Yakunlangan'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      <Modal
        isOpen={showNewTicket}
        onClose={() => setShowNewTicket(false)}
        title={t('queue.ticket')}
        width={500}
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Bemor ismi (ixtiyoriy)</label>
            <input
              type="text"
              className="form-input"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Bemor ismi..."
            />
          </div>
          <div className="form-group full-width">
            <label>{t('reception.selectDoctor')}</label>
            <div className="doctor-select-grid">
              {doctors.map((doc) => (
                <button
                  key={doc.id}
                  className={`doctor-select-item ${selectedDoctor?.id === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDoctor(doc)}
                >
                  <div style={{ fontWeight: 600 }}>
                    {doc.prefix || '?'} — {doc.fullName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {doc.specialty}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => setShowNewTicket(false)}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" onClick={prepareTicket}>
            🎫 Ko'rish
          </button>
        </div>
      </Modal>

      {/* Ticket Preview Modal */}
      <Modal
        isOpen={!!previewTicket}
        onClose={() => setPreviewTicket(null)}
        title="Navbat Cheki Namunasi"
        width={400}
      >
        {previewTicket && (
          <div className="ticket-preview-box" style={{ textAlign: 'center', padding: 20 }}>
            <div
              className="ticket-visual"
              style={{
                background: '#fff',
                color: '#000',
                padding: 30,
                borderRadius: 8,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                border: '1px dashed #ccc',
                margin: '0 auto 25px auto',
                width: '80%',
                fontFamily: 'monospace',
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>КЛИНИКА</h2>
              <div
                style={{
                  margin: '15px 0',
                  fontSize: 50,
                  fontWeight: 'bold',
                  borderTop: '2px solid #000',
                  borderBottom: '2px solid #000',
                }}
              >
                {previewTicket.prefix}-{previewTicket.number}
              </div>
              <div style={{ fontSize: 16, marginBottom: 5 }}>{previewTicket.doctorName}</div>
              {previewTicket.patientName && (
                <div style={{ fontSize: 14, fontWeight: 'bold' }}>{previewTicket.patientName}</div>
              )}
              <div
                style={{ fontSize: 12, marginTop: 15, borderTop: '1px solid #eee', paddingTop: 10 }}
              >
                Sana: {new Date().toLocaleDateString()}
                <br />
                Vaqt: {new Date().toLocaleTimeString().slice(0, 5)}
              </div>
            </div>
            <div className="form-actions" style={{ justifyContent: 'center', gap: 15 }}>
              <button className="btn btn-danger" onClick={() => setPreviewTicket(null)}>
                ❌ Atkaz
              </button>
              <button className="btn btn-primary" onClick={finalPrintTicket}>
                🖨️ Chiqarish
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
