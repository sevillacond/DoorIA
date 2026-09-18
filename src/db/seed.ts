import 'dotenv/config';
import crypto from 'crypto';
import { db } from './index.ts';
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
} from './schema.ts';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export async function runSeed() {
  console.log('[Seed] Iniciando povoamento estruturado do banco PostgreSQL 16 LTS...');

  try {
    // 1. Condomínio Mestre
    console.log('[Seed] Inserindo condomínio mestre...');
    await db
      .insert(condominiums)
      .values({
        id: 'condo-slz-01',
        name: 'Condomínio Residencial Solar das Palmeiras',
        tradingName: 'Solar das Palmeiras Residencial',
        cnpj: '34.891.022/0001-85',
        address: {
          street: 'Av. dos Holandeses, Quadra 14',
          number: '250',
          complement: 'Torre Única',
          neighborhood: 'Calhau',
          city: 'São Luís',
          state: 'MA',
          zipCode: '65071-380',
        },
        unitsCount: 12,
        blocks: ['Bloco A'],
        floorsCount: 3,
        parkingSpotsCount: 18,
        managementPhone: '(98) 3235-9000',
        emergencyPhone: '(98) 98112-9900',
        email: 'administracao@solardaspalmeiras.com.br',
        sindico: {
          name: 'Henrique Vasconcelos de Alencar',
          document: '482.319.403-12',
          phone: '(98) 98455-2020',
          email: 'sindico@solardaspalmeiras.com.br',
          mandateStart: '2025-03-01',
          mandateEnd: '2027-02-28',
          apartment: '304',
        },
        administrator: {
          name: 'Enlace Administradora de Condomínios & Soluções Imobiliárias',
          cnpj: '18.420.981/0001-30',
          phone: '(98) 3227-4000',
          email: 'contato@enlacegestao.com.br',
          contactPerson: 'Dra. Roberta Fontenele',
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
          standardFee: 480.0,
          reserveFundPercentage: 10,
          latePenaltyPercentage: 2.0,
          monthlyInterestPercentage: 1.0,
          pixKeyType: 'cnpj',
          pixKey: '34.891.022/0001-85',
          bankName: 'Banco do Brasil (001)',
          bankAgency: '1612-8',
          bankAccount: '48.910-2',
        },
        technicalSettings: {
          localServerIp: '192.168.1.100',
          asteriskVersion: 'Asterisk 20.8 LTS Pure (No FreePBX / Vanilla PJSIP)',
          xpeModel: 'Intelbras XPE-3115-IP (Firmware v3.2.0)',
          xpeIp: '192.168.1.150',
          iotGateway: 'NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet (Local-First)',
          iotGatewayIp: '192.168.1.160',
          subnetRange: '192.168.1.0/24',
          publicDomain: 'https://pwa.condominio-solar.com.br',
          stunTurnServer: 'stun:stun.l.google.com:19302',
          asteriskWssPort: 8089,
          allowSelfSignedCerts: true,
          localIpRange: '192.168.1.0/24',
        },
      })
      .onConflictDoNothing();

    // 2. Unidades (101 a 104, 201 a 204, 301 a 304)
    console.log('[Seed] Inserindo 12 unidades habitacionais...');
    const seedUnits = [
      { id: 'u-101', number: '101', block: 'Bloco A', floor: 1, sipExtension: '101', intercomCode: '101', ownerName: 'Carlos Eduardo Mendes', ownerPhone: '(98) 98112-4011', financialStatus: 'em_dia' },
      { id: 'u-102', number: '102', block: 'Bloco A', floor: 1, sipExtension: '102', intercomCode: '102', ownerName: 'Mariana Silveira Castro', ownerPhone: '(98) 98822-1922', financialStatus: 'em_dia' },
      { id: 'u-103', number: '103', block: 'Bloco A', floor: 1, sipExtension: '103', intercomCode: '103', ownerName: 'Roberto Alencar', ownerPhone: '(98) 98401-3310', financialStatus: 'em_dia' },
      { id: 'u-104', number: '104', block: 'Bloco A', floor: 1, sipExtension: '104', intercomCode: '104', ownerName: 'Juliana Barbosa', ownerPhone: '(98) 99105-8844', financialStatus: 'em_dia' },
      { id: 'u-201', number: '201', block: 'Bloco A', floor: 2, sipExtension: '201', intercomCode: '201', ownerName: 'Fernando Henrique Rocha', ownerPhone: '(98) 98220-4499', financialStatus: 'em_dia' },
      { id: 'u-202', number: '202', block: 'Bloco A', floor: 2, sipExtension: '202', intercomCode: '202', ownerName: 'Patrícia Nogueira', ownerPhone: '(98) 98711-2345', financialStatus: 'em_dia' },
      { id: 'u-203', number: '203', block: 'Bloco A', floor: 2, sipExtension: '203', intercomCode: '203', ownerName: 'Lucas Vasconcelos', ownerPhone: '(98) 98199-7700', financialStatus: 'inadimplente' },
      { id: 'u-204', number: '204', block: 'Bloco A', floor: 2, sipExtension: '204', intercomCode: '204', ownerName: 'Camila Fernandes Ribeiro', ownerPhone: '(98) 98310-5566', financialStatus: 'em_dia' },
      { id: 'u-301', number: '301', block: 'Bloco A', floor: 3, sipExtension: '301', intercomCode: '301', ownerName: 'Marcelo Pires de Castro', ownerPhone: '(98) 99201-1188', financialStatus: 'em_dia' },
      { id: 'u-302', number: '302', block: 'Bloco A', floor: 3, sipExtension: '302', intercomCode: '302', ownerName: 'Beatriz Azevedo', ownerPhone: '(98) 98844-3322', financialStatus: 'em_acordo' },
      { id: 'u-303', number: '303', block: 'Bloco A', floor: 3, sipExtension: '303', intercomCode: '303', ownerName: 'Gustavo Henrique Borges', ownerPhone: '(98) 98155-9011', financialStatus: 'em_dia' },
      { id: 'u-304', number: '304', block: 'Bloco A', floor: 3, sipExtension: '304', intercomCode: '304', ownerName: 'Henrique Vasconcelos de Alencar', ownerPhone: '(98) 98455-2020', financialStatus: 'em_dia' },
    ];

    for (const u of seedUnits) {
      await db.insert(units).values(u).onConflictDoNothing();
    }

    // 3. Moradores
    console.log('[Seed] Inserindo moradores...');
    const seedResidents = [
      { id: 'r-101-1', unitId: 'u-101', name: 'Carlos Eduardo Mendes', document: '512.441.893-20', phone: '(98) 98112-4011', email: 'carlos.mendes@gmail.com', isMainContact: true, sipExtension: '101', sipRegistered: true, webrtcSupported: true },
      { id: 'r-102-1', unitId: 'u-102', name: 'Mariana Silveira Castro', document: '614.992.123-45', phone: '(98) 98822-1922', email: 'mariana.silveira@outlook.com', isMainContact: true, sipExtension: '102', sipRegistered: true, webrtcSupported: true },
      { id: 'r-201-1', unitId: 'u-201', name: 'Fernando Henrique Rocha (Síndico)', document: '445.109.876-54', phone: '(98) 98220-4499', email: 'sindico.solar@gmail.com', isMainContact: true, sipExtension: '201', sipRegistered: true, webrtcSupported: true },
      { id: 'r-203-1', unitId: 'u-203', name: 'Lucas Vasconcelos', document: '112.334.556-78', phone: '(98) 98199-7700', email: 'lucas.vasconcelos@gmail.com', isMainContact: true, sipExtension: '203', sipRegistered: true, webrtcSupported: true },
    ];

    for (const r of seedResidents) {
      await db.insert(residents).values(r).onConflictDoNothing();
    }

    // 4. Portões e Relés
    console.log('[Seed] Inserindo portões e relés...');
    const seedGates = [
      { id: 'gate-pedestre', name: 'Portão Social Pedestres (XPE 3115 IP)', type: 'pedestre', relayPin: 1, relayIp: '192.168.1.160', dtmfCode: '*07', isOpen: false, status: 'fechado', sensorState: 'ok' },
      { id: 'gate-garagem', name: 'Portão Garagem Principal (Garen/PPA Fast)', type: 'garagem', relayPin: 2, relayIp: '192.168.1.160', dtmfCode: '*08', isOpen: false, status: 'fechado', sensorState: 'ok' },
      { id: 'gate-servico', name: 'Portão de Serviço e Cargas', type: 'servico', relayPin: 3, relayIp: '192.168.1.160', dtmfCode: '*09', isOpen: false, status: 'fechado', sensorState: 'ok' },
    ];

    for (const g of seedGates) {
      await db.insert(gates).values(g).onConflictDoNothing();
    }

    // 5. Câmeras CFTV
    console.log('[Seed] Inserindo câmeras CFTV...');
    const seedCameras = [
      { id: 'cam-1', name: 'Totem Portaria (XPE 3115 IP)', location: 'Calçada / Entrada Principal', profile: 'ONVIF_Profile_T', streamUrl: 'rtsp://admin:intelbras@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0', webrtcStreamId: 'camera_portaria', ipAddress: '192.168.1.150', manufacturer: 'Intelbras', model: 'XPE 3115 IP Face/RFID', status: 'online', resolution: '1080p Full HD', isXpeIntegrated: true },
      { id: 'cam-2', name: 'Portão de Garagem (LPR Veicular)', location: 'Rampa de Acesso Veicular', profile: 'ONVIF_Profile_T', streamUrl: 'rtsp://admin:intelbras@192.168.1.151:554/cam/realmonitor?channel=1&subtype=0', webrtcStreamId: 'camera_garagem', ipAddress: '192.168.1.151', manufacturer: 'Intelbras', model: 'VIP 3230 B LPR AI', status: 'online', resolution: '1080p Full HD' },
      { id: 'cam-3', name: 'Hall de Entrada & Elevador', location: 'Hall Social Interno', profile: 'ONVIF_Profile_S', streamUrl: 'rtsp://admin:hikvision@192.168.1.152:554/Streaming/Channels/101', webrtcStreamId: 'camera_hall', ipAddress: '192.168.1.152', manufacturer: 'Hikvision', model: 'DS-2CD1123G0-I Dome', status: 'online', resolution: '1080p Full HD' },
      { id: 'cam-4', name: 'Espaço Gourmet & Churrasqueira', location: 'Área de Lazer / Terraço', profile: 'ONVIF_Profile_S', streamUrl: 'rtsp://admin:dahua@192.168.1.153:554/cam/realmonitor?channel=1&subtype=0', webrtcStreamId: 'camera_gourmet', ipAddress: '192.168.1.153', manufacturer: 'Dahua', model: 'IPC-HDBW1230E', status: 'online', resolution: '1080p Full HD' },
    ];

    for (const c of seedCameras) {
      await db.insert(cameraDevices).values(c).onConflictDoNothing();
    }

    // 6. Usuários do Sistema (RBAC) com Hash de Alta Segurança
    console.log('[Seed] Inserindo credenciais e papéis do sistema (RBAC)...');
    const saltAdmin = crypto.randomBytes(16).toString('hex');
    const saltSindico = crypto.randomBytes(16).toString('hex');
    const saltMorador = crypto.randomBytes(16).toString('hex');

    const seedUsers = [
      {
        id: 'usr-superadmin',
        username: 'superadmin',
        passwordHash: hashPassword('admin123', saltAdmin),
        salt: saltAdmin,
        displayName: 'Engenheiro de Telecom / Super Admin',
        email: 'dev.telecom@enlace.ai',
        role: 'super_admin',
        active: true,
        mfaEnabled: true,
      },
      {
        id: 'usr-sindico',
        username: 'sindico',
        passwordHash: hashPassword('sindico123', saltSindico),
        salt: saltSindico,
        displayName: 'Fernando Henrique Rocha (Síndico)',
        email: 'sindico.solar@gmail.com',
        role: 'sindico',
        unitId: 'u-201',
        unitNumber: '201',
        active: true,
        mfaEnabled: true,
      },
      {
        id: 'usr-morador-101',
        username: 'morador101',
        passwordHash: hashPassword('morador123', saltMorador),
        salt: saltMorador,
        displayName: 'Carlos Eduardo Mendes',
        email: 'carlos.mendes@gmail.com',
        role: 'morador',
        unitId: 'u-101',
        unitNumber: '101',
        active: true,
        mfaEnabled: false,
      },
    ];

    for (const u of seedUsers) {
      await db.insert(systemUsers).values(u).onConflictDoNothing();
    }

    // 7. Cobranças Financeiras Iniciais
    console.log('[Seed] Inserindo cobranças financeiras com composição detalhada...');
    const seedBills = [
      {
        id: 'bill-101-0826',
        unitId: 'u-101',
        unitNumber: '101',
        competencia: '08/2026',
        vencimento: new Date('2026-08-10T23:59:59Z'),
        taxaOrdinaria: '440.00',
        taxaExtraordinaria: '0.00',
        fundoReserva: '40.00',
        consumoGasAgua: '0.00',
        valorOriginal: '480.00',
        multa: '0.00',
        juros: '0.00',
        correcao: '0.00',
        desconto: '0.00',
        valorTotal: '480.00',
        diasAtraso: 0,
        status: 'pago',
        pagoEm: new Date('2026-08-08T14:20:00Z'),
        metodoPagamento: 'pix',
        codigoBarras: '00190000090123456789012345678901234567890123',
      },
      {
        id: 'bill-203-0826',
        unitId: 'u-203',
        unitNumber: '203',
        competencia: '08/2026',
        vencimento: new Date('2026-08-10T23:59:59Z'),
        taxaOrdinaria: '440.00',
        taxaExtraordinaria: '0.00',
        fundoReserva: '40.00',
        consumoGasAgua: '0.00',
        valorOriginal: '480.00',
        multa: '9.60',
        juros: '6.40',
        correcao: '2.50',
        desconto: '0.00',
        valorTotal: '498.50',
        diasAtraso: 40,
        status: 'atrasado',
        metodoPagamento: 'boleto',
        codigoBarras: '00190000090987654321098765432109876543210987',
      },
    ];

    for (const b of seedBills) {
      await db.insert(financialBills).values(b).onConflictDoNothing();
    }

    console.log('[Seed] Povoamento concluído com sucesso!');
  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED')) {
      console.log('[Seed] Standby: O PostgreSQL local não está ativo neste ambiente no momento.');
    } else {
      console.error('[Seed] Falha na execução do seed:', error);
    }
  }
}

// Executa diretamente caso seja chamado pelo CLI via `tsx src/db/seed.ts`
if (process.argv[1]?.includes('seed.ts')) {
  runSeed().then(() => process.exit(0));
}
