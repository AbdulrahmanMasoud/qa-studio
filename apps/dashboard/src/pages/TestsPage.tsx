import { useState, useCallback, useRef } from 'react';
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
  Workflow,
  Search,
  MinusCircle,
  Download,
  Upload,
  Calendar,
} from 'lucide-react';
import { projectsApi, testsApi, suiteRunsApi, analyticsApi, schedulesApi } from '../lib/api';
import EnvironmentVariablesModal from '../components/EnvironmentVariablesModal';
import BatchRunProgress, { BatchTestStatus } from '../components/BatchRunProgress';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import clsx from 'clsx';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

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
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passing' | 'failing' | 'no-runs'>('all');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSchedules, setShowSchedules] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleCron, setNewScheduleCron] = useState('0 3 * * *');

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

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary', projectId],
    queryFn: () => analyticsApi.summary(projectId!),
    enabled: !!projectId,
  });

  const { data: projectSchedules } = useQuery({
    queryKey: ['schedules', projectId],
    queryFn: () => schedulesApi.listByProject(projectId!),
    enabled: !!projectId && showSchedules,
  });

  const createScheduleMutation = useMutation({
    mutationFn: schedulesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', projectId] });
      setNewScheduleName('');
      setNewScheduleCron('0 3 * * *');
      toast.success('Schedule created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create schedule'),
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      schedulesApi.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', projectId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update schedule'),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: schedulesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', projectId] });
      toast.success('Schedule deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete schedule'),
  });

  const createMutation = useMutation({
    mutationFn: testsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
      setShowCreate(false);
      setNewTestName('');
      toast.success('Test created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create test'),
  });

  const cloneMutation = useMutation({
    mutationFn: testsApi.clone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
      toast.success('Test cloned');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to clone test'),
  });

  const deleteMutation = useMutation({
    mutationFn: testsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
      setConfirmDelete(null);
      toast.success('Test deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete test'),
  });

  const variablesMutation = useMutation({
    mutationFn: (variables: Record<string, string>) =>
      projectsApi.update(projectId!, { variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      setShowVariables(false);
      toast.success('Variables saved');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save variables'),
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
    setConfirmDelete({ id: test.id, name: test.name });
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

  const handleExportTest = async (testId: string, testName: string) => {
    try {
      const data = await testsApi.exportTest(testId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${testName.replace(/[^a-z0-9]/gi, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Test exported');
    } catch {
      toast.error('Failed to export test');
    }
  };

  const handleExportProject = async () => {
    if (!projectId || !project) return;
    try {
      const data = await projectsApi.exportProject(projectId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Project exported');
    } catch {
      toast.error('Failed to export project');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await projectsApi.importData(projectId, data);
      queryClient.invalidateQueries({ queryKey: ['tests', projectId] });
      queryClient.invalidateQueries({ queryKey: ['flows', projectId] });
      toast.success(`Imported ${result.importedTests} test(s), ${result.importedFlows} flow(s)`);
    } catch {
      toast.error('Failed to import — invalid file format');
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
          <div className="flex flex-wrap items-center gap-2">
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
            <Link
              to={`/projects/${projectId}/flows`}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Workflow className="h-4 w-4" />
              Flows
            </Link>
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
              onClick={() => setShowSchedules(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Schedules
            </button>
            <button
              onClick={handleExportProject}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export project"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Import tests"
            >
              <Upload className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
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

      {/* Schedules modal */}
      {showSchedules && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Scheduled Runs</h2>
              <button
                onClick={() => setShowSchedules(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Add schedule form */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Add Schedule</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newScheduleName}
                  onChange={(e) => setNewScheduleName(e.target.value)}
                  placeholder="Schedule name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <select
                    value={newScheduleCron}
                    onChange={(e) => setNewScheduleCron(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="0 * * * *">Every hour</option>
                    <option value="0 3 * * *">Daily at 3 AM</option>
                    <option value="0 9 * * *">Daily at 9 AM</option>
                    <option value="0 */6 * * *">Every 6 hours</option>
                    <option value="0 9 * * 1">Weekly Mon 9 AM</option>
                  </select>
                  <button
                    onClick={() => {
                      if (!newScheduleName.trim() || !projectId) return;
                      createScheduleMutation.mutate({
                        projectId,
                        name: newScheduleName.trim(),
                        cronExpression: newScheduleCron,
                      });
                    }}
                    disabled={!newScheduleName.trim() || createScheduleMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Schedules list */}
            <div className="flex-1 overflow-auto">
              {!projectSchedules || projectSchedules.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No schedules yet</p>
              ) : (
                <div className="space-y-2">
                  {projectSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleScheduleMutation.mutate({ id: schedule.id, enabled: !schedule.enabled })}
                        className={clsx(
                          'w-10 h-6 rounded-full relative transition-colors flex-shrink-0',
                          schedule.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                        )}
                      >
                        <div className={clsx(
                          'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform',
                          schedule.enabled ? 'translate-x-5' : 'translate-x-1'
                        )} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{schedule.name}</p>
                        <p className="text-xs text-gray-500">
                          {schedule.cronExpression}
                          {schedule.lastRunAt && (
                            <span className="ml-2">
                              · Last: {schedule.lastRunStatus === 'passed' ? 'Passed' : schedule.lastRunStatus === 'failed' ? 'Failed' : '—'}
                              {' '}{formatRelativeTime(schedule.lastRunAt)}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileCode className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-gray-500">Total Tests</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.totalTests}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-500">Pass Rate</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.passRate}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Play className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-gray-500">Total Runs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary.totalRuns}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary.avgDuration ? `${(summary.avgDuration / 1000).toFixed(1)}s` : '—'}
            </p>
          </div>
        </div>
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

      {/* Confirm delete modal */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Test"
          message={`Delete "${confirmDelete.name}"? This will permanently delete all runs and data associated with this test.`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Tests list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading tests...</div>
      ) : tests?.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileCode className="h-8 w-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No tests yet</h3>
          <p className="text-gray-500 mt-1 max-w-sm mx-auto">
            Tests define automated browser interactions. Create your first test to start validating your application.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Test
          </button>
        </div>
      ) : (
        <>
          {/* Search & Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tests..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'passing', 'failing', 'no-runs'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    statusFilter === filter
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {filter === 'all' ? 'All' : filter === 'passing' ? 'Passing' : filter === 'failing' ? 'Failing' : 'No Runs'}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const filteredTests = tests?.filter((test) => {
              const matchesSearch = !searchQuery || test.name.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'passing' && test.lastRunStatus === 'passed') ||
                (statusFilter === 'failing' && test.lastRunStatus === 'failed') ||
                (statusFilter === 'no-runs' && !test.lastRunStatus);
              return matchesSearch && matchesStatus;
            }) ?? [];

            if (filteredTests.length === 0) {
              return (
                <div className="text-center py-12">
                  <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No matching tests</h3>
                  <p className="text-gray-500 mt-1">Try adjusting your search or filter</p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredTests.map((test) => (
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
                          ) : test.lastRunStatus === 'passed' ? (
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          ) : test.lastRunStatus === 'failed' ? (
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                              <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <MinusCircle className="h-4 w-4 text-gray-400" />
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
                            {test.lastRunAt && (
                              <span className="ml-2">
                                · Last run {formatRelativeTime(test.lastRunAt)}
                              </span>
                            )}
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
                        <button
                          onClick={() => handleExportTest(test.id, test.name)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Export test"
                        >
                          <Download className="h-4 w-4" />
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

                    {/* Last run result (from inline mutation) */}
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
            );
          })()}
        </>
      )}
    </div>
  );
}
