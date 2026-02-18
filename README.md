# QA Studio

A no-code E2E testing tool powered by Playwright. Build, run, and manage automated browser tests without writing code.

![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=playwright&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

## Features

- **Visual Test Builder** - Drag-and-drop interface to build tests with 11 action types
- **Cross-Browser Testing** - Run tests on Chromium, Firefox, and WebKit
- **Real Browser Mode** - Use system-installed Chrome to bypass bot detection (Cloudflare, etc.)
- **Run History** - View past runs with status, duration, and step-by-step results
- **Video Recording** - Every test run is automatically recorded
- **Failure Screenshots** - Automatic screenshots captured on step failures
- **Project Organization** - Group tests by project with base URLs
- **Live Results** - Watch test progress in real time with auto-polling

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** (`npm install -g pnpm`)
- **Google Chrome** (optional, required only for Real Browser mode)

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

| Service   | URL                      |
|-----------|--------------------------|
| Dashboard | http://localhost:5173     |
| API       | http://localhost:3001     |

## Usage Guide

### 1. Create a Project

Open http://localhost:5173 and click **New Project**. Give it a name and optionally a base URL.

### 2. Create a Test

Inside a project, click **New Test**. This opens the Test Builder.

### 3. Build Your Test

The Test Builder has three panels:

- **Left: Action Palette** - Drag or click actions to add steps
- **Center: Steps List** - Your test steps in execution order (drag to reorder)
- **Right: Step Editor / Run Results** - Configure the selected step or view run details

### 4. Run Your Test

Click **Run Test** in the top-right corner. If you have unsaved changes, they are saved automatically before running. After the run completes, the **Run Details** panel opens automatically showing:

- Pass/fail status and total duration
- Step-by-step results with individual timings
- Error messages for failed steps
- Screenshot and video buttons for the run artifacts

### 5. View Run History

Click the **Runs** button in the header to see all past runs for the test. Click any run to view its full details.

## Available Actions

| Action | Description | Key Fields |
|--------|-------------|------------|
| Navigate | Go to a URL | `url` |
| Click | Click an element | `selector` |
| Fill | Type text into an input | `selector`, `value` |
| Select | Choose a dropdown option | `selector`, `value` |
| Check | Check a checkbox | `selector` |
| Uncheck | Uncheck a checkbox | `selector` |
| Hover | Hover over an element | `selector` |
| Press Key | Press a keyboard key | `key` |
| Wait | Wait for time, selector, or URL | `waitType`, `value` |
| Screenshot | Capture the page | `name`, `fullPage` |
| Assert | Verify a condition | `assertType`, `selector`, `condition`, `value` |

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

- **equals** - Exact match
- **contains** - Substring match
- **matches** - Regex match

## Real Browser Mode

Some websites use bot detection services (Cloudflare Turnstile, etc.) that block automated browsers. The **Real Browser** toggle in the test header switches from Playwright's bundled Chromium to your system-installed Chrome.

### How It Works

| Detection Method | Default (Chromium) | Real Browser Mode |
|------------------|--------------------|-------------------|
| Headless detection | Headless Chromium | Headed real Chrome |
| `navigator.webdriver` | `true` (detected) | Patched to `false` |
| Browser fingerprint | Playwright Chromium build | Actual Chrome binary |
| Automation flags | Present | Disabled |
| User agent | Playwright default | Realistic Chrome UA |

### When to Use It

- **Off (default)** - For most websites. Faster, runs headless.
- **On** - For sites with Cloudflare, Akamai, or other bot protection. Runs headed (you'll see the browser window open).

### Requirements

Real Browser mode requires Google Chrome installed on the machine running the server.

## Test Configuration

Each test has configurable settings:

| Setting | Default | Description |
|---------|---------|-------------|
| Browser | Chromium | `chromium`, `firefox`, or `webkit` |
| Viewport | 1280x720 | Browser window dimensions |
| Timeout | 30000ms | Maximum wait time per step |
| Headless | true | Run without visible browser window |
| Real Browser | false | Use system Chrome with anti-detection |

## Project Structure

```
qa-studio/
├── apps/
│   ├── dashboard/              # React frontend (Vite + Tailwind)
│   │   └── src/
│   │       ├── components/     # UI components
│   │       │   ├── ActionPalette.tsx
│   │       │   ├── StepEditor.tsx
│   │       │   ├── SortableStep.tsx
│   │       │   ├── RunHistoryPanel.tsx
│   │       │   ├── RunDetailPanel.tsx
│   │       │   └── Layout.tsx
│   │       ├── pages/          # Route pages
│   │       │   ├── ProjectsPage.tsx
│   │       │   ├── TestsPage.tsx
│   │       │   └── TestBuilderPage.tsx
│   │       └── lib/
│   │           └── api.ts      # API client
│   │
│   └── server/                 # Fastify API + Playwright runner
│       └── src/
│           ├── db/
│           │   ├── schema.ts   # Drizzle ORM schema
│           │   └── index.ts    # DB initialization
│           ├── routes/
│           │   ├── projects.ts # Project CRUD
│           │   └── tests.ts    # Test CRUD + run + history
│           ├── services/
│           │   └── runner.ts   # Playwright test executor
│           └── server.ts       # Fastify setup
│
├── packages/
│   └── shared/                 # Shared TypeScript types & utilities
│       └── src/
│           └── index.ts
│
└── data/                       # Auto-created at runtime
    ├── qa-studio.db            # SQLite database
    ├── screenshots/            # Failure & step screenshots
    └── videos/                 # Test run recordings
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router, TanStack Query, Tailwind CSS |
| Drag & Drop | @dnd-kit |
| Icons | Lucide React |
| Backend | Fastify, Zod validation |
| Database | SQLite via better-sqlite3, Drizzle ORM |
| Test Engine | Playwright |
| Language | TypeScript throughout |
| Build | Vite (frontend), tsx (server dev) |
| Monorepo | pnpm workspaces |

## API Reference

### Projects

```
GET    /api/projects              # List all projects
POST   /api/projects              # Create a project
GET    /api/projects/:id          # Get a project
PUT    /api/projects/:id          # Update a project
DELETE /api/projects/:id          # Delete a project
```

### Tests

```
GET    /api/projects/:pid/tests   # List tests for a project
POST   /api/tests                 # Create a test
GET    /api/tests/:id             # Get a test
PUT    /api/tests/:id             # Update a test
DELETE /api/tests/:id             # Delete a test
POST   /api/tests/:id/run         # Run a test
GET    /api/tests/:id/runs        # Get run history for a test
```

### Runs

```
GET    /api/runs/:id              # Get full run details
```

### Health

```
GET    /api/health                # Server status check
```

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

Create a `.env` file in `apps/server/` (optional, defaults work out of the box):

```env
PORT=3001             # Server port (default: 3001)
```

## Database Schema

QA Studio uses SQLite with three tables:

**projects** - Test project groupings
- `id`, `name`, `base_url`, `description`, `created_at`, `updated_at`

**tests** - Test definitions with steps and config
- `id`, `project_id` (FK), `name`, `description`, `config` (JSON), `steps` (JSON), `created_at`, `updated_at`

**runs** - Test execution results
- `id`, `test_id` (FK), `status`, `duration_ms`, `error`, `step_results` (JSON), `screenshot_path`, `video_path`, `trace_path`, `created_at`, `completed_at`

Cascade deletes are configured: deleting a project removes its tests, deleting a test removes its runs.

## License

MIT

---

Built with Playwright, React, and Fastify
