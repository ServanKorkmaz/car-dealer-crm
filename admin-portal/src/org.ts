import { supabase } from './lib/supabaseClient';

export async function getOrCreateMyOrg(): Promise<{ orgId: string; role: 'owner'|'admin'|'user' }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: memberships, error } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1);
  if (error) throw error;

  if (memberships && memberships.length) {
    return { orgId: memberships[0].org_id, role: memberships[0].role as any };
  }

  const { data: org, error: insErr } = await supabase
    .from('orgs')
    .insert({ name: 'Default Org' })
    .select('id')
    .single();
  if (insErr) throw insErr;

  return { orgId: org.id, role: 'owner' };
}