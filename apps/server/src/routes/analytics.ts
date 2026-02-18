import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { tests, runs, projects } from '../db/schema.js';
import { eq, desc, and, gte } from 'drizzle-orm';
import type { StepResult } from '@qa-studio/shared';

export async function analyticsRoutes(app: FastifyInstance) {
  // Summary analytics
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId/analytics/summary', async (request, reply) => {
    const { projectId } = request.params;

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const allTests = await db.select().from(tests).where(eq(tests.projectId, projectId));
    const allRuns = [];

    for (const test of allTests) {
      const testRuns = await db.select().from(runs).where(eq(runs.testId, test.id));
      allRuns.push(...testRuns);
    }

    const totalTests = allTests.length;
    const totalRuns = allRuns.length;
    const passedRuns = allRuns.filter((r) => r.status === 'passed').length;
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
    const avgDuration = totalRuns > 0
      ? Math.round(allRuns.reduce((sum, r) => sum + (r.durationMs || 0), 0) / totalRuns)
      : 0;

    // Test status counts
    const testStatusCounts = { passing: 0, failing: 0, noRuns: 0 };
    for (const test of allTests) {
      const latestRun = await db.select().from(runs)
        .where(eq(runs.testId, test.id))
        .orderBy(desc(runs.createdAt))
        .limit(1)
        .get();

      if (!latestRun) testStatusCounts.noRuns++;
      else if (latestRun.status === 'passed') testStatusCounts.passing++;
      else testStatusCounts.failing++;
    }

    return {
      totalTests,
      totalRuns,
      passRate,
      avgDuration,
      testStatusCounts,
    };
  });

  // Trend analytics
  app.get<{ Params: { projectId: string }; Querystring: { days?: string } }>(
    '/api/projects/:projectId/analytics/trends',
    async (request, reply) => {
      const { projectId } = request.params;
      const days = parseInt(request.query.days || '30', 10);

      const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
      if (!project) return reply.status(404).send({ error: 'Project not found' });

      const allTests = await db.select().from(tests).where(eq(tests.projectId, projectId));
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();

      const allRuns = [];
      for (const test of allTests) {
        const testRuns = await db.select().from(runs)
          .where(and(eq(runs.testId, test.id), gte(runs.createdAt, cutoffIso)));
        allRuns.push(...testRuns);
      }

      // Group by date
      const dailyMap = new Map<string, { totalRuns: number; passed: number; failed: number }>();
      for (const run of allRuns) {
        const date = run.createdAt.split('T')[0];
        const entry = dailyMap.get(date) || { totalRuns: 0, passed: 0, failed: 0 };
        entry.totalRuns++;
        if (run.status === 'passed') entry.passed++;
        else if (run.status === 'failed') entry.failed++;
        dailyMap.set(date, entry);
      }

      const dailyStats = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({
          date,
          ...stats,
          passRate: stats.totalRuns > 0 ? Math.round((stats.passed / stats.totalRuns) * 100) : 0,
        }));

      return { dailyStats };
    }
  );

  // Flaky tests
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId/analytics/flaky', async (request, reply) => {
    const { projectId } = request.params;

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return reply.status(404).send({ error: 'Project not found' });

    const allTests = await db.select().from(tests).where(eq(tests.projectId, projectId));

    const flakyTests = [];
    for (const test of allTests) {
      const recentRuns = await db.select().from(runs)
        .where(eq(runs.testId, test.id))
        .orderBy(desc(runs.createdAt))
        .limit(10);

      if (recentRuns.length < 2) continue;

      // Count status alternations
      let alternations = 0;
      for (let i = 1; i < recentRuns.length; i++) {
        if (recentRuns[i].status !== recentRuns[i - 1].status) {
          alternations++;
        }
      }

      const flakinessScore = alternations / (recentRuns.length - 1);
      const recentResults = recentRuns.map((r) => ({
        status: r.status,
        createdAt: r.createdAt,
      }));

      flakyTests.push({
        testId: test.id,
        testName: test.name,
        flakinessScore: Math.round(flakinessScore * 100) / 100,
        recentResults,
      });
    }

    // Sort by flakiness score descending
    flakyTests.sort((a, b) => b.flakinessScore - a.flakinessScore);

    return { flakyTests };
  });
}
