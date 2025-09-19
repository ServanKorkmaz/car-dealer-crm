import { supabase } from './supabaseClient';

export async function getMyOrg(): Promise<{ orgId: string; role: 'owner'|'admin'|'user' }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: m, error } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1);
  if (error) throw error;
  if (!m || !m.length) throw new Error('No org membership');

  return { orgId: m[0].org_id, role: m[0].role as any };
}