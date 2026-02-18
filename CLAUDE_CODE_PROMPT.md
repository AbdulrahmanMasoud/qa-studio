# QA Studio - Complete Project Context for Claude Code

## PROJECT OVERVIEW

I'm building **QA Studio**, a no-code E2E testing tool powered by Playwright. The goal is to create a tool that allows me to visually build, run, and manage automated tests for my web projects (including Magento stores) without writing code.

## CURRENT STATUS

I have the initial project structure set up with the No-Code Builder feature partially implemented. I need you to complete it and make it fully functional.

## TECH STACK

- **Monorepo**: pnpm workspaces
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + TanStack Query + dnd-kit
- **Backend**: Fastify + TypeScript
- **Database**: SQLite with Drizzle ORM
- **Test Engine**: Playwright
- **Storage**: Local filesystem (./data folder)

## PROJECT STRUCTURE

```
qa-studio/
├── package.json                    # Root package.json with workspace scripts
├── pnpm-workspace.yaml             # pnpm workspace config
├── apps/
│   ├── dashboard/                  # React frontend (port 5173)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── index.css
│   │   │   ├── components/
│   │   │   │   ├── Layout.tsx
│   │   │   │   ├── ActionPalette.tsx
│   │   │   │   ├── SortableStep.tsx
│   │   │   │   └── StepEditor.tsx
│   │   │   ├── pages/
│   │   │   │   ├── ProjectsPage.tsx
│   │   │   │   ├── TestsPage.tsx
│   │   │   │   └── TestBuilderPage.tsx
│   │   │   └── lib/
│   │   │       └── api.ts
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   └── tsconfig.json
│   │
│   └── server/                     # Fastify backend (port 3001)
│       ├── src/
│       │   ├── server.ts
│       │   ├── db/
│       │   │   ├── index.ts
│       │   │   └── schema.ts
│       │   ├── routes/
│       │   │   ├── projects.ts
│       │   │   └── tests.ts
│       │   └── services/
│       │       └── runner.ts
│       ├── drizzle.config.ts
│       └── tsconfig.json
│
├── packages/
│   └── shared/                     # Shared types between frontend and backend
│       ├── src/
│       │   └── index.ts
│       └── tsconfig.json
│
└── data/                           # Local storage (auto-created, gitignored)
    ├── qa-studio.db
    ├── screenshots/
    └── videos/
```

## SHARED TYPES (packages/shared/src/index.ts)

The shared package contains:
- `ActionType`: 'goto' | 'click' | 'fill' | 'select' | 'check' | 'uncheck' | 'hover' | 'press' | 'wait' | 'screenshot' | 'assert'
- `TestStep`: Union type for all step types (GotoStep, ClickStep, FillStep, etc.)
- `TestConfig`: { browser, viewport, timeout, headless }
- `TestDefinition`: { id, projectId, name, description, config, steps, createdAt, updatedAt }
- `Project`: { id, name, baseUrl, description, createdAt, updatedAt }
- `TestRun`: { id, testId, status, durationMs, error, stepResults, screenshotPath, videoPath, tracePath, createdAt, completedAt }
- `actionsMeta`: Array of action metadata with icons, labels, descriptions, and field definitions
- `createEmptyStep(actionType)`: Helper to create empty step of given type
- `generateId()`: Helper to generate unique IDs

## DATABASE SCHEMA (apps/server/src/db/schema.ts)

```sql
-- Projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tests
CREATE TABLE tests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL,        -- JSON: TestConfig
  steps TEXT NOT NULL,         -- JSON: TestStep[]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Test Runs
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,        -- pending | running | passed | failed | cancelled
  duration_ms INTEGER,
  error TEXT,
  step_results TEXT,           -- JSON: StepResult[]
  screenshot_path TEXT,
  video_path TEXT,
  trace_path TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

## API ENDPOINTS

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project { name, baseUrl?, description? }
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (cascades to tests)

### Tests
- `GET /api/projects/:projectId/tests` - List tests in project
- `POST /api/tests` - Create test { projectId, name, description?, config?, steps? }
- `GET /api/tests/:id` - Get single test
- `PUT /api/tests/:id` - Update test { name?, description?, config?, steps? }
- `DELETE /api/tests/:id` - Delete test
- `POST /api/tests/:id/run` - Run test, returns TestRun result
- `GET /api/tests/:id/runs` - Get run history for test

### Runs
- `GET /api/runs/:id` - Get single run details

## TEST RUNNER SERVICE (apps/server/src/services/runner.ts)

The runner:
1. Takes a TestDefinition
2. Launches Playwright browser based on config
3. Creates context with video recording enabled
4. Executes each step sequentially
5. Captures screenshots on failure
6. Returns TestRun with results

Supported actions:
- `goto`: page.goto(url)
- `click`: page.click(selector)
- `fill`: page.fill(selector, value)
- `select`: page.selectOption(selector, value)
- `check`: page.check(selector)
- `uncheck`: page.uncheck(selector)
- `hover`: page.hover(selector)
- `press`: page.keyboard.press(key)
- `wait`: waitForTimeout / waitForSelector / waitForURL
- `screenshot`: page.screenshot()
- `assert`: visibility, text, URL, title, value checks

## FRONTEND PAGES

### ProjectsPage
- Lists all projects in a grid
- Create new project modal
- Delete project with confirmation
- Links to project's tests

### TestsPage
- Lists tests for a project
- Create new test modal
- Run test button (shows running state)
- Delete test
- Links to test builder

### TestBuilderPage (Main Feature)
- Left sidebar: ActionPalette with draggable actions
- Center: Sortable list of test steps (drag to reorder)
- Right sidebar: StepEditor for selected step
- Header: Save button, Run button, run status indicator

## WHAT I NEED YOU TO DO

### 1. Complete & Fix the Current Implementation

Please review and fix any issues in the existing code:
- Ensure all imports are correct
- Fix any TypeScript errors
- Make sure drag-and-drop works properly
- Ensure API calls work correctly
- Test that the runner executes tests properly

### 2. Add Missing Features

#### A. Run Results Viewer
Add a way to view test run results with:
- List of past runs for each test
- Detailed view of each run showing:
  - Overall status (passed/failed)
  - Duration
  - Step-by-step results (which passed/failed)
  - Error messages
  - Screenshot viewer (for failure screenshots)
  - Video player (for recorded videos)

#### B. Test Configuration Panel
Add UI to configure test settings:
- Browser selection (Chromium, Firefox, WebKit)
- Viewport size (preset options + custom)
- Timeout setting
- Headless mode toggle

#### C. Better Error Handling
- Show toast notifications for success/error
- Better error messages from API
- Loading states for all async operations

#### D. Selector Helper
Add a helper that suggests common selectors:
- ID selectors (#)
- Class selectors (.)
- Attribute selectors ([type="submit"])
- Text content selectors
- Playwright-specific selectors (role, text, etc.)

### 3. Code Quality

- Add proper error boundaries
- Add loading skeletons
- Ensure responsive design
- Add keyboard shortcuts (Ctrl+S to save, etc.)

## DEPENDENCIES TO INSTALL

### Root
```bash
pnpm install
```

### Server (apps/server)
```json
{
  "dependencies": {
    "@qa-studio/shared": "workspace:*",
    "fastify": "^4.25.2",
    "@fastify/cors": "^8.5.0",
    "@fastify/static": "^6.12.0",
    "@fastify/websocket": "^8.3.1",
    "drizzle-orm": "^0.29.3",
    "better-sqlite3": "^9.2.2",
    "playwright": "^1.41.0",
    "nanoid": "^5.0.4",
    "zod": "^3.22.4"
  }
}
```

### Dashboard (apps/dashboard)
```json
{
  "dependencies": {
    "@qa-studio/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "@tanstack/react-query": "^5.17.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "lucide-react": "^0.303.0",
    "clsx": "^2.1.0"
  }
}
```

## HOW TO RUN

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium firefox webkit

# Start development (both server and dashboard)
pnpm dev

# Or start separately:
pnpm dev:server    # http://localhost:3001
pnpm dev:dashboard # http://localhost:5173
```

## IMPORTANT NOTES

1. **Local Storage**: All data is stored locally in ./data folder (SQLite DB, screenshots, videos)

2. **Vite Proxy**: The dashboard proxies /api and /data requests to the server (configured in vite.config.ts)

3. **Playwright Browsers**: Need to run `pnpm exec playwright install` before tests can run

4. **Test JSON Format**: Tests are stored as JSON in the database. Example:
```json
{
  "id": "test_abc123",
  "name": "Login Test",
  "config": {
    "browser": "chromium",
    "viewport": { "width": 1280, "height": 720 },
    "timeout": 30000,
    "headless": true
  },
  "steps": [
    { "id": "step_1", "action": "goto", "url": "https://example.com" },
    { "id": "step_2", "action": "fill", "selector": "#email", "value": "test@example.com" },
    { "id": "step_3", "action": "click", "selector": "button[type=submit]" },
    { "id": "step_4", "action": "assert", "assertType": "url", "condition": "contains", "value": "/dashboard" }
  ]
}
```

5. **Magento Testing**: This tool will be used to test Magento stores, so consider:
   - Longer default timeouts (Magento is slow)
   - Wait for AJAX/network idle
   - Handle dynamic elements

## FUTURE FEATURES (Not for now, but keep in mind)

- Test Recorder (capture user actions)
- Visual Regression (screenshot comparison)
- Test Suites (group tests)
- Scheduled runs
- CI/CD integration
- Team collaboration

---

## START HERE

1. First, explore the project structure and understand the existing code
2. Run `pnpm install` and `pnpm dev` to see the current state
3. Fix any issues you find
4. Implement the missing features listed above
5. Test everything works end-to-end

Let me know if you have any questions about the architecture or requirements!
