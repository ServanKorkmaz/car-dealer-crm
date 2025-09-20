import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { getMyOrg } from '@/lib/orgHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, BarChart3 } from 'lucide-react';

type Member = { user_id: string; role: 'owner'|'admin'|'user'; full_name: string|null; email: string|null };
type ActiveRow = { user_id: string|null; last_seen: string };

export default function AdminPortal() {
  const [orgId, setOrgId] = useState<string>('');
  const [myRole, setMyRole] = useState<'owner'|'admin'|'user'>('user');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Supabase er ikke konfigurert. Admin-portalen krever Supabase-integrasjon.');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { orgId, role } = await getMyOrg();
        setOrgId(orgId);
        setMyRole(role);
      } catch (err) {
        console.error('Failed to get org:', err);
        setError('Kunne ikke hente organisasjonsinformasjon');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Admin Portal ikke tilgjengelig</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-muted-foreground mt-1">Administrer organisasjonen din</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline">Org: {orgId ? orgId.slice(0, 8) : '—'}</Badge>
          <Badge variant={myRole === 'owner' ? 'default' : 'secondary'}>
            {myRole === 'owner' ? 'Eier' : myRole === 'admin' ? 'Admin' : 'Bruker'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Medlemmer
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Aktive nå
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Bruk
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="members">
          <Members orgId={orgId} myRole={myRole} />
        </TabsContent>
        
        <TabsContent value="active">
          <Active orgId={orgId} />
        </TabsContent>
        
        <TabsContent value="usage">
          <Usage orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Members({ orgId, myRole }: { orgId: string; myRole: 'owner'|'admin'|'user' }) {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteRole, setInviteRole] = useState<'owner'|'admin'|'user'>('user');
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const canManage = myRole === 'owner' || myRole === 'admin';

  async function load() {
    if (!orgId || !supabase) return;
    setLoading(true);
    
    try {
      const { data: mems, error } = await supabase
        .from('org_members')
        .select('user_id, role')
        .eq('org_id', orgId);
      
      if (error) throw error;

      const ids = mems?.map(m => m.user_id).filter(Boolean) || [];
      let map: Record<string, {full_name:string|null,email:string|null}> = {};
      
      if (ids.length) {
        const { data: prof } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        (prof||[]).forEach(p => map[p.user_id] = { full_name: p.full_name, email: null });
        for (const id of ids) {
          map[id] = { full_name: map[id]?.full_name ?? null, email: null };
        }
      }

      const merged: Member[] = (mems || []).map(m => ({
        user_id: m.user_id,
        role: m.role as any,
        full_name: map[m.user_id]?.full_name ?? null,
        email: map[m.user_id]?.email ?? null
      }));
      
      setRows(merged);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orgId]);

  async function changeRole(user_id: string, role: 'owner'|'admin'|'user') {
    if (!supabase) return;
    await supabase.from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', user_id);
    await load();
  }

  async function removeUser(user_id: string) {
    if (!supabase) return;
    await supabase.from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('user_id', user_id);
    await load();
  }

  async function createInvite() {
    if (!canManage || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase.from('org_invites').insert({
      org_id: orgId,
      role: inviteRole,
      created_by: user.id
    }).select('token').single();
    
    if (error || !data) return;
    const url = `${window.location.origin}/join?token=${data.token}`;
    setInviteUrl(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisasjonsmedlemmer</CardTitle>
        <CardDescription>Administrer brukere og roller i organisasjonen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => (
          <div key={r.user_id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">{r.full_name || 'Bruker'}</div>
              <div className="text-xs text-muted-foreground">{r.user_id}</div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={r.role}
                onValueChange={(value) => changeRole(r.user_id, value as any)}
                disabled={!canManage}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Eier</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Bruker</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => removeUser(r.user_id)} 
                disabled={!canManage}
              >
                Fjern
              </Button>
            </div>
          </div>
        ))}
        
        {!rows.length && (
          <div className="text-center py-8 text-muted-foreground">
            Ingen medlemmer funnet
          </div>
        )}

        {canManage && (
          <div className="mt-6 pt-6 border-t space-y-4">
            <h3 className="font-medium">Inviter via lenke</h3>
            <div className="flex items-center gap-2">
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Bruker</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Eier</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={createInvite}>Opprett invitasjonslenke</Button>
            </div>
            
            {inviteUrl && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Del denne lenken:</p>
                <code className="text-xs break-all">{inviteUrl}</code>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Active({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<ActiveRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!orgId || !supabase) return;
    setLoading(true);
    
    try {
      const sinceIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('usage_events')
        .select('user_id, created_at')
        .eq('org_id', orgId)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const seen = new Set();
      const unique: ActiveRow[] = [];
      for (const d of (data || [])) {
        if (!seen.has(d.user_id)) {
          seen.add(d.user_id);
          unique.push({ user_id: d.user_id, last_seen: d.created_at });
        }
      }
      
      setRows(unique);
    } catch (err) {
      console.error('Failed to load active users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [orgId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktive brukere</CardTitle>
        <CardDescription>Brukere som har vært aktive de siste 15 minuttene</CardDescription>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          {loading ? 'Oppdaterer...' : 'Oppdater'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="font-medium">Bruker: {r.user_id || 'Anonym'}</div>
            <div className="text-sm text-muted-foreground">
              Sist sett: {new Date(r.last_seen).toLocaleString('nb-NO')}
            </div>
          </div>
        ))}
        
        {!rows.length && (
          <div className="text-center py-8 text-muted-foreground">
            Ingen aktive brukere de siste 15 minuttene
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Usage({ orgId }: { orgId: string }) {
  const [today, setToday] = useState<number>(0);
  const [week, setWeek] = useState<Array<{ day: string; value: number }>>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!orgId || !supabase) return;
    
    try {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Today's usage
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

      // Last 7 days
      const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data: weekAgg } = await supabase
        .from('usage_daily')
        .select('day, value')
        .eq('org_id', orgId)
        .eq('metric', 'api.calls')
        .gte('day', sevenDaysAgo)
        .order('day', { ascending: true });

      const map: Record<string, number> = {};
      (weekAgg || []).forEach(r => { map[r.day] = Number(r.value); });
      
      const days: Array<{day: string, value: number}> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        days.push({ day: d, value: map[d] ?? 0 });
      }
      
      setWeek(days);
    } catch (err) {
      console.error('Failed to load usage:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orgId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bruksstatistikk</CardTitle>
        <CardDescription>API-kall og systembruk</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>API-kall i dag</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{today}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Siste 7 dager</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {week.map(d => (
                <div key={d.day} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{d.day}</span>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}