import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, CheckCircle, XCircle, Loader2, MinusCircle } from 'lucide-react';
import { TestStep, actionsMeta, parseSelectorMode, selectorModes } from '@qa-studio/shared';
import clsx from 'clsx';

export type StepRunStatus = 'running' | 'passed' | 'failed' | 'skipped' | null;

interface SortableStepProps {
  step: TestStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  runStatus?: StepRunStatus;
  durationMs?: number;
  nestingDepth?: number;
}

export default function SortableStep({
  step,
  index,
  isSelected,
  onSelect,
  onDelete,
  runStatus = null,
  durationMs,
  nestingDepth = 0,
}: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: nestingDepth * 24,
  };

  const meta = actionsMeta.find((m) => m.type === step.action);

  const formatSelector = (selector: string): string => {
    if (!selector) return 'No selector';
    const parsed = parseSelectorMode(selector);
    const modeLabel = selectorModes.find((m) => m.mode === parsed.mode)?.label || parsed.mode;
    if (parsed.mode === 'css') return selector;
    if (parsed.mode === 'role') {
      return parsed.name ? `${modeLabel}: ${parsed.role}["${parsed.name}"]` : `${modeLabel}: ${parsed.role}`;
    }
    return `${modeLabel}: "${parsed.value}"`;
  };

  const getStepSummary = () => {
    switch (step.action) {
      case 'goto':
        return step.url || 'No URL';
      case 'click':
      case 'hover':
      case 'check':
      case 'uncheck':
        return formatSelector(step.selector);
      case 'fill':
        return `${formatSelector(step.selector)} → "${step.value || ''}"`;
      case 'select':
        return `${formatSelector(step.selector)} → "${step.value || ''}"`;
      case 'press':
        return step.key || 'No key';
      case 'wait':
        return step.waitType === 'time'
          ? `${step.value}ms`
          : String(step.value) || 'No value';
      case 'screenshot':
        return step.name || 'No name';
      case 'assert':
        return `${step.assertType}: ${step.selector ? formatSelector(step.selector) : step.value || 'No value'}`;
      case 'use-flow':
        return (step as any).flowName || (step as any).flowId || 'No flow selected';
      case 'if':
        return `if ${(step as any).condition?.type || '...'}`;
      case 'else':
        return '';
      case 'end-if':
        return '';
      case 'loop':
        return `while ${(step as any).condition?.type || '...'} (max ${(step as any).maxIterations || 10})`;
      case 'end-loop':
        return '';
      default:
        return '';
    }
  };

  const statusIcon = () => {
    switch (runStatus) {
      case 'running':
        return <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />;
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'skipped':
        return <MinusCircle className="h-5 w-5 text-gray-300" />;
      default:
        return null;
    }
  };

  const isControlFlow = ['if', 'else', 'end-if', 'loop', 'end-loop'].includes(step.action);

  const borderColor = () => {
    if (isSelected) return 'border-indigo-500 shadow-md';
    if (isControlFlow) return 'border-amber-300 hover:border-amber-400';
    switch (runStatus) {
      case 'running':
        return 'border-indigo-400 shadow-md ring-1 ring-indigo-100';
      case 'passed':
        return 'border-green-300';
      case 'failed':
        return 'border-red-300';
      case 'skipped':
        return 'border-gray-200 opacity-50';
      default:
        return 'border-gray-200 hover:border-gray-300';
    }
  };

  const numberBadge = () => {
    if (isControlFlow) return 'bg-amber-100 text-amber-700';
    switch (runStatus) {
      case 'passed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'running':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group rounded-lg border-2 transition-all',
        isDragging && 'opacity-50',
        isControlFlow ? 'bg-amber-50' : 'bg-white',
        borderColor()
      )}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Step number */}
        <span className={clsx(
          'flex-shrink-0 w-6 h-6 rounded-full text-sm font-medium flex items-center justify-center transition-colors',
          numberBadge()
        )}>
          {index + 1}
        </span>

        {/* Icon */}
        <span className="text-xl">{meta?.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0" onClick={onSelect}>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="font-medium text-gray-900">{meta?.label}</span>
            <span className="text-gray-500 truncate text-sm">
              {getStepSummary()}
            </span>
          </div>
        </div>

        {/* Run status indicator / duration */}
        {runStatus && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {durationMs != null && runStatus !== 'running' && runStatus !== 'skipped' && (
              <span className="text-xs text-gray-400 tabular-nums">
                {durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`}
              </span>
            )}
            {statusIcon()}
          </div>
        )}

        {/* Delete button (hidden during run) */}
        {!runStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
