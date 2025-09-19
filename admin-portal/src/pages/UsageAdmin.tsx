import React from 'react';
import { getOrCreateMyOrg } from '../org';

type ActiveRow = { user_id: string|null; last_seen: string; name: string|null };

export default function UsageAdmin() {
  const [orgId, setOrgId] = React.useState('');
  const [rows, setRows] = React.useState<ActiveRow[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const o = await getOrCreateMyOrg();
      setOrgId(o.orgId);
      await refresh(o.orgId);
      const t = setInterval(()=>refresh(o.orgId), 5000);
      return () => clearInterval(t);
    })();
  }, []);

  async function refresh(oid: string) {
    if (!oid) return;
    setLoading(true);
    const res = await fetch(`/api/admin/active?orgId=${oid}`);
    const json = await res.json();
    setRows(json.active || []);
    setLoading(false);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Active users (last 15 min)</h1>
      <div className="text-sm opacity-80">Org: {orgId}</div>
      <button className="rounded border px-3 py-2" onClick={()=>refresh(orgId)} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh now'}
      </button>
      <div className="grid gap-2">
        {rows.map((r, i) => (
          <div key={i} className="rounded border px-3 py-2">
            <div><b>User:</b> {r.name || r.user_id || 'Anonymous'}</div>
            <div><b>Last seen:</b> {new Date(r.last_seen).toLocaleString()}</div>
          </div>
        ))}
        {!rows.length && <div>No active users in the last 15 minutes.</div>}
      </div>
    </div>
  );
}