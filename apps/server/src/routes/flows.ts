import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { flows, projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateId } from '@qa-studio/shared';

const createFlowSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  steps: z.array(z.any()).optional(),
});

const updateFlowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  steps: z.array(z.any()).optional(),
});

export async function flowRoutes(app: FastifyInstance) {
  // List flows for a project
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId/flows', async (request) => {
    const { projectId } = request.params;
    return db.select().from(flows).where(eq(flows.projectId, projectId)).orderBy(flows.createdAt);
  });

  // Get single flow
  app.get<{ Params: { id: string } }>('/api/flows/:id', async (request, reply) => {
    const { id } = request.params;
    const flow = await db.select().from(flows).where(eq(flows.id, id)).get();
    if (!flow) return reply.status(404).send({ error: 'Flow not found' });
    return flow;
  });

  // Create flow
  app.post('/api/flows', async (request, reply) => {
    const parsed = createFlowSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });

    const project = await db.select().from(projects).where(eq(projects.id, parsed.data.projectId)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const now = new Date().toISOString();
    const flow = {
      id: generateId(),
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      steps: parsed.data.steps || [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(flows).values(flow);
    return reply.status(201).send(flow);
  });

  // Update flow
  app.put<{ Params: { id: string } }>('/api/flows/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = updateFlowSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });

    const existing = await db.select().from(flows).where(eq(flows.id, id)).get();
    if (!existing) return reply.status(404).send({ error: 'Flow not found' });

    const updated = {
      name: parsed.data.name ?? existing.name,
      description: parsed.data.description !== undefined ? parsed.data.description : existing.description,
      steps: parsed.data.steps ?? existing.steps,
      updatedAt: new Date().toISOString(),
    };

    await db.update(flows).set(updated).where(eq(flows.id, id));
    return { ...existing, ...updated };
  });

  // Delete flow
  app.delete<{ Params: { id: string } }>('/api/flows/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await db.select().from(flows).where(eq(flows.id, id)).get();
    if (!existing) return reply.status(404).send({ error: 'Flow not found' });

    await db.delete(flows).where(eq(flows.id, id));
    return { success: true };
  });
}
