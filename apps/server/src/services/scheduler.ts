import cron, { ScheduledTask } from 'node-cron';
import { db } from '../db/index.js';
import { schedules, tests, projects, suiteRuns } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateId, TestConfig, TestStep, TestDefinition } from '@qa-studio/shared';
import { runBatch } from './batch-runner.js';

const activeTasks = new Map<string, ScheduledTask>();

function getNextRunDate(cronExpression: string): string | null {
  try {
    // Simple next-run estimate — for display purposes
    // We'll just store current time + rough estimate
    return new Date().toISOString();
  } catch {
    return null;
  }
}

async function executeSchedule(scheduleId: string) {
  const schedule = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
  if (!schedule || !schedule.enabled) return;

  const project = await db.select().from(projects).where(eq(projects.id, schedule.projectId)).get();
  if (!project) return;

  const variables = (project.variables as Record<string, string>) || undefined;

  const allTests = await db.select().from(tests).where(eq(tests.projectId, schedule.projectId));
  if (allTests.length === 0) return;

  const testDefs: TestDefinition[] = allTests.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    name: t.name,
    description: t.description || undefined,
    config: t.config as TestConfig,
    steps: t.steps as TestStep[],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  console.log(`[Scheduler] Running schedule "${schedule.name}" (${allTests.length} tests)`);

  // Create suite run record
  const suiteRunId = generateId();
  const now = new Date().toISOString();
  await db.insert(suiteRuns).values({
    id: suiteRunId,
    projectId: schedule.projectId,
    status: 'running',
    totalTests: allTests.length,
    passedTests: 0,
    failedTests: 0,
    runIds: [],
    createdAt: now,
  });

  try {
    const result = await runBatch({
      tests: testDefs,
      variables,
      concurrency: 2,
    });

    const completedAt = new Date().toISOString();
    await db.update(suiteRuns).set({
      status: result.failed > 0 ? 'failed' : 'passed',
      passedTests: result.passed,
      failedTests: result.failed,
      runIds: result.runs.map((r) => r.id),
      durationMs: result.durationMs,
      completedAt,
    }).where(eq(suiteRuns.id, suiteRunId));

    // Update schedule with last run info
    await db.update(schedules).set({
      lastRunAt: completedAt,
      lastRunStatus: result.failed > 0 ? 'failed' : 'passed',
      updatedAt: completedAt,
    }).where(eq(schedules.id, scheduleId));

    console.log(`[Scheduler] Schedule "${schedule.name}" completed: ${result.passed} passed, ${result.failed} failed`);
  } catch (err) {
    console.error(`[Scheduler] Schedule "${schedule.name}" error:`, err);
    const errorAt = new Date().toISOString();
    await db.update(suiteRuns).set({
      status: 'failed',
      completedAt: errorAt,
    }).where(eq(suiteRuns.id, suiteRunId));

    await db.update(schedules).set({
      lastRunAt: errorAt,
      lastRunStatus: 'failed',
      updatedAt: errorAt,
    }).where(eq(schedules.id, scheduleId));
  }
}

export function scheduleJob(schedule: { id: string; cronExpression: string; name: string }) {
  // Stop existing task if any
  unscheduleJob(schedule.id);

  if (!cron.validate(schedule.cronExpression)) {
    console.error(`[Scheduler] Invalid cron expression for "${schedule.name}": ${schedule.cronExpression}`);
    return;
  }

  const task = cron.schedule(schedule.cronExpression, () => {
    executeSchedule(schedule.id);
  });

  activeTasks.set(schedule.id, task);
  console.log(`[Scheduler] Scheduled "${schedule.name}" with cron: ${schedule.cronExpression}`);
}

export function unscheduleJob(id: string) {
  const existing = activeTasks.get(id);
  if (existing) {
    existing.stop();
    activeTasks.delete(id);
  }
}

export async function loadAllSchedules() {
  const allSchedules = await db.select().from(schedules);
  let loaded = 0;

  for (const schedule of allSchedules) {
    if (schedule.enabled) {
      scheduleJob({
        id: schedule.id,
        cronExpression: schedule.cronExpression,
        name: schedule.name,
      });
      loaded++;
    }
  }

  console.log(`[Scheduler] Loaded ${loaded} active schedule(s)`);
}
