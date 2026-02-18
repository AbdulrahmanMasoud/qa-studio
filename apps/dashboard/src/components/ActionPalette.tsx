import { actionsMeta, ActionType } from '@qa-studio/shared';
import { Plus } from 'lucide-react';

interface ActionPaletteProps {
  onAddStep: (actionType: ActionType) => void;
  excludeActions?: ActionType[];
}

const controlFlowActions: ActionType[] = ['if', 'else', 'end-if', 'loop', 'end-loop'];

export default function ActionPalette({ onAddStep, excludeActions }: ActionPaletteProps) {
  const filteredActions = actionsMeta.filter(
    (a) => !excludeActions?.includes(a.type) && !controlFlowActions.includes(a.type)
  );
  const controlActions = actionsMeta.filter(
    (a) => !excludeActions?.includes(a.type) && controlFlowActions.includes(a.type)
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-auto">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Actions
      </h2>
      <div className="space-y-2">
        {filteredActions.map((action) => (
          <button
            key={action.type}
            onClick={() => onAddStep(action.type)}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left group"
          >
            <span className="text-xl">{action.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-900 group-hover:text-indigo-700">
                {action.label}
              </span>
              <p className="text-xs text-gray-500 truncate">
                {action.description}
              </p>
            </div>
            <Plus className="h-4 w-4 text-gray-400 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

      {controlActions.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-4">
            Control Flow
          </h2>
          <div className="space-y-2">
            {controlActions.map((action) => (
              <button
                key={action.type}
                onClick={() => onAddStep(action.type)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors text-left group"
              >
                <span className="text-xl">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900">
                    {action.label}
                  </span>
                  <p className="text-xs text-gray-500 truncate">
                    {action.description}
                  </p>
                </div>
                <Plus className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
