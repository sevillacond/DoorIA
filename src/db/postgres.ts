import type pg from 'pg';
import { pool } from './index.ts';

export interface PostgresConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  latencyMs?: number;
  error?: string;
  lastChecked: string;
  tablesCount?: number;
}

let lastStatus: PostgresConnectionStatus = {
  connected: false,
  host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'dooria_db',
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'dooria',
  lastChecked: new Date().toISOString(),
};

export function getPgPool(): pg.Pool {
  return pool;
}

/**
 * Executa uma consulta SQL com tratamento seguro de erro e logs estruturados
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T> | null> {
  try {
    const result = await pool.query<T>(text, params);
    return result;
  } catch (error: any) {
    if (!error.message?.includes('ECONNREFUSED')) {
      console.warn(`[PostgreSQL Local] Erro ao executar query (${text.substring(0, 40)}...):`, error.message);
    }
    return null;
  }
}

/**
 * Verifica a saúde e a conectividade com o PostgreSQL local
 */
export async function checkPostgresHealth(): Promise<PostgresConnectionStatus> {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost';
  const port = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10);
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'dooria_db';
  const user = process.env.PGUSER || process.env.POSTGRES_USER || 'dooria';

  const startTime = Date.now();
  try {
    const result = await pool.query('SELECT 1 as ping, current_database() as db, version() as ver;');
    const latencyMs = Date.now() - startTime;

    // Contagem de tabelas públicas criadas
    const tablesResult = await pool.query<{ count: string }>(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
    );
    const tablesCount = tablesResult.rows[0] ? parseInt(tablesResult.rows[0].count, 10) : 0;

    lastStatus = {
      connected: true,
      host,
      port,
      database: result.rows[0]?.db || database,
      user,
      latencyMs,
      tablesCount,
      lastChecked: new Date().toISOString(),
    };
    return lastStatus;
  } catch (err: any) {
    lastStatus = {
      connected: false,
      host,
      port,
      database,
      user,
      error: err.message?.includes('ECONNREFUSED')
        ? 'PostgreSQL local em standby (porta 5432)'
        : err.message,
      lastChecked: new Date().toISOString(),
    };
    return lastStatus;
  }
}
