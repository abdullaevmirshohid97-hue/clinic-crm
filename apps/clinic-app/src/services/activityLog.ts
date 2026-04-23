import { supabase } from '../lib/supabase';
import { authStore } from '../app/store';

interface ActivityPayload {
  actionType: string;
  entityType: string;
  entityId?: string | null;
  patientName?: string | null;
  actorName?: string | null;
  details?: Record<string, unknown>;
}

export async function logActivity(payload: ActivityPayload) {
  const state = authStore.getState();
  if (!state.clinicId) return;

  await supabase.from('activity_journal').insert({
    clinic_id: state.clinicId,
    actor_id: state.user?.id ?? null,
    actor_name: payload.actorName || state.user?.email || 'unknown',
    actor_role: state.role ?? 'unknown',
    action_type: payload.actionType,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    patient_name: payload.patientName ?? null,
    details: payload.details ?? {},
  });
}
