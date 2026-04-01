// ===== QA Studio Documentation - Core Scripts =====

(function () {
  'use strict';

  // ===== Search Index =====
  const searchIndex = [
    { title: 'Getting Started', section: 'Overview', href: 'pages/getting-started.html', keywords: 'install setup prerequisites node pnpm clone quick start run dev' },
    { title: 'Test Builder', section: 'Core', href: 'pages/test-builder.html', keywords: 'builder drag drop steps panel editor three-panel layout save run selector' },
    { title: 'Recording', section: 'Core', href: 'pages/recording.html', keywords: 'record capture browser websocket selector generation session' },
    { title: 'Actions Reference', section: 'Reference', href: 'pages/actions-reference.html', keywords: 'actions navigate click fill select check uncheck hover press wait screenshot assert' },
    { title: 'Control Flow', section: 'Core', href: 'pages/control-flow.html', keywords: 'if else end-if loop end-loop condition conditional nesting' },
    { title: 'Reusable Flows', section: 'Core', href: 'pages/reusable-flows.html', keywords: 'flows reusable shared steps use-flow depth nesting' },
    { title: 'Visual Regression', section: 'Testing', href: 'pages/visual-regression.html', keywords: 'visual regression screenshot baseline diff pixelmatch approve reject comparison' },
    { title: 'Test Suites', section: 'Testing', href: 'pages/test-suites.html', keywords: 'suites batch run parallel concurrency suite-runs group collection' },
    { title: 'Environment Variables', section: 'Configuration', href: 'pages/environment-variables.html', keywords: 'variables environment substitution key value project' },
    { title: 'Analytics', section: 'Monitoring', href: 'pages/analytics.html', keywords: 'analytics dashboard summary trends flaky pass rate metrics chart' },
    { title: 'Scheduled Runs', section: 'Automation', href: 'pages/scheduled-runs.html', keywords: 'schedule cron automated runs cleanup retention' },
    { title: 'Export & Import', section: 'Data', href: 'pages/export-import.html', keywords: 'export import json project test flow data transfer' },
    { title: 'Browser Configuration', section: 'Configuration', href: 'pages/browser-config.html', keywords: 'browser chromium firefox webkit viewport timeout headless real chrome permissions geolocation' },
    { title: 'API Reference', section: 'Reference', href: 'pages/api-reference.html', keywords: 'api rest endpoints routes http get post put delete sse streaming' },
    { title: 'Self-Hosting', section: 'Deployment', href: 'pages/self-hosting.html', keywords: 'self-host deploy production build pm2 systemd nginx reverse proxy' },
  ];

  // ===== Theme Toggle =====
  function initTheme() {
    const saved = localStorage.getItem('qa-docs-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('qa-docs-theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ===== Mobile Menu =====
  function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (!hamburger || !sidebar) return;

    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      });
    }
  }

  // ===== Active Nav Tracking =====
  function setActiveNav() {
    const path = window.location.pathname;
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (path.endsWith(href) || (href === 'pages/getting-started.html' && (path.endsWith('index.html') || path.endsWith('/')))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ===== Search =====
  function initSearch() {
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    const searchBtn = document.getElementById('search-btn');

    if (!overlay || !input || !results) return;

    function openSearch() {
      overlay.classList.add('open');
      input.value = '';
      input.focus();
      renderResults('');
    }

    function closeSearch() {
      overlay.classList.remove('open');
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', openSearch);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearch();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        overlay.classList.contains('open') ? closeSearch() : openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    });

    input.addEventListener('input', (e) => {
      renderResults(e.target.value);
    });

    function renderResults(query) {
      if (!query.trim()) {
        results.innerHTML = searchIndex.map(item =>
          `<a class="search-result" href="${resolveHref(item.href)}">
            <div class="search-result-title">${item.title}</div>
            <div class="search-result-section">${item.section}</div>
          </a>`
        ).join('');
        return;
      }

      const q = query.toLowerCase();
      const filtered = searchIndex.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.includes(q) ||
        item.section.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        results.innerHTML = '<div class="search-empty">No results found</div>';
        return;
      }

      results.innerHTML = filtered.map(item =>
        `<a class="search-result" href="${resolveHref(item.href)}">
          <div class="search-result-title">${highlight(item.title, q)}</div>
          <div class="search-result-section">${item.section}</div>
        </a>`
      ).join('');
    }

    function highlight(text, q) {
      const idx = text.toLowerCase().indexOf(q);
      if (idx === -1) return text;
      return text.slice(0, idx) + '<strong>' + text.slice(idx, idx + q.length) + '</strong>' + text.slice(idx + q.length);
    }
  }

  function resolveHref(href) {
    const path = window.location.pathname;
    if (path.includes('/pages/')) {
      return href.replace('pages/', '');
    }
    return href;
  }

  // ===== Code Syntax Highlighting =====
  function highlightCode() {
    document.querySelectorAll('.code-block code').forEach(block => {
      const lang = block.closest('.code-block').getAttribute('data-lang') || '';
      block.innerHTML = applySyntaxHighlighting(block.textContent, lang);
    });
  }

  function applySyntaxHighlighting(code, lang) {
    const escaped = escapeHtml(code);

    if (lang === 'bash' || lang === 'shell') {
      return escaped
        .replace(/(#.*$)/gm, '<span class="token-comment">$1</span>')
        .replace(/^(\s*)(pnpm|npm|git|cd|mkdir|curl|node)\b/gm, '$1<span class="token-function">$2</span>')
        .replace(/(--?\w[\w-]*)/g, '<span class="token-flag">$1</span>')
        .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token-string">$1</span>');
    }

    if (lang === 'json') {
      return escaped
        .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="token-property">$1</span>:')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="token-string">$1</span>')
        .replace(/:\s*(\d+)/g, ': <span class="token-number">$1</span>')
        .replace(/:\s*(true|false|null)/g, ': <span class="token-keyword">$1</span>');
    }

    if (lang === 'sql') {
      return escaped
        .replace(/(--.*$)/gm, '<span class="token-comment">$1</span>')
        .replace(/\b(CREATE|TABLE|IF|NOT|EXISTS|INSERT|INTO|VALUES|SELECT|FROM|WHERE|ALTER|ADD|COLUMN|DROP|DELETE|UPDATE|SET|PRIMARY|KEY|REFERENCES|CASCADE|TEXT|INTEGER|REAL|BLOB|DEFAULT|NULL|ON|FOREIGN|UNIQUE|INDEX|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET)\b/gi, '<span class="token-keyword">$1</span>')
        .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="token-string">$1</span>');
    }

    if (lang === 'typescript' || lang === 'ts' || lang === 'javascript' || lang === 'js') {
      return escaped
        .replace(/(\/\/.*$)/gm, '<span class="token-comment">$1</span>')
        .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|class|interface|type|enum|extends|implements|new|this|typeof|instanceof)\b/g, '<span class="token-keyword">$1</span>')
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="token-string">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>')
        .replace(/\b([A-Z]\w+)\b/g, '<span class="token-type">$1</span>');
    }

    if (lang === 'http' || lang === 'api') {
      return escaped
        .replace(/(#.*$)/gm, '<span class="token-comment">$1</span>')
        .replace(/\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/g, '<span class="token-http-method">$1</span>')
        .replace(/(\/api\/[\w\/:.-]+)/g, '<span class="token-endpoint">$1</span>');
    }

    if (lang === 'env') {
      return escaped
        .replace(/(#.*$)/gm, '<span class="token-comment">$1</span>')
        .replace(/^(\w+)=/gm, '<span class="token-property">$1</span>=')
        .replace(/=(.+)$/gm, '=<span class="token-string">$1</span>');
    }

    return escaped;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ===== Copy Code Button =====
  function initCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const block = btn.closest('.code-block');
        const code = block.querySelector('code').textContent;
        navigator.clipboard.writeText(code).then(() => {
          btn.classList.add('copied');
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = 'Copy';
          }, 2000);
        });
      });
    });
  }

  // ===== Table of Contents =====
  function initTOC() {
    const toc = document.getElementById('toc');
    if (!toc) return;

    const headings = document.querySelectorAll('.content h2, .content h3');
    if (headings.length < 2) {
      toc.style.display = 'none';
      return;
    }

    const tocLinks = toc.querySelector('.toc-links');
    if (!tocLinks) return;

    tocLinks.innerHTML = '';
    headings.forEach(h => {
      const id = h.id || h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      h.id = id;
      const a = document.createElement('a');
      a.href = '#' + id;
      a.textContent = h.textContent;
      a.className = h.tagName === 'H3' ? 'toc-h3' : '';
      tocLinks.appendChild(a);
    });

    // Scroll spy
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.querySelectorAll('a').forEach(a => a.classList.remove('active'));
          const active = tocLinks.querySelector(`a[href="#${entry.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });

    headings.forEach(h => observer.observe(h));
  }

  // ===== Init =====
  function init() {
    initTheme();
    initMobileMenu();
    setActiveNav();
    highlightCode();
    initCopyButtons();
    initSearch();
    initTOC();

    // Theme toggle button
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
