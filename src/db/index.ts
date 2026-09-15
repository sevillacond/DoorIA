import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pkg;

// Configuração do pool de conexões com o PostgreSQL local
const pool = new Pool({
  host: process.env.POSTGRES_HOST || '127.0.0.1',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'dooria',
  password: process.env.POSTGRES_PASSWORD || 'dooria_local',
  database: process.env.POSTGRES_DB || 'dooria_db',
});

// Inicialização do Drizzle ORM
export const db = drizzle(pool, { schema });
