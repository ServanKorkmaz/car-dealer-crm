import { supabaseAdmin } from './supabaseAdminClient.js';

export async function aggregateDaily(dayIsoDate) {
  const day = dayIsoDate || new Date(Date.now() - 24*60*60*1000).toISOString().slice(0,10);
  const { data, error } = await supabaseAdmin.rpc('aggregate_usage_daily', { day_input: day });
  if (error) throw error;
  return { ok: true, day };
}