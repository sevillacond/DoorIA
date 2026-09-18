import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.ts';

/**
 * Executa as migrações versionadas oficiais do Drizzle ORM no PostgreSQL
 */
export async function runMigrations() {
  console.log('[Drizzle Migrator] Iniciando execução controlada das migrações...');
  const client = await pool.connect();
  try {
    // Executa a migration oficial
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('[Drizzle Migrator] ✅ Todas as migrações do schema foram aplicadas com sucesso!');
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED')) {
      console.warn('[Drizzle Migrator] PostgreSQL local não conectado no momento da migração (standby).');
      return { success: false, reason: 'ECONNREFUSED' };
    }
    console.error('[Drizzle Migrator] ❌ Falha crítica ao aplicar migrações:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Execução direta via CLI: `npm run db:migrate` ou `tsx src/db/migrate.ts`
if (process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('[Drizzle Migrator] Erro fatal:', err);
      process.exit(1);
    });
}
