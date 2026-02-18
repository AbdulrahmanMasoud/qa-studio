import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = './data/qa-studio.db';

// Ensure data directory exists
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    config TEXT NOT NULL,
    steps TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    duration_ms INTEGER,
    error TEXT,
    step_results TEXT,
    screenshot_path TEXT,
    video_path TEXT,
    trace_path TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
`);

console.log('✅ Database initialized');
