import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, "..", "data", "db.json");

export function migrate(db) {
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  const { count } = db.prepare("SELECT COUNT(*) AS count FROM leads").get();
  if (count > 0 || !fs.existsSync(SEED_PATH)) {
    return;
  }

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  const insert = db.prepare(`
    INSERT INTO leads (id, customer_name, phone, site_address, stage, estimated_value, notes, created_at, updated_at)
    VALUES (@id, @customerName, @phone, @siteAddress, @stage, @estimatedValue, @notes, @createdAt, @updatedAt)
  `);

  const insertAll = db.transaction((leads) => {
    for (const lead of leads) {
      insert.run({
        id: lead.id,
        customerName: lead.customerName,
        phone: lead.phone,
        siteAddress: lead.siteAddress || null,
        stage: lead.stage,
        estimatedValue: Number(lead.estimatedValue),
        notes: lead.notes || null,
        createdAt: new Date(lead.createdAt).toISOString(),
        updatedAt: new Date(lead.updatedAt).toISOString()
      });
    }
  });

  insertAll(seed.leads);
  console.log(`Seeded ${seed.leads.length} lead(s) from ${SEED_PATH} into SQLite.`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const DB_PATH = path.join(__dirname, "..", "data", "app.db");
  const db = new Database(DB_PATH);
  migrate(db);
  db.close();
  console.log(`Migration complete: ${DB_PATH}`);
}
