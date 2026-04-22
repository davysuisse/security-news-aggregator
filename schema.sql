CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  feed_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'rss',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_fetched_at INTEGER,
  credibility_score REAL NOT NULL DEFAULT 0.7,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS news_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_name TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  ingested_at INTEGER NOT NULL,
  raw_content TEXT,
  summary TEXT,
  executive_summary TEXT,
  technical_details TEXT,
  why_it_matters TEXT,
  suggested_actions TEXT,
  signal_level TEXT NOT NULL DEFAULT 'MEDIUM',
  relevance_score REAL NOT NULL DEFAULT 0.5,
  domains TEXT NOT NULL DEFAULT '[]',
  frameworks TEXT NOT NULL DEFAULT '[]',
  affected_technologies TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_signal_level ON news_items(signal_level);
CREATE INDEX IF NOT EXISTS idx_news_items_status ON news_items(status);
CREATE INDEX IF NOT EXISTS idx_news_items_source_id ON news_items(source_id);
CREATE INDEX IF NOT EXISTS idx_news_items_relevance ON news_items(relevance_score DESC);
