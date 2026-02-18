import { TestDefinition, TestRun } from '@qa-studio/shared';
import { runTest } from './runner.js';

interface BatchRunOptions {
  tests: TestDefinition[];
  variables?: Record<string, string>;
  concurrency?: number;
  onTestStart?: (testId: string, index: number) => void;
  onTestComplete?: (testId: string, run: TestRun, index: number) => void;
}

export interface BatchResult {
  runs: TestRun[];
  passed: number;
  failed: number;
  durationMs: number;
}

export async function runBatch(options: BatchRunOptions): Promise<BatchResult> {
  const { tests, variables, concurrency = 1, onTestStart, onTestComplete } = options;
  const startTime = Date.now();
  const runs: TestRun[] = [];

  if (concurrency <= 1) {
    // Sequential execution
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      onTestStart?.(test.id, i);
      const run = await runTest(test, undefined, variables);
      runs.push(run);
      onTestComplete?.(test.id, run, i);
    }
  } else {
    // Parallel execution with semaphore
    let activeCount = 0;
    let nextIndex = 0;
    const results: (TestRun | null)[] = new Array(tests.length).fill(null);

    await new Promise<void>((resolve) => {
      const tryNext = () => {
        while (activeCount < concurrency && nextIndex < tests.length) {
          const idx = nextIndex++;
          const test = tests[idx];
          activeCount++;
          onTestStart?.(test.id, idx);

          runTest(test, undefined, variables).then((run) => {
            results[idx] = run;
            activeCount--;
            onTestComplete?.(test.id, run, idx);

            if (nextIndex >= tests.length && activeCount === 0) {
              resolve();
            } else {
              tryNext();
            }
          });
        }
      };
      if (tests.length === 0) resolve();
      else tryNext();
    });

    for (const r of results) {
      if (r) runs.push(r);
    }
  }

  const passed = runs.filter((r) => r.status === 'passed').length;
  const failed = runs.filter((r) => r.status === 'failed').length;

  return {
    runs,
    passed,
    failed,
    durationMs: Date.now() - startTime,
  };
}
