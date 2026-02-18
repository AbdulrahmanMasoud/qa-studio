import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
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
import { runs } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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

  switch (config.browser) {
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

// Main test runner function
export async function runTest(test: TestDefinition, onProgress?: (run: Partial<TestRun>) => void): Promise<TestRun> {
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

    // When using real Chrome, set a realistic user agent to avoid detection
    if (test.config.useRealChrome) {
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
    
    // Execute each step
    const stepResults: StepResult[] = [];
    let failed = false;
    
    for (const step of test.steps) {
      if (failed) {
        stepResults.push({
          stepId: step.id,
          status: 'skipped',
          durationMs: 0,
        });
        continue;
      }
      
      const result = await executeStep(page, step, test.config);
      stepResults.push(result);
      
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
