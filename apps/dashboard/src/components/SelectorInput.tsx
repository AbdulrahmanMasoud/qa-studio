import { useState, useEffect } from 'react';
import {
  SelectorMode,
  selectorModes,
  ariaRoles,
  buildPlaywrightSelector,
  parseSelectorMode,
} from '@qa-studio/shared';

interface SelectorInputProps {
  value: string;
  onChange: (selector: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function SelectorInput({ value, onChange, placeholder, required }: SelectorInputProps) {
  const parsed = parseSelectorMode(value);
  const [mode, setMode] = useState<SelectorMode>(parsed.mode);
  const [textValue, setTextValue] = useState(parsed.value);
  const [roleName, setRoleName] = useState(parsed.name || '');
  const [selectedRole, setSelectedRole] = useState(parsed.role || ariaRoles[0]);

  // Sync from external value changes (e.g. loading a saved step)
  useEffect(() => {
    const p = parseSelectorMode(value);
    setMode(p.mode);
    setTextValue(p.value);
    if (p.mode === 'role') {
      setSelectedRole(p.role || ariaRoles[0]);
      setRoleName(p.name || '');
    }
  }, [value]);

  const emitChange = (
    nextMode: SelectorMode,
    nextValue: string,
    nextRole?: string,
    nextName?: string
  ) => {
    const selector = buildPlaywrightSelector(nextMode, nextValue, {
      role: nextRole,
      name: nextName,
    });
    onChange(selector);
  };

  const handleModeChange = (newMode: SelectorMode) => {
    setMode(newMode);
    // Reset values when switching modes
    if (newMode === 'role') {
      const role = selectedRole || ariaRoles[0];
      setSelectedRole(role);
      setRoleName('');
      setTextValue(role);
      emitChange(newMode, role, role, '');
    } else if (newMode === 'css') {
      // Preserve current raw selector value when switching to CSS
      setTextValue(value);
    } else {
      setTextValue('');
      emitChange(newMode, '', undefined, undefined);
    }
  };

  const handleTextChange = (newValue: string) => {
    setTextValue(newValue);
    emitChange(mode, newValue);
  };

  const handleRoleChange = (newRole: string) => {
    setSelectedRole(newRole);
    setTextValue(newRole);
    emitChange('role', newRole, newRole, roleName);
  };

  const handleRoleNameChange = (newName: string) => {
    setRoleName(newName);
    emitChange('role', selectedRole, selectedRole, newName);
  };

  const currentModeInfo = selectorModes.find((m) => m.mode === mode);
  const generatedSelector = buildPlaywrightSelector(mode, textValue, {
    role: selectedRole,
    name: roleName,
  });

  return (
    <div className="space-y-2">
      {/* Mode selector */}
      <select
        value={mode}
        onChange={(e) => handleModeChange(e.target.value as SelectorMode)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
      >
        {selectorModes.map((m) => (
          <option key={m.mode} value={m.mode}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Mode description */}
      {currentModeInfo && (
        <p className="text-xs text-gray-500">{currentModeInfo.description}</p>
      )}

      {/* Mode-specific inputs */}
      {mode === 'role' ? (
        <div className="space-y-2">
          <select
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          >
            {ariaRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={roleName}
            onChange={(e) => handleRoleNameChange(e.target.value)}
            placeholder="Accessible name (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
      ) : (
        <input
          type="text"
          value={mode === 'css' ? value : textValue}
          onChange={(e) => {
            if (mode === 'css') {
              onChange(e.target.value);
              setTextValue(e.target.value);
            } else {
              handleTextChange(e.target.value);
            }
          }}
          placeholder={
            mode === 'text'
              ? 'e.g. Login, Submit, Sign up'
              : mode === 'placeholder'
                ? 'e.g. Enter your email'
                : mode === 'label'
                  ? 'e.g. Email address'
                  : mode === 'testid'
                    ? 'e.g. login-button'
                    : placeholder || '#id, .class, button[type="submit"]'
          }
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      )}

      {/* Generated selector preview */}
      {generatedSelector && mode !== 'css' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Selector:</span>
          <code className="text-xs bg-gray-100 text-indigo-700 px-2 py-1 rounded font-mono truncate">
            {generatedSelector}
          </code>
        </div>
      )}
    </div>
  );
}
