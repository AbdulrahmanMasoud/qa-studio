import { chromium, firefox, webkit, devices, Browser, Page, BrowserContext } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  TestDefinition,
  TestStep,
  TestConfig,
  StepResult,
  TestRun,
  RunStatus,
  generateId,
} from '@qa-studio/shared';
import { db } from '../db/index.js';
import { runs, flows, baselines, screenshotDiffs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { substituteStepVariables } from './variables.js';
import { compareScreenshots } from './visual-diff.js';

export type FlowResolver = (flowId: string) => TestStep[] | null;

function resolveFlows(steps: TestStep[], resolver: FlowResolver, depth = 0): TestStep[] {
  if (depth > 10) throw new Error('Maximum flow nesting depth exceeded (10)');

  const resolved: TestStep[] = [];
  for (const step of steps) {
    if (step.action === 'use-flow') {
      const flowSteps = resolver((step as any).flowId);
      if (flowSteps) {
        resolved.push(...resolveFlows(flowSteps, resolver, depth + 1));
      }
    } else {
      resolved.push(step);
    }
  }
  return resolved;
}

export function createFlowResolver(): FlowResolver {
  return (flowId: string) => {
    const flow = db.select().from(flows).where(eq(flows.id, flowId)).get();
    return flow ? (flow.steps as TestStep[]) : null;
  };
}

const DATA_DIR = './data';

// Ensure directories exist
function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

// Get browser instance based on config
async function getBrowser(config: TestConfig): Promise<Browser> {
  if (config.useRealChrome) {
    // Use system Chrome in headed mode to bypass bot detection.
    // Headless Chrome is reliably fingerprinted by Cloudflare even with stealth args.
    return chromium.launch({
      channel: 'chrome',
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });
  }

  const options = { headless: config.headless };

  // Use the device's default browser type if a device is selected
  let browserType = config.browser;
  if (config.device && devices[config.device]) {
    browserType = devices[config.device].defaultBrowserType;
  }

  switch (browserType) {
    case 'firefox':
      return firefox.launch(options);
    case 'webkit':
      return webkit.launch(options);
    case 'chromium':
    default:
      return chromium.launch(options);
  }
}

// Execute a single test step
async function executeStep(page: Page, step: TestStep, config: TestConfig): Promise<StepResult> {
  const startTime = Date.now();
  
  try {
    switch (step.action) {
      case 'goto':
        await page.goto(step.url, { timeout: config.timeout });
        break;
        
      case 'click':
        await page.click(step.selector, { timeout: config.timeout });
        break;
        
      case 'fill':
        await page.fill(step.selector, step.value, { timeout: config.timeout });
        break;
        
      case 'select':
        await page.selectOption(step.selector, step.value, { timeout: config.timeout });
        break;
        
      case 'check':
        await page.check(step.selector, { timeout: config.timeout });
        break;
        
      case 'uncheck':
        await page.uncheck(step.selector, { timeout: config.timeout });
        break;
        
      case 'hover':
        await page.hover(step.selector, { timeout: config.timeout });
        break;
        
      case 'press':
        await page.keyboard.press(step.key);
        break;
        
      case 'wait':
        if (step.waitType === 'time') {
          await page.waitForTimeout(Number(step.value));
        } else if (step.waitType === 'selector') {
          await page.waitForSelector(String(step.value), { timeout: config.timeout });
        } else if (step.waitType === 'url') {
          await page.waitForURL(`**${step.value}**`, { timeout: config.timeout });
        }
        break;
        
      case 'screenshot':
        const screenshotDir = join(DATA_DIR, 'screenshots');
        ensureDir(screenshotDir);
        const screenshotPath = join(screenshotDir, `${step.name}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: step.fullPage });
        return {
          stepId: step.id,
          status: 'passed',
          durationMs: Date.now() - startTime,
          screenshotPath,
        };
        
      case 'assert':
        await executeAssert(page, step, config);
        break;
        
      default:
        throw new Error(`Unknown action: ${(step as any).action}`);
    }
    
    return {
      stepId: step.id,
      status: 'passed',
      durationMs: Date.now() - startTime,
    };
    
  } catch (error) {
    return {
      stepId: step.id,
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Execute assertion step
async function executeAssert(page: Page, step: TestStep & { action: 'assert' }, config: TestConfig) {
  const { assertType, selector, condition, value } = step;
  
  switch (assertType) {
    case 'visible':
      if (!selector) throw new Error('Selector required for visibility check');
      await page.waitForSelector(selector, { state: 'visible', timeout: config.timeout });
      break;
      
    case 'hidden':
      if (!selector) throw new Error('Selector required for hidden check');
      await page.waitForSelector(selector, { state: 'hidden', timeout: config.timeout });
      break;
      
    case 'text':
      if (!selector) throw new Error('Selector required for text check');
      const textContent = await page.textContent(selector);
      assertCondition(textContent || '', value || '', condition || 'contains');
      break;
      
    case 'url':
      const currentUrl = page.url();
      assertCondition(currentUrl, value || '', condition || 'contains');
      break;
      
    case 'title':
      const title = await page.title();
      assertCondition(title, value || '', condition || 'contains');
      break;
      
    case 'value':
      if (!selector) throw new Error('Selector required for value check');
      const inputValue = await page.inputValue(selector);
      assertCondition(inputValue, value || '', condition || 'equals');
      break;
      
    default:
      throw new Error(`Unknown assert type: ${assertType}`);
  }
}

// Check assertion condition
function assertCondition(actual: string, expected: string, condition: string) {
  switch (condition) {
    case 'equals':
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`);
      }
      break;
    case 'contains':
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
      break;
    case 'matches':
      const regex = new RegExp(expected);
      if (!regex.test(actual)) {
        throw new Error(`Expected "${actual}" to match pattern "${expected}"`);
      }
      break;
    default:
      throw new Error(`Unknown condition: ${condition}`);
  }
}

// Evaluate a step condition (for if/loop)
async function evaluateCondition(
  page: Page,
  condition: { type: string; selector?: string; variable?: string; value?: string },
  variables?: Record<string, string>
): Promise<boolean> {
  switch (condition.type) {
    case 'element-exists':
      try {
        const el = await page.$(condition.selector || '');
        return el !== null;
      } catch { return false; }

    case 'element-not-exists':
      try {
        const el = await page.$(condition.selector || '');
        return el === null;
      } catch { return true; }

    case 'variable-equals':
      return (variables?.[condition.variable || ''] || '') === (condition.value || '');

    case 'variable-contains':
      return (variables?.[condition.variable || ''] || '').includes(condition.value || '');

    case 'url-matches':
      try {
        return new RegExp(condition.value || '').test(page.url());
      } catch { return false; }

    case 'url-contains':
      return page.url().includes(condition.value || '');

    default:
      return false;
  }
}

// Find matching else or end-if for an if at the given index
function findMatchingElseOrEndIf(steps: TestStep[], ifIndex: number): { elseIndex: number; endIfIndex: number } {
  let depth = 0;
  let elseIndex = -1;

  for (let i = ifIndex + 1; i < steps.length; i++) {
    if (steps[i].action === 'if') depth++;
    else if (steps[i].action === 'end-if') {
      if (depth === 0) return { elseIndex, endIfIndex: i };
      depth--;
    } else if (steps[i].action === 'else' && depth === 0) {
      elseIndex = i;
    }
  }
  return { elseIndex, endIfIndex: steps.length };
}

// Find matching end-loop for a loop at the given index
function findMatchingEndLoop(steps: TestStep[], loopIndex: number): number {
  let depth = 0;
  for (let i = loopIndex + 1; i < steps.length; i++) {
    if (steps[i].action === 'loop') depth++;
    else if (steps[i].action === 'end-loop') {
      if (depth === 0) return i;
      depth--;
    }
  }
  return steps.length;
}

// Resolve a URL against a base URL if it's relative
function resolveUrl(url: string, baseUrl?: string): string {
  if (!baseUrl) return url;
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative URL — prepend baseUrl
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

// Main test runner function
export async function runTest(test: TestDefinition, onProgress?: (run: Partial<TestRun>) => void, variables?: Record<string, string>, flowResolver?: FlowResolver, baseUrl?: string): Promise<TestRun> {
  const runId = generateId();
  const startTime = Date.now();
  
  // Create run record
  const run: TestRun = {
    id: runId,
    testId: test.id,
    status: 'running',
    stepResults: [],
    createdAt: new Date().toISOString(),
  };
  
  // Insert into database
  await db.insert(runs).values({
    id: run.id,
    testId: run.testId,
    status: run.status,
    stepResults: run.stepResults,
    createdAt: run.createdAt,
  });
  
  onProgress?.(run);
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  
  try {
    // Launch browser
    browser = await getBrowser(test.config);
    
    // Setup video recording
    const videoDir = join(DATA_DIR, 'videos', runId);
    ensureDir(videoDir);
    
    const contextOptions: any = {
      viewport: test.config.viewport,
      recordVideo: { dir: videoDir },
    };

    // Apply device emulation if a device is selected
    if (test.config.device && devices[test.config.device]) {
      const deviceDesc = devices[test.config.device];
      Object.assign(contextOptions, {
        viewport: deviceDesc.viewport,
        userAgent: deviceDesc.userAgent,
        deviceScaleFactor: deviceDesc.deviceScaleFactor,
        isMobile: deviceDesc.isMobile,
        hasTouch: deviceDesc.hasTouch,
      });
    }

    // When using real Chrome, set a realistic user agent to avoid detection
    if (test.config.useRealChrome && !test.config.device) {
      contextOptions.userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    }

    context = await browser.newContext(contextOptions);

    // Patch navigator.webdriver to prevent bot detection
    if (test.config.useRealChrome) {
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

    }

    const page = await context.newPage();

    // Show a visible cursor during real browser test execution
    if (test.config.useRealChrome) {
      const injectCursor = async () => {
        await page.evaluate(() => {
          if (document.querySelector('.__qa-cursor')) return;

          const style = document.createElement('style');
          style.textContent = `
            .__qa-cursor {
              position: fixed;
              z-index: 2147483647;
              pointer-events: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: rgba(220, 38, 38, 0.7);
              border: 2px solid rgba(220, 38, 38, 0.9);
              transform: translate(-50%, -50%);
              transition: width 0.15s, height 0.15s, background 0.15s;
              left: -100px;
              top: -100px;
            }
            .__qa-cursor--click {
              width: 34px;
              height: 34px;
              background: rgba(220, 38, 38, 0.3);
            }
          `;
          document.head.appendChild(style);

          const cursor = document.createElement('div');
          cursor.className = '__qa-cursor';
          document.body.appendChild(cursor);

          document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
          }, true);

          document.addEventListener('mousedown', () => {
            cursor.classList.add('__qa-cursor--click');
          }, true);

          document.addEventListener('mouseup', () => {
            setTimeout(() => cursor.classList.remove('__qa-cursor--click'), 150);
          }, true);
        }).catch(() => {});
      };

      // Re-inject cursor after every navigation
      page.on('load', () => { injectCursor(); });
    }
    
    // Resolve flows if resolver provided
    const resolver = flowResolver || createFlowResolver();
    const expandedSteps = resolveFlows(test.steps, resolver);

    // Execute steps with index-based state machine for control flow
    const stepResults: StepResult[] = [];
    let failed = false;
    let i = 0;

    while (i < expandedSteps.length) {
      const step = expandedSteps[i];

      if (failed) {
        stepResults.push({ stepId: step.id, status: 'skipped', durationMs: 0 });
        i++;
        run.stepResults = stepResults;
        onProgress?.(run);
        continue;
      }

      // Apply step delay if configured
      if (test.config.stepDelay && test.config.stepDelay > 0) {
        await page.waitForTimeout(test.config.stepDelay);
      }

      // Handle control flow steps
      if (step.action === 'if') {
        const condition = (step as any).condition;
        const conditionResult = condition ? await evaluateCondition(page, condition, variables) : false;
        const { elseIndex, endIfIndex } = findMatchingElseOrEndIf(expandedSteps, i);

        stepResults.push({ stepId: step.id, status: 'passed', durationMs: 0 });
        run.stepResults = stepResults;
        onProgress?.(run);

        if (conditionResult) {
          // Condition true: execute then-block, skip else-block
          i++; // Move past 'if', execute normally until else/end-if
          // We'll skip the else block when we encounter it
        } else {
          // Condition false: skip to else or end-if
          if (elseIndex !== -1) {
            // Skip to just after else
            for (let s = i + 1; s <= elseIndex; s++) {
              stepResults.push({ stepId: expandedSteps[s].id, status: 'skipped', durationMs: 0 });
            }
            i = elseIndex + 1;
          } else {
            // No else: skip to just after end-if
            for (let s = i + 1; s <= endIfIndex; s++) {
              stepResults.push({ stepId: expandedSteps[s].id, status: 'skipped', durationMs: 0 });
            }
            i = endIfIndex + 1;
          }
          run.stepResults = stepResults;
          onProgress?.(run);
        }
        continue;
      }

      if (step.action === 'else') {
        // If we reach 'else' normally, it means the if-condition was true
        // and we executed the then-block. Skip to end-if.
        const { endIfIndex } = findMatchingElseOrEndIf(expandedSteps, i - 1); // approximate
        stepResults.push({ stepId: step.id, status: 'skipped', durationMs: 0 });
        // Skip everything from else+1 to end-if
        let depth = 0;
        let endIdx = expandedSteps.length;
        for (let s = i + 1; s < expandedSteps.length; s++) {
          if (expandedSteps[s].action === 'if') depth++;
          else if (expandedSteps[s].action === 'end-if') {
            if (depth === 0) { endIdx = s; break; }
            depth--;
          }
          stepResults.push({ stepId: expandedSteps[s].id, status: 'skipped', durationMs: 0 });
        }
        if (endIdx < expandedSteps.length) {
          stepResults.push({ stepId: expandedSteps[endIdx].id, status: 'skipped', durationMs: 0 });
        }
        i = endIdx + 1;
        run.stepResults = stepResults;
        onProgress?.(run);
        continue;
      }

      if (step.action === 'end-if' || step.action === 'end-loop') {
        stepResults.push({ stepId: step.id, status: 'passed', durationMs: 0 });
        i++;
        run.stepResults = stepResults;
        onProgress?.(run);
        continue;
      }

      if (step.action === 'loop') {
        const condition = (step as any).condition;
        const maxIterations = (step as any).maxIterations || 10;
        const endLoopIndex = findMatchingEndLoop(expandedSteps, i);
        const loopBody = expandedSteps.slice(i + 1, endLoopIndex);

        stepResults.push({ stepId: step.id, status: 'passed', durationMs: 0 });
        run.stepResults = stepResults;
        onProgress?.(run);

        let iteration = 0;
        while (iteration < maxIterations) {
          const conditionResult = condition ? await evaluateCondition(page, condition, variables) : false;
          if (!conditionResult) break;

          for (const bodyStep of loopBody) {
            if (failed) {
              stepResults.push({ stepId: bodyStep.id, status: 'skipped', durationMs: 0 });
              continue;
            }
            let resolvedStep = variables ? substituteStepVariables(bodyStep, variables) : bodyStep;
            if (resolvedStep.action === 'goto' && baseUrl) {
              resolvedStep = { ...resolvedStep, url: resolveUrl(resolvedStep.url, baseUrl) };
            }
            const result = await executeStep(page, resolvedStep, test.config);
            stepResults.push(result);

            if (result.status === 'failed') {
              failed = true;
              const screenshotDir = join(DATA_DIR, 'screenshots');
              ensureDir(screenshotDir);
              const screenshotPath = join(screenshotDir, `failure-${runId}.png`);
              await page.screenshot({ path: screenshotPath, fullPage: true });
              run.screenshotPath = screenshotPath;
              run.error = result.error;
            }
            run.stepResults = stepResults;
            onProgress?.(run);
          }

          if (failed) break;
          iteration++;
        }

        // Record end-loop
        if (endLoopIndex < expandedSteps.length) {
          stepResults.push({ stepId: expandedSteps[endLoopIndex].id, status: 'passed', durationMs: 0 });
        }
        i = endLoopIndex + 1;
        run.stepResults = stepResults;
        onProgress?.(run);
        continue;
      }

      // Regular step execution
      let resolvedStep = variables ? substituteStepVariables(step, variables) : step;
      // Resolve relative goto URLs against project baseUrl
      if (resolvedStep.action === 'goto' && baseUrl) {
        resolvedStep = { ...resolvedStep, url: resolveUrl(resolvedStep.url, baseUrl) };
      }
      const result = await executeStep(page, resolvedStep, test.config);
      stepResults.push(result);

      // Visual regression: compare screenshot against baseline
      if (result.status === 'passed' && step.action === 'screenshot' && result.screenshotPath) {
        try {
          const baseline = db.select().from(baselines)
            .where(eq(baselines.testId, test.id))
            .all()
            .find((b) => b.stepId === step.id);

          if (baseline) {
            const diffDir = join(DATA_DIR, 'diffs');
            ensureDir(diffDir);
            const diffResult = compareScreenshots(baseline.screenshotPath, result.screenshotPath, diffDir);
            const now = new Date().toISOString();

            await db.insert(screenshotDiffs).values({
              id: generateId(),
              runId,
              stepId: step.id,
              baselineId: baseline.id,
              baselinePath: baseline.screenshotPath,
              actualPath: result.screenshotPath,
              diffPath: diffResult.diffImagePath,
              diffPercentage: Math.round(diffResult.diffPercentage * 100),
              status: diffResult.matches ? 'match' : 'mismatch',
              threshold: 500,
              createdAt: now,
            });
          }
        } catch (diffErr) {
          console.error('Visual diff error:', diffErr);
          // Don't fail the step if visual diff fails
        }
      }

      if (result.status === 'failed') {
        failed = true;

        // Take screenshot on failure
        const screenshotDir = join(DATA_DIR, 'screenshots');
        ensureDir(screenshotDir);
        const screenshotPath = join(screenshotDir, `failure-${runId}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        run.screenshotPath = screenshotPath;
        run.error = result.error;
      }

      // Update progress
      run.stepResults = stepResults;
      onProgress?.(run);
      i++;
    }
    
    // Finalize run
    run.status = failed ? 'failed' : 'passed';
    run.durationMs = Date.now() - startTime;
    run.stepResults = stepResults;
    run.completedAt = new Date().toISOString();
    
    // Get video path
    await context.close();
    const video = page.video();
    if (video) {
      run.videoPath = await video.path();
    }
    
  } catch (error) {
    run.status = 'failed';
    run.error = error instanceof Error ? error.message : String(error);
    run.durationMs = Date.now() - startTime;
    run.completedAt = new Date().toISOString();
    
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
  
  // Update database
  await db.update(runs)
    .set({
      status: run.status,
      durationMs: run.durationMs,
      error: run.error,
      stepResults: run.stepResults,
      screenshotPath: run.screenshotPath,
      videoPath: run.videoPath,
      completedAt: run.completedAt,
    })
    .where(eq(runs.id, runId));
  
  return run;
}
