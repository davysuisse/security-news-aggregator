import type { SourceType } from '../types';

export interface SourceDef {
  name: string;
  url: string;
  feed_url: string;
  source_type: SourceType;
  credibility_score: number;
}

export const DEFAULT_SOURCES: SourceDef[] = [
  {
    name: 'Krebs on Security',
    url: 'https://krebsonsecurity.com',
    feed_url: 'https://krebsonsecurity.com/feed/',
    source_type: 'rss',
    credibility_score: 0.95,
  },
  {
    name: 'The Hacker News',
    url: 'https://thehackernews.com',
    feed_url: 'https://feeds.feedburner.com/TheHackersNews',
    source_type: 'rss',
    credibility_score: 0.82,
  },
  {
    name: 'PortSwigger Research',
    url: 'https://portswigger.net/research',
    feed_url: 'https://portswigger.net/research/rss',
    source_type: 'rss',
    credibility_score: 0.93,
  },
  {
    name: 'Google Project Zero',
    url: 'https://googleprojectzero.blogspot.com',
    feed_url: 'https://googleprojectzero.blogspot.com/feeds/posts/default',
    source_type: 'atom',
    credibility_score: 0.97,
  },
  {
    name: 'GitHub Security Lab',
    url: 'https://securitylab.github.com',
    feed_url: 'https://github.blog/tag/security-research/feed/',
    source_type: 'rss',
    credibility_score: 0.92,
  },
  {
    name: 'CISA Advisories',
    url: 'https://www.cisa.gov',
    feed_url: 'https://www.cisa.gov/uscert/ncas/alerts.xml',
    source_type: 'rss',
    credibility_score: 1.0,
  },
  {
    name: 'OWASP Blog',
    url: 'https://owasp.org',
    feed_url: 'https://owasp.org/feed.xml',
    source_type: 'rss',
    credibility_score: 0.97,
  },
  {
    name: 'Snyk Security Blog',
    url: 'https://snyk.io/blog',
    feed_url: 'https://snyk.io/blog/feed/',
    source_type: 'rss',
    credibility_score: 0.85,
  },
  {
    name: 'Auth0 Blog',
    url: 'https://auth0.com/blog',
    feed_url: 'https://auth0.com/blog/rss.xml',
    source_type: 'rss',
    credibility_score: 0.80,
  },
  {
    name: 'Troy Hunt Blog',
    url: 'https://www.troyhunt.com',
    feed_url: 'https://feeds.feedburner.com/TroyHunt',
    source_type: 'rss',
    credibility_score: 0.90,
  },
  {
    name: 'Schneier on Security',
    url: 'https://www.schneier.com',
    feed_url: 'https://www.schneier.com/feed/atom/',
    source_type: 'atom',
    credibility_score: 0.93,
  },
  {
    name: 'Dark Reading',
    url: 'https://www.darkreading.com',
    feed_url: 'https://www.darkreading.com/rss.xml',
    source_type: 'rss',
    credibility_score: 0.78,
  },
];
