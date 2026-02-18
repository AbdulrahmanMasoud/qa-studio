import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Play,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  FileCode,
  Copy,
  Settings,
  PlayCircle,
  BarChart3,
} from 'lucide-react';
import { projectsApi, testsApi, suiteRunsApi } from '../lib/api';
import EnvironmentVariablesModal from '../components/EnvironmentVariablesModal';
import BatchRunProgress, { BatchTestStatus } from '../components/BatchRunProgress';
import clsx from 'clsx';

export default function TestsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchStatuses, setBatchStatuses] = useState<BatchTestStatus[]>([]);
  const [showBatchProgress, setShowBatchProgress] = useState(false);
  const [concurrency, setConcurrency] = useState(1);

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: tests, isLoading } = useQuery({
    queryKey: ['tests', projectId],
    queryFn: () => testsApi.listByProject(projectId!),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: testsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
      setShowCreate(false);
      setNewTestName('');
    },
  });

  const cloneMutation = useMutation({
    mutationFn: testsApi.clone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: testsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
    },
  });

  const variablesMutation = useMutation({
    mutationFn: (variables: Record<string, string>) =>
      projectsApi.update(projectId!, { variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      setShowVariables(false);
    },
  });

  const runMutation = useMutation({
    mutationFn: testsApi.run,
    onMutate: (testId) => {
      setRunningTest(testId);
    },
    onSettled: () => {
      setRunningTest(null);
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim() || !projectId) return;
    createMutation.mutate({
      projectId,
      name: newTestName.trim(),
    });
  };

  const handleDelete = (test: { id: string; name: string }) => {
    if (confirm(`Delete test "${test.name}"?`)) {
      deleteMutation.mutate(test.id);
    }
  };

  const handleRun = (testId: string) => {
    runMutation.mutate(testId);
  };

  const handleRunAll = useCallback(async () => {
    if (!projectId || !tests || tests.length === 0) return;

    setBatchRunning(true);
    setShowBatchProgress(true);
    setBatchStatuses(
      tests.map((t) => ({ testId: t.id, testName: t.name, status: 'pending' as const }))
    );

    try {
      await suiteRunsApi.runAll(projectId, concurrency, (event) => {
        if (event.type === 'test-start') {
          setBatchStatuses((prev) =>
            prev.map((s) =>
              s.testId === event.testId ? { ...s, status: 'running' } : s
            )
          );
        } else if (event.type === 'test-complete') {
          setBatchStatuses((prev) =>
            prev.map((s) =>
              s.testId === event.testId
                ? {
                    ...s,
                    status: event.status,
                    durationMs: event.durationMs,
                    error: event.error,
                  }
                : s
            )
          );
        }
      });
    } catch (error) {
      console.error('Batch run failed:', error);
    } finally {
      setBatchRunning(false);
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
    }
  }, [projectId, tests, concurrency, queryClient]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
            <p className="text-gray-500 mt-1">
              {tests?.length || 0} test{tests?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/projects/${projectId}/dashboard`}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Link>
            <button
              onClick={() => setShowVariables(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Variables
            </button>
            <div className="flex items-center gap-2">
              <select
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                title="Parallel tests"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
              <button
                onClick={handleRunAll}
                disabled={batchRunning || !tests || tests.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <PlayCircle className="h-4 w-4" />
                Run All
              </button>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              New Test
            </button>
          </div>
        </div>
      </div>

      {/* Variables modal */}
      {showVariables && (
        <EnvironmentVariablesModal
          variables={(project as any)?.variables || {}}
          onSave={(vars) => variablesMutation.mutate(vars)}
          onClose={() => setShowVariables(false)}
          isSaving={variablesMutation.isPending}
        />
      )}

      {/* Batch run progress */}
      {showBatchProgress && batchStatuses.length > 0 && (
        <BatchRunProgress
          testStatuses={batchStatuses}
          isRunning={batchRunning}
          onClose={() => setShowBatchProgress(false)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Test</h2>
            <form onSubmit={handleCreate}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name
                </label>
                <input
                  type="text"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="Homepage Load Test"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTestName.trim() || createMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tests list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading tests...</div>
      ) : tests?.length === 0 ? (
        <div className="text-center py-12">
          <FileCode className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No tests yet</h3>
          <p className="text-gray-500 mt-1">Create your first test to start building</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests?.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {runningTest === test.id ? (
                      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <FileCode className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Link
                      to={`/tests/${test.id}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {test.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {test.steps.length} step{test.steps.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRun(test.id)}
                    disabled={runningTest !== null}
                    className={clsx(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      runningTest === test.id
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    )}
                  >
                    <Play className="h-4 w-4" />
                    {runningTest === test.id ? 'Running...' : 'Run'}
                  </button>
                  <button
                    onClick={() => cloneMutation.mutate(test.id)}
                    disabled={cloneMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Clone test"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/tests/${test.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(test)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Last run result */}
              {runMutation.data && runMutation.variables === test.id && (
                <div
                  className={clsx(
                    'mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm',
                    runMutation.data.status === 'passed'
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  {runMutation.data.status === 'passed' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {runMutation.data.status === 'passed' ? 'Passed' : 'Failed'} in{' '}
                  {(runMutation.data.durationMs! / 1000).toFixed(2)}s
                  {runMutation.data.error && (
                    <span className="text-gray-500 ml-2">
                      — {runMutation.data.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
