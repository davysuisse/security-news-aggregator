export type Domain = 'AppSec' | 'IAM' | 'SecChampion';
export type SignalLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ItemStatus = 'pending' | 'processing' | 'done' | 'error';
export type SourceType = 'rss' | 'atom' | 'advisory';

export interface DomainClassification {
  domain: Domain;
  confidence: number;
  reasons: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source_id: string;
  source_name: string;
  published_at: number;
  ingested_at: number;
  raw_content: string;
  summary: string | null;
  executive_summary: string | null;
  technical_details: string | null;
  why_it_matters: string | null;
  suggested_actions: string | null;
  signal_level: SignalLevel;
  relevance_score: number;
  domains: DomainClassification[];
  frameworks: string[];
  affected_technologies: string[];
  status: ItemStatus;
  error_message: string | null;
  created_at: number;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  feed_url: string;
  source_type: SourceType;
  enabled: boolean;
  last_fetched_at: number | null;
  credibility_score: number;
  created_at: number;
}

export interface ClassificationResult {
  domains: DomainClassification[];
  relevance_score: number;
  signal_level: SignalLevel;
  summary: string;
  executive_summary: string;
  technical_details: string;
  why_it_matters: string;
  suggested_actions: string;
  frameworks: string[];
  affected_technologies: string[];
}

export interface RawFeedItem {
  title: string;
  url: string;
  description: string;
  published_at: number;
}

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  SLACK_WEBHOOK_URL?: string;
}

export interface ItemFilters {
  domain?: Domain;
  signal?: SignalLevel;
  source_id?: string;
  status?: ItemStatus;
  search?: string;
  limit?: number;
  offset?: number;
}
