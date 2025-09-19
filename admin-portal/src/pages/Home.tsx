import React from 'react';
import { getOrCreateMyOrg } from '../org';
import { track } from '../lib/track';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const nav = useNavigate();
  const [orgId, setOrgId] = React.useState<string>('');
  const [role, setRole] = React.useState<'owner'|'admin'|'user'>('user');
  const [me, setMe] = React.useState<{email:string}|null>(null);

  React.useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMe({ email: user.email || '' });
        
        // Ensure profile exists (in case email confirmation was required)
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            user_id: user.id,
            full_name: user.user_metadata?.full_name || null
          }, { onConflict: 'user_id' });
        if (error) console.error('Profile upsert error:', error);
      }
      
      const o = await getOrCreateMyOrg();
      setOrgId(o.orgId);
      setRole(o.role);
      await track(o.orgId, 'login');
    })();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    nav('/login');
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Welcome</h1>
      <div>Your org: <b>{orgId || '—'}</b> | Role: <b>{role}</b></div>
      <div>User: <b>{me?.email}</b></div>
      <div className="flex gap-2">
        <button className="rounded border px-3 py-2" onClick={()=>track(orgId,'car.create')}>Simulate: car.create</button>
        <button className="rounded border px-3 py-2" onClick={()=>track(orgId,'contract.generate')}>Simulate: contract.generate</button>
      </div>
      <div>
        <button className="bg-black text-white rounded px-4 py-2" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}