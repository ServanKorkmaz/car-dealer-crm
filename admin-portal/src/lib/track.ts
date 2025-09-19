import { supabase } from './supabaseClient';

export async function track(orgId: string, event: string, amount = 1, metadata: Record<string, any> = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('usage_events').insert({
    org_id: orgId,
    user_id: user?.id ?? null,
    event,
    amount,
    metadata
  });
}