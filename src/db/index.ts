import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pkg;

// Configuração do pool de conexões com o PostgreSQL local puro
// Respeita estritamente variáveis de ambiente sem fallback para credenciais fixas de produção
const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      max: 20,
    })
  : new Pool({
      host: process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1',
      port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10),
      user: process.env.PGUSER || process.env.POSTGRES_USER || 'dooria',
      password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
      database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'dooria_db',
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      max: 20,
    });

pool.on('error', (err) => {
  // Evita interrupção fatal do processo Node.js se houver oscilação de conexão
  if (!err.message.includes('ECONNREFUSED')) {
    console.warn('[PostgreSQL Local] Alerta no pool de conexões:', err.message);
  }
});

// Inicialização canônica do Drizzle ORM com o schema tipado
export const db = drizzle(pool, { schema });
