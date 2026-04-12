import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function processExpiredSubscriptions() {
  try {
    const now = new Date().toISOString();

    const { data: expiredSubs, error } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .in('status', ['active', 'trial'])
      .lt('current_period_end', now);

    if (error) { console.error('Cron: Error fetching expired subs:', error.message); return; }
    if (!expiredSubs?.length) return;

    const ids = expiredSubs.map(s => s.id);

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired' })
      .in('id', ids);

    if (updateError) { console.error('Cron: Error updating subs:', updateError.message); return; }
    console.log('Cron: Expired ' + ids.length + ' subscriptions');
  } catch (err) {
    console.error('Cron: Unexpected error:', err);
  }
}
