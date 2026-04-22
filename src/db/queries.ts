import type { D1Database } from '@cloudflare/workers-types';
import type { NewsItem, Source, ItemFilters, ClassificationResult, DomainClassification, SignalLevel, ItemStatus, SourceType } from '../types';

function rowToNewsItem(row: Record<string, unknown>): NewsItem {
  return {
    id: row.id as string,
    title: row.title as string,
    url: row.url as string,
    source_id: row.source_id as string,
    source_name: row.source_name as string,
    published_at: row.published_at as number,
    ingested_at: row.ingested_at as number,
    raw_content: row.raw_content as string,
    summary: row.summary as string | null,
    executive_summary: row.executive_summary as string | null,
    technical_details: row.technical_details as string | null,
    why_it_matters: row.why_it_matters as string | null,
    suggested_actions: row.suggested_actions as string | null,
    signal_level: row.signal_level as SignalLevel,
    relevance_score: row.relevance_score as number,
    domains: JSON.parse(row.domains as string || '[]') as DomainClassification[],
    frameworks: JSON.parse(row.frameworks as string || '[]') as string[],
    affected_technologies: JSON.parse(row.affected_technologies as string || '[]') as string[],
    status: row.status as ItemStatus,
    error_message: row.error_message as string | null,
    created_at: row.created_at as number,
  };
}

function rowToSource(row: Record<string, unknown>): Source {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    feed_url: row.feed_url as string,
    source_type: row.source_type as SourceType,
    enabled: Boolean(row.enabled),
    last_fetched_at: row.last_fetched_at as number | null,
    credibility_score: row.credibility_score as number,
    created_at: row.created_at as number,
  };
}

export async function getItems(db: D1Database, filters: ItemFilters = {}): Promise<{ items: NewsItem[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.signal) {
    conditions.push('signal_level = ?');
    params.push(filters.signal);
  }
  if (filters.source_id) {
    conditions.push('source_id = ?');
    params.push(filters.source_id);
  }
  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    conditions.push('(title LIKE ? OR summary LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.domain) {
    conditions.push("domains LIKE ?");
    params.push(`%"domain":"${filters.domain}"%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const [itemsResult, countResult] = await Promise.all([
    db.prepare(`SELECT * FROM news_items ${where} ORDER BY relevance_score DESC, published_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all(),
    db.prepare(`SELECT COUNT(*) as total FROM news_items ${where}`)
      .bind(...params)
      .first<{ total: number }>(),
  ]);

  return {
    items: (itemsResult.results || []).map(r => rowToNewsItem(r as Record<string, unknown>)),
    total: countResult?.total ?? 0,
  };
}

export async function getItemById(db: D1Database, id: string): Promise<NewsItem | null> {
  const row = await db.prepare('SELECT * FROM news_items WHERE id = ?').bind(id).first();
  return row ? rowToNewsItem(row as Record<string, unknown>) : null;
}

export async function upsertItem(db: D1Database, item: Omit<NewsItem, 'id' | 'ingested_at' | 'created_at'> & { id: string }): Promise<void> {
  const now = Date.now();
  await db.prepare(`
    INSERT INTO news_items (
      id, title, url, source_id, source_name, published_at, ingested_at,
      raw_content, signal_level, relevance_score, domains, frameworks,
      affected_technologies, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO NOTHING
  `).bind(
    item.id, item.title, item.url, item.source_id, item.source_name,
    item.published_at, now, item.raw_content || '',
    'MEDIUM', 0.5, '[]', '[]', '[]', 'pending', now
  ).run();
}

export async function updateItemEnrichment(db: D1Database, id: string, result: ClassificationResult): Promise<void> {
  await db.prepare(`
    UPDATE news_items SET
      summary = ?, executive_summary = ?, technical_details = ?,
      why_it_matters = ?, suggested_actions = ?, signal_level = ?,
      relevance_score = ?, domains = ?, frameworks = ?,
      affected_technologies = ?, status = 'done', error_message = NULL
    WHERE id = ?
  `).bind(
    result.summary, result.executive_summary, result.technical_details,
    result.why_it_matters, result.suggested_actions, result.signal_level,
    result.relevance_score,
    JSON.stringify(result.domains),
    JSON.stringify(result.frameworks),
    JSON.stringify(result.affected_technologies),
    id
  ).run();
}

export async function updateItemStatus(db: D1Database, id: string, status: ItemStatus, errorMessage?: string): Promise<void> {
  await db.prepare('UPDATE news_items SET status = ?, error_message = ? WHERE id = ?')
    .bind(status, errorMessage ?? null, id)
    .run();
}

export async function getPendingItems(db: D1Database, limit = 20): Promise<NewsItem[]> {
  const result = await db.prepare(
    "SELECT * FROM news_items WHERE status = 'pending' ORDER BY published_at DESC LIMIT ?"
  ).bind(limit).all();
  return (result.results || []).map(r => rowToNewsItem(r as Record<string, unknown>));
}

export async function getSources(db: D1Database): Promise<Source[]> {
  const result = await db.prepare('SELECT * FROM sources ORDER BY credibility_score DESC').all();
  return (result.results || []).map(r => rowToSource(r as Record<string, unknown>));
}

export async function getEnabledSources(db: D1Database): Promise<Source[]> {
  const result = await db.prepare('SELECT * FROM sources WHERE enabled = 1 ORDER BY credibility_score DESC').all();
  return (result.results || []).map(r => rowToSource(r as Record<string, unknown>));
}

export async function upsertSource(db: D1Database, source: Omit<Source, 'id' | 'created_at' | 'last_fetched_at'> & { id: string }): Promise<void> {
  const now = Date.now();
  await db.prepare(`
    INSERT INTO sources (id, name, url, feed_url, source_type, enabled, credibility_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, url = excluded.url, feed_url = excluded.feed_url,
      source_type = excluded.source_type, enabled = excluded.enabled,
      credibility_score = excluded.credibility_score
  `).bind(
    source.id, source.name, source.url, source.feed_url,
    source.source_type, source.enabled ? 1 : 0,
    source.credibility_score, now
  ).run();
}

export async function updateSourceLastFetched(db: D1Database, id: string): Promise<void> {
  await db.prepare('UPDATE sources SET last_fetched_at = ? WHERE id = ?')
    .bind(Date.now(), id)
    .run();
}

export async function toggleSource(db: D1Database, id: string, enabled: boolean): Promise<void> {
  await db.prepare('UPDATE sources SET enabled = ? WHERE id = ?')
    .bind(enabled ? 1 : 0, id)
    .run();
}

export async function getStats(db: D1Database): Promise<{
  total: number; high: number; medium: number; low: number;
  pending: number; sources: number;
}> {
  const [counts, sourceCnt] = await Promise.all([
    db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN signal_level = 'HIGH' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN signal_level = 'MEDIUM' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN signal_level = 'LOW' THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM news_items
    `).first<{ total: number; high: number; medium: number; low: number; pending: number }>(),
    db.prepare('SELECT COUNT(*) as cnt FROM sources WHERE enabled = 1').first<{ cnt: number }>(),
  ]);
  return {
    total: counts?.total ?? 0,
    high: counts?.high ?? 0,
    medium: counts?.medium ?? 0,
    low: counts?.low ?? 0,
    pending: counts?.pending ?? 0,
    sources: sourceCnt?.cnt ?? 0,
  };
}

export async function getRecentHighSignalItems(db: D1Database, days = 7, limit = 20): Promise<NewsItem[]> {
  const since = Date.now() - days * 86400000;
  const result = await db.prepare(`
    SELECT * FROM news_items
    WHERE signal_level = 'HIGH' AND published_at > ? AND status = 'done'
    ORDER BY relevance_score DESC, published_at DESC
    LIMIT ?
  `).bind(since, limit).all();
  return (result.results || []).map(r => rowToNewsItem(r as Record<string, unknown>));
}
