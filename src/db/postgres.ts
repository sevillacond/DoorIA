import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

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

let pool: pg.Pool | null = null;
let lastStatus: PostgresConnectionStatus = {
  connected: false,
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'dooria_db',
  user: process.env.PGUSER || 'dooria',
  lastChecked: new Date().toISOString(),
};

/**
 * Retorna ou inicializa o pool de conexões com o PostgreSQL local puro
 */
export function getPgPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 30000,
        max: 20,
      });
    } else {
      pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'dooria',
        password: process.env.PGPASSWORD || 'dooria_secret',
        database: process.env.PGDATABASE || 'dooria_db',
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 30000,
        max: 20,
      });
    }

    pool.on('error', (err) => {
      console.warn('[PostgreSQL Local] Alerta no pool de conexões:', err.message);
    });
  }

  return pool;
}

/**
 * Executa uma consulta SQL com tratamento de erro
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T> | null> {
  try {
    const currentPool = getPgPool();
    const result = await currentPool.query<T>(text, params);
    return result;
  } catch (error: any) {
    console.warn(`[PostgreSQL Local] Erro ao executar query (${text.substring(0, 40)}...):`, error.message);
    return null;
  }
}

/**
 * Verifica a saúde e a conectividade com o PostgreSQL local puro
 */
export async function checkPostgresHealth(): Promise<PostgresConnectionStatus> {
  const host = process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.PGPORT || '5432', 10);
  const database = process.env.PGDATABASE || 'dooria_db';
  const user = process.env.PGUSER || 'dooria';

  const startTime = Date.now();
  try {
    const currentPool = getPgPool();
    const result = await currentPool.query('SELECT 1 as ping, current_database() as db, version() as ver;');
    const latencyMs = Date.now() - startTime;

    // Contagem de tabelas públicas criadas
    const tablesResult = await currentPool.query<{ count: string }>(
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
      error: err.message || 'Não foi possível conectar ao PostgreSQL local na porta 5432',
      lastChecked: new Date().toISOString(),
    };
    return lastStatus;
  }
}

/**
 * Inicializa as tabelas do PostgreSQL executando o script DDL init.sql
 */
export async function initializePostgresSchema(): Promise<boolean> {
  try {
    const isHealthy = await checkPostgresHealth();
    if (!isHealthy.connected) {
      console.log('[PostgreSQL Local] PostgreSQL local em standby. A aplicação continuará operando com persistência em memória/cache até conexão.');
      return false;
    }

    const initSqlPath = path.join(process.cwd(), 'src', 'db', 'init.sql');
    if (fs.existsSync(initSqlPath)) {
      const sqlContent = fs.readFileSync(initSqlPath, 'utf8');
      const currentPool = getPgPool();
      await currentPool.query(sqlContent);
      console.log('[PostgreSQL Local] Schema e tabelas DDL inicializadas com sucesso no PostgreSQL local.');
      return true;
    }
    return false;
  } catch (error: any) {
    console.warn('[PostgreSQL Local] Erro ao aplicar DDL inicial:', error.message);
    return false;
  }
}
