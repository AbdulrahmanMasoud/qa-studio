// ============================================
// QA Studio - Shared Types
// ============================================

// --------------------------------------------
// Test Actions
// --------------------------------------------

export type ActionType =
  | 'goto'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'press'
  | 'wait'
  | 'screenshot'
  | 'assert';

export interface BaseStep {
  id: string;
  action: ActionType;
  description?: string;
}

export interface GotoStep extends BaseStep {
  action: 'goto';
  url: string;
}

export interface ClickStep extends BaseStep {
  action: 'click';
  selector: string;
}

export interface FillStep extends BaseStep {
  action: 'fill';
  selector: string;
  value: string;
}

export interface SelectStep extends BaseStep {
  action: 'select';
  selector: string;
  value: string;
}

export interface CheckStep extends BaseStep {
  action: 'check';
  selector: string;
}

export interface UncheckStep extends BaseStep {
  action: 'uncheck';
  selector: string;
}

export interface HoverStep extends BaseStep {
  action: 'hover';
  selector: string;
}

export interface PressStep extends BaseStep {
  action: 'press';
  key: string;
}

export interface WaitStep extends BaseStep {
  action: 'wait';
  waitType: 'time' | 'selector' | 'url';
  value: string | number;
}

export interface ScreenshotStep extends BaseStep {
  action: 'screenshot';
  name: string;
  fullPage?: boolean;
}

export interface AssertStep extends BaseStep {
  action: 'assert';
  assertType: 'visible' | 'hidden' | 'text' | 'url' | 'title' | 'value';
  selector?: string;
  condition?: 'equals' | 'contains' | 'matches';
  value?: string;
}

export type TestStep =
  | GotoStep
  | ClickStep
  | FillStep
  | SelectStep
  | CheckStep
  | UncheckStep
  | HoverStep
  | PressStep
  | WaitStep
  | ScreenshotStep
  | AssertStep;

// --------------------------------------------
// Test Configuration
// --------------------------------------------

export interface TestConfig {
  browser: 'chromium' | 'firefox' | 'webkit';
  viewport: {
    width: number;
    height: number;
  };
  timeout: number;
  headless: boolean;
  useRealChrome?: boolean;
}

export const defaultTestConfig: TestConfig = {
  browser: 'chromium',
  viewport: { width: 1280, height: 720 },
  timeout: 30000,
  headless: true,
  useRealChrome: false,
};

// --------------------------------------------
// Test Definition
// --------------------------------------------

export interface TestDefinition {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  config: TestConfig;
  steps: TestStep[];
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------
// Project
// --------------------------------------------

export interface Project {
  id: string;
  name: string;
  baseUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------
// Test Run
// --------------------------------------------

export type RunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';

export interface StepResult {
  stepId: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
  screenshotPath?: string;
}

export interface TestRun {
  id: string;
  testId: string;
  status: RunStatus;
  durationMs?: number;
  error?: string;
  stepResults: StepResult[];
  screenshotPath?: string;
  videoPath?: string;
  tracePath?: string;
  createdAt: string;
  completedAt?: string;
}

// --------------------------------------------
// API Request/Response Types
// --------------------------------------------

export interface CreateProjectRequest {
  name: string;
  baseUrl?: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  baseUrl?: string;
  description?: string;
}

export interface CreateTestRequest {
  projectId: string;
  name: string;
  description?: string;
  config?: Partial<TestConfig>;
  steps?: TestStep[];
}

export interface UpdateTestRequest {
  name?: string;
  description?: string;
  config?: Partial<TestConfig>;
  steps?: TestStep[];
}

export interface RunTestRequest {
  testId: string;
  config?: Partial<TestConfig>;
}

// --------------------------------------------
// Action Metadata (for UI)
// --------------------------------------------

export interface ActionMeta {
  type: ActionType;
  label: string;
  icon: string;
  description: string;
  fields: ActionField[];
}

export interface ActionField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'selector';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
}

// --------------------------------------------
// Selector Helper Types & Utilities
// --------------------------------------------

export type SelectorMode = 'text' | 'role' | 'placeholder' | 'label' | 'testid' | 'css';

export const selectorModes: { mode: SelectorMode; label: string; description: string }[] = [
  { mode: 'text', label: 'Text content', description: 'Match element by its visible text' },
  { mode: 'role', label: 'Role', description: 'Match element by ARIA role and accessible name' },
  { mode: 'placeholder', label: 'Placeholder', description: 'Match input by placeholder text' },
  { mode: 'label', label: 'Label', description: 'Match input by its associated label' },
  { mode: 'testid', label: 'Test ID', description: 'Match element by data-testid attribute' },
  { mode: 'css', label: 'CSS Selector', description: 'Advanced: raw CSS selector' },
];

export const ariaRoles = [
  'alert', 'alertdialog', 'button', 'checkbox', 'combobox', 'dialog',
  'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'menu',
  'menuitem', 'navigation', 'option', 'progressbar', 'radio',
  'region', 'row', 'search', 'slider', 'spinbutton', 'switch',
  'tab', 'tabpanel', 'textbox', 'tree', 'treeitem',
] as const;

export function buildPlaywrightSelector(
  mode: SelectorMode,
  value: string,
  options?: { role?: string; name?: string }
): string {
  switch (mode) {
    case 'text':
      return value ? `text=${value}` : '';
    case 'role': {
      const role = options?.role || value;
      const name = options?.name;
      if (!role) return '';
      return name ? `role=${role}[name="${name}"]` : `role=${role}`;
    }
    case 'placeholder':
      return value ? `[placeholder="${value}"]` : '';
    case 'label':
      return value ? `label=${value}` : '';
    case 'testid':
      return value ? `data-testid=${value}` : '';
    case 'css':
      return value;
    default:
      return value;
  }
}

export interface ParsedSelector {
  mode: SelectorMode;
  value: string;
  role?: string;
  name?: string;
}

export function parseSelectorMode(selector: string): ParsedSelector {
  if (!selector) return { mode: 'css', value: '' };

  if (selector.startsWith('text=')) {
    return { mode: 'text', value: selector.slice(5) };
  }
  if (selector.startsWith('role=')) {
    const rest = selector.slice(5);
    const match = rest.match(/^(\w+)(?:\[name="(.*)"\])?$/);
    if (match) {
      return { mode: 'role', value: match[1], role: match[1], name: match[2] || '' };
    }
    return { mode: 'role', value: rest, role: rest };
  }
  if (selector.startsWith('label=')) {
    return { mode: 'label', value: selector.slice(6) };
  }
  if (selector.startsWith('data-testid=')) {
    return { mode: 'testid', value: selector.slice(12) };
  }
  if (selector.match(/^\[placeholder="(.*)"\]$/)) {
    const match = selector.match(/^\[placeholder="(.*)"\]$/);
    return { mode: 'placeholder', value: match![1] };
  }

  return { mode: 'css', value: selector };
}

export const actionsMeta: ActionMeta[] = [
  {
    type: 'goto',
    label: 'Navigate',
    icon: '🌐',
    description: 'Navigate to a URL',
    fields: [
      { name: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://example.com' },
    ],
  },
  {
    type: 'click',
    label: 'Click',
    icon: '👆',
    description: 'Click on an element',
    fields: [
      { name: 'selector', label: 'Selector', type: 'selector', required: true, placeholder: '#button, .class, button[type="submit"]' },
    ],
  },
  {
    type: 'fill',
    label: 'Fill',
    icon: '⌨️',
    description: 'Type text into an input',
    fields: [
      { name: 'selector', label: 'Selector', type: 'selector', required: true, placeholder: '#email, input[name="username"]' },
      { name: 'value', label: 'Value', type: 'text', required: true, placeholder: 'Text to type...' },
    ],
  },
  {
    type: 'select',
    label: 'Select',
    icon: '📋',
    description: 'Select an option from dropdown',
    fields: [
      { name: 'selector', label: 'Selector', type: 'selector', required: true, placeholder: 'select#country' },
      { name: 'value', label: 'Value', type: 'text', required: true, placeholder: 'Option value' },
    ],
  },
  {
    type: 'check',
    label: 'Check',
    icon: '☑️',
    description: 'Check a checkbox',
    fields: [
      { name: 'selector', label: 'Selector', type: 'selector', required: true, placeholder: 'input[type="checkbox"]' },
    ],
  },
  {
    type: 'uncheck',
    label: 'Uncheck',
    icon: '⬜',
    description: 'Uncheck a checkbox',
    fields: [
      { name: 'selector', label: 'Selector', type: 'selector', required: true, placeholder: 'input[type="checkbox"]' },
    ],
  },
  {
    type: 'hover',
    label: 'Hover',
    icon: '🎯',
    description: 'Hover over an element',
    fields: [
      { name: 'selector', label: 'Selector', type: 'selector', required: true, placeholder: '.menu-item' },
    ],
  },
  {
    type: 'press',
    label: 'Press Key',
    icon: '⌨️',
    description: 'Press a keyboard key',
    fields: [
      { name: 'key', label: 'Key', type: 'text', required: true, placeholder: 'Enter, Tab, Escape, ArrowDown' },
    ],
  },
  {
    type: 'wait',
    label: 'Wait',
    icon: '⏳',
    description: 'Wait for time or element',
    fields: [
      {
        name: 'waitType',
        label: 'Wait Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Time (ms)', value: 'time' },
          { label: 'Element visible', value: 'selector' },
          { label: 'URL contains', value: 'url' },
        ],
        defaultValue: 'time',
      },
      { name: 'value', label: 'Value', type: 'text', required: true, placeholder: '1000 or .element or /dashboard' },
    ],
  },
  {
    type: 'screenshot',
    label: 'Screenshot',
    icon: '📸',
    description: 'Take a screenshot',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'screenshot-name' },
      { name: 'fullPage', label: 'Full Page', type: 'checkbox', required: false, defaultValue: false },
    ],
  },
  {
    type: 'assert',
    label: 'Assert',
    icon: '✅',
    description: 'Verify a condition',
    fields: [
      {
        name: 'assertType',
        label: 'Assert Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Element is visible', value: 'visible' },
          { label: 'Element is hidden', value: 'hidden' },
          { label: 'Text content', value: 'text' },
          { label: 'URL', value: 'url' },
          { label: 'Page title', value: 'title' },
          { label: 'Input value', value: 'value' },
        ],
        defaultValue: 'visible',
      },
      { name: 'selector', label: 'Selector', type: 'selector', required: false, placeholder: '.element (for element checks)' },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: false,
        options: [
          { label: 'Equals', value: 'equals' },
          { label: 'Contains', value: 'contains' },
          { label: 'Matches regex', value: 'matches' },
        ],
        defaultValue: 'contains',
      },
      { name: 'value', label: 'Expected Value', type: 'text', required: false, placeholder: 'Expected text or value' },
    ],
  },
];

// --------------------------------------------
// Utility Functions
// --------------------------------------------

export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyStep(action: ActionType): TestStep {
  const id = generateId();
  
  switch (action) {
    case 'goto':
      return { id, action, url: '' };
    case 'click':
      return { id, action, selector: '' };
    case 'fill':
      return { id, action, selector: '', value: '' };
    case 'select':
      return { id, action, selector: '', value: '' };
    case 'check':
      return { id, action, selector: '' };
    case 'uncheck':
      return { id, action, selector: '' };
    case 'hover':
      return { id, action, selector: '' };
    case 'press':
      return { id, action, key: '' };
    case 'wait':
      return { id, action, waitType: 'time', value: 1000 };
    case 'screenshot':
      return { id, action, name: '', fullPage: false };
    case 'assert':
      return { id, action, assertType: 'visible', selector: '', condition: 'contains', value: '' };
    default:
      throw new Error(`Unknown action type: ${action}`);
  }
}
