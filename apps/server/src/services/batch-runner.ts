import { TestDefinition, TestRun } from '@qa-studio/shared';
import { runTest } from './runner.js';

interface BatchRunOptions {
  tests: TestDefinition[];
  variables?: Record<string, string>;
  baseUrl?: string;
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
  const { tests, variables, baseUrl, concurrency = 1, onTestStart, onTestComplete } = options;
  const startTime = Date.now();
  const runs: TestRun[] = [];

  if (concurrency <= 1) {
    // Sequential execution
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      onTestStart?.(test.id, i);
      const run = await runTest(test, undefined, variables, undefined, baseUrl);
      runs.push(run);
      onTestComplete?.(test.id, run, i);
    }
  } else {
    // Parallel execution with semaphore
    let activeCount = 0;
    let nextIndex = 0;
    const results: (TestRun | null)[] = new Array(tests.length).fill(null);

    await new Promise<void>((resolve) => {
      const handleResult = (idx: number, testId: string, run: TestRun) => {
        results[idx] = run;
        activeCount--;
        onTestComplete?.(testId, run, idx);
        if (nextIndex >= tests.length && activeCount === 0) {
          resolve();
        } else {
          tryNext();
        }
      };

      const tryNext = () => {
        while (activeCount < concurrency && nextIndex < tests.length) {
          const idx = nextIndex++;
          const test = tests[idx];
          activeCount++;
          onTestStart?.(test.id, idx);

          runTest(test, undefined, variables, undefined, baseUrl)
            .then((run) => handleResult(idx, test.id, run))
            .catch((error) => {
              const failedRun: TestRun = {
                id: `failed-${test.id}-${Date.now()}`,
                testId: test.id,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                durationMs: 0,
                stepResults: [],
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
              };
              handleResult(idx, test.id, failedRun);
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
