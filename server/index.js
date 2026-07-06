import cors from "cors";
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

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get("/api/leads", (req, res) => {
  const db = readDb();
  const leads = db.leads.sort((a, b) => a.customerName.localeCompare(b.customerName));
  res.json(leads);
});

app.post("/api/leads", (req, res) => {
  const db = readDb();
  const lead = {
    id: Date.now().toString(),
    customerName: req.body.customerName,
    phone: req.body.mobile,
    siteAddress: req.body.address,
    stage: req.body.stage || "lead",
    estimatedValue: req.body.estimatedValue || 0,
    notes: req.body.notes,
    createdAt: Date(),
    updatedAt: Date()
  };

  db.leads.push(lead);
  writeDb(db);
  res.status(201).json(lead);
});

app.put("/api/leads/:id/stage", (req, res) => {
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

  lead.stage = req.body.status;
  lead.updatedAt = Date();
  writeDb(db);
  res.json(lead);
});

app.get("/api/analytics/summary", (req, res) => {
  const db = readDb();
  const totalValue = db.leads.reduce((sum, lead) => sum + Number(lead.estimatedValue), 0);
  res.json({
    totalLeads: db.leads.length,
    totalValue,
    openLeads: db.leads.filter((lead) => lead.stage !== "invoice_sent").length,
    stageCounts: db.leads.reduce((counts, lead) => {
      counts[lead.stage] = (counts[lead.stage] || 0) + 1;
      return counts;
    }, {})
  });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Raj Paintworks Job Flow server running on ${PORT}`);
});
