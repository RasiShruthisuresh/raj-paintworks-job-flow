export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  site_address TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('lead', 'quote_sent', 'customer_closed', 'work_finished', 'invoice_sent')),
  estimated_value REAL NOT NULL CHECK (estimated_value > 0),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads (stage);

-- Team member schema for the upcoming timesheet feature (docs/03-timesheet-tracking-prd.md).
-- No routes use this table yet; it exists so the migration is complete ahead of that work.
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('painter', 'supervisor', 'helper', 'contractor')),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('hourly', 'daily')),
  rate REAL NOT NULL CHECK (rate > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  phone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Time entry schema for the upcoming timesheet feature. No routes use this table yet.
-- job_id references leads(id) directly since "jobs" in this app are the pipeline leads --
-- there is no separate jobs table. Per the PRD's own acceptance test, end_time <= start_time
-- is rejected outright at the application layer; no cross-midnight support.
CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES leads(id),
  team_member_id TEXT NOT NULL REFERENCES team_members(id),
  work_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  payable_hours REAL NOT NULL CHECK (payable_hours > 0),
  work_type TEXT NOT NULL CHECK (work_type IN ('prep', 'primer', 'painting', 'cleanup', 'rework', 'travel')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries (job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_team_member_id ON time_entries (team_member_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_work_date ON time_entries (work_date);

-- Analytics dashboard mock dataset (docs/04-analytics-dashboard-spec.md).
-- Seeded once from data/paintworks_analytics_mock.csv (12 rows), independent of the
-- real leads table - this is demo data for the dashboard, not live pipeline data.
CREATE TABLE IF NOT EXISTS analytics_opportunities (
  lead_id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('lead', 'quote_sent', 'customer_closed', 'work_finished', 'invoice_sent')),
  estimated_value REAL NOT NULL,
  actual_invoice_value REAL,
  quote_sent_date TEXT,
  closed_date TEXT,
  work_finished_date TEXT,
  invoice_sent_date TEXT,
  source TEXT NOT NULL,
  city TEXT,
  job_type TEXT NOT NULL,
  crew_size INTEGER NOT NULL,
  lead_owner TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_opportunities_stage ON analytics_opportunities (stage);
CREATE INDEX IF NOT EXISTS idx_analytics_opportunities_date ON analytics_opportunities (date);
`;
