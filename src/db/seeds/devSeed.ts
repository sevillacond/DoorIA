import 'dotenv/config';
import crypto from 'crypto';
import { db } from '../index.ts';
import {
  condominiums,
  units,
  residents,
  vehicles,
  gates,
  cameraDevices,
  visitorInvites,
  packageDeliveries,
  financialBills,
  systemUsers,
  iotDevices,
  automationRules,
} from '../schema.ts';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Seed Exclusivo para Desenvolvimento / Demonstração Local.
 * NUNCA deve ser executado em ambientes de produção.
 */
export async function runDevSeed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Falha de Segurança: devSeed não pode ser executado em ambiente de produção (NODE_ENV=production).');
  }

  console.log('[DevSeed] Populando dados de demonstração/teste local...');

  try {
    // 1. Condomínio Mestre Demonstrativo
    await db
      .insert(condominiums)
      .values({
        id: 'condo-demo-01',
        name: 'Condomínio Residencial Exemplo',
        tradingName: 'Residencial Exemplo',
        cnpj: '00.000.000/0001-99',
        address: {
          street: 'Rua das Amendoeiras',
          number: '100',
          neighborhood: 'Bairro Modelo',
          city: 'Cidade Exemplo',
          state: 'MA',
          zipCode: '65000-000',
        },
        unitsCount: 12,
        blocks: ['Bloco A'],
        floorsCount: 3,
        parkingSpotsCount: 18,
        managementPhone: '(98) 3200-0000',
        emergencyPhone: '(98) 98000-0000',
        email: 'gestao@condominio.local',
        sindico: {
          name: 'Síndico de Demonstração',
          phone: '(98) 98000-1111',
          email: 'sindico@condominio.local',
          apartment: '304',
        },
        administrator: {
          name: 'Administradora Exemplo',
          cnpj: '00.000.000/0001-00',
          phone: '(98) 3200-1111',
          email: 'contato@admin.local',
        },
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
          standardFee: 450.0,
          reserveFundPercentage: 10,
          latePenaltyPercentage: 2.0,
          monthlyInterestPercentage: 1.0,
        },
        technicalSettings: {
          localServerIp: '127.0.0.1',
          asteriskVersion: 'Asterisk 20 LTS Pure PJSIP',
          asteriskWssPort: 8089,
          allowSelfSignedCerts: true,
        },
      })
      .onConflictDoNothing();

    // 2. Unidades Habitacionais (101 a 304)
    const unitList = [
      { id: 'u-101', number: '101', floor: 1, sipExtension: '101', intercomCode: '101', ownerName: 'Morador 101', financialStatus: 'em_dia' },
      { id: 'u-102', number: '102', floor: 1, sipExtension: '102', intercomCode: '102', ownerName: 'Morador 102', financialStatus: 'em_dia' },
      { id: 'u-103', number: '103', floor: 1, sipExtension: '103', intercomCode: '103', ownerName: 'Morador 103', financialStatus: 'atrasado' },
      { id: 'u-104', number: '104', floor: 1, sipExtension: '104', intercomCode: '104', ownerName: 'Morador 104', financialStatus: 'em_dia' },
      { id: 'u-201', number: '201', floor: 2, sipExtension: '201', intercomCode: '201', ownerName: 'Morador 201', financialStatus: 'em_dia' },
      { id: 'u-202', number: '202', floor: 2, sipExtension: '202', intercomCode: '202', ownerName: 'Morador 202', financialStatus: 'em_dia' },
      { id: 'u-203', number: '203', floor: 2, sipExtension: '203', intercomCode: '203', ownerName: 'Morador 203', financialStatus: 'acordo' },
      { id: 'u-204', number: '204', floor: 2, sipExtension: '204', intercomCode: '204', ownerName: 'Morador 204', financialStatus: 'em_dia' },
      { id: 'u-301', number: '301', floor: 3, sipExtension: '301', intercomCode: '301', ownerName: 'Morador 301', financialStatus: 'em_dia' },
      { id: 'u-302', number: '302', floor: 3, sipExtension: '302', intercomCode: '302', ownerName: 'Morador 302', financialStatus: 'em_dia' },
      { id: 'u-303', number: '303', floor: 3, sipExtension: '303', intercomCode: '303', ownerName: 'Morador 303', financialStatus: 'em_dia' },
      { id: 'u-304', number: '304', floor: 3, sipExtension: '304', intercomCode: '304', ownerName: 'Morador 304', financialStatus: 'em_dia' },
    ];

    for (const u of unitList) {
      await db.insert(units).values(u).onConflictDoNothing();
    }

    // 3. Portões
    await db
      .insert(gates)
      .values([
        {
          id: 'gate-pedestre',
          name: 'Portão Social Pedestre',
          type: 'pedestre',
          relayPin: 1,
          dtmfCode: '*07',
          status: 'fechado',
          isOpen: false,
        },
        {
          id: 'gate-garagem',
          name: 'Portão Garagem Veicular',
          type: 'garagem',
          relayPin: 2,
          dtmfCode: '*08',
          status: 'fechado',
          isOpen: false,
        },
      ])
      .onConflictDoNothing();

    // 4. Usuários de Teste (Dev)
    const salt = 'dev_salt_12345';
    await db
      .insert(systemUsers)
      .values([
        {
          id: 'usr-dev-superadmin',
          username: 'admin',
          passwordHash: hashPassword('admin123', salt),
          salt,
          displayName: 'Super Admin Técnico (Dev)',
          email: 'admin@condominio.local',
          role: 'super_admin',
          active: true,
        },
        {
          id: 'usr-dev-sindico',
          username: 'sindico',
          passwordHash: hashPassword('sindico123', salt),
          salt,
          displayName: 'Síndico Geral (Dev)',
          email: 'sindico@condominio.local',
          role: 'sindico',
          unitId: 'u-201',
          unitNumber: '201',
          active: true,
        },
      ])
      .onConflictDoNothing();

    console.log('[DevSeed] ✅ Dados de demonstração carregados com sucesso.');
    return { success: true };
  } catch (error: any) {
    console.error('[DevSeed] ❌ Erro ao popular dados de desenvolvimento:', error.message);
    throw error;
  }
}
