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
    const orgId = String(req.query.orgId || '');
    if (!orgId) return res.status(400).json({ error: 'Missing orgId' });
    const since = new Date(Date.now() - 15*60*1000).toISOString();
    const { data: events, error } = await supabaseAdmin
      .from('usage_events')
      .select('user_id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const userIds = Array.from(new Set((events || []).map(e => e.user_id).filter(Boolean)));
    let profiles = {};
    if (userIds.length) {
      const { data: profs, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      if (pErr) return res.status(500).json({ error: pErr.message });
      (profs || []).forEach(p => { profiles[p.user_id] = p.full_name || null; });
    }

    const active = (events || []).map(e => ({
      user_id: e.user_id,
      last_seen: e.created_at,
      name: e.user_id ? (profiles[e.user_id] ?? null) : null
    }));
    res.json({ active });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/aggregateDaily', async (req, res) => {
  try {
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