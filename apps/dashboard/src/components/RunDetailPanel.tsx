import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  ArrowLeft,
  CheckCircle,
  XCircle,
  MinusCircle,
  Loader2,
  Clock,
  Camera,
  Video,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { runsApi, visualRegressionApi } from '../lib/api';
import type { StepResult, ScreenshotDiff } from '@qa-studio/shared';
import VisualDiffViewer from './VisualDiffViewer';
import clsx from 'clsx';

interface RunDetailPanelProps {
  runId: string;
  onBack: () => void;
  onClose: () => void;
}

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  passed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Passed' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Running' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pending' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
};

const stepStatusIcon: Record<string, { icon: typeof CheckCircle; color: string }> = {
  passed: { icon: CheckCircle, color: 'text-green-500' },
  failed: { icon: XCircle, color: 'text-red-500' },
  skipped: { icon: MinusCircle, color: 'text-gray-400' },
};

function toDataUrl(fsPath: string): string {
  const idx = fsPath.indexOf('data/');
  if (idx !== -1) return '/' + fsPath.slice(idx);
  return fsPath;
}

export default function RunDetailPanel({ runId, onBack, onClose }: RunDetailPanelProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<ScreenshotDiff | null>(null);

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => runsApi.get(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'running' || status === 'pending') return 2000;
      return false;
    },
  });

  const { data: diffs } = useQuery({
    queryKey: ['diffs', runId],
    queryFn: () => visualRegressionApi.getDiffs(runId),
    enabled: !!run && (run.status === 'passed' || run.status === 'failed'),
  });

  if (isLoading) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </aside>
    );
  }

  if (!run) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex items-center justify-center">
        <p className="text-sm text-gray-500">Run not found</p>
      </aside>
    );
  }

  const badge = statusBadge[run.status] || statusBadge.pending;
  const passedCount = run.stepResults?.filter((s: StepResult) => s.status === 'passed').length ?? 0;
  const failedCount = run.stepResults?.filter((s: StepResult) => s.status === 'failed').length ?? 0;
  const skippedCount = run.stepResults?.filter((s: StepResult) => s.status === 'skipped').length ?? 0;

  const getDiffForStep = (stepId: string): ScreenshotDiff | undefined => {
    return diffs?.find((d) => d.stepId === stepId);
  };

  return (
    <>
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="font-semibold text-gray-900">Run Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Status overview */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
                  badge.bg,
                  badge.text
                )}
              >
                {run.status === 'running' && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {badge.label}
              </span>
              {run.durationMs != null && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  {(run.durationMs / 1000).toFixed(2)}s
                </span>
              )}
            </div>

            {/* Step counts */}
            <div className="flex gap-4 text-xs">
              {passedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {passedCount} passed
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-3.5 w-3.5" />
                  {failedCount} failed
                </span>
              )}
              {skippedCount > 0 && (
                <span className="flex items-center gap-1 text-gray-400">
                  <MinusCircle className="h-3.5 w-3.5" />
                  {skippedCount} skipped
                </span>
              )}
            </div>
          </div>

          {/* Error message */}
          {run.error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 break-words">{run.error}</p>
              </div>
            </div>
          )}

          {/* Artifacts */}
          {(run.videoPath || run.screenshotPath) && (
            <div className="px-4 pt-4 flex gap-2">
              {run.screenshotPath && (
                <button
                  onClick={() => setScreenshotUrl(toDataUrl(run.screenshotPath!))}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Screenshot
                </button>
              )}
              {run.videoPath && (
                <a
                  href={toDataUrl(run.videoPath!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Video className="h-3.5 w-3.5" />
                  Video
                </a>
              )}
            </div>
          )}

          {/* Step results */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Step Results
            </h3>
            {!run.stepResults || run.stepResults.length === 0 ? (
              <p className="text-sm text-gray-400">
                {run.status === 'running' || run.status === 'pending'
                  ? 'Waiting for results...'
                  : 'No step results'}
              </p>
            ) : (
              <div className="space-y-1">
                {run.stepResults.map((result: StepResult, index: number) => {
                  const stepConfig = stepStatusIcon[result.status] || stepStatusIcon.skipped;
                  const StepIcon = stepConfig.icon;
                  const diff = getDiffForStep(result.stepId);

                  return (
                    <div
                      key={result.stepId}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                        result.status === 'failed' && 'bg-red-50'
                      )}
                    >
                      <StepIcon className={clsx('h-4 w-4 flex-shrink-0', stepConfig.color)} />
                      <span className="flex-1 text-gray-700 truncate">
                        Step {index + 1}
                      </span>
                      {result.durationMs != null && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {result.durationMs < 1000
                            ? `${result.durationMs}ms`
                            : `${(result.durationMs / 1000).toFixed(1)}s`}
                        </span>
                      )}
                      {diff && (
                        <button
                          onClick={() => setSelectedDiff(diff)}
                          className={clsx(
                            'p-0.5 rounded',
                            diff.status === 'mismatch' ? 'text-yellow-600 hover:text-yellow-700' :
                            diff.status === 'match' ? 'text-green-500 hover:text-green-600' :
                            'text-gray-400 hover:text-gray-600'
                          )}
                          title={`Visual diff: ${diff.status}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {result.screenshotPath && (
                        <button
                          onClick={() => setScreenshotUrl(toDataUrl(result.screenshotPath!))}
                          className="p-0.5 text-gray-400 hover:text-gray-600"
                          title="View screenshot"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* Show per-step errors inline */}
                {run.stepResults
                  .filter((r: StepResult) => r.status === 'failed' && r.error)
                  .map((r: StepResult) => (
                    <div
                      key={`error-${r.stepId}`}
                      className="ml-6 px-3 py-2 text-xs text-red-600 bg-red-50 rounded border-l-2 border-red-300"
                    >
                      {r.error}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Screenshot modal */}
      {screenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setScreenshotUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setScreenshotUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white rounded-full shadow-lg text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={screenshotUrl}
              alt="Screenshot"
              className="rounded-lg shadow-2xl max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Visual diff viewer */}
      {selectedDiff && (
        <VisualDiffViewer
          diff={selectedDiff}
          onClose={() => setSelectedDiff(null)}
        />
      )}
    </>
  );
}
