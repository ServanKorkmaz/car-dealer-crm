import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import cron from 'node-cron';
import { supabaseAdmin } from './supabaseAdminClient.js';
import { aggregateDaily } from './aggregateDaily.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/admin/active', async (req, res) => {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const orgId = String(req.query.orgId || '');
    if (!orgId) return res.status(400).json({ error: 'Missing orgId' });
    
    // Check if user is admin/owner of the org
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();
    
    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const since = new Date(Date.now() - 15*60*1000).toISOString();
    
    // Get unique users with their last activity
    const { data: events, error } = await supabaseAdmin
      .from('usage_events')
      .select('user_id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', since);
    if (error) return res.status(500).json({ error: error.message });

    // Deduplicate users and get their last activity
    const userMap = new Map();
    (events || []).forEach(e => {
      if (!e.user_id) return;
      const existing = userMap.get(e.user_id);
      if (!existing || new Date(e.created_at) > new Date(existing)) {
        userMap.set(e.user_id, e.created_at);
      }
    });

    const userIds = Array.from(userMap.keys());
    let profiles = {};
    if (userIds.length) {
      const { data: profs, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      if (pErr) return res.status(500).json({ error: pErr.message });
      (profs || []).forEach(p => { profiles[p.user_id] = p.full_name || null; });
    }

    const active = Array.from(userMap.entries()).map(([userId, lastSeen]) => ({
      user_id: userId,
      last_seen: lastSeen,
      name: profiles[userId] ?? null
    })).sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
    
    res.json({ active });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/aggregateDaily', async (req, res) => {
  try {
    // Check authentication  
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin of any org
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);
    
    if (memberError || !memberships || memberships.length === 0) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { day } = req.body || {};
    const out = await aggregateDaily(day);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

cron.schedule('15 0 * * *', async () => {
  try {
    await aggregateDaily();
  } catch (_) {}
}, { timezone: 'Europe/Oslo' });

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});