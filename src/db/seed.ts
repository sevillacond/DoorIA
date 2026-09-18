import { db } from './index.ts';
import { units, users, gates } from './schema.ts';

async function seed() {
  console.log('🌱 Iniciando o seed (população inicial) do banco de dados...');

  try {
    // 1. Criar Portões (Relés)
    console.log('Criando portões (Pedestre e Garagem)...');
    await db.insert(gates).values([
      {
        name: 'Portão Social (Pedestre)',
        type: 'pedestre',
        relayPin: 'rele1',
        status: 'fechado',
      },
      {
        name: 'Portão da Garagem (Veículos)',
        type: 'garagem',
        relayPin: 'rele2',
        status: 'fechado',
      }
    ]).onConflictDoNothing();

    // 2. Criar Unidades Fictícias para Homologação
    console.log('Criando unidades (Aptos)...');
    const insertedUnits = await db.insert(units).values([
      { number: '101', block: 'A', ownerName: 'João Silva', sipExtension: '101', financialStatus: 'em_dia' },
      { number: '102', block: 'A', ownerName: 'Maria Oliveira', sipExtension: '102', financialStatus: 'em_dia' },
      { number: '201', block: 'B', ownerName: 'Carlos Santos', sipExtension: '201', financialStatus: 'inadimplente' },
    ]).returning();

    // 3. Criar Usuários Administrativos e Moradores
    console.log('Criando usuários...');
    await db.insert(users).values([
      {
        name: 'Super Admin (Instalador)',
        role: 'superadmin',
        email: 'admin@enlace.slz.br',
      },
      {
        name: 'Síndico',
        role: 'sindico',
        email: 'sindico@condominio.local',
      },
      {
        name: 'João Silva',
        role: 'morador',
        email: 'joao.silva@email.com',
        unitId: insertedUnits[0]?.id,
      }
    ]).onConflictDoNothing();

    console.log('✅ Seed finalizado com sucesso! O banco está pronto para uso.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante o seed do banco de dados:', error);
    process.exit(1);
  }
}

seed();
