import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { TestStep, actionsMeta } from '@qa-studio/shared';
import clsx from 'clsx';

interface SortableStepProps {
  step: TestStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function SortableStep({
  step,
  index,
  isSelected,
  onSelect,
  onDelete,
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
  };

  const meta = actionsMeta.find((m) => m.type === step.action);

  const getStepSummary = () => {
    switch (step.action) {
      case 'goto':
        return step.url || 'No URL';
      case 'click':
      case 'hover':
      case 'check':
      case 'uncheck':
        return step.selector || 'No selector';
      case 'fill':
        return `${step.selector || 'No selector'} → "${step.value || ''}"`;
      case 'select':
        return `${step.selector || 'No selector'} → "${step.value || ''}"`;
      case 'press':
        return step.key || 'No key';
      case 'wait':
        return step.waitType === 'time'
          ? `${step.value}ms`
          : String(step.value) || 'No value';
      case 'screenshot':
        return step.name || 'No name';
      case 'assert':
        return `${step.assertType}: ${step.selector || step.value || 'No value'}`;
      default:
        return '';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group bg-white rounded-lg border-2 transition-all',
        isDragging && 'opacity-50',
        isSelected
          ? 'border-indigo-500 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
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
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center">
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

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
