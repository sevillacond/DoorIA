import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432', 10),
    user: process.env.POSTGRES_USER || process.env.PGUSER || 'dooria',
    password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || '',
    database: process.env.POSTGRES_DB || process.env.PGDATABASE || 'dooria_db',
  },
  verbose: true,
  strict: true,
});
