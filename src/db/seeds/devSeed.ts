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

  console.log('[DevSeed] Populando dados de desenvolvimento/demonstração no PostgreSQL 16 LTS...');

  try {
    // 1. Condomínio de Demonstração
    await db
      .insert(condominiums)
      .values({
        id: 'condo-master',
        name: 'Condomínio Residencial Demonstração',
        tradingName: 'Residencial Solar das Palmeiras',
        cnpj: '12.345.678/0001-90',
        address: {
          street: 'Avenida dos Holandeses',
          number: '1000',
          neighborhood: 'Calhau',
          city: 'São Luís',
          state: 'MA',
          zipCode: '65071-380',
        },
        unitsCount: 16,
        blocks: ['Bloco A', 'Bloco B'],
        floorsCount: 4,
        parkingSpotsCount: 20,
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
      })
      .onConflictDoNothing();

    // 2. Unidades e Moradores de Teste
    const demoUnits = [
      { id: 'u-101', number: '101', block: 'Bloco A', floor: 1, sipExtension: '2101', intercomCode: '101', ownerName: 'Carlos Eduardo Mendes' },
      { id: 'u-102', number: '102', block: 'Bloco A', floor: 1, sipExtension: '2102', intercomCode: '102', ownerName: 'Mariana Lima Santos' },
      { id: 'u-201', number: '201', block: 'Bloco A', floor: 2, sipExtension: '2201', intercomCode: '201', ownerName: 'Roberto Albuquerque' },
      { id: 'u-202', number: '202', block: 'Bloco A', floor: 2, sipExtension: '2202', intercomCode: '202', ownerName: 'Fernanda Castelo Branco' },
    ];

    for (const u of demoUnits) {
      await db.insert(units).values(u).onConflictDoNothing();
    }

    await db
      .insert(residents)
      .values([
        {
          id: 'res-101',
          unitId: 'u-101',
          name: 'Carlos Eduardo Mendes',
          phone: '(98) 98123-4567',
          email: 'carlos.mendes@gmail.com',
          isMainContact: true,
        },
        {
          id: 'res-201',
          unitId: 'u-201',
          name: 'Roberto Albuquerque',
          phone: '(98) 98877-6655',
          email: 'sindico@solardaspalmeiras.com.br',
          isMainContact: true,
        },
      ])
      .onConflictDoNothing();

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

    // 5. Dispositivos IoT (Dev)
    await db
      .insert(iotDevices)
      .values([
        {
          id: 'dev-rele-pedestre',
          name: 'Relé Eletromecânico Portão Pedestre',
          type: 'rele',
          protocol: 'zigbee_3_0',
          gateway: 'NovaDigital_HNZ_CB3',
          state: 'desligado',
          online: true,
          location: 'Quadro de Comando da Guarita',
        },
        {
          id: 'dev-sensor-movimento-garagem',
          name: 'Sensor PIR Presença Aclive Garagem',
          type: 'sensor_presenca',
          protocol: 'zigbee_3_0',
          gateway: 'NovaDigital_HNZ_CB3',
          state: 'sem_movimento',
          batteryLevel: 94,
          online: true,
          location: 'Rampa de Acesso Subsolo',
        },
        {
          id: 'dev-rele-holofote-hall',
          name: 'Interruptor Inteligente Hall Social',
          type: 'iluminacao',
          protocol: 'zigbee_3_0',
          gateway: 'NovaDigital_HNZ_CB3',
          state: 'desligado',
          online: true,
          location: 'Hall de Entrada Social',
        },
        {
          id: 'dev-sirene-panico',
          name: 'Sirene Audiovisual Estroboscópica',
          type: 'sirene',
          protocol: 'zigbee_3_0',
          gateway: 'NovaDigital_HNZ_CB3',
          state: 'desligado',
          batteryLevel: 100,
          online: true,
          location: 'Fachada Externa Guarita',
        },
      ])
      .onConflictDoNothing();

    // 6. Regras de Automação (Dev)
    await db
      .insert(automationRules)
      .values([
        {
          id: 'rule-luz-garagem',
          name: 'Iluminação Noturna por Sensor na Garagem',
          description: 'Acende as lâmpadas da rampa ao detectar presença após às 18h',
          triggerEvent: 'MOTION_GARAGEM',
          condition: 'Horário >= 18:00 OU Horário <= 06:00',
          action: 'Ligar Relé Iluminação Rampa por 180 segundos',
          enabled: true,
        },
        {
          id: 'rule-panico-fechaduras',
          name: 'Bloqueio de Emergência em Pânico',
          description: 'Ao acionar botão SOS na guarita, tranca todos os portões e ativa sirene',
          triggerEvent: 'SOS_TRIGGERED',
          condition: 'Qualquer horário',
          action: 'Travar portões, ligar sirene e disparar notificação push imediata',
          enabled: true,
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
