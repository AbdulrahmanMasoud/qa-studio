# QA Studio

A no-code end-to-end testing platform powered by Playwright. Build, record, run, and manage automated browser tests through an intuitive visual interface — no code required.

![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=playwright&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

## Features

### Core Testing
- **Visual Test Builder** — Drag-and-drop interface with 17 action types, selector helpers, and live step editing
- **Cross-Browser Testing** — Run tests on Chromium, Firefox, and WebKit
- **Test Recording** — Record browser interactions via WebSocket streaming with intelligent selector generation
- **Live Execution** — Watch test progress in real time with step-by-step SSE streaming
- **Video Recording** — Every test run is automatically captured as video
- **Failure Screenshots** — Automatic screenshots on step failures

### Visual Regression
- **Baseline Management** — Set baseline screenshots from passing runs
- **Pixel-Level Comparison** — Detects visual differences using pixelmatch
- **Diff Viewer** — Side-by-side comparison with diff percentage
- **Approve/Reject Workflow** — Review and manage visual changes

### Reusable Flows & Control Flow
- **Reusable Flows** — Create shared step sequences and reference them across tests
- **Conditional Steps** — If/else/end-if blocks with 6 condition types
- **Loops** — Loop/end-loop blocks with configurable max iterations
- **Nesting** — Full support for nested control flow structures

### Test Suites & Parallel Execution
- **Test Suites** — Group tests into named collections
- **Batch Runs** — Run all project tests or a specific suite
- **Parallel Execution** — Configurable concurrency (1–5 simultaneous tests)
- **Suite Run History** — Track batch execution results over time

### Analytics Dashboard
- **Pass Rate Trends** — 30-day daily pass/fail history
- **Flaky Test Detection** — Automatic flakiness scoring based on status alternations
- **Test Health** — Breakdown of passing, failing, and untested tests
- **Summary Metrics** — Total tests, runs, pass rate, and average duration

### Scheduling & Maintenance
- **Scheduled Runs** — Cron-based automated test execution
- **Data Cleanup** — Configurable retention for old runs, screenshots, and videos

### Data Management
- **Test Cloning** — Duplicate tests with one click
- **Export/Import** — Export individual tests or entire projects as JSON; import with flow ID remapping
- **Paginated History** — Efficient browsing of large run histories

### Browser Configuration
- **Real Browser Mode** — Use system Chrome to bypass bot detection (Cloudflare, Akamai, etc.)
- **Browser Permissions** — Grant geolocation, camera, microphone, clipboard, and notifications
- **Mock Geolocation** — Set custom latitude/longitude coordinates
- **Viewport & Timeout** — Configurable per-test browser settings

### UI/UX
- **Project Organization** — Group tests by project with base URLs and environment variables
- **Toast Notifications** — Success/error feedback for all actions
- **Confirmation Dialogs** — Safety prompts for destructive operations
- **Search & Filter** — Find tests by name and filter by status

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** (`npm install -g pnpm`)
- **Google Chrome** (optional — only required for Real Browser mode)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd qa-studio

# One-command setup: installs dependencies, Playwright browsers, and initializes the database
pnpm setup
```

### Run

```bash
pnpm dev
```

This starts both the API server and the dashboard in parallel:

| Service   | URL                  |
|-----------|----------------------|
| Dashboard | http://localhost:5173 |
| API       | http://localhost:3001 |

## Usage Guide

### 1. Create a Project

Open http://localhost:5173 and click **New Project**. Give it a name and optionally a base URL. Projects group related tests and share environment variables.

### 2. Create a Test

Inside a project, click **New Test**. This opens the Test Builder.

### 3. Build Your Test

The Test Builder has a three-panel layout:

- **Left: Action Palette** — Click actions to add steps. Standard actions (navigate, click, fill, etc.) and control flow (if/else, loops) are grouped separately.
- **Center: Steps List** — Your test steps in execution order. Drag to reorder. Control flow steps are visually indented to show nesting.
- **Right: Step Editor** — Configure the selected step's properties (selector, value, conditions, etc.).

### 4. Record a Test

Click the **Record** button to open the recorder bar. Enter a start URL and click **Start Recording**. A browser window opens and captures your interactions:

- Clicks, text input, dropdown selections, and checkbox toggles are recorded automatically
- Selectors are generated using a 7-tier priority: `data-testid` > `id` > `role+name` > `placeholder` > `label` > `text content` > CSS path
- Text input is debounced (800ms) to capture complete values
- Click **Stop Recording** to save the captured steps to your test

### 5. Run Your Test

Click **Run Test** in the top-right corner. Unsaved changes are saved automatically before running. The run streams progress in real time — each step shows its status as it executes.

### 6. View Results & History

After a run completes, the **Run Details** panel shows:

- Pass/fail status and total duration
- Step-by-step results with individual timings
- Error messages for failed steps
- Screenshot and video artifacts
- Visual regression diffs (if screenshot steps exist)

Click the **Runs** button to browse paginated run history. Click any run to view its full details.

### 7. Reusable Flows

Navigate to **Flows** from the project page. Create a flow with a sequence of steps, then reference it in any test using the **Use Flow** action. Flows can reference other flows up to 10 levels deep.

### 8. Visual Regression

Add **Screenshot** steps to your test. After a passing run, open the **Baselines** panel and click **Set Baselines from Run**. Future runs will automatically compare screenshots against baselines and report pixel-level differences with approve/reject controls.

### 9. Test Suites & Batch Runs

Create suites to group tests. Run all tests in a project or a specific suite with configurable concurrency (1–5 parallel tests). The batch run progress panel shows live status for each test.

### 10. Scheduled Runs

Create schedules with cron expressions to run tests automatically. Choose from presets or enter custom cron syntax. Enable/disable schedules and view last run status.

### 11. Environment Variables

Open the **Variables** panel from the project tests page. Define key-value pairs that are substituted into step fields using `{{key}}` syntax. Variables work in all text-based step fields (URLs, selectors, values, etc.).

### 12. Export & Import

- **Export a test**: Download a single test as JSON from the test list
- **Export a project**: Download all tests and flows as a JSON bundle
- **Import**: Upload a JSON file into a project. Flow IDs are remapped automatically to avoid conflicts.

### 13. Analytics Dashboard

Click **Dashboard** from the project page to view:

- **Summary cards** — Total tests, pass rate, total runs, average duration
- **Trend chart** — Stacked daily pass/fail bars over 30 days
- **Flaky tests** — Tests ranked by flakiness score with recent result dots
- **Test health** — Breakdown of passing, failing, and untested tests

## Available Actions

| Action | Description | Key Fields |
|--------|-------------|------------|
| **Navigate** | Go to a URL | `url` |
| **Click** | Click an element | `selector` |
| **Fill** | Type text into an input | `selector`, `value` |
| **Select** | Choose a dropdown option | `selector`, `value` |
| **Check** | Check a checkbox | `selector` |
| **Uncheck** | Uncheck a checkbox | `selector` |
| **Hover** | Hover over an element | `selector` |
| **Press Key** | Press a keyboard key | `key` |
| **Wait** | Wait for time, selector, or URL | `waitType`, `value` |
| **Screenshot** | Capture the page | `name`, `fullPage` |
| **Assert** | Verify a condition | `assertType`, `selector`, `condition`, `value` |
| **Use Flow** | Execute a reusable flow | `flowId` |
| **If** | Start conditional block | `condition` |
| **Else** | Alternate branch of if block | — |
| **End If** | Close conditional block | — |
| **Loop** | Start loop block | `condition`, `maxIterations` |
| **End Loop** | Close loop block | — |

### Assert Types

| Type | What It Checks |
|------|----------------|
| `visible` | Element is visible on the page |
| `hidden` | Element is not visible |
| `text` | Element's text content matches |
| `url` | Current URL matches |
| `title` | Page title matches |
| `value` | Input field value matches |

### Assert Conditions

- **equals** — Exact match
- **contains** — Substring match
- **matches** — Regex match

## Control Flow

### If / Else / End If

Wrap steps in conditional blocks to execute them only when a condition is met:

```
If (element-exists: "#login-button")
  → Click: #login-button
  → Fill: #username, "admin"
Else
  → Click: #dashboard-link
End If
```

### Loop / End Loop

Repeat a block of steps while a condition holds:

```
Loop (element-exists: ".next-page", max: 5)
  → Click: .next-page
  → Wait: 1000ms
End Loop
```

### Condition Types

| Condition | Description | Fields |
|-----------|-------------|--------|
| `element-exists` | Element is present in DOM | `selector` |
| `element-not-exists` | Element is not present | `selector` |
| `variable-equals` | Environment variable equals value | `variable`, `value` |
| `variable-contains` | Environment variable contains substring | `variable`, `value` |
| `url-matches` | Current URL matches exactly | `value` |
| `url-contains` | Current URL contains substring | `value` |

## Test Configuration

Each test has configurable settings accessible from the test builder header:

| Setting | Default | Description |
|---------|---------|-------------|
| Browser | Chromium | `chromium`, `firefox`, or `webkit` |
| Viewport | 1280×720 | Browser window dimensions |
| Timeout | 30000ms | Maximum wait time per step (1s–120s) |
| Headless | true | Run without visible browser window |
| Real Browser | false | Use system Chrome with anti-detection |
| Permissions | none | Browser permissions to grant |
| Geolocation | none | Mock latitude/longitude coordinates |

### Browser Permissions

Grant browser-level permissions per test:

- Geolocation
- Camera
- Microphone
- Clipboard (read/write)
- Notifications

### Mock Geolocation

When geolocation permission is granted, you can set custom coordinates (latitude, longitude) that `navigator.geolocation` will return.

## Real Browser Mode

Some websites use bot detection services (Cloudflare Turnstile, Akamai, etc.) that block automated browsers. The **Real Browser** toggle switches from Playwright's bundled Chromium to your system-installed Chrome.

| Detection Method | Default (Chromium) | Real Browser Mode |
|------------------|--------------------|-------------------|
| Headless detection | Headless Chromium | Headed real Chrome |
| `navigator.webdriver` | `true` (detected) | Patched to `false` |
| Browser fingerprint | Playwright Chromium build | Actual Chrome binary |
| Automation flags | Present | Disabled |
| User agent | Playwright default | Realistic Chrome UA |

**When to use:**
- **Off (default)** — For most websites. Faster, runs headless.
- **On** — For sites with Cloudflare, Akamai, or other bot protection. Runs headed (browser window visible).

Requires Google Chrome installed on the server machine.

## Project Structure

```
qa-studio/
├── apps/
│   ├── dashboard/                   # React frontend (Vite + Tailwind)
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ActionPalette.tsx       # Action type selector sidebar
│   │       │   ├── BaselineManager.tsx     # Visual regression baseline management
│   │       │   ├── BatchRunProgress.tsx    # Suite/batch run progress tracker
│   │       │   ├── ConfirmDialog.tsx       # Reusable confirmation modal
│   │       │   ├── EnvironmentVariablesModal.tsx  # Project variable editor
│   │       │   ├── Layout.tsx             # App shell with sidebar navigation
│   │       │   ├── RecorderBar.tsx        # Test recording controls
│   │       │   ├── RunDetailPanel.tsx     # Single run detail viewer
│   │       │   ├── RunHistoryPanel.tsx    # Paginated run history list
│   │       │   ├── SelectorInput.tsx      # Multi-mode selector input
│   │       │   ├── SortableStep.tsx       # Draggable test step component
│   │       │   ├── StepEditor.tsx         # Step property editor panel
│   │       │   ├── ErrorBoundary.tsx       # React error boundary
│   │       │   └── VisualDiffViewer.tsx   # Screenshot diff comparison
│   │       ├── pages/
│   │       │   ├── FlowEditorPage.tsx     # Reusable flow step editor
│   │       │   ├── FlowsPage.tsx          # Flow list and management
│   │       │   ├── ProjectDashboardPage.tsx  # Analytics dashboard
│   │       │   ├── ProjectsPage.tsx       # Project list (home page)
│   │       │   ├── TestBuilderPage.tsx    # Test builder with 3-panel layout
│   │       │   └── TestsPage.tsx          # Test list, suites, schedules
│   │       └── lib/
│   │           └── api.ts                 # API client (fetchApi + domain modules)
│   │
│   └── server/                      # Fastify API + Playwright runner
│       └── src/
│           ├── db/
│           │   ├── schema.ts              # Drizzle ORM table definitions
│           │   └── index.ts               # DB initialization and migrations
│           ├── routes/
│           │   ├── analytics.ts           # Summary, trends, flaky test detection
│           │   ├── flows.ts               # Reusable flow CRUD
│           │   ├── projects.ts            # Project CRUD + export/import
│           │   ├── recorder.ts            # Recording session management
│           │   ├── schedules.ts           # Cron schedule CRUD + cleanup
│           │   ├── suites.ts              # Suite CRUD + batch run execution
│           │   ├── tests.ts               # Test CRUD + run + history
│           │   └── visual-regression.ts   # Baselines, diffs, approve/reject
│           ├── services/
│           │   ├── batch-runner.ts        # Parallel test execution (semaphore)
│           │   ├── cleanup.ts             # Old data retention cleanup
│           │   ├── recorder.ts            # Browser recording session manager
│           │   ├── runner.ts              # Playwright test executor
│           │   ├── scheduler.ts           # Cron job scheduling
│           │   ├── variables.ts           # {{key}} substitution engine
│           │   └── visual-diff.ts         # pixelmatch screenshot comparison
│           └── server.ts                  # Fastify app setup + plugin registration
│
├── packages/
│   └── shared/                      # Shared TypeScript types & utilities
│       └── src/
│           └── index.ts                   # Types, interfaces, helpers
│
└── data/                            # Auto-created at runtime
    ├── qa-studio.db                       # SQLite database
    ├── screenshots/                       # Step & failure screenshots
    ├── diffs/                             # Visual regression diff images
    └── videos/                            # Test run video recordings
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6, TanStack Query 5, Tailwind CSS |
| Drag & Drop | @dnd-kit |
| Icons | Lucide React |
| Backend | Fastify, Zod validation, WebSocket (@fastify/websocket) |
| Database | SQLite via better-sqlite3, Drizzle ORM |
| Test Engine | Playwright (Chromium, Firefox, WebKit) |
| Visual Diff | pixelmatch + pngjs |
| Scheduling | node-cron |
| Language | TypeScript (ESM throughout) |
| Build | Vite (frontend), tsx (server dev) |
| Monorepo | pnpm workspaces |

## API Reference

### Projects

```
GET    /api/projects                         # List all projects
POST   /api/projects                         # Create project
GET    /api/projects/:id                     # Get project
PUT    /api/projects/:id                     # Update project
DELETE /api/projects/:id                     # Delete project
GET    /api/projects/:id/export              # Export project (tests + flows)
POST   /api/projects/:id/import             # Import tests/flows into project
```

### Tests

```
GET    /api/projects/:projectId/tests        # List tests (with last run status)
POST   /api/tests                            # Create test
GET    /api/tests/:id                        # Get test
PUT    /api/tests/:id                        # Update test
DELETE /api/tests/:id                        # Delete test
POST   /api/tests/:id/clone                  # Clone test
POST   /api/tests/:id/run                    # Run test (SSE streaming)
GET    /api/tests/:id/runs                   # Get run history (paginated)
GET    /api/tests/:id/export                 # Export test as JSON
```

### Runs

```
GET    /api/runs/:id                         # Get run details
```

### Suites

```
GET    /api/projects/:projectId/suites       # List suites
POST   /api/suites                           # Create suite
PUT    /api/suites/:id                       # Update suite
DELETE /api/suites/:id                       # Delete suite
POST   /api/projects/:projectId/run-all      # Run all project tests (SSE)
POST   /api/suites/:id/run                   # Run suite tests (SSE)
GET    /api/projects/:projectId/suite-runs   # List suite runs (paginated)
GET    /api/suite-runs/:id                   # Get suite run details
```

### Flows

```
GET    /api/projects/:projectId/flows        # List flows
POST   /api/flows                            # Create flow
GET    /api/flows/:id                        # Get flow
PUT    /api/flows/:id                        # Update flow
DELETE /api/flows/:id                        # Delete flow
```

### Visual Regression

```
GET    /api/tests/:testId/baselines          # List baselines
POST   /api/tests/:testId/baselines/from-run/:runId  # Set baselines from run
GET    /api/runs/:runId/diffs                # Get diffs for a run
POST   /api/diffs/:id/approve                # Approve diff (update baseline)
POST   /api/diffs/:id/reject                # Reject diff
DELETE /api/baselines/:id                    # Delete baseline
```

### Analytics

```
GET    /api/projects/:projectId/analytics/summary   # Test summary metrics
GET    /api/projects/:projectId/analytics/trends    # Daily trends (?days=30)
GET    /api/projects/:projectId/analytics/flaky     # Flaky test detection
```

### Recorder

```
POST   /api/recorder/start                   # Start recording session
POST   /api/recorder/stop                    # Stop recording session
GET    /api/recorder/ws                      # WebSocket for live recorded steps
```

### Schedules

```
GET    /api/projects/:projectId/schedules    # List schedules
POST   /api/schedules                        # Create schedule
PUT    /api/schedules/:id                    # Update schedule
DELETE /api/schedules/:id                    # Delete schedule
```

### Admin

```
POST   /api/admin/cleanup                    # Trigger manual data cleanup
```

### Health

```
GET    /api/health                           # Server health check
```

## Database Schema

QA Studio uses SQLite with 9 tables. Cascade deletes are configured throughout.

**projects** — Test project containers
- `id`, `name`, `baseUrl`, `description`, `variables` (JSON), `createdAt`, `updatedAt`

**tests** — Test definitions with steps and configuration
- `id`, `projectId` (FK → projects), `name`, `description`, `config` (JSON), `steps` (JSON), `createdAt`, `updatedAt`

**runs** — Test execution results
- `id`, `testId` (FK → tests), `status`, `durationMs`, `error`, `stepResults` (JSON), `screenshotPath`, `videoPath`, `tracePath`, `createdAt`, `completedAt`

**suites** — Named test collections
- `id`, `projectId` (FK → projects), `name`, `testIds` (JSON), `createdAt`, `updatedAt`

**suiteRuns** — Suite execution results
- `id`, `suiteId`, `projectId`, `status`, `totalTests`, `passedTests`, `failedTests`, `runIds` (JSON), `durationMs`, `createdAt`, `completedAt`

**flows** — Reusable step sequences
- `id`, `projectId` (FK → projects), `name`, `description`, `steps` (JSON), `createdAt`, `updatedAt`

**baselines** — Visual regression baseline screenshots
- `id`, `testId` (FK → tests), `stepId`, `screenshotPath`, `runId`, `createdAt`

**screenshotDiffs** — Visual regression comparison results
- `id`, `runId` (FK → runs), `stepId`, `baselineId` (FK → baselines), `baselinePath`, `actualPath`, `diffPath`, `diffPercentage`, `status`, `threshold`, `createdAt`

**schedules** — Cron-based automated execution
- `id`, `projectId` (FK → projects), `suiteId`, `name`, `cronExpression`, `enabled`, `lastRunAt`, `nextRunAt`, `lastRunStatus`, `createdAt`, `updatedAt`

## Development

### Individual Services

```bash
pnpm dev:server       # API server only (port 3001)
pnpm dev:dashboard    # Dashboard only (port 5173)
```

### Database

```bash
pnpm db:push          # Apply schema changes to SQLite
pnpm db:studio        # Open Drizzle Studio (database GUI)
```

### Build

```bash
pnpm build            # Build all packages for production
```

### Playwright Browsers

```bash
pnpm playwright:install   # Install/update Chromium, Firefox, WebKit
```

## Environment Variables

Create a `.env` file in `apps/server/` (optional — defaults work out of the box):

```env
PORT=3001              # Server port (default: 3001)
RETENTION_DAYS=30      # Days to keep old runs/artifacts (default: 30)
```

## License

MIT

---

Built with Playwright, React, and Fastify
