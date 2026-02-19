import cron from 'node-cron';
import { db } from '../db/index.js';
import { runs, suiteRuns, screenshotDiffs } from '../db/schema.js';
import { sql, lt } from 'drizzle-orm';
import { existsSync, unlinkSync } from 'fs';

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '30');

export async function runCleanup() {
  if (RETENTION_DAYS <= 0) {
    console.log('[Cleanup] RETENTION_DAYS=0, skipping cleanup');
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  const cutoffISO = cutoffDate.toISOString();

  console.log(`[Cleanup] Removing data older than ${cutoffISO} (${RETENTION_DAYS} days)`);

  try {
    // Find old runs
    const oldRuns = await db.select({
      id: runs.id,
      screenshotPath: runs.screenshotPath,
      videoPath: runs.videoPath,
      tracePath: runs.tracePath,
    }).from(runs).where(lt(runs.createdAt, cutoffISO));

    let deletedFiles = 0;

    // Delete associated files
    for (const run of oldRuns) {
      // Delete screenshot diff files for this run
      const diffs = await db.select({
        baselinePath: screenshotDiffs.baselinePath,
        actualPath: screenshotDiffs.actualPath,
        diffPath: screenshotDiffs.diffPath,
      }).from(screenshotDiffs).where(sql`${screenshotDiffs.runId} = ${run.id}`);

      for (const diff of diffs) {
        for (const path of [diff.actualPath, diff.diffPath]) {
          if (path) {
            try {
              if (existsSync(path)) { unlinkSync(path); deletedFiles++; }
            } catch {}
          }
        }
      }

      // Delete run files
      for (const path of [run.screenshotPath, run.videoPath, run.tracePath]) {
        if (path) {
          try {
            if (existsSync(path)) { unlinkSync(path); deletedFiles++; }
          } catch {}
        }
      }
    }

    // Delete old runs from DB (cascade handles screenshot_diffs)
    const deletedRuns = db.run(sql`DELETE FROM runs WHERE created_at < ${cutoffISO}`);

    // Delete old suite runs
    const deletedSuiteRuns = db.run(sql`DELETE FROM suite_runs WHERE created_at < ${cutoffISO}`);

    console.log(`[Cleanup] Done: ${oldRuns.length} runs, ${deletedFiles} files removed`);
  } catch (err) {
    console.error('[Cleanup] Error:', err);
  }
}

export function startCleanupSchedule() {
  // Run daily at 3 AM
  cron.schedule('0 3 * * *', () => {
    runCleanup();
  });

  // Run once on startup (deferred 5s)
  setTimeout(() => runCleanup(), 5000);

  console.log(`[Cleanup] Scheduled daily at 3 AM (retention: ${RETENTION_DAYS} days)`);
}
