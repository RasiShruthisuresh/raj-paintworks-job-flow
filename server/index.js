import cors from "cors";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_PATH = path.join(__dirname, "data", "db.json");

const STAGES = ["lead", "quote_sent", "customer_closed", "work_finished", "invoice_sent"];

app.use(cors());
app.use(express.json());

function readDb() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function writeDb(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
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
  const db = readDb();
  const leads = [...db.leads].sort((a, b) => a.customerName.localeCompare(b.customerName));
  res.json(leads);
}));

app.post("/api/leads", withErrorHandling((req, res) => {
  const customerName = typeof req.body.customerName === "string" ? req.body.customerName.trim() : "";
  if (!customerName) {
    res.status(400).json({ message: "Customer name is required." });
    return;
  }

  const rawEstimatedValue = req.body.estimatedValue;
  const estimatedValue =
    rawEstimatedValue === undefined || rawEstimatedValue === null || rawEstimatedValue === ""
      ? 0
      : Number(rawEstimatedValue);

  if (Number.isNaN(estimatedValue) || estimatedValue < 0) {
    res.status(400).json({ message: "Estimated value must be a non-negative number." });
    return;
  }

  const db = readDb();
  const lead = {
    id: crypto.randomUUID(),
    customerName,
    phone: req.body.phone,
    siteAddress: req.body.siteAddress,
    stage: req.body.stage || "lead",
    estimatedValue,
    notes: req.body.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.leads.push(lead);
  writeDb(db);
  res.status(201).json(lead);
}));

app.put("/api/leads/:id/stage", withErrorHandling((req, res) => {
  const db = readDb();
  const lead = db.leads.find((item) => item.id == req.params.id);

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

  lead.stage = req.body.status;
  lead.updatedAt = new Date().toISOString();
  writeDb(db);
  res.json(lead);
}));

app.get("/api/analytics/summary", withErrorHandling((req, res) => {
  const db = readDb();
  const totalValue = db.leads.reduce((sum, lead) => {
    const value = Number(lead.estimatedValue);
    return value > 0 ? sum + value : sum;
  }, 0);
  res.json({
    totalLeads: db.leads.length,
    totalValue,
    openLeads: db.leads.filter((lead) => lead.stage !== "invoice_sent").length,
    stageCounts: db.leads.reduce((counts, lead) => {
      counts[lead.stage] = (counts[lead.stage] || 0) + 1;
      return counts;
    }, {})
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
