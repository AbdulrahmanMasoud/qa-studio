import { X, Check, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { visualRegressionApi } from '../lib/api';
import type { ScreenshotDiff } from '@qa-studio/shared';
import clsx from 'clsx';

function toDataUrl(fsPath: string): string {
  const idx = fsPath.indexOf('data/');
  if (idx !== -1) return '/' + fsPath.slice(idx);
  return fsPath;
}

interface VisualDiffViewerProps {
  diff: ScreenshotDiff;
  onClose: () => void;
}

export default function VisualDiffViewer({ diff, onClose }: VisualDiffViewerProps) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => visualRegressionApi.approveDiff(diff.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diffs'] });
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => visualRegressionApi.rejectDiff(diff.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diffs'] });
      onClose();
    },
  });

  const diffPercent = diff.diffPercentage != null ? (diff.diffPercentage / 100).toFixed(2) : '—';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-gray-900">Visual Diff</h2>
            <span
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium',
                diff.status === 'match' ? 'bg-green-100 text-green-700' :
                diff.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                diff.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              )}
            >
              {diff.status}
            </span>
            <span className="text-sm text-gray-500">{diffPercent}% difference</span>
          </div>
          <div className="flex items-center gap-2">
            {diff.status === 'mismatch' && (
              <>
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Three-panel view */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 gap-4 h-full">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Baseline</h3>
              <img
                src={toDataUrl(diff.baselinePath)}
                alt="Baseline"
                className="rounded-lg border border-gray-200 w-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Actual</h3>
              <img
                src={toDataUrl(diff.actualPath)}
                alt="Actual"
                className="rounded-lg border border-gray-200 w-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Diff</h3>
              {diff.diffPath ? (
                <img
                  src={toDataUrl(diff.diffPath)}
                  alt="Diff"
                  className="rounded-lg border border-gray-200 w-full object-contain"
                />
              ) : (
                <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  No diff image
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
