import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle, XCircle, Clock, Loader2, History } from 'lucide-react';
import { testsApi } from '../lib/api';
import type { TestRun } from '@qa-studio/shared';
import clsx from 'clsx';

interface RunHistoryPanelProps {
  testId: string;
  onSelectRun: (runId: string) => void;
  onClose: () => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  passed: { icon: CheckCircle, color: 'text-green-600', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-red-600', label: 'Failed' },
  running: { icon: Loader2, color: 'text-blue-600', label: 'Running' },
  pending: { icon: Clock, color: 'text-gray-400', label: 'Pending' },
  cancelled: { icon: XCircle, color: 'text-gray-400', label: 'Cancelled' },
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

export default function RunHistoryPanel({ testId, onSelectRun, onClose }: RunHistoryPanelProps) {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs', testId],
    queryFn: () => testsApi.getRuns(testId),
    refetchInterval: 5000,
  });

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Run History</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Runs list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !runs || runs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <History className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No runs yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "Run Test" to execute this test</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {runs.map((run: TestRun) => {
              const config = statusConfig[run.status] || statusConfig.pending;
              const Icon = config.icon;

              return (
                <button
                  key={run.id}
                  onClick={() => onSelectRun(run.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={clsx(
                        'h-5 w-5 flex-shrink-0',
                        config.color,
                        run.status === 'running' && 'animate-spin'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={clsx('text-sm font-medium', config.color)}>
                          {config.label}
                        </span>
                        {run.durationMs != null && (
                          <span className="text-xs text-gray-400">
                            {(run.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-gray-400 truncate">
                          {run.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime((run as any).createdAt || new Date().toISOString())}
                        </span>
                      </div>
                      {run.error && (
                        <p className="text-xs text-red-500 mt-1 truncate">{run.error}</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
