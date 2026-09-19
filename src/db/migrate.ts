import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.ts';

/**
 * Executa as migrações versionadas oficiais do Drizzle ORM no PostgreSQL
 */
export async function runMigrations() {
  console.log('[Drizzle Migrator] Iniciando execução controlada das migrações...');
  let client;
  try {
    client = await pool.connect();
    // Executa a migration oficial
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('[Drizzle Migrator] ✅ Todas as migrações do schema foram aplicadas com sucesso!');
    return { success: true };
  } catch (error: any) {
    console.error('[Drizzle Migrator] ❌ Falha crítica ao conectar ao PostgreSQL ou aplicar migrações:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Execução direta via CLI: `npm run db:migrate` ou `tsx src/db/migrate.ts`
if (process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Drizzle Migrator] Erro fatal:', err.message || err);
      process.exit(1);
    });
}
