import type { RawFeedItem, Source } from '../types';

function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i').exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return match ? decodeEntities(match[1].trim()) : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, 'i').exec(xml);
  return match ? match[1].trim() : '';
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(dateStr: string): number {
  if (!dateStr) return Date.now();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

export function parseRSSFeed(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const chunk = match[1];
    const title = extractTag(chunk, 'title');
    const link = extractTag(chunk, 'link') || extractTag(chunk, 'guid');
    const description = extractTag(chunk, 'description') || extractTag(chunk, 'content:encoded') || extractTag(chunk, 'summary');
    const pubDate = extractTag(chunk, 'pubDate') || extractTag(chunk, 'dc:date') || extractTag(chunk, 'published');
    if (title && link && link.startsWith('http')) {
      items.push({ title, url: link, description: description.slice(0, 2000), published_at: parseDate(pubDate) });
    }
  }
  return items;
}

export function parseAtomFeed(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const chunk = match[1];
    const title = extractTag(chunk, 'title');
    const linkMatch = /< link[^>]+href="([^"]+)"/i.exec(chunk) || /<link[^>]+href="([^"]+)"/i.exec(chunk);
    const link = linkMatch ? linkMatch[1] : extractTag(chunk, 'id');
    const description = extractTag(chunk, 'summary') || extractTag(chunk, 'content');
    const pubDate = extractTag(chunk, 'updated') || extractTag(chunk, 'published');
    if (title && link && link.startsWith('http')) {
      items.push({ title, url: link, description: description.slice(0, 2000), published_at: parseDate(pubDate) });
    }
  }
  return items;
}

export async function fetchFeed(source: Source): Promise<RawFeedItem[]> {
  const response = await fetch(source.feed_url, {
    headers: { 'User-Agent': 'SecurityNewsAggregator/1.0 (security research aggregator)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${source.feed_url}`);
  }

  const text = await response.text();

  if (source.source_type === 'atom' || text.includes('<feed') || text.includes('<entry>')) {
    return parseAtomFeed(text);
  }
  return parseRSSFeed(text);
}

export function buildItemId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `item_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}
