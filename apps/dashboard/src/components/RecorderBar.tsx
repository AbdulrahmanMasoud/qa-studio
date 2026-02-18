import { useState, useEffect } from 'react';
import { Video, StopCircle, Loader2, Globe, X, Zap } from 'lucide-react';

interface RecorderBarProps {
  isRecording: boolean;
  isStarting: boolean;
  recordedStepCount: number;
  startUrl: string;
  onStartUrlChange: (url: string) => void;
  onStart: () => void;
  onStop: () => void;
  onClose: () => void;
}

function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <span className="font-mono text-sm tabular-nums">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

export default function RecorderBar({
  isRecording,
  isStarting,
  recordedStepCount,
  startUrl,
  onStartUrlChange,
  onStart,
  onStop,
  onClose,
}: RecorderBarProps) {
  if (isRecording) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Pulsing dot */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>

            <span className="text-sm font-semibold text-white tracking-wide uppercase">
              Recording
            </span>

            {/* Divider */}
            <span className="w-px h-5 bg-red-400" />

            {/* Timer */}
            <div className="text-white/90">
              <ElapsedTimer />
            </div>

            {/* Divider */}
            <span className="w-px h-5 bg-red-400" />

            {/* Step count */}
            <div className="flex items-center gap-1.5 text-white/90">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">
                {recordedStepCount} step{recordedStepCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-red-100">
              Interact with the browser to capture steps
            </span>
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors shadow-sm"
            >
              <StopCircle className="h-4 w-4" />
              Stop Recording
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
          <Video className="h-4.5 w-4.5 text-red-600" />
        </div>

        {/* Label + description */}
        <div className="flex-shrink-0 mr-1">
          <p className="text-sm font-semibold text-gray-900">Record a session</p>
          <p className="text-xs text-gray-500">A browser will open — your actions become test steps</p>
        </div>

        {/* URL input */}
        <div className="flex-1 max-w-lg relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="url"
            value={startUrl}
            onChange={(e) => onStartUrlChange(e.target.value)}
            placeholder="Enter the URL to start recording..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white transition-shadow"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && startUrl) onStart();
              if (e.key === 'Escape') onClose();
            }}
            autoFocus
          />
        </div>

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={!startUrl || isStarting}
          className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          {isStarting ? 'Launching browser...' : 'Start Recording'}
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
