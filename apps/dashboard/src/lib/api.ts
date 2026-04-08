import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateTestRequest,
  UpdateTestRequest,
  TestRun,
  StepResult,
  TestConfig,
  TestStep,
  Suite,
  CreateSuiteRequest,
  SuiteRun,
  Flow,
  CreateFlowRequest,
  UpdateFlowRequest,
  Baseline,
  ScreenshotDiff,
} from '@qa-studio/shared';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

// Projects
export const projectsApi = {
  list: () => fetchApi<Project[]>('/projects'),
  
  get: (id: string) => fetchApi<Project>(`/projects/${id}`),
  
  create: (data: CreateProjectRequest) =>
    fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: UpdateProjectRequest) =>
    fetchApi<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    }),
};

// Tests
export interface TestFromApi {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  config: TestConfig;
  steps: TestStep[];
  createdAt: string;
  updatedAt: string;
}

export const testsApi = {
  listByProject: (projectId: string) =>
    fetchApi<TestFromApi[]>(`/projects/${projectId}/tests`),
  
  get: (id: string) => fetchApi<TestFromApi>(`/tests/${id}`),
  
  create: (data: CreateTestRequest) =>
    fetchApi<TestFromApi>('/tests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: UpdateTestRequest) =>
    fetchApi<TestFromApi>(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/tests/${id}`, {
      method: 'DELETE',
    }),

  clone: (id: string) =>
    fetchApi<TestFromApi>(`/tests/${id}/clone`, {
      method: 'POST',
    }),
  
  run: (id: string) =>
    fetchApi<TestRun>(`/tests/${id}/run`, {
      method: 'POST',
    }),

  runWithProgress: async (
    id: string,
    onStepResult: (stepResult: StepResult, stepIndex: number) => void,
  ): Promise<TestRun> => {
    const response = await fetch(`${API_BASE}/tests/${id}/run`, {
      method: 'POST',
      headers: { 'Accept': 'text/event-stream' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || error.error || 'Request failed');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalRun: TestRun | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'step-result') {
            onStepResult(data.stepResult, data.stepIndex);
          } else if (data.type === 'complete') {
            finalRun = data.run;
          }
        } catch (e) {
          console.warn('SSE parse error in runWithProgress:', e);
        }
      }
    }

    if (!finalRun) throw new Error('Run did not complete');
    return finalRun;
  },
  
  getRuns: (testId: string) => fetchApi<TestRun[]>(`/tests/${testId}/runs`),
};

// Runs
export const runsApi = {
  get: (id: string) => fetchApi<TestRun>(`/runs/${id}`),
};

// Suites
export const suitesApi = {
  listByProject: (projectId: string) =>
    fetchApi<Suite[]>(`/projects/${projectId}/suites`),

  create: (data: CreateSuiteRequest) =>
    fetchApi<Suite>('/suites', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Suite>) =>
    fetchApi<Suite>(`/suites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/suites/${id}`, { method: 'DELETE' }),
};

// Suite Runs
export const suiteRunsApi = {
  listByProject: (projectId: string) =>
    fetchApi<SuiteRun[]>(`/projects/${projectId}/suite-runs`),

  get: (id: string) =>
    fetchApi<SuiteRun>(`/suite-runs/${id}`),

  runAll: async (
    projectId: string,
    concurrency: number,
    onEvent: (event: any) => void,
  ): Promise<void> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/run-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurrency }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || error.error || 'Request failed');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch (e) {
          console.warn('SSE parse error in runAll:', e);
        }
      }
    }
  },

  runSuite: async (
    suiteId: string,
    concurrency: number,
    onEvent: (event: any) => void,
  ): Promise<void> => {
    const response = await fetch(`${API_BASE}/suites/${suiteId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurrency }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || error.error || 'Request failed');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          onEvent(JSON.parse(line.slice(6)));
        } catch (e) {
          console.warn('SSE parse error in runSuite:', e);
        }
      }
    }
  },
};

// Flows
export const flowsApi = {
  listByProject: (projectId: string) =>
    fetchApi<Flow[]>(`/projects/${projectId}/flows`),

  get: (id: string) => fetchApi<Flow>(`/flows/${id}`),

  create: (data: CreateFlowRequest) =>
    fetchApi<Flow>('/flows', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: UpdateFlowRequest) =>
    fetchApi<Flow>(`/flows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/flows/${id}`, { method: 'DELETE' }),
};

// Analytics
export const analyticsApi = {
  summary: (projectId: string) =>
    fetchApi<{
      totalTests: number;
      totalRuns: number;
      passRate: number;
      avgDuration: number;
      testStatusCounts: { passing: number; failing: number; noRuns: number };
    }>(`/projects/${projectId}/analytics/summary`),

  trends: (projectId: string, days = 30) =>
    fetchApi<{
      dailyStats: { date: string; totalRuns: number; passed: number; failed: number; passRate: number }[];
    }>(`/projects/${projectId}/analytics/trends?days=${days}`),

  flaky: (projectId: string) =>
    fetchApi<{
      flakyTests: {
        testId: string;
        testName: string;
        flakinessScore: number;
        recentResults: { status: string; createdAt: string }[];
      }[];
    }>(`/projects/${projectId}/analytics/flaky`),
};

// Visual Regression
export const visualRegressionApi = {
  getBaselines: (testId: string) =>
    fetchApi<Baseline[]>(`/tests/${testId}/baselines`),

  setBaselinesFromRun: (testId: string, runId: string) =>
    fetchApi<Baseline[]>(`/tests/${testId}/baselines/from-run/${runId}`, { method: 'POST' }),

  getDiffs: (runId: string) =>
    fetchApi<ScreenshotDiff[]>(`/runs/${runId}/diffs`),

  approveDiff: (diffId: string) =>
    fetchApi<{ success: boolean }>(`/diffs/${diffId}/approve`, { method: 'POST' }),

  rejectDiff: (diffId: string) =>
    fetchApi<{ success: boolean }>(`/diffs/${diffId}/reject`, { method: 'POST' }),

  deleteBaseline: (id: string) =>
    fetchApi<{ success: boolean }>(`/baselines/${id}`, { method: 'DELETE' }),
};

// Recorder
export const recorderApi = {
  start: (testId: string, startUrl: string, options?: { recordDelays?: boolean }) =>
    fetchApi<{ sessionId: string }>('/recorder/start', {
      method: 'POST',
      body: JSON.stringify({ testId, startUrl, recordDelays: options?.recordDelays ?? false }),
    }),

  stop: (sessionId: string) =>
    fetchApi<{ success: boolean }>('/recorder/stop', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
};
