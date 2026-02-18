import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { tests, projects, runs } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { generateId, defaultTestConfig, TestStep, TestConfig } from '@qa-studio/shared';
import { runTest } from '../services/runner.js';

const testStepSchema = z.object({
  id: z.string(),
  action: z.enum(['goto', 'click', 'fill', 'select', 'check', 'uncheck', 'hover', 'press', 'wait', 'screenshot', 'assert']),
  url: z.string().optional(),
  selector: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  key: z.string().optional(),
  waitType: z.enum(['time', 'selector', 'url']).optional(),
  name: z.string().optional(),
  fullPage: z.boolean().optional(),
  assertType: z.enum(['visible', 'hidden', 'text', 'url', 'title', 'value']).optional(),
  condition: z.enum(['equals', 'contains', 'matches']).optional(),
  description: z.string().optional(),
});

const testConfigSchema = z.object({
  browser: z.enum(['chromium', 'firefox', 'webkit']).optional(),
  viewport: z.object({
    width: z.number().min(320).max(3840),
    height: z.number().min(240).max(2160),
  }).optional(),
  timeout: z.number().min(1000).max(120000).optional(),
  headless: z.boolean().optional(),
  useRealChrome: z.boolean().optional(),
});

const createTestSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  config: testConfigSchema.optional(),
  steps: z.array(testStepSchema).optional(),
});

const updateTestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  config: testConfigSchema.optional(),
  steps: z.array(testStepSchema).optional(),
});

export async function testRoutes(app: FastifyInstance) {
  // List tests for a project
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId/tests', async (request, reply) => {
    const { projectId } = request.params;
    
    // Check project exists
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    
    const allTests = await db.select().from(tests).where(eq(tests.projectId, projectId)).orderBy(tests.createdAt);
    return allTests;
  });

  // Get single test
  app.get<{ Params: { id: string } }>('/api/tests/:id', async (request, reply) => {
    const { id } = request.params;
    const test = await db.select().from(tests).where(eq(tests.id, id)).get();
    
    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }
    
    return test;
  });

  // Create test
  app.post('/api/tests', async (request, reply) => {
    const parsed = createTestSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors });
    }
    
    // Check project exists
    const project = await db.select().from(projects).where(eq(projects.id, parsed.data.projectId)).get();
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    
    const now = new Date().toISOString();
    const config: TestConfig = { ...defaultTestConfig, ...parsed.data.config };
    
    const test = {
      id: generateId(),
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      config: config,
      steps: parsed.data.steps || [],
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(tests).values(test);
    
    return reply.status(201).send(test);
  });

  // Update test
  app.put<{ Params: { id: string } }>('/api/tests/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = updateTestSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors });
    }
    
    const existing = await db.select().from(tests).where(eq(tests.id, id)).get();
    
    if (!existing) {
      return reply.status(404).send({ error: 'Test not found' });
    }
    
    const existingConfig = existing.config as TestConfig;
    const existingSteps = existing.steps as TestStep[];
    
    const updated = {
      name: parsed.data.name ?? existing.name,
      description: parsed.data.description !== undefined ? parsed.data.description : existing.description,
      config: parsed.data.config ? { ...existingConfig, ...parsed.data.config } : existingConfig,
      steps: parsed.data.steps ?? existingSteps,
      updatedAt: new Date().toISOString(),
    };
    
    await db.update(tests).set(updated).where(eq(tests.id, id));
    
    return { ...existing, ...updated };
  });

  // Delete test
  app.delete<{ Params: { id: string } }>('/api/tests/:id', async (request, reply) => {
    const { id } = request.params;
    
    const existing = await db.select().from(tests).where(eq(tests.id, id)).get();
    
    if (!existing) {
      return reply.status(404).send({ error: 'Test not found' });
    }
    
    await db.delete(tests).where(eq(tests.id, id));
    
    return { success: true };
  });

  // Run test
  app.post<{ Params: { id: string } }>('/api/tests/:id/run', async (request, reply) => {
    const { id } = request.params;
    
    const test = await db.select().from(tests).where(eq(tests.id, id)).get();
    
    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }
    
    // Run the test
    const testDef = {
      id: test.id,
      projectId: test.projectId,
      name: test.name,
      description: test.description || undefined,
      config: test.config as TestConfig,
      steps: test.steps as TestStep[],
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };
    
    const result = await runTest(testDef);
    
    return result;
  });

  // Get runs for a test
  app.get<{ Params: { id: string } }>('/api/tests/:id/runs', async (request, reply) => {
    const { id } = request.params;
    
    const test = await db.select().from(tests).where(eq(tests.id, id)).get();
    
    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }
    
    const testRuns = await db.select().from(runs).where(eq(runs.testId, id)).orderBy(desc(runs.createdAt));
    return testRuns;
  });

  // Get single run
  app.get<{ Params: { id: string } }>('/api/runs/:id', async (request, reply) => {
    const { id } = request.params;
    const run = await db.select().from(runs).where(eq(runs.id, id)).get();
    
    if (!run) {
      return reply.status(404).send({ error: 'Run not found' });
    }
    
    return run;
  });
}
