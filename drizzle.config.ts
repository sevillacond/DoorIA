import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'dooria',
    password: process.env.POSTGRES_PASSWORD || 'dooria_local',
    database: process.env.POSTGRES_DB || 'dooria_db',
  },
  verbose: true,
  strict: true,
});
