import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { migrate, migrateAnalytics } from "./migrate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "app.db");

export const db = new Database(DB_PATH);

migrate(db);
migrateAnalytics(db);
