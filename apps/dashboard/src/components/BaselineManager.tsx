import { useState } from 'react';
import { X, Trash2, Image, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visualRegressionApi, testsApi } from '../lib/api';
import type { StepResult } from '@qa-studio/shared';

function toDataUrl(fsPath: string): string {
  const idx = fsPath.indexOf('data/');
  if (idx !== -1) return '/' + fsPath.slice(idx);
  return fsPath;
}

interface BaselineManagerProps {
  testId: string;
  onClose: () => void;
}

export default function BaselineManager({ testId, onClose }: BaselineManagerProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: baselines, isLoading } = useQuery({
    queryKey: ['baselines', testId],
    queryFn: () => visualRegressionApi.getBaselines(testId),
  });

  const { data: runsResponse } = useQuery({
    queryKey: ['runs', testId],
    queryFn: () => testsApi.getRuns(testId, 50),
  });
  const runs = runsResponse?.data;

  const setFromRunMutation = useMutation({
    mutationFn: (runId: string) => visualRegressionApi.setBaselinesFromRun(testId, runId),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['baselines', testId] });
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to set baselines');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: visualRegressionApi.deleteBaseline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baselines', testId] });
    },
  });

  // Only show runs that have screenshot step results
  const runsWithScreenshots = runs?.filter((r) => {
    if (r.status !== 'passed') return false;
    const stepResults = (r.stepResults as StepResult[]) || [];
    return stepResults.some((s) => s.screenshotPath);
  }) || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Visual Baselines</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Set from run */}
        {runsWithScreenshots.length > 0 ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Set baselines from a passed run
            </label>
            <div className="flex gap-2">
              <select
                id="baseline-run-select"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                defaultValue=""
              >
                <option value="" disabled>Select a run...</option>
                {runsWithScreenshots.slice(0, 10).map((run) => {
                  const stepResults = (run.stepResults as StepResult[]) || [];
                  const screenshotCount = stepResults.filter((s) => s.screenshotPath).length;
                  return (
                    <option key={run.id} value={run.id}>
                      {run.id.slice(0, 8)} — {new Date(run.createdAt).toLocaleDateString()} ({screenshotCount} screenshot{screenshotCount !== 1 ? 's' : ''})
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById('baseline-run-select') as HTMLSelectElement;
                  if (select?.value) setFromRunMutation.mutate(select.value);
                }}
                disabled={setFromRunMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {setFromRunMutation.isPending ? 'Setting...' : 'Set'}
              </button>
            </div>
          </div>
        ) : runs && runs.length > 0 ? (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">No runs with screenshots found</p>
            <p className="text-xs text-yellow-600 mt-1">Add screenshot steps to your test, run it, then come back here to set baselines.</p>
          </div>
        ) : null}

        {/* Baselines list */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
          ) : !baselines || baselines.length === 0 ? (
            <div className="text-center py-8">
              <Image className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No baselines set yet</p>
              <p className="text-xs text-gray-400">Run a test with screenshot steps, then set baselines from that run</p>
            </div>
          ) : (
            <div className="space-y-2">
              {baselines.map((baseline) => (
                <div
                  key={baseline.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <img
                    src={toDataUrl(baseline.screenshotPath)}
                    alt="Baseline"
                    className="h-12 w-20 object-cover rounded border border-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      Step: {baseline.stepId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(baseline.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(baseline.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
  );
}
