import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { authStore } from '../../app/store';
import { logActivity } from '../../services/activityLog';
import { toast } from 'react-hot-toast';

type NurseTask = {
  id: string;
  title: string;
  dosage: string | null;
  frequency_per_day: number;
  scheduled_time: string | null;
  method: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  consultation_id: string;
  doctor_consultations?: {
    patient_id?: string | null;
    patients?: { full_name?: string | null } | null;
  } | null;
};

export default function NurseWorkspace() {
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [loading, setLoading] = useState(true);

  const state = authStore.getState();
  const clinicId = state.clinicId;
  const nurseId = state.user?.id;

  const loadTasks = async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('treatment_plan_items')
      .select(
        'id, title, dosage, frequency_per_day, scheduled_time, method, status, consultation_id, doctor_consultations(patient_id, patients(full_name))'
      )
      .eq('clinic_id', clinicId)
      .in('status', ['planned', 'in_progress'])
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .limit(100);

    if (error) {
      toast.error("Hamshira vazifalari yuklanmadi");
    } else {
      setTasks((data as NurseTask[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const updateTaskStatus = async (task: NurseTask, nextStatus: NurseTask['status']) => {
    if (!clinicId) return;
    const { error } = await supabase
      .from('treatment_plan_items')
      .update({
        status: nextStatus,
        assigned_nurse_id: nurseId || null,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
      .eq('clinic_id', clinicId);

    if (error) {
      toast.error('Statusni yangilashda xatolik');
      return;
    }

    if (nextStatus === 'completed') {
      await supabase.from('nurse_treatment_logs').insert({
        clinic_id: clinicId,
        plan_item_id: task.id,
        nurse_id: nurseId || null,
        status: 'completed',
        notes: 'Nurse workspace orqali bajarildi',
      });
    }

    await logActivity({
      actionType: 'nurse_treatment_status_updated',
      entityType: 'treatment_plan_item',
      entityId: task.id,
      patientName: task.doctor_consultations?.patients?.full_name ?? null,
      details: {
        from: task.status,
        to: nextStatus,
        title: task.title,
      },
    });

    toast.success(`Vazifa holati: ${nextStatus}`);
    await loadTasks();
  };

  return (
    <div className="page nurse-workspace-page">
      <div className="page-header">
        <h1>Nurse Workspace</h1>
      </div>

      {loading ? (
        <div className="card glass-card">
          <div className="card-body">Yuklanmoqda...</div>
        </div>
      ) : (
        <div className="nurse-task-grid">
          {tasks.length === 0 && (
            <div className="card glass-card">
              <div className="card-body">Hozircha vazifalar yo'q</div>
            </div>
          )}

          {tasks.map((task) => (
            <article key={task.id} className="card glass-card nurse-task-card">
              <div className="card-header">
                <strong>{task.title}</strong>
                <span className={`status-${task.status}`}>{task.status}</span>
              </div>
              <div className="card-body">
                <p>
                  <b>Bemor:</b> {task.doctor_consultations?.patients?.full_name || 'Noma`lum'}
                </p>
                <p>
                  <b>Doza:</b> {task.dosage || '-'}
                </p>
                <p>
                  <b>Kuniga:</b> {task.frequency_per_day} mahal
                </p>
                <p>
                  <b>Soat:</b> {task.scheduled_time || '-'}
                </p>
                <p>
                  <b>Uslub:</b> {task.method || '-'}
                </p>

                <div className="nurse-task-actions">
                  {task.status === 'planned' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => updateTaskStatus(task, 'in_progress')}
                    >
                      Boshlash
                    </button>
                  )}
                  {task.status !== 'completed' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => updateTaskStatus(task, 'completed')}
                    >
                      Muolaja qilindi
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
