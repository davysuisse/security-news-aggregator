import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import {
  getItems, getItemById, upsertItem, updateItemEnrichment, updateItemStatus,
  getPendingItems, getSources, getEnabledSources, upsertSource, toggleSource,
  updateSourceLastFetched, getStats, getRecentHighSignalItems,
} from './db/queries';
import { fetchFeed, buildItemId } from './ingestion/fetcher';
import { DEFAULT_SOURCES } from './ingestion/sources';
import { classifyAndEnrich, buildDigest } from './ai/claude';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

// ── Stats ──────────────────────────────────────────────────────────────────
app.get('/api/stats', async (c) => {
  const cached = await c.env.CACHE.get('stats');
  if (cached) return c.json(JSON.parse(cached));
  const stats = await getStats(c.env.DB);
  await c.env.CACHE.put('stats', JSON.stringify(stats), { expirationTtl: 60 });
  return c.json(stats);
});

// ── News Items ─────────────────────────────────────────────────────────────
app.get('/api/items', async (c) => {
  const { domain, signal, source_id, search, limit, offset } = c.req.query() as Record<string, string>;
  const result = await getItems(c.env.DB, {
    domain: domain as any,
    signal: signal as any,
    source_id,
    search,
    limit: limit ? parseInt(limit) : 50,
    offset: offset ? parseInt(offset) : 0,
  });
  return c.json(result);
});

app.get('/api/items/:id', async (c) => {
  const item = await getItemById(c.env.DB, c.req.param('id'));
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json(item);
});

// ── Sources ────────────────────────────────────────────────────────────────
app.get('/api/sources', async (c) => {
  const sources = await getSources(c.env.DB);
  return c.json(sources);
});

app.post('/api/sources', async (c) => {
  const body = await c.req.json<{
    name: string; url: string; feed_url: string;
    source_type?: string; credibility_score?: number;
  }>();
  if (!body.name || !body.feed_url) {
    return c.json({ error: 'name and feed_url required' }, 400);
  }
  const id = `src_${Date.now().toString(36)}`;
  await upsertSource(c.env.DB, {
    id, name: body.name, url: body.url || body.feed_url,
    feed_url: body.feed_url,
    source_type: (body.source_type as any) || 'rss',
    enabled: true,
    credibility_score: body.credibility_score ?? 0.7,
  });
  return c.json({ id }, 201);
});

app.patch('/api/sources/:id', async (c) => {
  const { enabled } = await c.req.json<{ enabled: boolean }>();
  await toggleSource(c.env.DB, c.req.param('id'), enabled);
  return c.json({ ok: true });
});

// ── Manual Ingestion Trigger ───────────────────────────────────────────────
app.post('/api/ingest', async (c) => {
  const count = await runIngestion(c.env);
  return c.json({ ingested: count });
});

// ── Manual Enrichment Trigger ──────────────────────────────────────────────
app.post('/api/enrich', async (c) => {
  const count = await runEnrichment(c.env);
  return c.json({ enriched: count });
});

// ── Digest ─────────────────────────────────────────────────────────────────
app.get('/api/digest', async (c) => {
  const days = parseInt(c.req.query('days') || '7');
  const items = await getRecentHighSignalItems(c.env.DB, days, 30);
  const allItems = (await getItems(c.env.DB, { limit: 100 })).items.filter(i => i.status === 'done');
  const digest = buildDigest([...items, ...allItems.filter(i => i.signal_level !== 'HIGH')].slice(0, 50));
  return c.json({ digest, item_count: items.length });
});

app.post('/api/digest/send', async (c) => {
  if (!c.env.SLACK_WEBHOOK_URL) {
    return c.json({ error: 'SLACK_WEBHOOK_URL not configured' }, 400);
  }
  const days = parseInt((await c.req.json<{ days?: number }>()).days?.toString() || '7');
  const items = await getRecentHighSignalItems(c.env.DB, days, 30);
  const allItems = (await getItems(c.env.DB, { limit: 100 })).items.filter(i => i.status === 'done');
  const digest = buildDigest([...items, ...allItems.filter(i => i.signal_level !== 'HIGH')].slice(0, 50));

  const slackPayload = {
    text: digest.slice(0, 3000),
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: digest.slice(0, 3000) },
      },
    ],
  };

  const resp = await fetch(c.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackPayload),
  });

  if (!resp.ok) return c.json({ error: 'Slack delivery failed' }, 502);
  return c.json({ ok: true });
});

// ── Seed default sources ───────────────────────────────────────────────────
app.post('/api/seed', async (c) => {
  for (const def of DEFAULT_SOURCES) {
    const id = `src_${def.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    await upsertSource(c.env.DB, { ...def, id, enabled: true });
  }
  return c.json({ seeded: DEFAULT_SOURCES.length });
});

// ── Ingestion pipeline ─────────────────────────────────────────────────────
async function runIngestion(env: Env): Promise<number> {
  const sources = await getEnabledSources(env.DB);
  let total = 0;

  for (const source of sources) {
    try {
      const items = await fetchFeed(source);
      for (const raw of items) {
        const id = buildItemId(raw.url);
        await upsertItem(env.DB, {
          id, title: raw.title, url: raw.url,
          source_id: source.id, source_name: source.name,
          published_at: raw.published_at,
          raw_content: raw.description,
          summary: null, executive_summary: null,
          technical_details: null, why_it_matters: null, suggested_actions: null,
          signal_level: 'MEDIUM', relevance_score: 0.5,
          domains: [], frameworks: [], affected_technologies: [],
          status: 'pending', error_message: null,
        });
        total++;
      }
      await updateSourceLastFetched(env.DB, source.id);
    } catch (err) {
      console.error(`Failed to fetch ${source.name}:`, err);
    }
  }

  await env.CACHE.delete('stats');
  return total;
}

// ── Enrichment pipeline ────────────────────────────────────────────────────
async function runEnrichment(env: Env): Promise<number> {
  if (!env.ANTHROPIC_API_KEY) return 0;

  const pending = await getPendingItems(env.DB, 10);
  let enriched = 0;

  for (const item of pending) {
    await updateItemStatus(env.DB, item.id, 'processing');
    try {
      const result = await classifyAndEnrich(item, env.ANTHROPIC_API_KEY);
      await updateItemEnrichment(env.DB, item.id, result);
      enriched++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await updateItemStatus(env.DB, item.id, 'error', msg);
      console.error(`Enrichment failed for ${item.id}:`, msg);
    }
  }

  if (enriched > 0) await env.CACHE.delete('stats');
  return enriched;
}

// ── Cron handler ───────────────────────────────────────────────────────────
async function handleScheduled(env: Env): Promise<void> {
  const ingested = await runIngestion(env);
  console.log(`Ingested ${ingested} raw items`);
  const enriched = await runEnrichment(env);
  console.log(`Enriched ${enriched} items`);
}

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    await handleScheduled(env);
  },
};
