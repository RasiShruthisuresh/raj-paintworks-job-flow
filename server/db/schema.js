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
`;
