import { TestStep } from '@qa-studio/shared';

export function substituteVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}

export function substituteStepVariables(step: TestStep, variables: Record<string, string>): TestStep {
  const clone = { ...step };

  for (const key of Object.keys(clone)) {
    const val = (clone as any)[key];
    if (typeof val === 'string') {
      (clone as any)[key] = substituteVariables(val, variables);
    }
  }

  return clone as TestStep;
}
