import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { baselines, screenshotDiffs, runs } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { generateId } from '@qa-studio/shared';
import type { StepResult } from '@qa-studio/shared';
import { compareScreenshots } from '../services/visual-diff.js';

export async function visualRegressionRoutes(app: FastifyInstance) {
  // Get baselines for a test
  app.get<{ Params: { testId: string } }>('/api/tests/:testId/baselines', async (request) => {
    const { testId } = request.params;
    return db.select().from(baselines).where(eq(baselines.testId, testId));
  });

  // Set baselines from a run
  app.post<{ Params: { testId: string; runId: string } }>(
    '/api/tests/:testId/baselines/from-run/:runId',
    async (request, reply) => {
      const { testId, runId } = request.params;

      const run = await db.select().from(runs).where(eq(runs.id, runId)).get();
      if (!run) return reply.status(404).send({ error: 'Run not found' });

      const stepResults = (run.stepResults as StepResult[]) || [];
      const screenshotSteps = stepResults.filter((r) => r.screenshotPath);

      if (screenshotSteps.length === 0) {
        return reply.status(400).send({ error: 'No screenshots in this run' });
      }

      // Delete existing baselines for this test
      await db.delete(baselines).where(eq(baselines.testId, testId));

      const now = new Date().toISOString();
      const newBaselines = [];

      for (const stepResult of screenshotSteps) {
        const baseline = {
          id: generateId(),
          testId,
          stepId: stepResult.stepId,
          screenshotPath: stepResult.screenshotPath!,
          runId,
          createdAt: now,
        };
        await db.insert(baselines).values(baseline);
        newBaselines.push(baseline);
      }

      return reply.status(201).send(newBaselines);
    }
  );

  // Get diffs for a run
  app.get<{ Params: { runId: string } }>('/api/runs/:runId/diffs', async (request) => {
    const { runId } = request.params;
    return db.select().from(screenshotDiffs).where(eq(screenshotDiffs.runId, runId));
  });

  // Approve a diff
  app.post<{ Params: { id: string } }>('/api/diffs/:id/approve', async (request, reply) => {
    const { id } = request.params;
    const diff = await db.select().from(screenshotDiffs).where(eq(screenshotDiffs.id, id)).get();
    if (!diff) return reply.status(404).send({ error: 'Diff not found' });

    await db.update(screenshotDiffs).set({ status: 'approved' }).where(eq(screenshotDiffs.id, id));

    // Update baseline with the actual screenshot
    if (diff.baselineId) {
      await db.update(baselines).set({
        screenshotPath: diff.actualPath,
        createdAt: new Date().toISOString(),
      }).where(eq(baselines.id, diff.baselineId));
    }

    return { success: true, status: 'approved' };
  });

  // Reject a diff
  app.post<{ Params: { id: string } }>('/api/diffs/:id/reject', async (request, reply) => {
    const { id } = request.params;
    const diff = await db.select().from(screenshotDiffs).where(eq(screenshotDiffs.id, id)).get();
    if (!diff) return reply.status(404).send({ error: 'Diff not found' });

    await db.update(screenshotDiffs).set({ status: 'rejected' }).where(eq(screenshotDiffs.id, id));
    return { success: true, status: 'rejected' };
  });

  // Delete a baseline
  app.delete<{ Params: { id: string } }>('/api/baselines/:id', async (request, reply) => {
    const { id } = request.params;
    const baseline = await db.select().from(baselines).where(eq(baselines.id, id)).get();
    if (!baseline) return reply.status(404).send({ error: 'Baseline not found' });

    await db.delete(baselines).where(eq(baselines.id, id));
    return { success: true };
  });
}
