import React from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getMyOrg } from '../../lib/orgHelpers';

type Member = { user_id: string; role: 'owner'|'admin'|'user'; full_name: string|null; email: string|null };
type ActiveRow = { user_id: string|null; last_seen: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminPage() {
  const [orgId, setOrgId] = React.useState<string>('');
  const [myRole, setMyRole] = React.useState<'owner'|'admin'|'user'>('user');
  const [tab, setTab] = React.useState<'members'|'active'|'usage'>('members');

  React.useEffect(() => {
    (async () => {
      try {
        const { orgId, role } = await getMyOrg();
        setOrgId(orgId);
        setMyRole(role);
      } catch (err) {
        console.error('Failed to get org:', err);
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="text-sm opacity-80">Org: {orgId || '—'} · You: {myRole}</div>
      </div>

      <div className="flex gap-2">
        {['members','active','usage'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`px-3 py-2 rounded border ${tab===t ? 'bg-black text-white' : ''}`}
          >
            {t === 'members' ? 'Members' : t === 'active' ? 'Active now' : 'Usage'}
          </button>
        ))}
      </div>

      {tab === 'members' && <Members orgId={orgId} myRole={myRole} />}
      {tab === 'active' && <Active orgId={orgId} />}
      {tab === 'usage' && <Usage orgId={orgId} />}
    </div>
  );
}

function Members({ orgId, myRole }: { orgId: string; myRole: 'owner'|'admin'|'user' }) {
  const [rows, setRows] = React.useState<Member[]>([]);
  const [, setLoading] = React.useState(false);
  const [inviteRole, setInviteRole] = React.useState<'owner'|'admin'|'user'>('user');
  const [inviteUrl, setInviteUrl] = React.useState<string>('');
  const canManage = myRole === 'owner' || myRole === 'admin';

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const { data: mems, error } = await supabase
      .from('org_members')
      .select('user_id, role')
      .eq('org_id', orgId);
    if (error) { setLoading(false); return; }

    const ids = mems.map(m => m.user_id).filter(Boolean);
    let map: Record<string, {full_name:string|null,email:string|null}> = {};
    if (ids.length) {
      const { data: prof } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      (prof||[]).forEach(p => map[p.user_id] = { full_name: p.full_name, email: null });
      // Try pulling email via auth.getUser for each row (client-side)
      for (const id of ids) {
        map[id] = { full_name: map[id]?.full_name ?? null, email: null };
      }
    }

    // Since we cannot read other users' emails via client SDK directly,
    // display name from profiles and mask user_id.
    const merged: Member[] = mems.map(m => ({
      user_id: m.user_id,
      role: m.role as any,
      full_name: map[m.user_id]?.full_name ?? null,
      email: map[m.user_id]?.email ?? null
    }));
    setRows(merged);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [orgId]);

  async function changeRole(user_id: string, role: 'owner'|'admin'|'user') {
    await supabase.from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', user_id);
    await load();
  }

  async function removeUser(user_id: string) {
    await supabase.from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', user_id);
    await load();
  }

  async function createInvite() {
    if (!canManage) return;
    const { data, error } = await supabase.from('org_invites').insert({
      org_id: orgId,
      role: inviteRole,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }).select('token').single();
    if (error || !data) return;
    const url = `${window.location.origin}/join?token=${data.token}`;
    setInviteUrl(url);
  }

  return (
    <Section title="Members">
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.user_id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div><b>{r.full_name || 'User'}</b></div>
              <div className="text-xs opacity-70">{r.user_id}</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded px-2 py-1"
                value={r.role}
                onChange={(e)=>changeRole(r.user_id, e.target.value as any)}
                disabled={!canManage}
              >
                <option value="owner">owner</option>
                <option value="admin">admin</option>
                <option value="user">user</option>
              </select>
              <button className="border rounded px-3 py-1" onClick={()=>removeUser(r.user_id)} disabled={!canManage}>Remove</button>
            </div>
          </div>
        ))}
        {!rows.length && <div>No members yet.</div>}
      </div>

      {canManage && (
        <div className="mt-6 space-y-2">
          <div className="font-medium">Invite via link</div>
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1" value={inviteRole} onChange={(e)=>setInviteRole(e.target.value as any)}>
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
            <button className="bg-black text-white rounded px-3 py-1" onClick={createInvite}>Create invite link</button>
          </div>
          {inviteUrl && (
            <div className="text-sm">
              <span className="opacity-70">Share this link:</span><br/>
              <code className="break-all">{inviteUrl}</code>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function Active({ orgId }: { orgId: string }) {
  const [rows, setRows] = React.useState<ActiveRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    const sinceIso = new Date(Date.now()-15*60*1000).toISOString();
    const { data, error } = await supabase
      .from('usage_events')
      .select('user_id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false });
    if (error) { setLoading(false); return; }
    
    // Deduplicate by user_id
    const seen = new Set();
    const unique: ActiveRow[] = [];
    for (const d of (data || [])) {
      if (!seen.has(d.user_id)) {
        seen.add(d.user_id);
        unique.push({ user_id: d.user_id, last_seen: d.created_at });
      }
    }
    setRows(unique);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [orgId]);

  return (
    <Section title="Active now (last 15 min)">
      <button className="border rounded px-3 py-1" onClick={load} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
      <div className="grid gap-2 mt-3">
        {rows.map((r, i) => (
          <div key={i} className="border rounded p-3">
            <div><b>User:</b> {r.user_id || 'Anonymous'}</div>
            <div><b>Last seen:</b> {new Date(r.last_seen).toLocaleString()}</div>
          </div>
        ))}
        {!rows.length && <div>No active users in the last 15 minutes.</div>}
      </div>
    </Section>
  );
}

function Usage({ orgId }: { orgId: string }) {
  const [today, setToday] = React.useState<number>(0);
  const [week, setWeek] = React.useState<Array<{ day: string; value: number }>>([]);

  async function load() {
    if (!orgId) return;
    const todayStr = new Date().toISOString().slice(0,10);

    // Today (fallback: count usage_events where created_at = today)
    const { data: todayAgg } = await supabase
      .from('usage_daily')
      .select('value')
      .eq('org_id', orgId)
      .eq('day', todayStr)
      .eq('metric', 'api.calls')
      .limit(1);
    if (todayAgg && todayAgg.length) {
      setToday(Number(todayAgg[0].value));
    } else {
      const { count } = await supabase
        .from('usage_events')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', `${todayStr}T00:00:00Z`)
        .lt('created_at', `${todayStr}T23:59:59Z`);
      setToday(count || 0);
    }

    // Last 7 days from usage_daily
    const sevenDaysAgo = new Date(Date.now() - 6*24*60*60*1000).toISOString().slice(0,10);
    const { data: weekAgg } = await supabase
      .from('usage_daily')
      .select('day, value')
      .eq('org_id', orgId)
      .eq('metric', 'api.calls')
      .gte('day', sevenDaysAgo)
      .order('day', { ascending: true });

    const map: Record<string, number> = {};
    (weekAgg || []).forEach(r => { map[r.day] = Number(r.value); });
    const days: Array<{day:string,value:number}> = [];
    for (let i=6;i>=0;i--) {
      const d = new Date(Date.now() - i*24*60*60*1000).toISOString().slice(0,10);
      days.push({ day: d, value: map[d] ?? 0 });
    }
    setWeek(days);
  }

  React.useEffect(() => { load(); }, [orgId]);

  return (
    <Section title="Usage">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <div className="text-sm opacity-70">API calls today</div>
          <div className="text-3xl font-bold">{today}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm opacity-70 mb-2">Last 7 days (api.calls)</div>
          <div className="space-y-1">
            {week.map(d => (
              <div key={d.day} className="flex justify-between text-sm">
                <span>{d.day}</span><span>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}