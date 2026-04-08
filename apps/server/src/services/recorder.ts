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

  // --- Helpers ---

  function isUnique(sel, el) {
    try {
      const m = document.querySelectorAll(sel);
      return m.length === 1 && m[0] === el;
    } catch { return false; }
  }

  function isDynamic(name) {
    if (!name) return true;
    // CSS Modules: Component_class__hash
    if (/^[A-Za-z][\\w]*_[\\w]+__[\\w]{5,}$/.test(name)) return true;
    // Styled-components / Emotion / MUI etc.
    if (/^(css|sc|emotion|styled|jss|mui|chakra)-[a-zA-Z0-9]{4,}$/i.test(name)) return true;
    // Generic hash suffix: ends with - or _ followed by 6+ alphanumeric
    if (/[-_][a-zA-Z0-9]{6,}$/.test(name)) return true;
    // Very short / minified (e.g. a0, _1, x3)
    if (/^[a-zA-Z_]{1,2}[0-9]+$/.test(name)) return true;
    // Starts with double underscore
    if (name.startsWith('__')) return true;
    return false;
  }

  function escAttr(val) {
    return val.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
  }

  function getStableClasses(el) {
    if (!el.className || typeof el.className !== 'string') return [];
    return el.className.trim().split(/\\s+/).filter(function(c) {
      return c.length > 0 && !isDynamic(c);
    });
  }

  function tryClassSelector(el) {
    const classes = getStableClasses(el).slice(0, 4);
    if (classes.length === 0) return null;
    const tag = el.tagName.toLowerCase();

    // Try single class
    for (var i = 0; i < classes.length; i++) {
      var sel = '.' + CSS.escape(classes[i]);
      if (isUnique(sel, el)) return sel;
    }
    // Try tag + single class
    for (var i = 0; i < classes.length; i++) {
      var sel = tag + '.' + CSS.escape(classes[i]);
      if (isUnique(sel, el)) return sel;
    }
    // Try two-class combos
    for (var i = 0; i < classes.length; i++) {
      for (var j = i + 1; j < classes.length; j++) {
        var sel = '.' + CSS.escape(classes[i]) + '.' + CSS.escape(classes[j]);
        if (isUnique(sel, el)) return sel;
      }
    }
    // Try tag + two-class combos
    for (var i = 0; i < classes.length; i++) {
      for (var j = i + 1; j < classes.length; j++) {
        var sel = tag + '.' + CSS.escape(classes[i]) + '.' + CSS.escape(classes[j]);
        if (isUnique(sel, el)) return sel;
      }
    }
    return null;
  }

  function isInputElement(el) {
    var tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  function isFormElement(el) {
    var tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button';
  }

  function implicitRole(el) {
    var tag = el.tagName.toLowerCase();
    var type = (el.type || '').toLowerCase();
    var roles = {
      a: 'link', button: 'button', select: 'combobox',
      textarea: 'textbox', h1: 'heading', h2: 'heading',
      h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
      nav: 'navigation', main: 'main', img: 'img',
    };
    if (tag === 'input') {
      var inputRoles = {
        checkbox: 'checkbox', radio: 'radio', range: 'slider',
        search: 'search', text: 'textbox', email: 'textbox',
        tel: 'textbox', url: 'textbox', password: 'textbox',
      };
      return inputRoles[type] || null;
    }
    return roles[tag] || null;
  }

  function buildCssPath(el) {
    var maxDepth = 5;
    for (var depth = 3; depth <= maxDepth; depth++) {
      var parts = [];
      var current = el;
      while (current && current !== document.body && current !== document.documentElement) {
        var part = current.tagName.toLowerCase();
        if (current.className && typeof current.className === 'string') {
          var cls = getStableClasses(current).slice(0, 2);
          if (cls.length > 0) part += '.' + cls.map(function(c) { return CSS.escape(c); }).join('.');
        }
        var parent = current.parentElement;
        if (parent) {
          var siblings = Array.from(parent.children).filter(function(s) { return s.tagName === current.tagName; });
          if (siblings.length > 1) {
            var idx = siblings.indexOf(current) + 1;
            part += ':nth-of-type(' + idx + ')';
          }
        }
        parts.unshift(part);
        current = current.parentElement;
        if (parts.length >= depth) break;
      }
      var sel = parts.join(' > ');
      if (isUnique(sel, el)) return sel;
    }
    // Final fallback: return deepest attempt even if not unique
    var parts = [];
    var current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      var part = current.tagName.toLowerCase();
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(s) { return s.tagName === current.tagName; });
        if (siblings.length > 1) {
          var idx = siblings.indexOf(current) + 1;
          part += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(part);
      current = current.parentElement;
      if (parts.length >= 5) break;
    }
    return parts.join(' > ');
  }

  // --- Main selector function ---

  function getSelector(el) {
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    console.log('[QA Studio] getSelector for <' + tag + '> id=' + el.id + ' classes=' + (typeof el.className === 'string' ? el.className : '') + ' aria-label=' + (el.getAttribute ? el.getAttribute('aria-label') : ''));

    // Priority 1: data-testid
    if (el.dataset && el.dataset.testid) {
      var sel = '[data-testid="' + escAttr(el.dataset.testid) + '"]';
      if (isUnique(sel, el)) return 'data-testid=' + el.dataset.testid;
      console.log('[QA Studio] P1 data-testid not unique: ' + sel);
    }

    // Priority 2: id (skip dynamic IDs)
    if (el.id && !isDynamic(el.id)) {
      var sel = '#' + CSS.escape(el.id);
      if (isUnique(sel, el)) return sel;
      console.log('[QA Studio] P2 id not unique: ' + sel);
    }

    // Priority 3: name attribute (form elements)
    if (isFormElement(el) && el.getAttribute('name')) {
      var name = el.getAttribute('name');
      var sel = tag + '[name="' + escAttr(name) + '"]';
      if (isUnique(sel, el)) return sel;
      console.log('[QA Studio] P3 name not unique: ' + sel);
    }

    // Priority 4: unique class-based selector
    var classSel = tryClassSelector(el);
    if (classSel) return classSel;
    console.log('[QA Studio] P4 no unique class selector. stableClasses=' + JSON.stringify(getStableClasses(el)));

    // Priority 5: placeholder
    if (el.placeholder) {
      var sel = '[placeholder="' + escAttr(el.placeholder) + '"]';
      if (isUnique(sel, el)) return sel;
      // Also try tag-qualified
      var sel2 = tag + sel;
      if (isUnique(sel2, el)) return sel2;
      console.log('[QA Studio] P5 placeholder not unique');
    }

    // Priority 6: aria-label (try plain and tag-qualified)
    var ariaLabel = el.getAttribute ? el.getAttribute('aria-label') : null;
    if (ariaLabel) {
      var sel = '[aria-label="' + escAttr(ariaLabel) + '"]';
      if (isUnique(sel, el)) return sel;
      var sel2 = tag + sel;
      if (isUnique(sel2, el)) return sel2;
      console.log('[QA Studio] P6 aria-label not unique: ' + sel + ' / ' + sel2);
    }

    // Priority 7: label (via el.labels or closest label)
    if (el.labels && el.labels.length === 1) {
      var labelText = el.labels[0].textContent.trim();
      if (labelText) return 'label=' + labelText;
    }
    var closestLabel = el.closest && el.closest('label');
    if (closestLabel) {
      var labelText = closestLabel.textContent.trim();
      if (labelText) return 'label=' + labelText;
    }

    // Priority 8: role + accessible name
    var role = el.getAttribute ? (el.getAttribute('role') || implicitRole(el)) : implicitRole(el);
    var accessName = (el.getAttribute ? el.getAttribute('aria-label') : null) ||
      el.textContent?.trim().slice(0, 50);
    if (role && accessName) {
      console.log('[QA Studio] P8 falling back to role: role=' + role + ' name=' + accessName);
      return 'role=' + role + '[name="' + accessName.replace(/"/g, '\\\\"') + '"]';
    }

    // Priority 9: text content (non-inputs, short text)
    if (!isInputElement(el) && el.textContent?.trim()) {
      var text = el.textContent.trim();
      if (text.length <= 50) return 'text=' + text;
    }

    // Priority 10: CSS path
    return buildCssPath(el);
  }

  // Walk up from e.target to find the nearest interactive/clickable element.
  // When you click an icon inside <a class="cmd-close"><svg>...</svg></a>,
  // e.target is the <svg>, but we want the <a> which has the useful selector.
  function findClickTarget(el) {
    var interactiveTags = { A: 1, BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1 };
    var current = el;
    while (current && current !== document.body) {
      // Stop at elements with explicit role="button" or role="link"
      var role = current.getAttribute && current.getAttribute('role');
      if (role === 'button' || role === 'link' || role === 'menuitem' || role === 'tab') return current;
      // Stop at native interactive elements
      if (interactiveTags[current.tagName]) return current;
      // Stop at elements with data-testid, id, or click-relevant classes
      if (current.dataset && current.dataset.testid) return current;
      if (current.id && !isDynamic(current.id)) return current;
      // Stop at elements with an onclick handler attribute
      if (current.hasAttribute && current.hasAttribute('onclick')) return current;
      current = current.parentElement;
    }
    // No interactive parent found — use the original element
    return el;
  }

  // --- Event handlers ---

  // Click handler
  document.addEventListener('click', function(e) {
    var rawEl = e.target;
    if (!rawEl || rawEl === document.body) return;
    var el = findClickTarget(rawEl);
    var selector = getSelector(el);

    // If it's a checkbox or radio, capture as check/uncheck
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
      window.__qaStudioCapture(JSON.stringify({
        action: el.checked ? 'check' : 'uncheck',
        selector: selector,
      }));
      return;
    }

    window.__qaStudioCapture(JSON.stringify({
      action: 'click',
      selector: selector,
    }));
  }, true);

  // Input handler (debounced)
  document.addEventListener('input', function(e) {
    var el = e.target;
    if (!el) return;
    var selector = getSelector(el);

    // Handle select elements
    if (el.tagName === 'SELECT') {
      window.__qaStudioCapture(JSON.stringify({
        action: 'select',
        selector: selector,
        value: el.value,
      }));
      return;
    }

    // Debounce text input
    if (inputTimer && lastInputSelector === selector) {
      clearTimeout(inputTimer);
    }
    lastInputSelector = selector;
    inputTimer = setTimeout(function() {
      window.__qaStudioCapture(JSON.stringify({
        action: 'fill',
        selector: selector,
        value: el.value,
      }));
      inputTimer = null;
      lastInputSelector = null;
    }, 800);
  }, true);
})();
`;

export interface RecorderOptions {
  recordDelays?: boolean;
}

export async function startRecording(testId: string, startUrl: string, options: RecorderOptions = {}): Promise<string> {
  const sessionId = generateId();
  const { recordDelays = false } = options;

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

  // Track timing between steps to insert natural wait delays
  let lastStepTime = Date.now();
  const MIN_DELAY = 500; // Only insert waits for gaps > 500ms

  // Expose capture function from injected script → Node
  await page.exposeFunction('__qaStudioCapture', (data: string) => {
    try {
      const parsed = JSON.parse(data);

      // Insert a wait step if recording delays is enabled
      if (recordDelays) {
        const now = Date.now();
        const gap = now - lastStepTime;
        if (gap > MIN_DELAY) {
          const waitStep: TestStep = {
            id: generateId(),
            action: 'wait',
            waitType: 'time',
            value: gap,
          } as TestStep;
          emitter.emit('step', waitStep);
        }
      }

      const step: TestStep = {
        id: generateId(),
        ...parsed,
      };
      emitter.emit('step', step);
      lastStepTime = Date.now();
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

  // Capture navigation events (deduplicated)
  let lastNavUrl = '';
  let navDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      if (!url || url === 'about:blank') return;

      // Strip query params for dedup comparison (catches Cloudflare challenge tokens)
      const urlBase = url.split('?')[0];
      if (urlBase === lastNavUrl.split('?')[0]) return;

      // Debounce rapid redirects (e.g. Cloudflare challenge → redirect → final page)
      if (navDebounceTimer) clearTimeout(navDebounceTimer);
      navDebounceTimer = setTimeout(() => {
        lastNavUrl = url;
        emitter.emit('step', {
          id: generateId(),
          action: 'goto',
          url,
        } as TestStep);
        // Reset timing after navigation so first action doesn't get a huge wait
        lastStepTime = Date.now();
        navDebounceTimer = null;
      }, 500);
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
    lastNavUrl = startUrl;
    await page.goto(startUrl);
    // Update lastNavUrl to the final URL after any redirects
    lastNavUrl = page.url();
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
