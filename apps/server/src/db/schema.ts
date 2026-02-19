import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Projects table
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url'),
  description: text('description'),
  variables: text('variables', { mode: 'json' }),
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

// Test suites table
export const suites = sqliteTable('suites', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  testIds: text('test_ids', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Suite runs table
export const suiteRuns = sqliteTable('suite_runs', {
  id: text('id').primaryKey(),
  suiteId: text('suite_id'),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  totalTests: integer('total_tests').notNull(),
  passedTests: integer('passed_tests').notNull().default(0),
  failedTests: integer('failed_tests').notNull().default(0),
  runIds: text('run_ids', { mode: 'json' }),
  durationMs: integer('duration_ms'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

// Baselines for visual regression
export const baselines = sqliteTable('baselines', {
  id: text('id').primaryKey(),
  testId: text('test_id')
    .notNull()
    .references(() => tests.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(),
  screenshotPath: text('screenshot_path').notNull(),
  runId: text('run_id').notNull(),
  createdAt: text('created_at').notNull(),
});

// Screenshot diffs
export const screenshotDiffs = sqliteTable('screenshot_diffs', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(),
  baselineId: text('baseline_id')
    .references(() => baselines.id),
  baselinePath: text('baseline_path').notNull(),
  actualPath: text('actual_path').notNull(),
  diffPath: text('diff_path'),
  diffPercentage: integer('diff_percentage'),
  status: text('status').notNull(), // match, mismatch, new, approved, rejected
  threshold: integer('threshold'),
  createdAt: text('created_at').notNull(),
});

// Flows (reusable step groups)
export const flows = sqliteTable('flows', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  steps: text('steps', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Schedules (cron-based test execution)
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  suiteId: text('suite_id'),
  name: text('name').notNull(),
  cronExpression: text('cron_expression').notNull(),
  enabled: integer('enabled').notNull().default(1),
  lastRunAt: text('last_run_at'),
  nextRunAt: text('next_run_at'),
  lastRunStatus: text('last_run_status'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Types for insert/select
export type InsertProject = typeof projects.$inferInsert;
export type SelectProject = typeof projects.$inferSelect;

export type InsertTest = typeof tests.$inferInsert;
export type SelectTest = typeof tests.$inferSelect;

export type InsertRun = typeof runs.$inferInsert;
export type SelectRun = typeof runs.$inferSelect;

export type InsertSuite = typeof suites.$inferInsert;
export type SelectSuite = typeof suites.$inferSelect;

export type InsertSuiteRun = typeof suiteRuns.$inferInsert;
export type SelectSuiteRun = typeof suiteRuns.$inferSelect;

export type InsertFlow = typeof flows.$inferInsert;
export type SelectFlow = typeof flows.$inferSelect;

export type InsertBaseline = typeof baselines.$inferInsert;
export type SelectBaseline = typeof baselines.$inferSelect;

export type InsertScreenshotDiff = typeof screenshotDiffs.$inferInsert;
export type SelectScreenshotDiff = typeof screenshotDiffs.$inferSelect;

export type InsertSchedule = typeof schedules.$inferInsert;
export type SelectSchedule = typeof schedules.$inferSelect;
