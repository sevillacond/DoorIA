import 'dotenv/config';
import { runProductionBootstrap } from './seeds/prodBootstrap.ts';
import { runDevSeed } from './seeds/devSeed.ts';

export async function runSeed() {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`[Seed Dispatcher] Executando rotina de dados (Ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'})...`);

  if (isProduction) {
    return runProductionBootstrap();
  } else {
    return runDevSeed();
  }
}

if (process.argv[1]?.includes('seed.ts')) {
  runSeed()
    .then(() => {
      console.log('[Seed Dispatcher] Concluído.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Dispatcher] Erro fatal:', err);
      process.exit(1);
    });
}
