import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './data/qa-studio.db',
  },
  verbose: true,
  strict: true,
});
