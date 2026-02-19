import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={clsx(
              'p-2 rounded-lg flex-shrink-0',
              variant === 'danger' && 'bg-red-100',
              variant === 'warning' && 'bg-yellow-100',
              variant === 'default' && 'bg-gray-100'
            )}
          >
            <AlertTriangle
              className={clsx(
                'h-5 w-5',
                variant === 'danger' && 'text-red-600',
                variant === 'warning' && 'text-yellow-600',
                variant === 'default' && 'text-gray-600'
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={clsx(
              'px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50',
              variant === 'danger' && 'bg-red-600 hover:bg-red-700',
              variant === 'warning' && 'bg-yellow-600 hover:bg-yellow-700',
              variant === 'default' && 'bg-indigo-600 hover:bg-indigo-700'
            )}
          >
            {isLoading ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
