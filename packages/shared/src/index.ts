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
  type: 'text' | 'number' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
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
      { name: 'selector', label: 'Selector', type: 'text', required: true, placeholder: '#button, .class, button[type="submit"]' },
    ],
  },
  {
    type: 'fill',
    label: 'Fill',
    icon: '⌨️',
    description: 'Type text into an input',
    fields: [
      { name: 'selector', label: 'Selector', type: 'text', required: true, placeholder: '#email, input[name="username"]' },
      { name: 'value', label: 'Value', type: 'text', required: true, placeholder: 'Text to type...' },
    ],
  },
  {
    type: 'select',
    label: 'Select',
    icon: '📋',
    description: 'Select an option from dropdown',
    fields: [
      { name: 'selector', label: 'Selector', type: 'text', required: true, placeholder: 'select#country' },
      { name: 'value', label: 'Value', type: 'text', required: true, placeholder: 'Option value' },
    ],
  },
  {
    type: 'check',
    label: 'Check',
    icon: '☑️',
    description: 'Check a checkbox',
    fields: [
      { name: 'selector', label: 'Selector', type: 'text', required: true, placeholder: 'input[type="checkbox"]' },
    ],
  },
  {
    type: 'uncheck',
    label: 'Uncheck',
    icon: '⬜',
    description: 'Uncheck a checkbox',
    fields: [
      { name: 'selector', label: 'Selector', type: 'text', required: true, placeholder: 'input[type="checkbox"]' },
    ],
  },
  {
    type: 'hover',
    label: 'Hover',
    icon: '🎯',
    description: 'Hover over an element',
    fields: [
      { name: 'selector', label: 'Selector', type: 'text', required: true, placeholder: '.menu-item' },
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
      { name: 'selector', label: 'Selector', type: 'text', required: false, placeholder: '.element (for element checks)' },
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
