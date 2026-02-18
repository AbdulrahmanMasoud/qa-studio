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
        } catch {
          // ignore parse errors
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

// Recorder
export const recorderApi = {
  start: (testId: string, startUrl: string) =>
    fetchApi<{ sessionId: string }>('/recorder/start', {
      method: 'POST',
      body: JSON.stringify({ testId, startUrl }),
    }),

  stop: (sessionId: string) =>
    fetchApi<{ success: boolean }>('/recorder/stop', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),
};
