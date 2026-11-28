-- CodexHost zero-ID anonymous product telemetry & extension marketplace stats schema (Cloudflare D1 / SQLite)
--
-- Privacy invariant:
-- This database contains ONLY aggregate counters and public extension download counts.
-- It intentionally has NO per-device table, NO install_id / user_id column, and NO IP storage.
-- Daily/weekly/monthly/retention deduplication happens strictly on the client before sending.

CREATE TABLE IF NOT EXISTS extension_downloads (
  id TEXT PRIMARY KEY,
  downloads INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extension_downloads_daily (
  day TEXT NOT NULL,
  id TEXT NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, id)
);

CREATE INDEX IF NOT EXISTS idx_ext_downloads_daily_day
  ON extension_downloads_daily(day);

CREATE TABLE IF NOT EXISTS daily_metrics (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  dim TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, dim)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_metric_day
  ON daily_metrics(metric, day);

CREATE TABLE IF NOT EXISTS period_metrics (
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  metric TEXT NOT NULL,
  dim TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (period_type, period_key, metric, dim)
);

CREATE TABLE IF NOT EXISTS worker_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
