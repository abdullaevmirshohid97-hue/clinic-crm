import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { authStore } from '../../app/store';
import { logActivity } from '../../services/activityLog';
import { toast } from 'react-hot-toast';

type QueueRow = {
  id: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  number: number;
  patient_id: string | null;
  patients?: { full_name?: string | null } | null;
};

type PlanItemDraft = {
  title: string;
  dosage: string;
  frequencyPerDay: number;
  scheduledTime: string;
  method: string;
  checkupNotes: string;
};

const emptyPlanItem = (): PlanItemDraft => ({
  title: '',
  dosage: '',
  frequencyPerDay: 1,
  scheduledTime: '',
  method: '',
  checkupNotes: '',
});

export default function DoctorWorkspace() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [inpatientRequired, setInpatientRequired] = useState(false);
  const [planItems, setPlanItems] = useState<PlanItemDraft[]>([emptyPlanItem()]);
  const [saving, setSaving] = useState(false);

  const state = authStore.getState();
  const clinicId = state.clinicId;
  const doctorId = state.user?.id;

  const selectedQueue = useMemo(
    () => queue.find((item) => item.id === selectedQueueId) ?? null,
    [queue, selectedQueueId]
  );

  const loadQueue = async () => {
    if (!clinicId || !doctorId) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('queues')
      .select('id, status, number, patient_id, patients(full_name)')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .in('status', ['waiting', 'in_progress'])
      .order('created_at', { ascending: true });

    if (error) {
      toast.error("Navbatni yuklab bo'lmadi");
      return;
    }
    setQueue((data as QueueRow[]) ?? []);
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const addPlanItem = () => setPlanItems((prev) => [...prev, emptyPlanItem()]);

  const updatePlanItem = (index: number, key: keyof PlanItemDraft, value: string | number) => {
    setPlanItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  const saveConsultation = async () => {
    if (!clinicId || !doctorId || !selectedQueue) {
      toast.error('Avval navbatdagi bemorni tanlang');
      return;
    }
    if (!diagnosis.trim()) {
      toast.error('Tashxis majburiy');
      return;
    }

    setSaving(true);
    try {
      const { data: consultation, error: consultationError } = await supabase
        .from('doctor_consultations')
        .insert({
          clinic_id: clinicId,
          queue_id: selectedQueue.id,
          patient_id: selectedQueue.patient_id,
          doctor_id: doctorId,
          diagnosis,
          prescription,
          inpatient_required: inpatientRequired,
          status: 'completed',
        })
        .select('id')
        .single();

      if (consultationError || !consultation) throw consultationError;

      if (inpatientRequired) {
        const cleanItems = planItems.filter((item) => item.title.trim());
        if (cleanItems.length > 0) {
          const payload = cleanItems.map((item) => ({
            clinic_id: clinicId,
            consultation_id: consultation.id,
            title: item.title,
            dosage: item.dosage || null,
            frequency_per_day: Math.max(Number(item.frequencyPerDay) || 1, 1),
            scheduled_time: item.scheduledTime || null,
            method: item.method || null,
            checkup_notes: item.checkupNotes || null,
            status: 'planned',
          }));
          const { error: planError } = await supabase.from('treatment_plan_items').insert(payload);
          if (planError) throw planError;
        }
      }

      const { error: queueError } = await supabase
        .from('queues')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', selectedQueue.id)
        .eq('clinic_id', clinicId);
      if (queueError) throw queueError;

      await logActivity({
        actionType: 'doctor_consultation_completed',
        entityType: 'doctor_consultation',
        entityId: consultation.id,
        patientName: selectedQueue.patients?.full_name ?? null,
        details: {
          inpatientRequired,
          treatmentItems: planItems.filter((item) => item.title.trim()).length,
        },
      });

      toast.success("Ko'rik saqlandi va navbat yakunlandi");
      setDiagnosis('');
      setPrescription('');
      setInpatientRequired(false);
      setPlanItems([emptyPlanItem()]);
      setSelectedQueueId('');
      await loadQueue();
    } catch (error) {
      toast.error('Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page doctor-workspace-page">
      <div className="page-header">
        <h1>Doctor Workspace</h1>
      </div>
      <div className="doctor-layout">
        <div className="card glass-card">
          <div className="card-header">Bugungi navbat</div>
          <div className="card-body doctor-queue-list">
            {queue.length === 0 && <p>Navbat topilmadi</p>}
            {queue.map((item) => (
              <button
                key={item.id}
                className={`doctor-queue-item ${selectedQueueId === item.id ? 'active' : ''}`}
                onClick={() => setSelectedQueueId(item.id)}
              >
                <span>#{item.number}</span>
                <span>{item.patients?.full_name || 'Noma`lum bemor'}</span>
                <span className={`status-${item.status}`}>{item.status}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card glass-card">
          <div className="card-header">Qabul formasi</div>
          <div className="card-body doctor-form">
            <label>Tashxis</label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={4}
              className="form-input"
            />

            <label>Retsept</label>
            <textarea
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              rows={4}
              className="form-input"
            />

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={inpatientRequired}
                onChange={(e) => setInpatientRequired(e.target.checked)}
              />
              Statsionarda davolash kerak
            </label>

            {inpatientRequired && (
              <div className="doctor-plan-grid">
                {planItems.map((item, index) => (
                  <div key={index} className="doctor-plan-item">
                    <input
                      className="form-input"
                      placeholder="Muolaja nomi"
                      value={item.title}
                      onChange={(e) => updatePlanItem(index, 'title', e.target.value)}
                    />
                    <input
                      className="form-input"
                      placeholder="Doza"
                      value={item.dosage}
                      onChange={(e) => updatePlanItem(index, 'dosage', e.target.value)}
                    />
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      placeholder="Kuniga necha mahal"
                      value={item.frequencyPerDay}
                      onChange={(e) =>
                        updatePlanItem(index, 'frequencyPerDay', Number(e.target.value) || 1)
                      }
                    />
                    <input
                      className="form-input"
                      type="time"
                      value={item.scheduledTime}
                      onChange={(e) => updatePlanItem(index, 'scheduledTime', e.target.value)}
                    />
                    <input
                      className="form-input"
                      placeholder="Uslub (IV/IM/per os...)"
                      value={item.method}
                      onChange={(e) => updatePlanItem(index, 'method', e.target.value)}
                    />
                    <input
                      className="form-input"
                      placeholder="Tekshiruv izohi"
                      value={item.checkupNotes}
                      onChange={(e) => updatePlanItem(index, 'checkupNotes', e.target.value)}
                    />
                  </div>
                ))}
                <button className="btn btn-secondary" onClick={addPlanItem}>
                  + Muolaja qatori qo'shish
                </button>
              </div>
            )}

            <button className="btn btn-primary" onClick={saveConsultation} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : "Qabulni yakunlash va saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
