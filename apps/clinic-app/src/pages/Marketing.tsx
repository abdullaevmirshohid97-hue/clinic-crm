import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import type { PatientLTVRecord, CampaignRecord } from '../types/clinic';

export default function Marketing() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('segments');
  const [loading, setLoading] = useState(true);

  const [patientsLTV, setPatientsLTV] = useState<PatientLTVRecord[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    id: null as number | null,
    name: '',
    type: 'sms',
    targetGroup: 'all',
    content: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'segments') {
        const [patientsResult, txnsResult] = await Promise.all([
          supabase.from('patients').select('id, fullName, phone, createdAt'),
          supabase.from('transactions').select('patientId, amount, createdAt'),
        ]);

        if (patientsResult.error) throw patientsResult.error;
        if (txnsResult.error) throw txnsResult.error;

        const ltvMap = new Map<number, { ltv: number; lastVisit: string | null }>();
        (txnsResult.data ?? []).forEach((t) => {
          const pid = t.patientId as number;
          const existing = ltvMap.get(pid) ?? { ltv: 0, lastVisit: null };
          const amt = (t.amount as number) || 0;
          const ts = t.createdAt as string | null;
          ltvMap.set(pid, {
            ltv: existing.ltv + amt,
            lastVisit:
              !existing.lastVisit || (ts && ts > existing.lastVisit)
                ? (ts ?? existing.lastVisit)
                : existing.lastVisit,
          });
        });

        const records: PatientLTVRecord[] = (patientsResult.data ?? []).map((p) => {
          const entry = ltvMap.get(p.id as number);
          return {
            id: p.id as number,
            fullName: p.fullName as string,
            phone: (p.phone as string | null) ?? undefined,
            createdAt: (p.createdAt as string | null) ?? undefined,
            ltv: entry?.ltv ?? 0,
            lastVisit: entry?.lastVisit ?? undefined,
          };
        });

        records.sort((a, b) => b.ltv - a.ltv);
        setPatientsLTV(records);
      } else {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .select('*')
          .order('id', { ascending: false });
        if (error) throw error;
        setCampaigns((data ?? []) as CampaignRecord[]);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [activeTab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveCampaign() {
    if (!campaignForm.name || !campaignForm.content) return toast.error("To'ldiring");
    try {
      if (campaignForm.id) {
        const { error } = await supabase
          .from('marketing_campaigns')
          .update({
            name: campaignForm.name,
            type: campaignForm.type,
            targetGroup: campaignForm.targetGroup,
            content: campaignForm.content,
          })
          .eq('id', campaignForm.id);
        if (error) throw error;
        toast.success('Yangilandi');
      } else {
        const { error } = await supabase.from('marketing_campaigns').insert({
          name: campaignForm.name,
          type: campaignForm.type,
          targetGroup: campaignForm.targetGroup,
          content: campaignForm.content,
          startDate: new Date().toISOString(),
          status: 'active',
        });
        if (error) throw error;
        toast.success('Kampaniya boshlandi!');
      }
      setShowCampaignModal(false);
      loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function stopCampaign(id: number | string) {
    if (!window.confirm("Buni to'xtatmoqchimisiz?")) return;
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status: 'completed', endDate: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success("Kampaniya to'xtatildi");
      loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function deleteCampaign(id: number | string) {
    if (!window.confirm("Kampaniyani o'chirishni tasdiqlaysizmi?")) return;
    try {
      const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
      if (error) throw error;
      toast.success("Kampaniya o'chirildi");
      loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function formatPrice(n: number | string | null | undefined) {
    return Number(n || 0).toLocaleString('uz-UZ');
  }

  const top10 = patientsLTV.slice(0, 10);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const inactivePatients = patientsLTV.filter(
    (p) => p.lastVisit && new Date(p.lastVisit) < threeMonthsAgo
  );

  return (
    <div className="page page-marketing">
      <div className="page-header">
        <h1 style={{ fontSize: 32 }}>📣 Marketing & CRM</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'campaigns' && (
            <button
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: 16 }}
              onClick={() => {
                setCampaignForm({
                  id: null,
                  name: '',
                  type: 'sms',
                  targetGroup: 'all',
                  content: '',
                });
                setShowCampaignModal(true);
              }}
            >
              + Yangi Kampaniya
            </button>
          )}
        </div>
      </div>

      <div className="settings-layout" style={{ display: 'flex', gap: 20 }}>
        <div
          className="settings-sidebar card glass-card"
          style={{ width: 320, alignSelf: 'flex-start', padding: 20 }}
        >
          <div
            className="settings-nav"
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <button
              onClick={() => setActiveTab('segments')}
              style={{
                textAlign: 'left',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: '20px',
                borderRadius: '16px',
                border:
                  activeTab === 'segments'
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-color)',
                background:
                  activeTab === 'segments' ? 'var(--accent-primary-glow)' : 'var(--bg-input)',
                display: 'flex',
                gap: 15,
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: activeTab === 'segments' ? '0 8px 20px rgba(37,99,235,0.15)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  padding: 12,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                }}
              >
                👥
              </span>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color:
                      activeTab === 'segments' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  }}
                >
                  Segmentlash
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  VIP va Passiv bemorlarni tahlil qilish.
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              style={{
                textAlign: 'left',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: '20px',
                borderRadius: '16px',
                border:
                  activeTab === 'campaigns'
                    ? '1px solid var(--accent-success)'
                    : '1px solid var(--border-color)',
                background: activeTab === 'campaigns' ? 'rgba(34,197,94,0.1)' : 'var(--bg-input)',
                display: 'flex',
                gap: 15,
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: activeTab === 'campaigns' ? '0 8px 20px rgba(34,197,94,0.15)' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  padding: 12,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                }}
              >
                💌
              </span>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color:
                      activeTab === 'campaigns' ? 'var(--accent-success)' : 'var(--text-primary)',
                  }}
                >
                  SMS Kampaniyalar
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  Xabarnomalar va chegirmalar boshqaruvi.
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="settings-content" style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'segments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                <div
                  className="card glass-card p-5"
                  style={{ borderLeft: '6px solid var(--accent-success)' }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Jami bemorlar
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900, marginTop: 10 }}>
                    {patientsLTV.length} <small style={{ fontSize: 16, opacity: 0.6 }}>ta</small>
                  </div>
                </div>
                <div
                  className="card glass-card p-5"
                  style={{ borderLeft: '6px solid var(--accent-warning)' }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Passiv (3+ oy)
                  </div>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 900,
                      marginTop: 10,
                      color: 'var(--accent-warning)',
                    }}
                  >
                    {inactivePatients.length}{' '}
                    <small style={{ fontSize: 16, opacity: 0.6 }}>ta</small>
                  </div>
                </div>
                <div
                  className="card glass-card p-5"
                  style={{ borderLeft: '6px solid var(--accent-primary)' }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    O'rtacha LTV
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, marginTop: 10 }}>
                    {formatPrice(
                      patientsLTV.reduce((a, b) => a + b.ltv, 0) / (patientsLTV.length || 1)
                    )}{' '}
                    <small style={{ fontSize: 14 }}>so'm</small>
                  </div>
                </div>
              </div>

              <div className="card glass-card">
                <div
                  className="card-header p-4"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <h3 style={{ fontSize: 20 }}>🏆 VIP Bemorlar (Top-10)</h3>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead style={{ background: 'var(--bg-input)' }}>
                      <tr style={{ height: 55 }}>
                        <th>F.I.O</th>
                        <th>Telefon</th>
                        <th style={{ textAlign: 'right' }}>LTV (Jami daromad)</th>
                        <th style={{ textAlign: 'center' }}>Oxirgi tashrif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top10.length === 0 && !loading && (
                        <tr>
                          <td colSpan={4} className="p-10 text-center opacity-50">
                            Ma&apos;lumot topilmadi
                          </td>
                        </tr>
                      )}
                      {top10.map((p) => (
                        <tr key={p.id} style={{ height: 65, fontSize: 15 }}>
                          <td>
                            <div style={{ fontWeight: 800 }}>{p.fullName}</div>
                          </td>
                          <td>{p.phone || '—'}</td>
                          <td
                            style={{
                              fontWeight: 900,
                              color: 'var(--accent-success)',
                              textAlign: 'right',
                              fontSize: 18,
                            }}
                          >
                            {formatPrice(p.ltv)} so'm
                          </td>
                          <td style={{ textAlign: 'center', opacity: 0.7 }}>
                            {p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('uz-UZ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="card glass-card">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead style={{ background: 'var(--bg-input)' }}>
                    <tr style={{ height: 55 }}>
                      <th>Kampaniya Nomi</th>
                      <th>Xabar Matni</th>
                      <th>Turi</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} style={{ height: 75 }}>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</div>
                        </td>
                        <td style={{ maxWidth: 300 }}>
                          <div
                            style={{
                              fontSize: 13,
                              opacity: 0.8,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {c.content}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge badge-outline"
                            style={{ textTransform: 'uppercase' }}
                          >
                            {c.type}
                          </span>
                        </td>
                        <td>{c.targetGroup}</td>
                        <td>
                          <span
                            className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-outline'}`}
                            style={{ padding: '4px 12px' }}
                          >
                            {c.status === 'active' ? '🔄 FAOL' : '✅ TUGAGAN'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            {c.status === 'active' && (
                              <button
                                className="btn btn-sm btn-ghost text-danger"
                                onClick={() => stopCampaign(c.id)}
                              >
                                ⏹️ To&apos;xtatish
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-ghost text-danger"
                              onClick={() => deleteCampaign(c.id)}
                            >
                              🗑️ O&apos;chirish
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="p-10 text-center opacity-50">
                          Kampaniyalar mavjud emas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        title="Yangi Marketing Kampaniyasi"
        width={600}
      >
        <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="form-group">
            <label>Kampaniya Nomi</label>
            <input
              type="text"
              className="form-input"
              style={{ padding: 12 }}
              value={campaignForm.name}
              onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
              placeholder="Masalan: Bahorgi chegirmalar"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
            <div className="form-group">
              <label>Yuborish usuli</label>
              <select
                className="form-input"
                value={campaignForm.type}
                onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}
              >
                <option value="sms">📱 SMS Xabarnoma</option>
                <option value="telegram">✈️ Telegram Bot</option>
                <option value="call">📞 Shaxsiy qo'ng'iroq</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target (Guruh)</label>
              <select
                className="form-input"
                value={campaignForm.targetGroup}
                onChange={(e) => setCampaignForm({ ...campaignForm, targetGroup: e.target.value })}
              >
                <option value="all">Barcha bemorlar ({patientsLTV.length})</option>
                <option value="vip">Faqat VIP bemorlar ({top10.length})</option>
                <option value="inactive">Passiv bemorlar ({inactivePatients.length})</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Xabar Matni</label>
            <textarea
              className="form-input"
              rows={5}
              style={{ padding: 12 }}
              value={campaignForm.content}
              onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
              placeholder="Xabar matni..."
            ></textarea>
          </div>

          <div
            className="p-4"
            style={{
              background: 'rgba(37,99,235,0.05)',
              border: '1px solid var(--accent-primary-glow)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent-primary)',
                marginBottom: 5,
              }}
            >
              ℹ️ Muhim ma&apos;lumot
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              SMS kampaniyalar tanlangan provayder API orqali real vaqtda jo&apos;natiladi. Iltimos
              matnni va targetni qayta tekshiring.
            </div>
          </div>
        </div>
        <div
          className="form-actions p-5"
          style={{
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button className="btn btn-ghost" onClick={() => setShowCampaignModal(false)}>
            Bekor qilish
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 30px' }}
            onClick={saveCampaign}
          >
            🚀 Kampaniyani boshlash
          </button>
        </div>
      </Modal>
    </div>
  );
}
