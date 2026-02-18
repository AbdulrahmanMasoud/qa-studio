import { X } from 'lucide-react';
import { TestStep, actionsMeta, ActionField, ConditionType } from '@qa-studio/shared';
import { useQuery } from '@tanstack/react-query';
import { flowsApi } from '../lib/api';
import SelectorInput from './SelectorInput';

interface StepEditorProps {
  step: TestStep;
  onUpdate: (updates: Partial<TestStep>) => void;
  onClose: () => void;
  projectId?: string;
}

const conditionTypes: { label: string; value: ConditionType }[] = [
  { label: 'Element exists', value: 'element-exists' },
  { label: 'Element does not exist', value: 'element-not-exists' },
  { label: 'Variable equals', value: 'variable-equals' },
  { label: 'Variable contains', value: 'variable-contains' },
  { label: 'URL matches', value: 'url-matches' },
  { label: 'URL contains', value: 'url-contains' },
];

export default function StepEditor({ step, onUpdate, onClose, projectId }: StepEditorProps) {
  const meta = actionsMeta.find((m) => m.type === step.action);

  // Fetch flows for use-flow step selector
  const { data: flows } = useQuery({
    queryKey: ['flows', projectId],
    queryFn: () => flowsApi.listByProject(projectId!),
    enabled: !!projectId && step.action === 'use-flow',
  });

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

  // Render use-flow selector
  const renderFlowSelector = () => {
    const flowId = (step as any).flowId || '';
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Flow <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          value={flowId}
          onChange={(e) => {
            const selectedFlow = flows?.find((f) => f.id === e.target.value);
            onUpdate({
              flowId: e.target.value,
              flowName: selectedFlow?.name || '',
            } as any);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Select a flow...</option>
          {flows?.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
    );
  };

  // Render condition editor for if/loop steps
  const renderConditionEditor = () => {
    const condition = (step as any).condition || { type: 'element-exists' };

    const updateCondition = (updates: any) => {
      onUpdate({ condition: { ...condition, ...updates } } as any);
    };

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition Type</label>
          <select
            value={condition.type}
            onChange={(e) => updateCondition({ type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {conditionTypes.map((ct) => (
              <option key={ct.value} value={ct.value}>{ct.label}</option>
            ))}
          </select>
        </div>

        {(condition.type === 'element-exists' || condition.type === 'element-not-exists') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selector</label>
            <SelectorInput
              value={condition.selector || ''}
              onChange={(selector) => updateCondition({ selector })}
              placeholder=".element"
              required
            />
          </div>
        )}

        {(condition.type === 'variable-equals' || condition.type === 'variable-contains') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variable Name</label>
              <input
                type="text"
                value={condition.variable || ''}
                onChange={(e) => updateCondition({ variable: e.target.value })}
                placeholder="variable_name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="text"
                value={condition.value || ''}
                onChange={(e) => updateCondition({ value: e.target.value })}
                placeholder="Expected value"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {(condition.type === 'url-matches' || condition.type === 'url-contains') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Pattern</label>
            <input
              type="text"
              value={condition.value || ''}
              onChange={(e) => updateCondition({ value: e.target.value })}
              placeholder={condition.type === 'url-matches' ? '/dashboard.*' : '/dashboard'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {step.action === 'loop' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Iterations</label>
            <input
              type="number"
              value={(step as any).maxIterations || 10}
              onChange={(e) => onUpdate({ maxIterations: Number(e.target.value) } as any)}
              min={1}
              max={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
    );
  };

  const isControlFlow = ['if', 'else', 'end-if', 'loop', 'end-loop'].includes(step.action);
  const hasCondition = step.action === 'if' || step.action === 'loop';

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
          {step.action === 'use-flow' ? (
            renderFlowSelector()
          ) : hasCondition ? (
            renderConditionEditor()
          ) : isControlFlow ? (
            <p className="text-sm text-gray-500">{meta.description}</p>
          ) : (
            meta.fields.map((field) => (
              <div key={field.name}>
                {field.type !== 'checkbox' && (
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                {renderField(field)}
              </div>
            ))
          )}

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
