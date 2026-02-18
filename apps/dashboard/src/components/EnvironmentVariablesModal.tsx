import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface EnvironmentVariablesModalProps {
  variables: Record<string, string>;
  onSave: (variables: Record<string, string>) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export default function EnvironmentVariablesModal({
  variables,
  onSave,
  onClose,
  isSaving,
}: EnvironmentVariablesModalProps) {
  const [rows, setRows] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    const entries = Object.entries(variables || {});
    setRows(entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]);
  }, [variables]);

  const handleAdd = () => {
    setRows([...rows, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: 'key' | 'value', val: string) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  };

  const handleSave = () => {
    const vars: Record<string, string> = {};
    for (const row of rows) {
      if (row.key.trim()) {
        vars[row.key.trim()] = row.value;
      }
    }
    onSave(vars);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Environment Variables</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Use <code className="bg-gray-100 px-1 rounded">{'{{variable_name}}'}</code> in step fields to substitute values at runtime.
        </p>

        <div className="flex-1 overflow-auto space-y-2 mb-4">
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={row.key}
                onChange={(e) => handleChange(index, 'key', e.target.value)}
                placeholder="Variable name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                value={row.value}
                onChange={(e) => handleChange(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={() => handleRemove(index)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 mb-4"
        >
          <Plus className="h-4 w-4" />
          Add Variable
        </button>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
