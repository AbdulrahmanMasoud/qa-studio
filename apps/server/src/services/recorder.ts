import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { EventEmitter } from 'events';
import { generateId, TestStep } from '@qa-studio/shared';

interface RecorderSession {
  id: string;
  testId: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  emitter: EventEmitter;
}

const sessions = new Map<string, RecorderSession>();

const CAPTURE_SCRIPT = `
(() => {
  if (window.__qaStudioInjected) return;
  window.__qaStudioInjected = true;

  let inputTimer = null;
  let lastInputSelector = null;

  function getSelector(el) {
    // Priority 1: data-testid
    if (el.dataset && el.dataset.testid) {
      return 'data-testid=' + el.dataset.testid;
    }
    // Priority 2: id
    if (el.id) {
      return '#' + CSS.escape(el.id);
    }
    // Priority 3: role + accessible name
    const role = el.getAttribute('role') || implicitRole(el);
    const name = el.getAttribute('aria-label') ||
      el.textContent?.trim().slice(0, 50);
    if (role && name) {
      return 'role=' + role + '[name="' + name.replace(/"/g, '\\\\"') + '"]';
    }
    // Priority 4: placeholder
    if (el.placeholder) {
      return '[placeholder="' + el.placeholder.replace(/"/g, '\\\\"') + '"]';
    }
    // Priority 5: label
    if (el.id) {
      const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (label) return 'label=' + label.textContent.trim();
    }
    // Priority 6: text content (for non-input elements)
    if (!isInputElement(el) && el.textContent?.trim()) {
      const text = el.textContent.trim();
      if (text.length <= 50) return 'text=' + text;
    }
    // Priority 7: CSS path
    return buildCssPath(el);
  }

  function implicitRole(el) {
    const tag = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();
    const roles = {
      a: 'link', button: 'button', select: 'combobox',
      textarea: 'textbox', h1: 'heading', h2: 'heading',
      h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
      nav: 'navigation', main: 'main', img: 'img',
    };
    if (tag === 'input') {
      const inputRoles = {
        checkbox: 'checkbox', radio: 'radio', range: 'slider',
        search: 'search', text: 'textbox', email: 'textbox',
        tel: 'textbox', url: 'textbox', password: 'textbox',
      };
      return inputRoles[type] || null;
    }
    return roles[tag] || null;
  }

  function isInputElement(el) {
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function buildCssPath(el) {
    const parts = [];
    let current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      let part = current.tagName.toLowerCase();
      if (current.className && typeof current.className === 'string') {
        const cls = current.className.trim().split(/\\s+/).filter(c => c.length > 0 && !c.startsWith('__')).slice(0, 2);
        if (cls.length > 0) part += '.' + cls.join('.');
      }
      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(s => s.tagName === current.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          part += ':nth-child(' + idx + ')';
        }
      }
      parts.unshift(part);
      current = current.parentElement;
      // Stop at 3 levels to keep selectors short
      if (parts.length >= 3) break;
    }
    return parts.join(' > ');
  }

  // Click handler
  document.addEventListener('click', (e) => {
    const el = e.target;
    if (!el || el === document.body) return;
    const selector = getSelector(el);

    // If it's a checkbox or radio, capture as check/uncheck
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
      window.__qaStudioCapture(JSON.stringify({
        action: el.checked ? 'check' : 'uncheck',
        selector,
      }));
      return;
    }

    window.__qaStudioCapture(JSON.stringify({
      action: 'click',
      selector,
    }));
  }, true);

  // Input handler (debounced)
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el) return;
    const selector = getSelector(el);

    // Handle select elements
    if (el.tagName === 'SELECT') {
      window.__qaStudioCapture(JSON.stringify({
        action: 'select',
        selector,
        value: el.value,
      }));
      return;
    }

    // Debounce text input
    if (inputTimer && lastInputSelector === selector) {
      clearTimeout(inputTimer);
    }
    lastInputSelector = selector;
    inputTimer = setTimeout(() => {
      window.__qaStudioCapture(JSON.stringify({
        action: 'fill',
        selector,
        value: el.value,
      }));
      inputTimer = null;
      lastInputSelector = null;
    }, 800);
  }, true);
})();
`;

export async function startRecording(testId: string, startUrl: string): Promise<string> {
  const sessionId = generateId();

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const emitter = new EventEmitter();

  // Expose capture function from injected script → Node
  await page.exposeFunction('__qaStudioCapture', (data: string) => {
    try {
      const parsed = JSON.parse(data);
      const step: TestStep = {
        id: generateId(),
        ...parsed,
      };
      emitter.emit('step', step);
    } catch {
      // ignore malformed data
    }
  });

  // Inject capture script on every frame navigation
  page.on('framenavigated', async (frame) => {
    if (frame === page.mainFrame()) {
      try {
        await frame.evaluate(CAPTURE_SCRIPT);
      } catch {
        // page might have been closed
      }
    }
  });

  // Capture navigation events
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (url && url !== 'about:blank') {
        emitter.emit('step', {
          id: generateId(),
          action: 'goto',
          url,
        } as TestStep);
      }
    }
  });

  // Handle browser disconnect (user closes window)
  browser.on('disconnected', () => {
    emitter.emit('disconnect');
    sessions.delete(sessionId);
  });

  const session: RecorderSession = {
    id: sessionId,
    testId,
    browser,
    context,
    page,
    emitter,
  };

  sessions.set(sessionId, session);

  // Navigate to start URL
  if (startUrl) {
    await page.goto(startUrl);
    // Inject script after initial navigation
    await page.evaluate(CAPTURE_SCRIPT);
  }

  return sessionId;
}

export async function stopRecording(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  sessions.delete(sessionId);

  try {
    await session.context.close();
  } catch { /* already closed */ }
  try {
    await session.browser.close();
  } catch { /* already closed */ }
}

export function getSession(sessionId: string): RecorderSession | undefined {
  return sessions.get(sessionId);
}
