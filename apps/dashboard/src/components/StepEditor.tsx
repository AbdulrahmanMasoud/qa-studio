import { X } from 'lucide-react';
import { TestStep, actionsMeta, ActionField } from '@qa-studio/shared';
import SelectorInput from './SelectorInput';

interface StepEditorProps {
  step: TestStep;
  onUpdate: (updates: Partial<TestStep>) => void;
  onClose: () => void;
}

export default function StepEditor({ step, onUpdate, onClose }: StepEditorProps) {
  const meta = actionsMeta.find((m) => m.type === step.action);

  if (!meta) return null;

  const renderField = (field: ActionField) => {
    const value = (step as any)[field.name] ?? field.defaultValue ?? '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onUpdate({ [field.name]: e.target.value })}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onUpdate({ [field.name]: Number(e.target.value) })}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => onUpdate({ [field.name]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onUpdate({ [field.name]: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="text-gray-700">{field.label}</span>
          </label>
        );

      case 'selector':
        return (
          <SelectorInput
            value={value as string}
            onChange={(selector) => onUpdate({ [field.name]: selector })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      default:
        return null;
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <h2 className="font-semibold text-gray-900">{meta.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {meta.fields.map((field) => (
            <div key={field.name}>
              {field.type !== 'checkbox' && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}
              {renderField(field)}
            </div>
          ))}

          {/* Description field (optional for all steps) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={step.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Add a note for this step..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Tips
        </h3>
        <p className="text-sm text-gray-600">{meta.description}</p>
        {(step.action === 'click' || step.action === 'fill' || step.action === 'hover') && (
          <p className="text-xs text-gray-500 mt-2">
            Use the selector mode picker to target elements by text, role, placeholder, or CSS.
          </p>
        )}
        {step.action === 'wait' && (
          <p className="text-xs text-gray-500 mt-2">
            For time: enter milliseconds (1000 = 1 second).
            <br />
            For selector: enter a CSS selector to wait for.
          </p>
        )}
        {step.action === 'assert' && (
          <p className="text-xs text-gray-500 mt-2">
            Assertions verify that your app is in the expected state.
          </p>
        )}
      </div>
    </aside>
  );
}
