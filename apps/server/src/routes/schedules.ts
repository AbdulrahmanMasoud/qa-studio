import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import cron from 'node-cron';
import { db } from '../db/index.js';
import { schedules, projects } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateId } from '@qa-studio/shared';
import { scheduleJob, unscheduleJob } from '../services/scheduler.js';

const createScheduleSchema = z.object({
  projectId: z.string(),
  suiteId: z.string().optional(),
  name: z.string().min(1).max(100),
  cronExpression: z.string().refine((val) => cron.validate(val), {
    message: 'Invalid cron expression',
  }),
  enabled: z.boolean().optional().default(true),
});

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  cronExpression: z.string().refine((val) => cron.validate(val), {
    message: 'Invalid cron expression',
  }).optional(),
  enabled: z.boolean().optional(),
  suiteId: z.string().optional().nullable(),
});

export async function scheduleRoutes(app: FastifyInstance) {
  // List schedules for a project
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId/schedules', async (request, reply) => {
    const { projectId } = request.params;
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const allSchedules = await db.select().from(schedules).where(eq(schedules.projectId, projectId)).orderBy(schedules.createdAt);
    return allSchedules;
  });

  // Create schedule
  app.post('/api/schedules', async (request, reply) => {
    const parsed = createScheduleSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });

    const project = await db.select().from(projects).where(eq(projects.id, parsed.data.projectId)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const now = new Date().toISOString();
    const schedule = {
      id: generateId(),
      projectId: parsed.data.projectId,
      suiteId: parsed.data.suiteId || null,
      name: parsed.data.name,
      cronExpression: parsed.data.cronExpression,
      enabled: parsed.data.enabled ? 1 : 0,
      lastRunAt: null,
      nextRunAt: null,
      lastRunStatus: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(schedules).values(schedule);

    // Activate the schedule if enabled
    if (parsed.data.enabled) {
      scheduleJob({
        id: schedule.id,
        cronExpression: schedule.cronExpression,
        name: schedule.name,
      });
    }

    return reply.status(201).send(schedule);
  });

  // Update schedule
  app.put<{ Params: { id: string } }>('/api/schedules/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = updateScheduleSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });

    const existing = await db.select().from(schedules).where(eq(schedules.id, id)).get();
    if (!existing) return reply.status(404).send({ error: 'Schedule not found' });

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.cronExpression !== undefined) updates.cronExpression = parsed.data.cronExpression;
    if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled ? 1 : 0;
    if (parsed.data.suiteId !== undefined) updates.suiteId = parsed.data.suiteId;

    await db.update(schedules).set(updates).where(eq(schedules.id, id));

    const updated = await db.select().from(schedules).where(eq(schedules.id, id)).get();

    // Reschedule or unschedule
    if (updated?.enabled) {
      scheduleJob({
        id: updated.id,
        cronExpression: updated.cronExpression,
        name: updated.name,
      });
    } else {
      unscheduleJob(id);
    }

    return updated;
  });

  // Delete schedule
  app.delete<{ Params: { id: string } }>('/api/schedules/:id', async (request, reply) => {
    const { id } = request.params;
    const existing = await db.select().from(schedules).where(eq(schedules.id, id)).get();
    if (!existing) return reply.status(404).send({ error: 'Schedule not found' });

    unscheduleJob(id);
    await db.delete(schedules).where(eq(schedules.id, id));

    return { success: true };
  });

  // Manual cleanup trigger
  app.post('/api/admin/cleanup', async () => {
    const { runCleanup } = await import('../services/cleanup.js');
    await runCleanup();
    return { success: true };
  });
}
