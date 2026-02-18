import { CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import clsx from 'clsx';

export interface BatchTestStatus {
  testId: string;
  testName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  durationMs?: number;
  error?: string;
}

interface BatchRunProgressProps {
  testStatuses: BatchTestStatus[];
  isRunning: boolean;
  onClose: () => void;
}

export default function BatchRunProgress({
  testStatuses,
  isRunning,
  onClose,
}: BatchRunProgressProps) {
  const total = testStatuses.length;
  const passed = testStatuses.filter((t) => t.status === 'passed').length;
  const failed = testStatuses.filter((t) => t.status === 'failed').length;
  const completed = passed + failed;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">
          {isRunning ? 'Running Tests...' : 'Batch Run Complete'}
        </h3>
        {!isRunning && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={clsx(
            'h-2 rounded-full transition-all duration-300',
            failed > 0 ? 'bg-red-500' : 'bg-green-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Counters */}
      <div className="flex items-center gap-4 text-sm mb-3">
        <span className="text-gray-600">{completed}/{total} tests</span>
        {passed > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" /> {passed} passed
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3.5 w-3.5" /> {failed} failed
          </span>
        )}
      </div>

      {/* Test list */}
      <div className="space-y-1 max-h-48 overflow-auto">
        {testStatuses.map((t) => (
          <div
            key={t.testId}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm',
              t.status === 'failed' && 'bg-red-50',
              t.status === 'running' && 'bg-indigo-50'
            )}
          >
            {t.status === 'running' && <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />}
            {t.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-500" />}
            {t.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
            {t.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}
            <span className="flex-1 text-gray-700 truncate">{t.testName}</span>
            {t.durationMs != null && (
              <span className="text-xs text-gray-400">
                {(t.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
