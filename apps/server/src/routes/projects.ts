import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects, tests, flows } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateId, TestStep, TestConfig, defaultTestConfig } from '@qa-studio/shared';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  baseUrl: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  variables: z.record(z.string()).optional(),
});

export async function projectRoutes(app: FastifyInstance) {
  // List all projects
  app.get('/api/projects', async () => {
    const allProjects = await db.select().from(projects).orderBy(projects.createdAt);
    return allProjects;
  });

  // Get single project
  app.get<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const { id } = request.params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    
    return project;
  });

  // Create project
  app.post('/api/projects', async (request, reply) => {
    const parsed = createProjectSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors });
    }
    
    const now = new Date().toISOString();
    const project = {
      id: generateId(),
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl || null,
      description: parsed.data.description || null,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(projects).values(project);
    
    return reply.status(201).send(project);
  });

  // Update project
  app.put<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = updateProjectSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors });
    }
    
    const existing = await db.select().from(projects).where(eq(projects.id, id)).get();
    
    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    
    const updated = {
      ...existing,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    
    await db.update(projects).set(updated).where(eq(projects.id, id));
    
    return updated;
  });

  // Delete project
  app.delete<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const { id } = request.params;

    const existing = await db.select().from(projects).where(eq(projects.id, id)).get();

    if (!existing) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    await db.delete(projects).where(eq(projects.id, id));

    return { success: true };
  });

  // Export project (all tests + flows)
  app.get<{ Params: { id: string } }>('/api/projects/:id/export', async (request, reply) => {
    const { id } = request.params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const allTests = await db.select().from(tests).where(eq(tests.projectId, id));
    const allFlows = await db.select().from(flows).where(eq(flows.projectId, id));

    return {
      version: 1,
      type: 'project',
      exportedAt: new Date().toISOString(),
      project: {
        name: project.name,
        baseUrl: project.baseUrl,
        variables: project.variables,
      },
      tests: allTests.map((t) => ({
        name: t.name,
        description: t.description,
        config: t.config,
        steps: t.steps,
      })),
      flows: allFlows.map((f) => ({
        name: f.name,
        description: f.description,
        steps: f.steps,
      })),
    };
  });

  // Import tests/flows into a project
  app.post<{ Params: { id: string } }>('/api/projects/:id/import', async (request, reply) => {
    const { id } = request.params;
    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const body = request.body as any;

    const importSchema = z.object({
      version: z.number(),
      type: z.enum(['test', 'project']),
      test: z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        config: z.any().optional(),
        steps: z.array(z.any()).optional(),
      }).optional(),
      tests: z.array(z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        config: z.any().optional(),
        steps: z.array(z.any()).optional(),
      })).optional(),
      flows: z.array(z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        steps: z.array(z.any()).optional(),
      })).optional(),
    });

    const parsed = importSchema.safeParse(body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid import format' });

    const data = parsed.data;
    const now = new Date().toISOString();
    let importedTests = 0;
    let importedFlows = 0;

    // Build flow ID mapping for remapping use-flow references
    const flowIdMap = new Map<string, string>();

    // Import flows first (so we can remap references)
    if (data.flows) {
      for (const flowData of data.flows) {
        const newId = generateId();
        // We store the name → newId mapping for later use-flow remapping
        flowIdMap.set(flowData.name, newId);
        const steps = (flowData.steps || []).map((s: any) => ({ ...s, id: generateId() }));
        await db.insert(flows).values({
          id: newId,
          projectId: id,
          name: flowData.name,
          description: flowData.description || null,
          steps,
          createdAt: now,
          updatedAt: now,
        });
        importedFlows++;
      }
    }

    // Helper to remap use-flow step flowId references
    const remapSteps = (steps: any[]) =>
      steps.map((step: any) => {
        const newStep = { ...step, id: generateId() };
        if (step.action === 'use-flow' && step.flowName && flowIdMap.has(step.flowName)) {
          newStep.flowId = flowIdMap.get(step.flowName)!;
        }
        return newStep;
      });

    // Import tests
    const testsToImport = data.type === 'test' && data.test ? [data.test] : data.tests || [];
    for (const testData of testsToImport) {
      const config = { ...defaultTestConfig, ...(testData.config || {}) };
      await db.insert(tests).values({
        id: generateId(),
        projectId: id,
        name: testData.name,
        description: testData.description || null,
        config,
        steps: remapSteps(testData.steps || []),
        createdAt: now,
        updatedAt: now,
      });
      importedTests++;
    }

    return { success: true, importedTests, importedFlows };
  });
}
