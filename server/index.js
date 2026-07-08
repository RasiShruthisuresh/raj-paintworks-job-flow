import cors from "cors";
import crypto from "crypto";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

const STAGES = ["lead", "quote_sent", "customer_closed", "work_finished", "invoice_sent"];
const ROLES = ["painter", "supervisor", "helper", "contractor"];
const RATE_TYPES = ["hourly", "daily"];
const WORK_TYPES = ["prep", "primer", "painting", "cleanup", "rework", "travel"];

const CLOSED_STAGES = "'customer_closed', 'work_finished', 'invoice_sent'";
const CLOSED_VALUE_EXPR = `
  CASE
    WHEN stage IN (${CLOSED_STAGES})
    THEN CASE WHEN actual_invoice_value > 0 THEN actual_invoice_value ELSE estimated_value END
    ELSE 0
  END
`;

function buildAnalyticsFilters(query) {
  const conditions = [];
  const params = [];

  if (query.startDate) {
    conditions.push("date >= ?");
    params.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push("date <= ?");
    params.push(query.endDate);
  }
  if (query.stage) {
    conditions.push("stage = ?");
    params.push(query.stage);
  }
  if (query.source) {
    conditions.push("source = ?");
    params.push(query.source);
  }
  if (query.jobType) {
    conditions.push("job_type = ?");
    params.push(query.jobType);
  }
  if (query.leadOwner) {
    conditions.push("lead_owner = ?");
    params.push(query.leadOwner);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ message: "Request body is not valid JSON." });
    return;
  }
  next(err);
});

function mapLead(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    siteAddress: row.site_address,
    stage: row.stage,
    estimatedValue: row.estimated_value,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTeamMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    rateType: row.rate_type,
    rate: row.rate,
    isActive: row.is_active === 1,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTimeEntry(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    jobCustomerName: row.job_customer_name,
    teamMemberId: row.team_member_id,
    teamMemberName: row.team_member_name,
    teamMemberRateType: row.team_member_rate_type,
    teamMemberRate: row.team_member_rate,
    workDate: row.work_date,
    startTime: row.start_time,
    endTime: row.end_time,
    breakMinutes: row.break_minutes,
    payableHours: row.payable_hours,
    workType: row.work_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const TIME_ENTRY_JOIN_SELECT = `
  SELECT
    time_entries.*,
    leads.customer_name AS job_customer_name,
    team_members.name AS team_member_name,
    team_members.rate_type AS team_member_rate_type,
    team_members.rate AS team_member_rate
  FROM time_entries
  JOIN leads ON leads.id = time_entries.job_id
  JOIN team_members ON team_members.id = time_entries.team_member_id
`;

function computePayableHours(workDate, startTime, endTime, breakMinutes) {
  const start = new Date(`${workDate}T${startTime}:00`);
  const end = new Date(`${workDate}T${endTime}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Work date, start time, and end time must all be valid." };
  }

  const totalMinutes = (end - start) / 60000;
  if (totalMinutes <= 0) {
    return { error: "End time must be after start time." };
  }

  if (breakMinutes < 0) {
    return { error: "Break minutes cannot be negative." };
  }

  if (breakMinutes >= totalMinutes) {
    return { error: "Break minutes cannot equal or exceed the shift duration." };
  }

  return { payableHours: (totalMinutes - breakMinutes) / 60 };
}

function normalizePhone(raw) {
  const digitsOnly = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
  const digits = digitsOnly.length === 12 && digitsOnly.startsWith("91") ? digitsOnly.slice(2) : digitsOnly;
  return digits.length === 10 ? digits : null;
}

function withErrorHandling(handler) {
  return (req, res) => {
    try {
      handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Unable to read or write lead data right now." });
    }
  };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get("/api/leads", withErrorHandling((req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY customer_name COLLATE NOCASE").all();
  res.json(rows.map(mapLead));
}));

app.get("/api/leads/:id", withErrorHandling((req, res) => {
  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);

  if (!row) {
    res.status(404).json({ message: "Lead not found" });
    return;
  }

  res.json(mapLead(row));
}));

app.post("/api/leads", withErrorHandling((req, res) => {
  const customerName = typeof req.body.customerName === "string" ? req.body.customerName.trim() : "";
  if (!customerName) {
    res.status(400).json({ message: "Customer name is required." });
    return;
  }

  const phone = normalizePhone(req.body.phone);
  if (!phone) {
    res.status(400).json({ message: "Phone number must be exactly 10 digits." });
    return;
  }

  const estimatedValue = Number(req.body.estimatedValue);
  if (Number.isNaN(estimatedValue) || estimatedValue <= 0) {
    res.status(400).json({ message: "Estimated value must be a positive number." });
    return;
  }

  const stage = req.body.stage || "lead";
  if (!STAGES.includes(stage)) {
    res.status(400).json({ message: "Invalid stage" });
    return;
  }

  const now = new Date().toISOString();
  const lead = {
    id: crypto.randomUUID(),
    customerName,
    phone: `${phone.slice(0, 5)} ${phone.slice(5)}`,
    siteAddress: req.body.siteAddress || null,
    stage,
    estimatedValue,
    notes: req.body.notes || null,
    createdAt: now,
    updatedAt: now
  };

  db.prepare(`
    INSERT INTO leads (id, customer_name, phone, site_address, stage, estimated_value, notes, created_at, updated_at)
    VALUES (@id, @customerName, @phone, @siteAddress, @stage, @estimatedValue, @notes, @createdAt, @updatedAt)
  `).run(lead);

  res.status(201).json(lead);
}));

app.put("/api/leads/:id/stage", withErrorHandling((req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);

  if (!lead) {
    res.status(404).json({ message: "Lead not found" });
    return;
  }

  if (!STAGES.includes(req.body.status)) {
    res.status(400).json({ message: "Invalid stage" });
    return;
  }

  const currentIndex = STAGES.indexOf(lead.stage);
  const requestedIndex = STAGES.indexOf(req.body.status);

  if (currentIndex === -1) {
    res.status(400).json({ message: `Lead has an unrecognized stage (${lead.stage}); cannot validate the transition.` });
    return;
  }

  if (requestedIndex !== currentIndex && requestedIndex !== currentIndex + 1) {
    res.status(400).json({ message: "A lead can only move to its immediate next stage." });
    return;
  }

  const updatedAt = new Date().toISOString();
  db.prepare("UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?").run(req.body.status, updatedAt, req.params.id);

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json(mapLead(updated));
}));

// ===== TEMPORARY ADMIN CLEANUP ROUTE — REMOVE BEFORE FINAL SUBMISSION =====
// One-time production cleanup for stray manual-test leads on Railway. Not a
// real feature; delete this whole block once the cleanup is confirmed done.
app.delete("/api/admin/leads/:id", withErrorHandling((req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const lead = db.prepare("SELECT id FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) {
    res.status(404).json({ message: "Lead not found" });
    return;
  }

  db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
  res.status(204).end();
}));
// ===== END TEMPORARY ADMIN CLEANUP ROUTE =====

app.get("/api/analytics/summary", withErrorHandling((req, res) => {
  const totalLeads = db.prepare("SELECT COUNT(*) AS count FROM leads").get().count;
  const totalValue = db.prepare("SELECT COALESCE(SUM(estimated_value), 0) AS total FROM leads WHERE estimated_value > 0").get().total;
  const openLeads = db.prepare("SELECT COUNT(*) AS count FROM leads WHERE stage != 'invoice_sent'").get().count;
  const stageCounts = {};
  for (const row of db.prepare("SELECT stage, COUNT(*) AS count FROM leads GROUP BY stage").all()) {
    stageCounts[row.stage] = row.count;
  }

  res.json({ totalLeads, totalValue, openLeads, stageCounts });
}));

app.get("/api/team-members", withErrorHandling((req, res) => {
  const rows = db.prepare("SELECT * FROM team_members ORDER BY name COLLATE NOCASE").all();
  res.json(rows.map(mapTeamMember));
}));

app.post("/api/team-members", withErrorHandling((req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    res.status(400).json({ message: "Name is required." });
    return;
  }

  if (!ROLES.includes(req.body.role)) {
    res.status(400).json({ message: `Role must be one of: ${ROLES.join(", ")}.` });
    return;
  }

  if (!RATE_TYPES.includes(req.body.rateType)) {
    res.status(400).json({ message: `Rate type must be one of: ${RATE_TYPES.join(", ")}.` });
    return;
  }

  const rate = Number(req.body.rate);
  if (Number.isNaN(rate) || rate <= 0) {
    res.status(400).json({ message: "Rate must be a positive number." });
    return;
  }

  const now = new Date().toISOString();
  const teamMember = {
    id: crypto.randomUUID(),
    name,
    role: req.body.role,
    rateType: req.body.rateType,
    rate,
    isActive: 1,
    phone: req.body.phone || null,
    createdAt: now,
    updatedAt: now
  };

  db.prepare(`
    INSERT INTO team_members (id, name, role, rate_type, rate, is_active, phone, created_at, updated_at)
    VALUES (@id, @name, @role, @rateType, @rate, @isActive, @phone, @createdAt, @updatedAt)
  `).run(teamMember);

  const created = db.prepare("SELECT * FROM team_members WHERE id = ?").get(teamMember.id);
  res.status(201).json(mapTeamMember(created));
}));

app.put("/api/team-members/:id", withErrorHandling((req, res) => {
  const existing = db.prepare("SELECT * FROM team_members WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ message: "Team member not found" });
    return;
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    res.status(400).json({ message: "Name is required." });
    return;
  }

  if (!ROLES.includes(req.body.role)) {
    res.status(400).json({ message: `Role must be one of: ${ROLES.join(", ")}.` });
    return;
  }

  if (!RATE_TYPES.includes(req.body.rateType)) {
    res.status(400).json({ message: `Rate type must be one of: ${RATE_TYPES.join(", ")}.` });
    return;
  }

  const rate = Number(req.body.rate);
  if (Number.isNaN(rate) || rate <= 0) {
    res.status(400).json({ message: "Rate must be a positive number." });
    return;
  }

  const isActive = req.body.isActive ? 1 : 0;
  const updatedAt = new Date().toISOString();

  db.prepare(`
    UPDATE team_members
    SET name = ?, role = ?, rate_type = ?, rate = ?, is_active = ?, phone = ?, updated_at = ?
    WHERE id = ?
  `).run(name, req.body.role, req.body.rateType, rate, isActive, req.body.phone || null, updatedAt, req.params.id);

  const updated = db.prepare("SELECT * FROM team_members WHERE id = ?").get(req.params.id);
  res.json(mapTeamMember(updated));
}));

app.get("/api/time-entries", withErrorHandling((req, res) => {
  const conditions = [];
  const params = [];

  if (req.query.jobId) {
    conditions.push("time_entries.job_id = ?");
    params.push(req.query.jobId);
  }
  if (req.query.teamMemberId) {
    conditions.push("time_entries.team_member_id = ?");
    params.push(req.query.teamMemberId);
  }
  if (req.query.workType) {
    conditions.push("time_entries.work_type = ?");
    params.push(req.query.workType);
  }
  if (req.query.startDate) {
    conditions.push("time_entries.work_date >= ?");
    params.push(req.query.startDate);
  }
  if (req.query.endDate) {
    conditions.push("time_entries.work_date <= ?");
    params.push(req.query.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(`${TIME_ENTRY_JOIN_SELECT} ${whereClause} ORDER BY time_entries.work_date DESC, time_entries.start_time DESC`)
    .all(...params);

  res.json(rows.map(mapTimeEntry));
}));

app.post("/api/time-entries", withErrorHandling((req, res) => {
  const job = db.prepare("SELECT id FROM leads WHERE id = ?").get(req.body.jobId);
  if (!job) {
    res.status(400).json({ message: "A valid job is required." });
    return;
  }

  const teamMember = db.prepare("SELECT id, is_active FROM team_members WHERE id = ?").get(req.body.teamMemberId);
  if (!teamMember) {
    res.status(400).json({ message: "A valid team member is required." });
    return;
  }

  if (!teamMember.is_active) {
    res.status(400).json({ message: "Cannot log time for an inactive team member." });
    return;
  }

  if (!WORK_TYPES.includes(req.body.workType)) {
    res.status(400).json({ message: `Work type must be one of: ${WORK_TYPES.join(", ")}.` });
    return;
  }

  const breakMinutes = Number(req.body.breakMinutes) || 0;
  const result = computePayableHours(req.body.workDate, req.body.startTime, req.body.endTime, breakMinutes);
  if (result.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  const now = new Date().toISOString();
  const timeEntry = {
    id: crypto.randomUUID(),
    jobId: req.body.jobId,
    teamMemberId: req.body.teamMemberId,
    workDate: req.body.workDate,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    breakMinutes,
    payableHours: result.payableHours,
    workType: req.body.workType,
    notes: req.body.notes || null,
    createdAt: now,
    updatedAt: now
  };

  db.prepare(`
    INSERT INTO time_entries (id, job_id, team_member_id, work_date, start_time, end_time, break_minutes, payable_hours, work_type, notes, created_at, updated_at)
    VALUES (@id, @jobId, @teamMemberId, @workDate, @startTime, @endTime, @breakMinutes, @payableHours, @workType, @notes, @createdAt, @updatedAt)
  `).run(timeEntry);

  const created = db.prepare(`${TIME_ENTRY_JOIN_SELECT} WHERE time_entries.id = ?`).get(timeEntry.id);
  res.status(201).json(mapTimeEntry(created));
}));

app.put("/api/time-entries/:id", withErrorHandling((req, res) => {
  const existing = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({ message: "Time entry not found" });
    return;
  }

  const job = db.prepare("SELECT id FROM leads WHERE id = ?").get(req.body.jobId);
  if (!job) {
    res.status(400).json({ message: "A valid job is required." });
    return;
  }

  const teamMember = db.prepare("SELECT id FROM team_members WHERE id = ?").get(req.body.teamMemberId);
  if (!teamMember) {
    res.status(400).json({ message: "A valid team member is required." });
    return;
  }

  if (!WORK_TYPES.includes(req.body.workType)) {
    res.status(400).json({ message: `Work type must be one of: ${WORK_TYPES.join(", ")}.` });
    return;
  }

  const breakMinutes = Number(req.body.breakMinutes) || 0;
  const result = computePayableHours(req.body.workDate, req.body.startTime, req.body.endTime, breakMinutes);
  if (result.error) {
    res.status(400).json({ message: result.error });
    return;
  }

  const updatedAt = new Date().toISOString();

  db.prepare(`
    UPDATE time_entries
    SET job_id = ?, team_member_id = ?, work_date = ?, start_time = ?, end_time = ?,
        break_minutes = ?, payable_hours = ?, work_type = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    req.body.jobId,
    req.body.teamMemberId,
    req.body.workDate,
    req.body.startTime,
    req.body.endTime,
    breakMinutes,
    result.payableHours,
    req.body.workType,
    req.body.notes || null,
    updatedAt,
    req.params.id
  );

  const updated = db.prepare(`${TIME_ENTRY_JOIN_SELECT} WHERE time_entries.id = ?`).get(req.params.id);
  res.json(mapTimeEntry(updated));
}));

app.get("/api/analytics/dashboard", withErrorHandling((req, res) => {
  const { whereClause, params } = buildAnalyticsFilters(req.query);

  const metricRow = db
    .prepare(
      `
    SELECT
      COUNT(*) AS totalLeads,
      COALESCE(SUM(CASE WHEN stage IN ('lead', 'quote_sent') THEN estimated_value ELSE 0 END), 0) AS openValue,
      COALESCE(SUM(${CLOSED_VALUE_EXPR}), 0) AS closedValue,
      COALESCE(SUM(CASE WHEN stage = 'invoice_sent' THEN 1 ELSE 0 END), 0) AS invoicesSent,
      AVG(CASE WHEN quote_sent_date IS NOT NULL AND closed_date IS NOT NULL THEN julianday(closed_date) - julianday(quote_sent_date) END) AS avgQuoteToCloseDays
    FROM analytics_opportunities
    ${whereClause}
  `
    )
    .get(...params);

  const stageBreakdown = db
    .prepare(
      `
    SELECT stage, COUNT(*) AS count, COALESCE(SUM(estimated_value), 0) AS value
    FROM analytics_opportunities
    ${whereClause}
    GROUP BY stage
  `
    )
    .all(...params);

  const sourcePerformance = db
    .prepare(
      `
    SELECT source, COUNT(*) AS count, COALESCE(SUM(${CLOSED_VALUE_EXPR}), 0) AS closedValue
    FROM analytics_opportunities
    ${whereClause}
    GROUP BY source
  `
    )
    .all(...params);

  const jobTypeMix = db
    .prepare(
      `
    SELECT job_type AS jobType, COUNT(*) AS count, COALESCE(SUM(estimated_value), 0) AS value
    FROM analytics_opportunities
    ${whereClause}
    GROUP BY job_type
  `
    )
    .all(...params);

  const activeCondition = whereClause
    ? `${whereClause} AND stage IN ('lead', 'quote_sent', 'customer_closed')`
    : "WHERE stage IN ('lead', 'quote_sent', 'customer_closed')";
  const workloadRow = db
    .prepare(
      `
    SELECT COUNT(*) AS activeJobCount, AVG(crew_size) AS averageCrewSize
    FROM analytics_opportunities
    ${activeCondition}
  `
    )
    .get(...params);

  const table = db
    .prepare(
      `
    SELECT lead_id AS leadId, customer_name AS customerName, stage, estimated_value AS value, source, job_type AS jobType, lead_owner AS leadOwner
    FROM analytics_opportunities
    ${whereClause}
    ORDER BY date DESC
  `
    )
    .all(...params);

  const filterOptions = {
    sources: db.prepare("SELECT DISTINCT source FROM analytics_opportunities ORDER BY source").all().map((row) => row.source),
    jobTypes: db
      .prepare("SELECT DISTINCT job_type FROM analytics_opportunities ORDER BY job_type")
      .all()
      .map((row) => row.job_type),
    leadOwners: db
      .prepare("SELECT DISTINCT lead_owner FROM analytics_opportunities ORDER BY lead_owner")
      .all()
      .map((row) => row.lead_owner)
  };

  res.json({
    metricSummary: {
      totalLeads: metricRow.totalLeads,
      openValue: metricRow.openValue,
      closedValue: metricRow.closedValue,
      invoicesSent: metricRow.invoicesSent,
      avgQuoteToCloseDays: metricRow.avgQuoteToCloseDays
    },
    stageBreakdown,
    sourcePerformance,
    jobTypeMix,
    workloadSignal: {
      activeJobCount: workloadRow.activeJobCount,
      averageCrewSize: workloadRow.averageCrewSize
    },
    table,
    filterOptions
  });
}));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Raj Paintworks Job Flow server running on ${PORT}`);
});
