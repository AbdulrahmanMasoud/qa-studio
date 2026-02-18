import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Initialize database
import './db/index.js';

// Import routes
import { projectRoutes } from './routes/projects.js';
import { testRoutes } from './routes/tests.js';
import { recorderRoutes } from './routes/recorder.js';

const app = Fastify({
  logger: true,
});

// CORS for frontend
await app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Serve static files (screenshots, videos)
// Use resolve from CWD to match where the runner writes files (DATA_DIR = './data')
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}
await app.register(fastifyStatic, {
  root: dataDir,
  prefix: '/data/',
  decorateReply: false,
});

// WebSocket support
await app.register(fastifyWebsocket);

// Register routes
await app.register(projectRoutes);
await app.register(testRoutes);
await app.register(recorderRoutes);

// Health check
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🎭 QA Studio Server                             ║
  ║                                                   ║
  ║   API running at: http://localhost:${PORT}          ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
