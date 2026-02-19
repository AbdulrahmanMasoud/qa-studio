import { useState } from 'react';
import { X, Check, XCircle, ZoomIn, Columns3, ArrowLeftRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { visualRegressionApi } from '../lib/api';
import { useToast } from './Toast';
import type { ScreenshotDiff } from '@qa-studio/shared';
import clsx from 'clsx';

function toDataUrl(fsPath: string): string {
  const idx = fsPath.indexOf('data/');
  if (idx !== -1) return '/' + fsPath.slice(idx);
  return fsPath;
}

type ViewMode = 'side-by-side' | 'slider';

interface VisualDiffViewerProps {
  diff: ScreenshotDiff;
  onClose: () => void;
}

export default function VisualDiffViewer({ diff, onClose }: VisualDiffViewerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [sliderPos, setSliderPos] = useState(50);

  const approveMutation = useMutation({
    mutationFn: () => visualRegressionApi.approveDiff(diff.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diffs'] });
      toast.success('Diff approved');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to approve diff'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => visualRegressionApi.rejectDiff(diff.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diffs'] });
      toast.success('Diff rejected');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reject diff'),
  });

  const diffPercent = diff.diffPercentage != null ? (diff.diffPercentage / 100).toFixed(2) : '—';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
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
              {/* View mode toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    viewMode === 'side-by-side' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Side by Side
                </button>
                <button
                  onClick={() => setViewMode('slider')}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    viewMode === 'slider' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Slider
                </button>
              </div>

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

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {viewMode === 'side-by-side' ? (
              <div className="grid grid-cols-3 gap-4">
                {/* Baseline */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Baseline</h3>
                  <div
                    className="relative group cursor-zoom-in rounded-lg border border-gray-200 overflow-hidden"
                    onClick={() => setZoomedImage(toDataUrl(diff.baselinePath))}
                  >
                    <img
                      src={toDataUrl(diff.baselinePath)}
                      alt="Baseline"
                      className="w-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>
                </div>
                {/* Actual */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Actual</h3>
                  <div
                    className="relative group cursor-zoom-in rounded-lg border border-gray-200 overflow-hidden"
                    onClick={() => setZoomedImage(toDataUrl(diff.actualPath))}
                  >
                    <img
                      src={toDataUrl(diff.actualPath)}
                      alt="Actual"
                      className="w-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </div>
                </div>
                {/* Diff */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Diff</h3>
                  {diff.diffPath ? (
                    <div
                      className="relative group cursor-zoom-in rounded-lg border border-red-200 overflow-hidden bg-gray-900"
                      onClick={() => setZoomedImage(toDataUrl(diff.diffPath!))}
                    >
                      <img
                        src={toDataUrl(diff.diffPath)}
                        alt="Diff"
                        className="w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                      No diff image
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Slider view: overlay baseline and actual */
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm font-medium text-gray-500">Baseline</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-500">Actual</span>
                </div>
                <div
                  className="relative rounded-lg border border-gray-200 overflow-hidden cursor-zoom-in"
                  onClick={() => setZoomedImage(sliderPos < 50 ? toDataUrl(diff.baselinePath) : toDataUrl(diff.actualPath))}
                >
                  {/* Actual (bottom layer) */}
                  <img
                    src={toDataUrl(diff.actualPath)}
                    alt="Actual"
                    className="w-full object-contain"
                  />
                  {/* Baseline (top layer, clipped) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={toDataUrl(diff.baselinePath)}
                      alt="Baseline"
                      className="object-contain"
                      style={{ width: `${10000 / sliderPos}%`, maxWidth: 'none' }}
                    />
                  </div>
                  {/* Slider line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 shadow-lg"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                      <ArrowLeftRight className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                {/* Diff image below */}
                {diff.diffPath && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Diff Map</h3>
                    <div
                      className="relative group cursor-zoom-in rounded-lg border border-red-200 overflow-hidden bg-gray-900"
                      onClick={() => setZoomedImage(toDataUrl(diff.diffPath!))}
                    >
                      <img
                        src={toDataUrl(diff.diffPath)}
                        alt="Diff"
                        className="w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zoomed image modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] overflow-auto">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow-lg text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Zoomed view"
              className="max-w-none"
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: 'default' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
