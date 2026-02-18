import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Projects table
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url'),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Tests table
export const tests = sqliteTable('tests', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config', { mode: 'json' }).notNull(),
  steps: text('steps', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Test runs table
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  testId: text('test_id')
    .notNull()
    .references(() => tests.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // pending, running, passed, failed, cancelled
  durationMs: integer('duration_ms'),
  error: text('error'),
  stepResults: text('step_results', { mode: 'json' }),
  screenshotPath: text('screenshot_path'),
  videoPath: text('video_path'),
  tracePath: text('trace_path'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

// Types for insert/select
export type InsertProject = typeof projects.$inferInsert;
export type SelectProject = typeof projects.$inferSelect;

export type InsertTest = typeof tests.$inferInsert;
export type SelectTest = typeof tests.$inferSelect;

export type InsertRun = typeof runs.$inferInsert;
export type SelectRun = typeof runs.$inferSelect;
