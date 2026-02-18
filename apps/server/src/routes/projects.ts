import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateId } from '@qa-studio/shared';

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
}
