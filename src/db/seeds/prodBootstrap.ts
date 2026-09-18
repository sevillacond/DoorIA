import 'dotenv/config';
import crypto from 'crypto';
import { db } from '../index.ts';
import { condominiums, systemUsers, gates } from '../schema.ts';
import { eq } from 'drizzle-orm';

/**
 * Bootstrap Mínimo e Seguro para Ambientes de Produção (PostgreSQL 16 LTS)
 * Não cria dados de moradores, veículos ou faturas fictícias.
 * Inicializa apenas:
 * 1. Estrutura base do condomínio (a partir de ENV ou cadastro inicial)
 * 2. Portões operacionais fundamentais (Pedestre e Garagem com DTMF padrão *07 e *08)
 * 3. Conta mestre de Super Administrador (com salt criptográfico seguro)
 */
export async function runProductionBootstrap() {
  console.log('[Prod Bootstrap] Iniciando bootstrap seguro de produção...');

  try {
    // 1. Condomínio Mestre
    const condoId = process.env.CONDO_ID || 'condo-master';
    const condoName = process.env.CONDO_NAME || 'Condomínio Residencial';
    const condoCnpj = process.env.CONDO_CNPJ || '00.000.000/0001-00';

    const existingCondo = await db.select().from(condominiums).where(eq(condominiums.id, condoId)).limit(1);
    if (!existingCondo || existingCondo.length === 0) {
      console.log('[Prod Bootstrap] Inicializando registro de condomínio base...');
      await db.insert(condominiums).values({
        id: condoId,
        name: condoName,
        tradingName: process.env.CONDO_TRADING_NAME || condoName,
        cnpj: condoCnpj,
        address: {
          street: process.env.CONDO_STREET || '',
          number: process.env.CONDO_NUMBER || '',
          neighborhood: process.env.CONDO_NEIGHBORHOOD || '',
          city: process.env.CONDO_CITY || '',
          state: process.env.CONDO_STATE || '',
          zipCode: process.env.CONDO_ZIP || '',
        },
        unitsCount: parseInt(process.env.CONDO_UNITS_COUNT || '0', 10),
        blocks: process.env.CONDO_BLOCKS ? process.env.CONDO_BLOCKS.split(',') : ['Bloco A'],
        floorsCount: parseInt(process.env.CONDO_FLOORS_COUNT || '1', 10),
        parkingSpotsCount: parseInt(process.env.CONDO_PARKING_COUNT || '0', 10),
        operationalSettings: {
          pedestrianGatePulseSeconds: 5,
          vehicleGatePulseSeconds: 15,
          openGateAlertSeconds: 60,
          dtmfPedestrian: '*07',
          dtmfVehicle: '*08',
          silencePeriodStart: '22:00',
          silencePeriodEnd: '08:00',
          packageDeliveryWindowStart: '08:00',
          packageDeliveryWindowEnd: '20:00',
          callTimeoutSeconds: 30,
          autoUraFallback: true,
          localFirstOfflineMode: true,
          requireVisitorPhoto: true,
        },
        financialSettings: {
          dueDay: 10,
          standardFee: 0.0,
          reserveFundPercentage: 10,
          latePenaltyPercentage: 2.0,
          monthlyInterestPercentage: 1.0,
        },
        technicalSettings: {
          localServerIp: process.env.LOCAL_SERVER_IP || '127.0.0.1',
          asteriskVersion: 'Asterisk 20 LTS Pure PJSIP',
          asteriskWssPort: 8089,
          allowSelfSignedCerts: true,
        },
      });
    }

    // 2. Portões Operacionais
    const existingGates = await db.select().from(gates);
    if (!existingGates || existingGates.length === 0) {
      console.log('[Prod Bootstrap] Configurando portões essenciais de acesso...');
      await db.insert(gates).values([
        {
          id: 'gate-pedestre',
          name: 'Portão Social Pedestre (Calçada)',
          type: 'pedestre',
          relayPin: 1,
          relayIp: process.env.RELAY_CONTROLLER_IP || '192.168.1.160',
          dtmfCode: '*07',
          status: 'fechado',
          isOpen: false,
        },
        {
          id: 'gate-garagem',
          name: 'Portão Garagem Veicular',
          type: 'garagem',
          relayPin: 2,
          relayIp: process.env.RELAY_CONTROLLER_IP || '192.168.1.160',
          dtmfCode: '*08',
          status: 'fechado',
          isOpen: false,
        },
      ]);
    }

    // 3. Usuário Super Admin Inicial Seguro
    const adminUser = process.env.INITIAL_ADMIN_USER || 'admin';
    const adminPass = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminPass && process.env.NODE_ENV === 'production') {
      console.warn('[Prod Bootstrap] ⚠️ INITIAL_ADMIN_PASSWORD não definido nas variáveis de ambiente.');
    }

    const existingAdmin = await db.select().from(systemUsers).where(eq(systemUsers.username, adminUser)).limit(1);
    if (!existingAdmin || existingAdmin.length === 0) {
      const generatedPass = adminPass || crypto.randomBytes(16).toString('hex');
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = crypto.scryptSync(generatedPass, salt, 64).toString('hex');

      console.log(`[Prod Bootstrap] Criando usuário inicial '${adminUser}' (Super Admin)...`);
      if (!adminPass) {
        console.warn(`[Prod Bootstrap] 🔑 Senha temporária de primeiro acesso gerada: ${generatedPass}`);
        console.warn(`[Prod Bootstrap] ⚠️ Altere esta senha imediatamente após o primeiro acesso.`);
      }

      await db.insert(systemUsers).values({
        id: 'usr-superadmin',
        username: adminUser,
        passwordHash,
        salt,
        displayName: 'Administrador do Sistema',
        email: process.env.INITIAL_ADMIN_EMAIL || 'admin@condominio.local',
        role: 'super_admin',
        active: true,
        mfaEnabled: false,
      });
    }

    console.log('[Prod Bootstrap] ✅ Bootstrap de produção concluído com sucesso!');
    return { success: true };
  } catch (error: any) {
    console.error('[Prod Bootstrap] ❌ Erro durante o bootstrap de produção:', error.message);
    throw error;
  }
}

if (process.argv[1]?.includes('prodBootstrap.ts')) {
  runProductionBootstrap()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
