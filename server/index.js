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

const STAGES = ["lead", "quote_sent", "customer_closed", "work_finished", "invoice_sent"];

app.use(cors());
app.use(express.json());

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

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Raj Paintworks Job Flow server running on ${PORT}`);
});
