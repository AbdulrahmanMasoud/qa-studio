import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { suites, suiteRuns, tests, projects } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { generateId, TestStep, TestConfig, TestDefinition } from '@qa-studio/shared';
import { runBatch } from '../services/batch-runner.js';

const createSuiteSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  testIds: z.array(z.string()),
});

const updateSuiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  testIds: z.array(z.string()).optional(),
});

export async function suiteRoutes(app: FastifyInstance) {
  // List suites for a project
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId/suites', async (request) => {
    const { projectId } = request.params;
    return db.select().from(suites).where(eq(suites.projectId, projectId)).orderBy(suites.createdAt);
  });

  // Create suite
  app.post('/api/suites', async (request, reply) => {
    const parsed = createSuiteSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });

    const now = new Date().toISOString();
    const suite = {
      id: generateId(),
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      testIds: parsed.data.testIds,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(suites).values(suite);
    return reply.status(201).send(suite);
  });

  // Update suite
  app.put<{ Params: { id: string } }>('/api/suites/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = updateSuiteSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });

    const existing = await db.select().from(suites).where(eq(suites.id, id)).get();
    if (!existing) return reply.status(404).send({ error: 'Suite not found' });

    const updated = {
      ...existing,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    await db.update(suites).set(updated).where(eq(suites.id, id));
    return updated;
  });

  // Delete suite
  app.delete<{ Params: { id: string } }>('/api/suites/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await db.select().from(suites).where(eq(suites.id, id)).get();
    if (!existing) return reply.status(404).send({ error: 'Suite not found' });

    await db.delete(suites).where(eq(suites.id, id));
    return { success: true };
  });

  // Run all tests in a project (SSE)
  app.post<{ Params: { projectId: string } }>('/api/projects/:projectId/run-all', async (request, reply) => {
    const { projectId } = request.params;
    const body = request.body as any;
    const concurrency = Math.min(Math.max(body?.concurrency || 1, 1), 5);

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const allTests = await db.select().from(tests).where(eq(tests.projectId, projectId)).orderBy(tests.createdAt);
    if (allTests.length === 0) return reply.status(400).send({ error: 'No tests to run' });

    const variables = (project.variables as Record<string, string>) || undefined;

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

    // Create suite run record
    const suiteRunId = generateId();
    const now = new Date().toISOString();
    await db.insert(suiteRuns).values({
      id: suiteRunId,
      projectId,
      status: 'running',
      totalTests: allTests.length,
      passedTests: 0,
      failedTests: 0,
      runIds: [],
      createdAt: now,
    });

    // SSE stream
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const runIds: string[] = [];
    let passedCount = 0;
    let failedCount = 0;

    const result = await runBatch({
      tests: testDefs,
      variables,
      concurrency,
      onTestStart: (testId, index) => {
        const testName = allTests.find((t) => t.id === testId)?.name || testId;
        reply.raw.write(`data: ${JSON.stringify({ type: 'test-start', testId, testName, index })}\n\n`);
      },
      onTestComplete: (testId, run, index) => {
        runIds.push(run.id);
        if (run.status === 'passed') passedCount++;
        else failedCount++;
        const testName = allTests.find((t) => t.id === testId)?.name || testId;
        reply.raw.write(`data: ${JSON.stringify({
          type: 'test-complete',
          testId,
          testName,
          index,
          status: run.status,
          durationMs: run.durationMs,
          error: run.error,
          runId: run.id,
        })}\n\n`);
      },
    });

    // Update suite run
    const completedAt = new Date().toISOString();
    await db.update(suiteRuns).set({
      status: failedCount > 0 ? 'failed' : 'passed',
      passedTests: passedCount,
      failedTests: failedCount,
      runIds,
      durationMs: result.durationMs,
      completedAt,
    }).where(eq(suiteRuns.id, suiteRunId));

    reply.raw.write(`data: ${JSON.stringify({
      type: 'suite-complete',
      suiteRunId,
      status: failedCount > 0 ? 'failed' : 'passed',
      passed: passedCount,
      failed: failedCount,
      durationMs: result.durationMs,
    })}\n\n`);

    reply.raw.end();
    return reply;
  });

  // Run a specific suite (SSE)
  app.post<{ Params: { id: string } }>('/api/suites/:id/run', async (request, reply) => {
    const { id } = request.params;
    const body = request.body as any;
    const concurrency = Math.min(Math.max(body?.concurrency || 1, 1), 5);

    const suite = await db.select().from(suites).where(eq(suites.id, id)).get();
    if (!suite) return reply.status(404).send({ error: 'Suite not found' });

    const project = await db.select().from(projects).where(eq(projects.id, suite.projectId)).get();
    const variables = (project?.variables as Record<string, string>) || undefined;

    const suiteTestIds = suite.testIds as string[];
    const allTests = await db.select().from(tests).where(eq(tests.projectId, suite.projectId));
    const suiteTests = allTests.filter((t) => suiteTestIds.includes(t.id));

    if (suiteTests.length === 0) return reply.status(400).send({ error: 'No tests in suite' });

    const testDefs: TestDefinition[] = suiteTests.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      name: t.name,
      description: t.description || undefined,
      config: t.config as TestConfig,
      steps: t.steps as TestStep[],
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    const suiteRunId = generateId();
    const now = new Date().toISOString();
    await db.insert(suiteRuns).values({
      id: suiteRunId,
      suiteId: id,
      projectId: suite.projectId,
      status: 'running',
      totalTests: suiteTests.length,
      passedTests: 0,
      failedTests: 0,
      runIds: [],
      createdAt: now,
    });

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const runIds: string[] = [];
    let passedCount = 0;
    let failedCount = 0;

    const result = await runBatch({
      tests: testDefs,
      variables,
      concurrency,
      onTestStart: (testId, index) => {
        const testName = suiteTests.find((t) => t.id === testId)?.name || testId;
        reply.raw.write(`data: ${JSON.stringify({ type: 'test-start', testId, testName, index })}\n\n`);
      },
      onTestComplete: (testId, run, index) => {
        runIds.push(run.id);
        if (run.status === 'passed') passedCount++;
        else failedCount++;
        const testName = suiteTests.find((t) => t.id === testId)?.name || testId;
        reply.raw.write(`data: ${JSON.stringify({
          type: 'test-complete',
          testId,
          testName,
          index,
          status: run.status,
          durationMs: run.durationMs,
          error: run.error,
          runId: run.id,
        })}\n\n`);
      },
    });

    const completedAt = new Date().toISOString();
    await db.update(suiteRuns).set({
      status: failedCount > 0 ? 'failed' : 'passed',
      passedTests: passedCount,
      failedTests: failedCount,
      runIds,
      durationMs: result.durationMs,
      completedAt,
    }).where(eq(suiteRuns.id, suiteRunId));

    reply.raw.write(`data: ${JSON.stringify({
      type: 'suite-complete',
      suiteRunId,
      status: failedCount > 0 ? 'failed' : 'passed',
      passed: passedCount,
      failed: failedCount,
      durationMs: result.durationMs,
    })}\n\n`);

    reply.raw.end();
    return reply;
  });

  // List suite runs for a project (paginated)
  app.get<{ Params: { projectId: string }; Querystring: { limit?: string; offset?: string } }>('/api/projects/:projectId/suite-runs', async (request) => {
    const { projectId } = request.params;
    const limit = Math.min(Math.max(parseInt(request.query.limit || '20') || 20, 1), 100);
    const offset = Math.max(parseInt(request.query.offset || '0') || 0, 0);

    const totalResult = db.select({ count: sql<number>`count(*)` }).from(suiteRuns).where(eq(suiteRuns.projectId, projectId)).get();
    const total = totalResult?.count ?? 0;

    const data = await db.select().from(suiteRuns).where(eq(suiteRuns.projectId, projectId)).orderBy(desc(suiteRuns.createdAt)).limit(limit).offset(offset);
    return { data, total, limit, offset };
  });

  // Get single suite run
  app.get<{ Params: { id: string } }>('/api/suite-runs/:id', async (request, reply) => {
    const { id } = request.params;
    const run = await db.select().from(suiteRuns).where(eq(suiteRuns.id, id)).get();
    if (!run) return reply.status(404).send({ error: 'Suite run not found' });
    return run;
  });
}
