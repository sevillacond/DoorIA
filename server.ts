import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import type {
  UserRole,
  UserSession,
  Unit,
  Resident,
  Vehicle,
  VisitorInvite,
  PackageDelivery,
  Gate,
  CameraDevice,
  ActiveCall,
  CallLog,
  FinancialBill,
  FinancialSummary,
  Agreement,
  IoTDevice,
  AutomationRule,
  EventBusMessage,
  AuditLogEntry,
  SystemStatus,
  CallRecordingAuditData,
  LprLogEntry,
  DiscoveredCamera,
  CondominiumConfig,
  XpeConfig,
  XpeRelayConfig,
} from './src/types.ts';
import { parametrizeDiscoveredCamera, MANUFACTURER_PROFILES } from './src/services/CameraDiscovery.ts';
import { checkPostgresHealth, initializePostgresSchema, query } from './src/db/postgres.ts';

const PORT = 3000;

// ============================================================================
// BASELINE DE DADOS DO PILOTO (SÃO LUÍS - MA / 12 UNIDADES)
// ============================================================================

const DEFAULT_CONDOMINIUM_CONFIG: CondominiumConfig = {
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
    standardFee: 480.00,
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
    localIpRange: '192.168.1.0/24'
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'Sistema Piloto',
};

let condominiumConfig: CondominiumConfig = JSON.parse(JSON.stringify(DEFAULT_CONDOMINIUM_CONFIG));

const CONDOMINIUM_INFO = {
  get name() { return condominiumConfig.name; },
  get pilotLocation() { return `${condominiumConfig.address.city} - ${condominiumConfig.address.state}, ${condominiumConfig.address.neighborhood}`; },
  get unitsCount() { return condominiumConfig.unitsCount; },
  get blocks() { return condominiumConfig.blocks; },
  get managementPhone() { return condominiumConfig.managementPhone; },
  get localServerIp() { return condominiumConfig.technicalSettings.localServerIp; },
  get asteriskVersion() { return condominiumConfig.technicalSettings.asteriskVersion; },
  get xpeModel() { return condominiumConfig.technicalSettings.xpeModel; },
  get iotGateway() { return condominiumConfig.technicalSettings.iotGateway; },
};

// 12 Unidades (101 a 104, 201 a 204, 301 a 304)
let units: Unit[] = [
  {
    id: 'u-101',
    number: '101',
    block: 'Bloco A',
    floor: 1,
    sipExtension: '101',
    intercomCode: '101',
    ownerName: 'Carlos Eduardo Mendes',
    ownerPhone: '(98) 98112-4011',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-101-1',
        unitId: 'u-101',
        name: 'Carlos Eduardo Mendes',
        document: '512.441.893-20',
        phone: '(98) 98112-4011',
        email: 'carlos.mendes@gmail.com',
        isMainContact: true,
        sipDevice: { extension: '101', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-102',
    number: '102',
    block: 'Bloco A',
    floor: 1,
    sipExtension: '102',
    intercomCode: '102',
    ownerName: 'Mariana Silveira Castro',
    ownerPhone: '(98) 98822-1922',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-102-1',
        unitId: 'u-102',
        name: 'Mariana Silveira Castro',
        document: '614.992.123-45',
        phone: '(98) 98822-1922',
        email: 'mariana.silveira@outlook.com',
        isMainContact: true,
        sipDevice: { extension: '102', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-103',
    number: '103',
    block: 'Bloco A',
    floor: 1,
    sipExtension: '103',
    intercomCode: '103',
    ownerName: 'Roberto Alencar',
    ownerPhone: '(98) 98401-3310',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-103-1',
        unitId: 'u-103',
        name: 'Roberto Alencar',
        document: '321.456.789-00',
        phone: '(98) 98401-3310',
        email: 'roberto.alencar@empresa.com.br',
        isMainContact: true,
        sipDevice: { extension: '103', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-104',
    number: '104',
    block: 'Bloco A',
    floor: 1,
    sipExtension: '104',
    intercomCode: '104',
    ownerName: 'Juliana Barbosa',
    ownerPhone: '(98) 99105-8844',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-104-1',
        unitId: 'u-104',
        name: 'Juliana Barbosa',
        document: '789.123.456-11',
        phone: '(98) 99105-8844',
        email: 'juliana.barbosa@gmail.com',
        isMainContact: true,
        sipDevice: { extension: '104', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-201',
    number: '201',
    block: 'Bloco A',
    floor: 2,
    sipExtension: '201',
    intercomCode: '201',
    ownerName: 'Fernando Henrique Rocha',
    ownerPhone: '(98) 98220-4499',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-201-1',
        unitId: 'u-201',
        name: 'Fernando Henrique Rocha (Síndico)',
        document: '445.109.876-54',
        phone: '(98) 98220-4499',
        email: 'sindico.solar@gmail.com',
        isMainContact: true,
        sipDevice: { extension: '201', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-202',
    number: '202',
    block: 'Bloco A',
    floor: 2,
    sipExtension: '202',
    intercomCode: '202',
    ownerName: 'Camila Vasconcelos',
    ownerPhone: '(98) 98777-1010',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-202-1',
        unitId: 'u-202',
        name: 'Camila Vasconcelos',
        document: '908.234.567-88',
        phone: '(98) 98777-1010',
        email: 'camila.vasconcelos@adv.br',
        isMainContact: true,
        sipDevice: { extension: '202', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-203',
    number: '203',
    block: 'Bloco A',
    floor: 2,
    sipExtension: '203',
    intercomCode: '203',
    ownerName: 'Marcio Azevedo Lima',
    ownerPhone: '(98) 98150-7766',
    financialStatus: 'inadimplente',
    residents: [
      {
        id: 'r-203-1',
        unitId: 'u-203',
        name: 'Marcio Azevedo Lima',
        document: '334.887.654-32',
        phone: '(98) 98150-7766',
        email: 'marcio.azevedo@gmail.com',
        isMainContact: true,
        sipDevice: { extension: '203', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-204',
    number: '204',
    block: 'Bloco A',
    floor: 2,
    sipExtension: '204',
    intercomCode: '204',
    ownerName: 'Tatiana Gusmão',
    ownerPhone: '(98) 98330-9900',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-204-1',
        unitId: 'u-204',
        name: 'Tatiana Gusmão',
        document: '123.654.789-99',
        phone: '(98) 98330-9900',
        email: 'tatiana.gusmao@gmail.com',
        isMainContact: true,
        sipDevice: { extension: '204', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-301',
    number: '301',
    block: 'Bloco A',
    floor: 3,
    sipExtension: '301',
    intercomCode: '301',
    ownerName: 'Rodrigo Fonseca',
    ownerPhone: '(98) 98199-5522',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-301-1',
        unitId: 'u-301',
        name: 'Rodrigo Fonseca',
        document: '876.543.210-44',
        phone: '(98) 98199-5522',
        email: 'rodrigo.fonseca@eng.br',
        isMainContact: true,
        sipDevice: { extension: '301', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-302',
    number: '302',
    block: 'Bloco A',
    floor: 3,
    sipExtension: '302',
    intercomCode: '302',
    ownerName: 'Beatriz Nogueira',
    ownerPhone: '(98) 98888-2144',
    financialStatus: 'em_acordo',
    residents: [
      {
        id: 'r-302-1',
        unitId: 'u-302',
        name: 'Beatriz Nogueira',
        document: '654.987.321-00',
        phone: '(98) 98888-2144',
        email: 'beatriz.nogueira@gmail.com',
        isMainContact: true,
        sipDevice: { extension: '302', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-303',
    number: '303',
    block: 'Bloco A',
    floor: 3,
    sipExtension: '303',
    intercomCode: '303',
    ownerName: 'Gustavo Pinheiro',
    ownerPhone: '(98) 98444-1234',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-303-1',
        unitId: 'u-303',
        name: 'Gustavo Pinheiro',
        document: '432.109.876-77',
        phone: '(98) 98444-1234',
        email: 'gustavo.pinheiro@gmail.com',
        isMainContact: true,
        sipDevice: { extension: '303', registered: true, webrtcSupported: true },
      },
    ],
  },
  {
    id: 'u-304',
    number: '304',
    block: 'Bloco A',
    floor: 3,
    sipExtension: '304',
    intercomCode: '304',
    ownerName: 'Luciana Meireles',
    ownerPhone: '(98) 98111-9988',
    financialStatus: 'em_dia',
    residents: [
      {
        id: 'r-304-1',
        unitId: 'u-304',
        name: 'Luciana Meireles',
        document: '210.987.654-88',
        phone: '(98) 98111-9988',
        email: 'luciana.meireles@uol.com.br',
        isMainContact: true,
        sipDevice: { extension: '304', registered: true, webrtcSupported: true },
      },
    ],
  },
];

let gates: Gate[] = [
  {
    id: 'gate-pedestre',
    name: 'Portão Pedestre Social',
    type: 'pedestre',
    dtmfCode: '*07',
    status: 'fechado',
    sensorState: 'ok',
    relayPin: 17,
  },
  {
    id: 'gate-garagem',
    name: 'Portão Garagem Veicular',
    type: 'garagem',
    dtmfCode: '*08',
    status: 'fechado',
    sensorState: 'ok',
    relayPin: 27,
  },
];

let cameras: CameraDevice[] = [
  {
    id: 'cam-01',
    name: 'Câmera XPE Portaria Social',
    location: 'Portaria Frontal (Integrada ao XPE-3115-IP)',
    profile: 'ONVIF_Profile_T',
    rtspUrl: 'rtsp://192.168.1.150:554/cam/realmonitor?channel=1&subtype=0',
    webrtcStreamUrl: '/api/v1/cameras/cam-01/stream',
    resolution: '1080p @ 30fps (H.264 Baseline)',
    status: 'online',
    isXpeIntegrated: true,
  },
  {
    id: 'cam-02',
    name: 'Câmera Portão Garagem',
    location: 'Acesso Veicular',
    profile: 'ONVIF_Profile_T',
    rtspUrl: 'rtsp://192.168.1.151:554/live/ch0',
    webrtcStreamUrl: '/api/v1/cameras/cam-02/stream',
    resolution: '1080p @ 30fps',
    status: 'online',
  },
  {
    id: 'cam-03',
    name: 'Câmera Hall dos Elevadores',
    location: 'Térreo / Hall Social',
    profile: 'ONVIF_Profile_S',
    rtspUrl: 'rtsp://192.168.1.152:554/live/ch0',
    webrtcStreamUrl: '/api/v1/cameras/cam-03/stream',
    resolution: '1080p @ 25fps',
    status: 'online',
  },
  {
    id: 'cam-04',
    name: 'Câmera Espaço Gourmet & Lazer',
    location: 'Área Comum Coberta',
    profile: 'ONVIF_Profile_S',
    rtspUrl: 'rtsp://192.168.1.153:554/live/ch0',
    webrtcStreamUrl: '/api/v1/cameras/cam-04/stream',
    resolution: '720p @ 30fps',
    status: 'online',
  },
];

let discoveredCamerasPool: DiscoveredCamera[] = [
  parametrizeDiscoveredCamera(
    {
      ip: '192.168.1.150',
      mac: '00:1A:3F:8A:2C:11',
      manufacturerHint: 'Intelbras',
      modelHint: 'Intelbras XPE 3115-IP (Câmera Integrada)',
      port: 80,
      discoveryMethod: 'WS-Discovery',
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: '192.168.1.160',
      mac: '4C:11:BF:12:90:AB',
      manufacturerHint: 'Intelbras',
      modelHint: 'Intelbras VIP 3230 B (Bullet Full HD G4)',
      port: 80,
      discoveryMethod: 'WS-Discovery',
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: '192.168.1.161',
      mac: '10:12:FB:CC:34:9A',
      manufacturerHint: 'Hikvision',
      modelHint: 'Hikvision DS-2CD2043G2-I (AcuSense 4MP LPR)',
      port: 80,
      discoveryMethod: 'WS-Discovery',
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: '192.168.1.162',
      mac: '3C:EF:8C:55:12:33',
      manufacturerHint: 'Dahua',
      modelHint: 'Dahua IPC-HFW1230S (Starlight 2MP)',
      port: 80,
      discoveryMethod: 'SSDP',
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: '192.168.1.163',
      mac: '00:40:8C:77:43:10',
      manufacturerHint: 'Axis',
      modelHint: 'Axis M1065-L (PIR + Microfone)',
      port: 80,
      discoveryMethod: 'WS-Discovery',
    },
    cameras
  ),
  parametrizeDiscoveredCamera(
    {
      ip: '192.168.1.164',
      mac: '34:CD:6D:88:99:AA',
      manufacturerHint: 'Uniview',
      modelHint: 'Uniview IPC2122LR3-PF40M-D',
      port: 80,
      discoveryMethod: 'ARP/OUI Scan',
    },
    cameras
  ),
];

let vehicles: Vehicle[] = [
  { id: 'v-1', unitId: 'u-101', brand: 'Toyota', model: 'Corolla', plate: 'PTA-4A12', color: 'Prata', parkingSpot: 'Vaga 01' },
  { id: 'v-2', unitId: 'u-102', brand: 'Honda', model: 'HR-V', plate: 'ROX-8B90', color: 'Preto', parkingSpot: 'Vaga 02' },
  { id: 'v-3', unitId: 'u-201', brand: 'Jeep', model: 'Compass', plate: 'SLZ-2C34', color: 'Branco', parkingSpot: 'Vaga 05' },
  { id: 'v-4', unitId: 'u-203', brand: 'Hyundai', model: 'HB20', plate: 'NMS-5511', color: 'Cinza', parkingSpot: 'Vaga 07' },
  { id: 'v-5', unitId: 'u-301', brand: 'Volkswagen', model: 'Nivus', plate: 'MAO-9J88', color: 'Azul', parkingSpot: 'Vaga 09' },
];

let visitorInvites: VisitorInvite[] = [
  {
    id: 'inv-1',
    unitId: 'u-101',
    visitorName: 'Ana Paula Ferreira (Personal)',
    type: 'prestador',
    qrToken: 'door_qr_sec_991823a1',
    validFrom: new Date(Date.now() - 3600000).toISOString(),
    validUntil: new Date(Date.now() + 86400000).toISOString(),
    status: 'ativo',
    entryCount: 1,
  },
  {
    id: 'inv-2',
    unitId: 'u-201',
    visitorName: 'Lucas Lima (Festa de Aniversário)',
    type: 'visitante',
    qrToken: 'door_qr_sec_772199f3',
    validFrom: new Date(Date.now() - 7200000).toISOString(),
    validUntil: new Date(Date.now() + 18000000).toISOString(),
    status: 'ativo',
    entryCount: 0,
  },
];

let packageDeliveries: PackageDelivery[] = [
  {
    id: 'pkg-1',
    unitId: 'u-101',
    trackingCode: 'BR-MELI-882910',
    courier: 'Mercado Livre',
    description: 'Caixa de encomendas pequenas (Eletrônico)',
    receivedAt: new Date(Date.now() - 14400000).toISOString(),
    status: 'aguardando_retirada',
    pickupCode: '8912',
  },
  {
    id: 'pkg-2',
    unitId: 'u-201',
    trackingCode: 'AMZ-BR-102934',
    courier: 'Amazon Logística',
    description: 'Pacote padrão (Livros e utilidades)',
    receivedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'entregue',
    pickupCode: '4431',
    pickedUpAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'pkg-3',
    unitId: 'u-203',
    trackingCode: 'CORREIOS-QM9911',
    courier: 'Correios Sedex',
    description: 'Envelope documento com aviso de recebimento',
    receivedAt: new Date(Date.now() - 28800000).toISOString(),
    status: 'aguardando_retirada',
    pickupCode: '7230',
  },
];

let lprLogs: LprLogEntry[] = [
  {
    id: 'lpr-1',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    plate: 'PTA-4A12',
    confidence: 98.6,
    cameraName: 'Câmera Portão Garagem (cam-02)',
    matchedVehicle: vehicles[0],
    matchedUnitNumber: '101',
    action: 'ABERTURA_AUTOMATICA',
    reason: 'Veículo cadastrado na Unidade 101. Vaga 01. Policy Engine liberou acesso.',
  },
  {
    id: 'lpr-2',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    plate: 'ROX-8B90',
    confidence: 97.4,
    cameraName: 'Câmera Portão Garagem (cam-02)',
    matchedVehicle: vehicles[1],
    matchedUnitNumber: '102',
    action: 'ABERTURA_AUTOMATICA',
    reason: 'Veículo cadastrado na Unidade 102. Vaga 02. Policy Engine liberou acesso.',
  },
  {
    id: 'lpr-3',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    plate: 'ABC-1234',
    confidence: 94.2,
    cameraName: 'Câmera Portão Garagem (cam-02)',
    action: 'NEGADO_DESCONHECIDO',
    reason: 'Placa não cadastrada no condomínio Solar das Palmeiras. Acesso retido.',
  },
];

// Boletos Financeiros com Cálculo Conforme Seção 23 do PRD (Multa 2% + Juros 1% a.m.)
let financialBills: FinancialBill[] = [
  // Apto 101 - Em dia
  {
    id: 'b-101-09',
    unitId: 'u-101',
    unitNumber: '101',
    competencia: '09/2026',
    vencimento: '2026-09-10T23:59:59.000Z',
    valorOriginal: 650.0,
    diasAtraso: 0,
    multa: 0,
    juros: 0,
    correcao: 0,
    valorTotal: 650.0,
    status: 'pago',
    pagoEm: '2026-09-08T14:32:00.000Z',
    codigoBarras: '23793.38128 60000.123456 12000.650009 1 98760000065000',
  },
  // Apto 201 - Em dia
  {
    id: 'b-201-09',
    unitId: 'u-201',
    unitNumber: '201',
    competencia: '09/2026',
    vencimento: '2026-09-10T23:59:59.000Z',
    valorOriginal: 650.0,
    diasAtraso: 0,
    multa: 0,
    juros: 0,
    correcao: 0,
    valorTotal: 650.0,
    status: 'pago',
    pagoEm: '2026-09-09T10:15:00.000Z',
    codigoBarras: '23793.38128 60000.123457 12000.650009 1 98760000065000',
  },
  // Apto 203 - Inadimplente (competências 07/2026 e 08/2026)
  {
    id: 'b-203-07',
    unitId: 'u-203',
    unitNumber: '203',
    competencia: '07/2026',
    vencimento: '2026-07-10T23:59:59.000Z',
    valorOriginal: 650.0,
    diasAtraso: 64,
    multa: 13.0, // 2%
    juros: 13.87, // 1% ao mês proporcional (64 dias)
    correcao: 3.25,
    valorTotal: 680.12,
    status: 'atrasado',
    codigoBarras: '23793.38128 60000.123458 12000.650009 1 98760000068012',
  },
  {
    id: 'b-203-08',
    unitId: 'u-203',
    unitNumber: '203',
    competencia: '08/2026',
    vencimento: '2026-08-10T23:59:59.000Z',
    valorOriginal: 650.0,
    diasAtraso: 33,
    multa: 13.0, // 2%
    juros: 7.15, // 1% ao mês proporcional (33 dias)
    correcao: 1.8,
    valorTotal: 671.95,
    status: 'atrasado',
    codigoBarras: '23793.38128 60000.123459 12000.650009 1 98760000067195',
  },
  {
    id: 'b-203-09',
    unitId: 'u-203',
    unitNumber: '203',
    competencia: '09/2026',
    vencimento: '2026-09-10T23:59:59.000Z',
    valorOriginal: 650.0,
    diasAtraso: 2,
    multa: 13.0,
    juros: 0.43,
    correcao: 0,
    valorTotal: 663.43,
    status: 'atrasado',
    codigoBarras: '23793.38128 60000.123460 12000.650009 1 98760000066343',
  },
  // Apto 302 - Em acordo formalizado
  {
    id: 'b-302-09',
    unitId: 'u-302',
    unitNumber: '302',
    competencia: '09/2026',
    vencimento: '2026-09-15T23:59:59.000Z',
    valorOriginal: 650.0,
    diasAtraso: 0,
    multa: 0,
    juros: 0,
    correcao: 0,
    valorTotal: 650.0,
    status: 'em_acordo',
    codigoBarras: '23793.38128 60000.123461 12000.650009 1 98760000065000',
  },
];

let agreements: Agreement[] = [
  {
    id: 'agr-302-1',
    unitId: 'u-302',
    unitNumber: '302',
    totalOriginal: 2600.0,
    totalNegociado: 2400.0,
    entrada: 600.0,
    parcelasTotal: 6,
    parcelasPagas: 2,
    valorParcela: 300.0,
    diaVencimento: 15,
    dataCriacao: '2026-07-01T10:00:00.000Z',
    status: 'ativo',
  },
];

let iotDevices: IoTDevice[] = [
  {
    id: 'iot-1',
    name: 'Iluminação Frontal Portaria',
    type: 'iluminacao',
    protocol: 'zigbee_3_0',
    gateway: 'NovaDigital_HNZ_CB3',
    state: 'desligado',
    online: true,
    location: 'Acesso Social Externo',
  },
  {
    id: 'iot-2',
    name: 'Sensor de Presença Garagem',
    type: 'sensor_presenca',
    protocol: 'zigbee_3_0',
    gateway: 'NovaDigital_HNZ_CB3',
    state: 'sem_movimento',
    batteryLevel: 94,
    online: true,
    location: 'Corredor Garagem Veicular',
  },
  {
    id: 'iot-3',
    name: 'Relé Acionamento Portão Pedestre',
    type: 'rele',
    protocol: 'ethernet',
    gateway: 'NovaDigital_HNZ_CB3',
    state: 'desligado',
    online: true,
    location: 'Quadro de Automação Térreo',
  },
];

let automationRules: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Iluminação Noturna em Chamada XPE',
    description: 'Quando o botão do XPE for pressionado, acender iluminação frontal por 5 minutos.',
    enabled: true,
    triggerEvent: 'CALL_STARTED',
    condition: 'Horário entre 18:00 e 06:00',
    action: 'Ligar Iluminação Frontal Portaria por 300 segundos',
    lastExecutedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'rule-2',
    name: 'Sensor de Garagem Noturno',
    description: 'Se movimento for detectado na garagem após as 19h, acender refletores de apoio.',
    enabled: true,
    triggerEvent: 'MOTION_DETECTED',
    condition: 'Horário > 19:00',
    action: 'Ligar iluminação garagem por 180s',
    lastExecutedAt: new Date(Date.now() - 12000000).toISOString(),
  },
];

// Fila de Eventos & Logs de Auditoria Imutáveis
let eventBusHistory: EventBusMessage[] = [
  {
    id: 'evt-1',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    type: 'CALL_STARTED',
    source: 'xpe_3115_ip',
    payload: { unitNumber: '101', purpose: 'entrega' },
    audited: true,
  },
  {
    id: 'evt-2',
    timestamp: new Date(Date.now() - 14380000).toISOString(),
    type: 'CALL_ANSWERED',
    source: 'pjsip_webrtc',
    payload: { unitNumber: '101', endpoint: 'WebPhone-101' },
    audited: true,
  },
  {
    id: 'evt-3',
    timestamp: new Date(Date.now() - 14350000).toISOString(),
    type: 'ACCESS_GRANTED',
    source: 'policy_engine',
    payload: { gate: 'pedestre', dtmf: '*07', unitNumber: '101' },
    audited: true,
  },
  {
    id: 'evt-4',
    timestamp: new Date(Date.now() - 14348000).toISOString(),
    type: 'GATE_OPENED',
    source: 'gate_controller',
    payload: { gateId: 'gate-pedestre', authorizedBy: 'Carlos Eduardo Mendes' },
    audited: true,
  },
];

let auditLogs: AuditLogEntry[] = [
  {
    id: 'aud-1',
    timestamp: new Date(Date.now() - 14350000).toISOString(),
    actor: 'Carlos Eduardo Mendes (Apto 101)',
    role: 'morador',
    action: 'ABERTURA_PORTAO_DTMF',
    target: 'Portão Pedestre Social',
    status: 'PERMITIDO',
    ipAddress: '192.168.1.101',
    dtmfCommand: '*07',
    details: { callId: 'call-sample-1', duration: 32, validatedByPolicyEngine: true },
  },
  {
    id: 'aud-2',
    timestamp: new Date(Date.now() - 28800000).toISOString(),
    actor: 'Dispositivo Externo IP',
    role: 'desconhecido',
    action: 'COMANDO_DTMF_SEM_CHAMADA',
    target: 'Portão Garagem Veicular',
    status: 'NEGADO',
    reason: 'Tentativa de acionamento DTMF fora de sessão de chamada ativa no Asterisk.',
    ipAddress: '192.168.1.205',
    dtmfCommand: '*08',
    details: { blocked: true, policyViolated: 'CALL_ACTIVE_MANDATORY' },
  },
];

let callHistory: CallLog[] = [
  {
    id: 'call-h-1',
    origin: 'xpe_3115_ip',
    unitNumber: '101',
    purpose: 'entrega',
    startedAt: new Date(Date.now() - 14400000).toISOString(),
    durationSeconds: 32,
    status: 'atendida',
    answeredBy: 'Carlos Eduardo Mendes (WebPhone)',
    gateOpened: 'Portão Pedestre Social (*07)',
    hasRecording: true,
    recordingId: 'rec-sha256-88ab19c',
  },
  {
    id: 'call-h-2',
    origin: 'qr_virtual_intercom',
    unitNumber: '201',
    purpose: 'visitante',
    startedAt: new Date(Date.now() - 21600000).toISOString(),
    durationSeconds: 45,
    status: 'atendida',
    answeredBy: 'Fernando Rocha (WebPhone)',
    gateOpened: 'Portão Pedestre Social (*07)',
    hasRecording: true,
    recordingId: 'rec-sha256-44ec99a',
  },
];

// Chamada ativa no simulador (se houver)
let activeCall: ActiveCall | null = null;

// ============================================================================
// POLICY ENGINE CENTRALIZADO (RBAC / ABAC)
// ============================================================================

interface PolicyEvaluationRequest {
  actor: {
    id: string;
    role: UserRole;
    unitNumber?: string;
  };
  action: 'ABRIR_PORTAO' | 'VER_GRAVACAO' | 'ACESSAR_CAMERA' | 'CONSULTAR_FINANCEIRO' | 'CONFIGURAR_SISTEMA';
  resource: {
    target: string;
    targetUnitNumber?: string;
    dtmfCommand?: string;
  };
  context: {
    callActive?: boolean;
    activeCallTargetUnit?: string;
    ipAddress?: string;
  };
}

class PolicyEngine {
  public static evaluate(req: PolicyEvaluationRequest): { allowed: boolean; reason?: string } {
    const { actor, action, resource, context } = req;

    // Regra 1: Abrir portão por DTMF ou comando durante chamada
    if (action === 'ABRIR_PORTAO') {
      // Se for morador: só pode abrir se houver chamada ativa endereçada à unidade dele OU se for o síndico/super_admin
      if (actor.role === 'morador') {
        if (!context.callActive) {
          return { allowed: false, reason: 'Política de Segurança: Abertura por morador só é autorizada durante chamada ativa.' };
        }
        if (context.activeCallTargetUnit !== actor.unitNumber) {
          return { allowed: false, reason: 'Política de Isolamento: Morador não tem permissão para abrir portão para outra unidade.' };
        }
        return { allowed: true };
      }

      if (['sindico', 'operador', 'admin_condominio', 'super_admin'].includes(actor.role)) {
        return { allowed: true };
      }

      return { allowed: false, reason: 'Papel sem privilégio de acionamento de portão.' };
    }

    // Regra 2: Ver gravações brutas de atendimento (Seção 12.3 do PRD)
    // "Moradores podem visualizar histórico; não podem reproduzir gravações; não podem baixar gravações"
    if (action === 'VER_GRAVACAO') {
      if (actor.role === 'morador') {
        return {
          allowed: false,
          reason: 'Violação da Regra de Ouro #10: Morador tem acesso ao histórico de logs, mas NÃO tem acesso à mídia bruta das gravações.',
        };
      }
      if (['sindico', 'admin_condominio', 'super_admin'].includes(actor.role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Acesso a gravações restrito a administradores e auditores.' };
    }

    // Regra 3: Consultar financeiro
    if (action === 'CONSULTAR_FINANCEIRO') {
      if (actor.role === 'morador') {
        if (resource.targetUnitNumber && resource.targetUnitNumber !== actor.unitNumber) {
          return { allowed: false, reason: 'Isolamento de Dados: Moradores só podem visualizar informações financeiras de sua própria unidade.' };
        }
        return { allowed: true };
      }
      if (['sindico', 'admin_condominio', 'super_admin'].includes(actor.role)) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Acesso financeiro não autorizado.' };
    }

    // Regra 4: Acessar câmeras
    if (action === 'ACESSAR_CAMERA') {
      // Câmeras de áreas comuns são autorizadas para moradores e síndicos
      return { allowed: true };
    }

    return { allowed: true };
  }
}

// ============================================================================
// EVENT BUS CENTRALIZADO
// ============================================================================

function publishEvent(type: EventBusMessage['type'], source: string, payload: Record<string, unknown>) {
  const event: EventBusMessage = {
    id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type,
    source,
    payload,
    audited: true,
  };

  eventBusHistory.unshift(event);
  if (eventBusHistory.length > 50) eventBusHistory.pop();

  // Executar automações correspondentes
  automationRules.forEach((rule) => {
    if (rule.enabled && rule.triggerEvent === type) {
      rule.lastExecutedAt = new Date().toISOString();
      if (rule.id === 'rule-1') {
        const lamp = iotDevices.find((d) => d.id === 'iot-1');
        if (lamp) lamp.state = 'ligado';
      }
    }
  });

  return event;
}

function logAudit(
  actor: string,
  role: string,
  action: string,
  target: string,
  status: 'PERMITIDO' | 'NEGADO' | 'ALERTA',
  details: Record<string, unknown>,
  reason?: string,
  dtmfCommand?: string
) {
  const log: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actor,
    role,
    action,
    target,
    status,
    reason,
    ipAddress: '192.168.1.100',
    dtmfCommand,
    details,
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 100) auditLogs.pop();

  // Assinatura criptográfica SHA-256 e gravação no PostgreSQL puro local (porta 5432)
  try {
    const rawPayload = `${log.id}|${log.timestamp}|${actor}|${action}|${status}|${dtmfCommand || ''}|${JSON.stringify(details)}`;
    const sha256Hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    query(
      `INSERT INTO audit_logs (id, timestamp, actor, role, action, target, status, reason, ip_address, dtmf_command, details, sha256_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [
        log.id,
        log.timestamp,
        log.actor,
        log.role,
        log.action,
        log.target || '',
        log.status,
        log.reason || '',
        log.ipAddress,
        log.dtmfCommand || null,
        JSON.stringify(log.details || {}),
        sha256Hash,
      ]
    ).catch(() => {
      // Standby silencioso caso o PostgreSQL local esteja em inicialização
    });
  } catch {
    // Continua sem falhas para manter a alta disponibilidade da portaria
  }

  return log;
}

// ============================================================================
// MAIA - ORQUESTRADOR DE INTELIGÊNCIA ARTIFICIAL (GEMINI SERVER-SIDE + FALLBACK)
// ============================================================================

let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('[MaIA] Falha na inicialização do GoogleGenAI SDK:', err);
  }
}

// Ferramentas da MaIA autorizadas
const MAIA_SYSTEM_PROMPT = `Você é a MaIA (Módulo de Automação e Inteligência Autônoma), a inteligência operacional do Enlace-DoorIA no condomínio piloto em São Luís - MA (12 unidades).
Diretrizes Absolutas:
1. Você opera sob estrito RBAC/Policy Engine. Você NUNCA executa comandos SQL diretamente nem comanda relés sem passar pela validação de permissão.
2. Seu tom é profissional, calmo, preciso, técnico e em português brasileiro.
3. Se o usuário for Morador, forneça informações APENAS sobre a unidade dele.
4. Para abrir portões, exija sempre confirmação explícita e verifique se há chamada ativa ou perfil de síndico/operador.
5. Você compreende os protocolos: Asterisk PJSIP, Intelbras XPE-3115-IP, DTMF *07 (pedestre) e *08 (garagem), Zigbee NovaDigital HNZ-CB3, câmeras ONVIF Profile T/S.`;

async function executeMaiaPrompt(
  prompt: string,
  user: UserSession
): Promise<{ reply: string; toolCallsExecuted: Array<{ toolName: string; params: any; result: any; authorized: boolean }> }> {
  const executedTools: Array<{ toolName: string; params: any; result: any; authorized: boolean }> = [];

  // Se Gemini estiver disponível, utilizamos geração com function calling estruturado
  if (aiClient && process.env.GEMINI_API_KEY) {
    try {
      const geminiPromise = aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: `${MAIA_SYSTEM_PROMPT}\nUsuário atual: Nome="${user.name}", Perfil="${user.role}", Unidade="${user.unitNumber || 'Geral'}".`,
          temperature: 0.3,
          tools: [{
            functionDeclarations: [
              {
                name: 'abrir_portao',
                description: 'Abre o portão (pedestre ou garagem). Exige confirmação do morador ou síndico.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    portao: { type: Type.STRING, enum: ['pedestre', 'garagem'], description: 'Qual portão abrir' }
                  },
                  required: ['portao']
                }
              },
              {
                name: 'consultar_unidade',
                description: 'Consulta informações de moradores e dados de uma unidade específica.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    unidade: { type: Type.STRING, description: 'Número da unidade para consulta' }
                  },
                  required: ['unidade']
                }
              },
              {
                name: 'consultar_financeiro',
                description: 'Consulta status de faturas e inadimplência do usuário atual ou geral (se síndico).',
                parameters: {
                  type: Type.OBJECT,
                  properties: {}
                }
              }
            ]
          }]
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido na resposta do modelo remoto')), 12000)
      );

      const response = await Promise.race([geminiPromise, timeoutPromise]);
      let finalReply = response.text || 'MaIA operacional. Solicitação processada com sucesso.';

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === 'abrir_portao') {
          const portao = call.args?.portao as string;
          if (user.role === 'morador' && !activeCall) {
            finalReply = `[MaIA Policy Engine] Solicitação Negada: Conforme o Master PRD, moradores só podem abrir portões via DTMF durante uma chamada ativa.`;
            logAudit(user.name, user.role, 'TENTATIVA_ABERTURA_VIA_MAIA_SEM_CHAMADA', 'Portões', 'NEGADO', { prompt });
          } else {
            finalReply = `[MaIA Portaria] Acionamento de portão autorizado para o perfil ${user.role}. Abrindo portão de ${portao}.`;
            executedTools.push({
              toolName: 'abrir_portao',
              params: { gate: portao },
              result: { status: 'aberto_por_5_segundos' },
              authorized: true,
            });
          }
        } else if (call.name === 'consultar_unidade') {
          const unidade = call.args?.unidade as string;
          const matchedUnit = units.find((u) => u.number === unidade);
          if (matchedUnit) {
            if (user.role === 'morador' && user.unitNumber !== matchedUnit.number) {
              finalReply = `[MaIA Segurança] Acesso restrito. Como morador da Unidade ${user.unitNumber}, você não tem permissão para consultar os dados da Unidade ${matchedUnit.number}.`;
            } else {
              finalReply = `[MaIA] Unidade ${matchedUnit.number} (${matchedUnit.block}): Proprietário ${matchedUnit.ownerName}, ramal SIP ${matchedUnit.sipExtension}. Situação financeira: ${matchedUnit.financialStatus.toUpperCase()}.`;
              executedTools.push({
                toolName: 'consultar_unidade',
                params: { unitNumber: matchedUnit.number },
                result: { unit: matchedUnit },
                authorized: true,
              });
            }
          } else {
            finalReply = `[MaIA] Unidade ${unidade} não encontrada.`;
          }
        } else if (call.name === 'consultar_financeiro') {
          if (user.role === 'morador') {
            const myBills = financialBills.filter((b) => b.unitNumber === user.unitNumber);
            const pendentes = myBills.filter((b) => b.status === 'atrasado');
            if (pendentes.length > 0) {
              const total = pendentes.reduce((acc, curr) => acc + curr.valorTotal, 0);
              finalReply = `[MaIA Financeiro] Unidade ${user.unitNumber}: Constam ${pendentes.length} taxa(s) condominial(is) pendente(s) totalizando R$ ${total.toFixed(2)}.`;
            } else {
              finalReply = `[MaIA Financeiro] Unidade ${user.unitNumber}: Suas taxas condominiais estão 100% em dia! O próximo vencimento é em 10/10/2026.`;
            }
          } else {
            const atrasadas = financialBills.filter((b) => b.status === 'atrasado');
            const total = atrasadas.reduce((acc, curr) => acc + curr.valorTotal, 0);
            finalReply = `[MaIA Relatório Síndico] O condomínio registra atualmente R$ ${total.toFixed(2)} em recebíveis em atraso. A inadimplência está concentrada na unidade 203.`;
          }
        }
      }

      return {
        reply: finalReply,
        toolCallsExecuted: executedTools,
      };
    } catch (apiError: any) {
      console.warn('[MaIA] Falha ou timeout no provedor principal Gemini, ativando Fallback Local-First:', apiError?.message || apiError);
    }
  }

  // MODO FALLBACK LOCAL-FIRST (Garante que a portaria e a MaIA nunca fiquem mudas)
  const lower = prompt.toLowerCase();
  let fallbackReply = '';

  if (lower.includes('unidade') || lower.includes('morador') || lower.includes('apartamento')) {
    const matchedUnit = units.find((u) => lower.includes(u.number));
    if (matchedUnit) {
      if (user.role === 'morador' && user.unitNumber !== matchedUnit.number) {
        fallbackReply = `[MaIA Segurança] Acesso restrito. Como morador da Unidade ${user.unitNumber}, você não tem permissão para consultar os dados da Unidade ${matchedUnit.number}.`;
      } else {
        fallbackReply = `[MaIA Local] Unidade ${matchedUnit.number} (${matchedUnit.block}): Proprietário ${matchedUnit.ownerName}, ramal SIP ${matchedUnit.sipExtension}. Situação financeira: ${matchedUnit.financialStatus.toUpperCase()}.`;
        executedTools.push({
          toolName: 'consultar_unidade',
          params: { unitNumber: matchedUnit.number },
          result: { unit: matchedUnit },
          authorized: true,
        });
      }
    } else {
      fallbackReply = `[MaIA Local] O Condomínio Solar das Palmeiras possui 12 unidades distribuídas no Bloco A (101 a 104, 201 a 204, 301 a 304). Qual unidade deseja consultar?`;
    }
  } else if (lower.includes('inadimpl') || lower.includes('boleto') || lower.includes('financeiro') || lower.includes('contas')) {
    if (user.role === 'morador') {
      const myBills = financialBills.filter((b) => b.unitNumber === user.unitNumber);
      const pendentes = myBills.filter((b) => b.status === 'atrasado');
      if (pendentes.length > 0) {
        const total = pendentes.reduce((acc, curr) => acc + curr.valorTotal, 0);
        fallbackReply = `[MaIA Financeiro] Unidade ${user.unitNumber}: Constam ${pendentes.length} taxa(s) condominial(is) pendente(s) totalizando R$ ${total.toFixed(2)} (já calculado com multa de 2% e juros de 1% a.m.). Deseja simular um acordo de parcelamento?`;
      } else {
        fallbackReply = `[MaIA Financeiro] Unidade ${user.unitNumber}: Suas taxas condominiais estão 100% em dia! O próximo vencimento é em 10/10/2026.`;
      }
    } else {
      const atrasadas = financialBills.filter((b) => b.status === 'atrasado');
      const total = atrasadas.reduce((acc, curr) => acc + curr.valorTotal, 0);
      fallbackReply = `[MaIA Relatório Síndico] O condomínio registra atualmente R$ ${total.toFixed(2)} em recebíveis em atraso, concentrados principalmente na Unidade 203. A Unidade 302 mantém um acordo de parcelamento ativo e em dia.`;
    }
  } else if (lower.includes('abrir') || lower.includes('portão') || lower.includes('garagem') || lower.includes('pedestre')) {
    if (user.role === 'morador' && !activeCall) {
      fallbackReply = `[MaIA Policy Engine] Solicitação Negada: Conforme o Master PRD (Regra de Ouro #4 e #11), moradores só podem abrir portões via DTMF (*07/*08) ou WebPhone durante uma sessão de chamada ativa de atendimento.`;
      logAudit(user.name, user.role, 'TENTATIVA_ABERTURA_VIA_MAIA_SEM_CHAMADA', 'Portões', 'NEGADO', { prompt });
    } else {
      fallbackReply = `[MaIA Portaria] Acionamento de portão autorizado para o perfil ${user.role}. Comando DTMF *07 (Pedestre) ou *08 (Garagem) validado com sucesso.`;
      executedTools.push({
        toolName: 'abrir_portao',
        params: { gate: lower.includes('garagem') ? 'garagem' : 'pedestre' },
        result: { status: 'aberto_por_5_segundos' },
        authorized: true,
      });
    }
  } else if (lower.includes('camera') || lower.includes('câmera') || lower.includes('xpe')) {
    fallbackReply = `[MaIA Monitoramento] Todas as 4 câmeras IP ONVIF (Portaria XPE, Garagem, Hall e Espaço Gourmet) estão operando normalmente na LAN local com codec H.264 e perfil Profile T/S.`;
  } else if (lower.includes('asterisk') || lower.includes('status') || lower.includes('rede')) {
    fallbackReply = `[MaIA Infraestrutura] Núcleo Asterisk 20.8 LTS operacional na LAN (192.168.1.100) com PJSIP e WebRTC ativos. Totem Intelbras XPE-3115-IP e Gateway NovaDigital Zigbee 3.0 Ethernet 100% online em modo Local-First.`;
  } else {
    fallbackReply = `[MaIA Autônoma] Olá, ${user.name}. Sou a MaIA, inteligência operacional do Enlace-DoorIA. Posso auxiliar no atendimento do XPE, consulta de visitantes, encomendas, histórico de portaria, status dos portões e conferência de boletos e taxas condominiais. Como posso ajudar?`;
  }

  return {
    reply: fallbackReply,
    toolCallsExecuted: executedTools,
  };
}

// ============================================================================
// EXPRESS SERVER & ROTAS DA API
// ============================================================================

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint para monitoramento de infraestrutura
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Enlace-DoorIA',
      timestamp: new Date().toISOString(),
      pilot: 'São Luís - MA (12 Unidades)',
      database: 'PostgreSQL 16 LTS Puro Local (Porta 5432)',
    });
  });

  // Status de integridade do Banco de Dados Puro Local PostgreSQL 16 LTS
  app.get('/api/v1/database/status', async (req, res) => {
    const dbStatus = await checkPostgresHealth();
    res.json({
      engine: 'PostgreSQL 16 LTS Puro Local',
      architecture: 'Local-First (Guarita / Mini PC)',
      port: dbStatus.port,
      database: dbStatus.database,
      user: dbStatus.user,
      host: dbStatus.host,
      connected: dbStatus.connected,
      latencyMs: dbStatus.latencyMs,
      tablesCount: dbStatus.tablesCount || 0,
      mode: 'Local Relational ACID',
      lastChecked: dbStatus.lastChecked,
      error: dbStatus.error,
      schemaFile: 'src/db/init.sql',
    });
  });

  // Middleware simples de sessão simulada (pode ser alternada para testes de RBAC)
  let currentSession: UserSession = {
    id: 'user-carlos-101',
    name: 'Carlos Eduardo Mendes',
    email: 'carlos.mendes@gmail.com',
    role: 'morador',
    unitId: 'u-101',
    unitNumber: '101',
    mfaEnabled: true,
  };

  // 1. Auth & Troca de Perfil (Para testes rápidos de Morador vs Síndico/Admin)
  app.get('/api/v1/auth/me', (req, res) => {
    res.json(currentSession);
  });

  app.post('/api/v1/auth/switch-role', (req, res) => {
    const { role, unitNumber } = req.body;
    if (role === 'sindico') {
      currentSession = {
        id: 'user-fernando-201',
        name: 'Fernando Henrique Rocha (Síndico)',
        email: 'sindico.solar@gmail.com',
        role: 'sindico',
        unitId: 'u-201',
        unitNumber: '201',
        mfaEnabled: true,
      };
    } else if (role === 'super_admin') {
      currentSession = {
        id: 'user-superadmin',
        name: 'Engenheiro de Telecom / Super Admin',
        email: 'dev.telecom@enlace.ai',
        role: 'super_admin',
        mfaEnabled: true,
      };
    } else {
      const targetUnit = units.find((u) => u.number === (unitNumber || '101')) || units[0];
      currentSession = {
        id: `user-${targetUnit.number}`,
        name: targetUnit.ownerName,
        email: targetUnit.residents[0]?.email || 'morador@gmail.com',
        role: 'morador',
        unitId: targetUnit.id,
        unitNumber: targetUnit.number,
        mfaEnabled: true,
      };
    }

    logAudit(currentSession.name, currentSession.role, 'TROCA_DE_SESSAO_SIMULADA', 'Sistema de Autenticacao', 'PERMITIDO', {
      newRole: currentSession.role,
      unitNumber: currentSession.unitNumber,
    });

    res.json({ success: true, session: currentSession });
  });

  // 2. Condomínio & Configurações
  app.get('/api/v1/condominium', (req, res) => {
    res.json({
      ...condominiumConfig,
      pilotLocation: `${condominiumConfig.address.city} - ${condominiumConfig.address.state}, ${condominiumConfig.address.neighborhood}`,
      localServerIp: condominiumConfig.technicalSettings.localServerIp,
      asteriskVersion: condominiumConfig.technicalSettings.asteriskVersion,
      xpeModel: condominiumConfig.technicalSettings.xpeModel,
      iotGateway: condominiumConfig.technicalSettings.iotGateway,
    });
  });

  app.put('/api/v1/condominium', express.json(), (req, res) => {
    // Apenas perfis administrativos podem alterar dados do condomínio
    if (currentSession.role === 'morador') {
      return res.status(403).json({ error: 'Permissão negada. Apenas administradores e síndicos podem alterar as configurações do condomínio.' });
    }

    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Payload de atualização inválido.' });
    }

    // Merge seguro preservando dados estruturais
    condominiumConfig = {
      ...condominiumConfig,
      name: updates.name || condominiumConfig.name,
      tradingName: updates.tradingName !== undefined ? updates.tradingName : condominiumConfig.tradingName,
      cnpj: updates.cnpj || condominiumConfig.cnpj,
      unitsCount: Number(updates.unitsCount) || condominiumConfig.unitsCount,
      blocks: Array.isArray(updates.blocks) ? updates.blocks : condominiumConfig.blocks,
      floorsCount: Number(updates.floorsCount) || condominiumConfig.floorsCount,
      parkingSpotsCount: Number(updates.parkingSpotsCount) || condominiumConfig.parkingSpotsCount,
      managementPhone: updates.managementPhone || condominiumConfig.managementPhone,
      emergencyPhone: updates.emergencyPhone || condominiumConfig.emergencyPhone,
      email: updates.email || condominiumConfig.email,
      address: {
        ...condominiumConfig.address,
        ...(updates.address || {}),
      },
      sindico: {
        ...condominiumConfig.sindico,
        ...(updates.sindico || {}),
      },
      administrator: {
        ...condominiumConfig.administrator,
        ...(updates.administrator || {}),
      },
      operationalSettings: {
        ...condominiumConfig.operationalSettings,
        ...(updates.operationalSettings || {}),
      },
      financialSettings: {
        ...condominiumConfig.financialSettings,
        ...(updates.financialSettings || {}),
      },
      technicalSettings: {
        ...condominiumConfig.technicalSettings,
        ...(updates.technicalSettings || {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: `${currentSession.name} (${currentSession.role})`,
    };

    logAudit(
      currentSession.name,
      currentSession.role,
      'CONFIGURACOES_CONDOMINIO_ATUALIZADAS',
      condominiumConfig.name,
      'PERMITIDO',
      {
        timestamp: condominiumConfig.updatedAt,
        updatedFields: Object.keys(updates),
      },
      'Parâmetros cadastrais e regras operacionais do condomínio atualizados pelo Administrador'
    );

    publishEvent('CONDOMINIUM_CONFIG_UPDATED', 'server.ts', {
      condominiumId: condominiumConfig.id,
      updatedBy: currentSession.name,
      timestamp: condominiumConfig.updatedAt,
    });

    res.json({
      success: true,
      data: condominiumConfig,
      message: 'Configurações e dados do condomínio salvos com sucesso no servidor local.',
    });
  });

  app.post('/api/v1/condominium/reset', (req, res) => {
    if (currentSession.role === 'morador') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    condominiumConfig = JSON.parse(JSON.stringify(DEFAULT_CONDOMINIUM_CONFIG));
    condominiumConfig.updatedAt = new Date().toISOString();
    condominiumConfig.updatedBy = `${currentSession.name} (Restauração Piloto)`;

    logAudit(
      currentSession.name,
      currentSession.role,
      'RESTAURACAO_PADROES_CONDOMINIO',
      condominiumConfig.name,
      'PERMITIDO',
      { timestamp: condominiumConfig.updatedAt },
      'Configurações do condomínio restauradas para o baseline padrão do piloto'
    );

    publishEvent('CONDOMINIUM_CONFIG_UPDATED', 'server.ts', {
      condominiumId: condominiumConfig.id,
      updatedBy: currentSession.name,
      action: 'reset_defaults',
    });

    res.json({
      success: true,
      data: condominiumConfig,
      message: 'Configurações do condomínio restauradas com sucesso para os padrões do Piloto.',
    });
  });

  
  app.post('/api/v1/units/:unitId/residents', express.json(), (req, res) => {
    const { unitId } = req.params;

    // RBAC: Morador só pode adicionar moradores à sua própria unidade
    if (currentSession.role === 'morador' && currentSession.unitId !== unitId) {
      logAudit(currentSession.name, currentSession.role, 'TENTATIVA_ADICAO_MORADOR_TERCEIROS', `Unidade ${unitId}`, 'NEGADO', {});
      return res.status(403).json({ error: 'Permissão negada. Você só pode gerenciar moradores da sua própria unidade.' });
    }

    const unit = units.find(u => u.id === unitId);
    if (!unit) return res.status(404).json({ error: 'Unidade não encontrada' });
    
    // Validação de inputs
    if (!req.body.name || !req.body.document || !req.body.phone) {
      return res.status(400).json({ error: 'Nome, documento e telefone são obrigatórios.' });
    }

    const newResident = {
      id: `r-${unitId}-${Date.now()}`,
      unitId,
      name: req.body.name,
      document: req.body.document,
      phone: req.body.phone,
      email: req.body.email || '',
      isMainContact: req.body.isMainContact || false,
      sipDevice: {
        extension: unit.sipExtension,
        registered: false,
        webrtcSupported: true
      }
    };
    
    unit.residents.push(newResident);
    logAudit(currentSession.name, currentSession.role, 'MORADOR_ADICIONADO', `Unidade ${unit.number} - ${newResident.name}`, 'PERMITIDO', {});
    res.json({ success: true, resident: newResident });
  });

  app.delete('/api/v1/units/:unitId/residents/:residentId', (req, res) => {
    const { unitId, residentId } = req.params;

    // RBAC: Morador só pode remover moradores da sua própria unidade
    if (currentSession.role === 'morador' && currentSession.unitId !== unitId) {
      logAudit(currentSession.name, currentSession.role, 'TENTATIVA_REMOCAO_MORADOR_TERCEIROS', `Unidade ${unitId}`, 'NEGADO', {});
      return res.status(403).json({ error: 'Permissão negada. Você só pode gerenciar moradores da sua própria unidade.' });
    }

    const unit = units.find(u => u.id === unitId);
    if (!unit) return res.status(404).json({ error: 'Unidade não encontrada' });
    
    const initialLength = unit.residents.length;
    unit.residents = unit.residents.filter(r => r.id !== residentId);
    
    if (unit.residents.length === initialLength) {
      return res.status(404).json({ error: 'Morador não encontrado na unidade especificada' });
    }

    logAudit(currentSession.name, currentSession.role, 'MORADOR_REMOVIDO', `Unidade ${unit.number} - ID ${residentId}`, 'PERMITIDO', {});
    res.json({ success: true });
  });

  app.get('/api/v1/units', (req, res) => {
    res.json(units);
  });

  // 3. Chamadas Asterisk / XPE / QR Intercom
  app.get('/api/v1/calls/active', (req, res) => {
    res.json({ activeCall });
  });

  app.get('/api/v1/calls/history', (req, res) => {
    // Se morador, filtra apenas as da unidade dele (Regra de Ouro #3)
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      const filtered = callHistory.filter((c) => c.unitNumber === currentSession.unitNumber);
      return res.json(filtered);
    }
    res.json(callHistory);
  });

  // Iniciar chamada pelo XPE-3115-IP (Simulador de Calçada / Totem)
  app.post('/api/v1/calls/xpe/start', (req, res) => {
    const { unitNumber, purpose } = req.body;
    const targetUnit = units.find((u) => u.number === unitNumber) || units[0];

    activeCall = {
      id: `call-xpe-${Date.now()}`,
      origin: 'xpe_3115_ip',
      sourceDevice: 'Intelbras XPE-3115-IP (192.168.1.150)',
      targetUnitId: targetUnit.id,
      targetUnitNumber: targetUnit.number,
      purpose: purpose || 'visitante',
      state: 'chamando',
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      visitorMedia: {
        hasVideo: true, // Câmera integrada do XPE enviando stream
        hasAudio: true,
        videoStreamUri: '/api/v1/cameras/cam-01/stream',
        mediaSessionId: `sess-${crypto.randomBytes(4).toString('hex')}`,
      },
    };

    publishEvent('CALL_STARTED', 'xpe_3115_ip', {
      callId: activeCall.id,
      unitNumber: targetUnit.number,
      purpose: activeCall.purpose,
    });

    logAudit('Visitante (Totem XPE)', 'visitante', 'CHAMADA_INICIADA_XPE', `Unidade ${targetUnit.number}`, 'PERMITIDO', {
      targetUnit: targetUnit.number,
      purpose: activeCall.purpose,
    });

    res.json({ success: true, call: activeCall });
  });

  // Iniciar chamada pelo QR Virtual Intercom (Visitante no Smartphone)
  app.post('/api/v1/calls/qr/start', (req, res) => {
    const { unitNumber, purpose, cameraGranted, microphoneGranted, qrToken } = req.body;

    // Se houver um token QR, validar a existência e validade (Regra Ouro #09)
    let validatedInvite = null;
    if (qrToken) {
      validatedInvite = visitorInvites.find(inv => inv.qrToken === qrToken);
      if (!validatedInvite) {
        logAudit('Visitante (QR Intercom)', 'visitante', 'CHAMADA_QR_BLOQUEADA', `Token ${qrToken}`, 'NEGADO', {
          reason: 'Token QR inválido ou inexistente.',
        });
        return res.status(403).json({
          success: false,
          error: 'Token QR inválido ou expirado.',
        });
      }
      if (validatedInvite.expiresAt < new Date().toISOString()) {
         logAudit('Visitante (QR Intercom)', 'visitante', 'CHAMADA_QR_BLOQUEADA', `Token ${qrToken}`, 'NEGADO', {
          reason: 'Token QR expirado.',
        });
        return res.status(403).json({
          success: false,
          error: 'Este convite QR Code expirou.',
        });
      }
    }

    // Regra Obrigatória #10.1 & Regra de Ouro #5:
    // "O morador só deve ser chamado depois que câmera e microfone estiverem habilitados"
    if (!cameraGranted || !microphoneGranted) {
      logAudit('Visitante (QR Intercom)', 'visitante', 'CHAMADA_QR_BLOQUEADA', `Unidade ${unitNumber}`, 'NEGADO', {
        reason: 'Permissões obrigatórias de mídia (câmera ou microfone) foram negadas pelo visitante.',
      });
      return res.status(403).json({
        success: false,
        error: 'Conforme a Seção 10.1 do Master PRD, a chamada para o morador exige permissão obrigatória de câmera frontal e microfone.',
      });
    }

    // Se o token QR validou, usar a unidade do token, caso contrário, usa a informada na UI (fallback se for o QR genérico da portaria)
    const targetUnitNumber = validatedInvite ? validatedInvite.unitNumber : unitNumber;
    const targetUnit = units.find((u) => u.number === targetUnitNumber) || units[0];

    activeCall = {
      id: `call-qr-${Date.now()}`,
      origin: 'qr_virtual_intercom',
      sourceDevice: 'QR Virtual Intercom WebRTC (Mobile)',
      targetUnitId: targetUnit.id,
      targetUnitNumber: targetUnit.number,
      purpose: purpose || 'visitante',
      state: 'chamando',
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      visitorMedia: {
        hasVideo: true,
        hasAudio: true,
        videoStreamUri: 'blob:webrtc-peer-visitor-stream',
        mediaSessionId: `sess-${crypto.randomBytes(4).toString('hex')}`,
      },
    };

    publishEvent('CALL_STARTED', 'qr_virtual_intercom', {
      callId: activeCall.id,
      unitNumber: targetUnit.number,
      purpose: activeCall.purpose,
    });

    res.json({ success: true, call: activeCall });
  });

  // Atender chamada (WebPhone do morador)
  app.post('/api/v1/calls/answer', (req, res) => {
    if (!activeCall) {
      return res.status(404).json({ error: 'Nenhuma chamada ativa para atender.' });
    }

    activeCall.state = 'em_atendimento';
    activeCall.answeredAt = new Date().toISOString();
    activeCall.answeredByEndpoint = `WebPhone-${currentSession.unitNumber || 'Sindico'}`;

    // Gravação Seção 12: Inicia gravação de áudio/vídeo durante atendimento
    activeCall.recording = {
      recordingId: `rec-${Date.now()}`,
      hashSha256: crypto.createHash('sha256').update(activeCall.id).digest('hex'),
      duration: 0,
      encrypted: true,
    };

    publishEvent('CALL_ANSWERED', 'pjsip_webrtc', {
      callId: activeCall.id,
      answeredBy: activeCall.answeredByEndpoint,
      unitNumber: activeCall.targetUnitNumber,
    });

    logAudit(currentSession.name, currentSession.role, 'CHAMADA_ATENDIDA_WEBPHONE', `Chamada ${activeCall.id}`, 'PERMITIDO', {
      unitNumber: activeCall.targetUnitNumber,
      endpoint: activeCall.answeredByEndpoint,
    });

    res.json({ success: true, call: activeCall });
  });

  // Enviar DTMF durante a chamada (*07 para pedestre, *08 para garagem)
  app.post('/api/v1/calls/dtmf', (req, res) => {
    const dtmf = req.body.dtmf || req.body.digit || req.body.code; // "*07" ou "*08"

    if (!['*07', '*08'].includes(dtmf)) {
      return res.status(400).json({ error: 'Código DTMF não suportado. Utilize *07 (Pedestre) ou *08 (Garagem).' });
    }

    const targetGateType = dtmf === '*07' ? 'pedestre' : 'garagem';
    const gate = gates.find((g) => g.type === targetGateType)!;

    // Avaliação no Policy Engine (Regra de Ouro #4)
    const policyResult = PolicyEngine.evaluate({
      actor: {
        id: currentSession.id,
        role: currentSession.role,
        unitNumber: currentSession.unitNumber,
      },
      action: 'ABRIR_PORTAO',
      resource: {
        target: gate.name,
        dtmfCommand: dtmf,
      },
      context: {
        callActive: !!activeCall,
        activeCallTargetUnit: activeCall?.targetUnitNumber,
      },
    });

    if (!policyResult.allowed) {
      logAudit(currentSession.name, currentSession.role, 'ABERTURA_PORTAO_DTMF', gate.name, 'NEGADO', { dtmf }, policyResult.reason, dtmf);
      publishEvent('ACCESS_DENIED', 'policy_engine', { gate: targetGateType, dtmf, reason: policyResult.reason });
      return res.status(403).json({ success: false, error: policyResult.reason });
    }

    // Abertura autorizada: aciona relé e agenda retorno ao estado fechado
    gate.status = 'aberto';
    gate.lastOpenedAt = new Date().toISOString();
    gate.lastOpenedBy = currentSession.name;

    publishEvent('ACCESS_GRANTED', 'policy_engine', { gate: targetGateType, dtmf, authorizedBy: currentSession.name });
    publishEvent('GATE_OPENED', 'access_core', { gateId: gate.id, gateName: gate.name, dtmf });
    logAudit(currentSession.name, currentSession.role, 'ABERTURA_PORTAO_DTMF', gate.name, 'PERMITIDO', { dtmf, relayPin: gate.relayPin }, undefined, dtmf);

    setTimeout(() => {
      gate.status = 'fechado';
      publishEvent('DOOR_OPENED', 'gate_controller', { gateId: gate.id, status: 'fechado_apos_timer' });
    }, 4000);

    res.json({
      success: true,
      message: `Comando DTMF ${dtmf} aceito pelo Policy Engine. ${gate.name} acionado via Relé ${gate.relayPin}.`,
      gate,
    });
  });

  // Encerrar chamada
  app.post('/api/v1/calls/hangup', (req, res) => {
    if (!activeCall) {
      return res.json({ success: true, message: 'Nenhuma chamada ativa.' });
    }

    const duration = activeCall.answeredAt
      ? Math.round((Date.now() - new Date(activeCall.answeredAt).getTime()) / 1000)
      : 15;

    const logEntry: CallLog = {
      id: activeCall.id,
      origin: activeCall.origin,
      unitNumber: activeCall.targetUnitNumber,
      purpose: activeCall.purpose || 'outro',
      startedAt: activeCall.startedAt,
      durationSeconds: Math.max(duration, 5),
      status: activeCall.answeredAt ? 'atendida' : 'nao_atendida',
      answeredBy: activeCall.answeredByEndpoint || 'Desconhecido',
      hasRecording: !!activeCall.answeredAt,
      recordingId: activeCall.recording?.recordingId,
    };

    callHistory.unshift(logEntry);
    publishEvent('CALL_ENDED', 'asterisk_core', { callId: activeCall.id, durationSeconds: logEntry.durationSeconds });

    activeCall = null;
    res.json({ success: true, callLog: logEntry });
  });

  // 4. Portões & Status de Acesso
  app.get('/api/v1/gates', (req, res) => {
    res.json(gates);
  });

  app.post('/api/v1/gates/:id/trigger', (req, res) => {
    const gateId = req.params.id;
    const gate = gates.find((g) => g.id === gateId);
    if (!gate) return res.status(404).json({ error: 'Portão não encontrado.' });

    const policy = PolicyEngine.evaluate({
      actor: { id: currentSession.id, role: currentSession.role, unitNumber: currentSession.unitNumber },
      action: 'ABRIR_PORTAO',
      resource: { target: gate.name },
      context: { callActive: !!activeCall, activeCallTargetUnit: activeCall?.targetUnitNumber },
    });

    if (!policy.allowed) {
      logAudit(currentSession.name, currentSession.role, 'ACIONAMENTO_MANUAL_PORTAO', gate.name, 'NEGADO', { gateId }, policy.reason);
      return res.status(403).json({ error: policy.reason });
    }

    gate.status = 'aberto';
    gate.lastOpenedAt = new Date().toISOString();
    gate.lastOpenedBy = currentSession.name;

    publishEvent('GATE_OPENED', 'manual_trigger', { gateId, openedBy: currentSession.name });
    logAudit(currentSession.name, currentSession.role, 'ACIONAMENTO_MANUAL_PORTAO', gate.name, 'PERMITIDO', { gateId });

    setTimeout(() => {
      gate.status = 'fechado';
    }, 4000);

    res.json({ success: true, gate });
  });

  // 5. Câmeras
  app.get('/api/v1/cameras', (req, res) => {
    res.json(cameras);
  });

  // 6. Financeiro & Inadimplência (Seção 22, 23 e 24 do Master PRD)
  app.get('/api/v1/finance/bills', (req, res) => {
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      const myBills = financialBills.filter((b) => b.unitNumber === currentSession.unitNumber);
      return res.json(myBills);
    }
    res.json(financialBills);
  });

  app.get('/api/v1/finance/summary', (req, res) => {
    const totalAtrasadas = financialBills.filter((b) => b.status === 'atrasado').reduce((acc, curr) => acc + curr.valorTotal, 0);
    const unidadesInadimplentes = new Set(financialBills.filter((b) => b.status === 'atrasado').map((b) => b.unitNumber)).size;

    const summary: FinancialSummary = {
      saldoAtual: 34250.8,
      recebiveisMes: 7800.0,
      totalInadimplencia: totalAtrasadas,
      unidadesInadimplentesCount: unidadesInadimplentes,
      proximosVencimentos: 6500.0,
      contasAPagar: 4120.0,
      receitaMensalPrevista: 7800.0, // 12 x 650
      despesasMensais: 4950.0,
      resultadoOperacional: 2850.0,
    };
    res.json(summary);
  });

  app.get('/api/v1/finance/agreements', (req, res) => {
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      return res.json(agreements.filter((a) => a.unitNumber === currentSession.unitNumber));
    }
    res.json(agreements);
  });

  // 7. Encomendas & Visitantes
  app.get('/api/v1/packages', (req, res) => {
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      const unit = units.find((u) => u.number === currentSession.unitNumber);
      return res.json(packageDeliveries.filter((p) => p.unitId === unit?.id));
    }
    res.json(packageDeliveries);
  });

  app.post('/api/v1/packages', (req, res) => {
    // Validação de RBAC: Morador não pode registrar encomenda (isso é papel da Portaria)
    if (currentSession.role === 'morador') {
      return res.status(403).json({ error: 'Permissão negada. Apenas a Portaria pode registrar o recebimento de encomendas.' });
    }

    const { unitNumber, courier, trackingCode, description } = req.body;
    
    // Validação de inputs
    if (!unitNumber || !courier || !description) {
      return res.status(400).json({ error: 'Dados incompletos. Unidade, transportadora e descrição são obrigatórios.' });
    }

    const targetUnit = units.find((u) => u.number === unitNumber);
    if (!targetUnit) {
      return res.status(404).json({ error: 'Unidade de destino não encontrada no cadastro.' });
    }

    // Código PIN aleatório de 4 dígitos para retirada segura
    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

    const newPackage: PackageDelivery = {
      id: `pkg-${Date.now()}`,
      unitId: targetUnit.id,
      trackingCode: trackingCode || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      courier,
      description,
      receivedAt: new Date().toISOString(),
      status: 'aguardando_retirada',
      pickupCode,
    };

    packageDeliveries.unshift(newPackage);

    publishEvent('PACKAGE_RECEIVED', 'portaria_core', {
      packageId: newPackage.id,
      unitNumber: targetUnit.number,
      courier: newPackage.courier,
      pickupCode,
    });

    logAudit(currentSession.name, currentSession.role, 'ENCOMENDA_RECEBIDA', `Unidade ${targetUnit.number}`, 'PERMITIDO', {
      packageId: newPackage.id,
      courier: newPackage.courier,
      trackingCode: newPackage.trackingCode,
    });

    res.json({ success: true, package: newPackage });
  });

  app.post('/api/v1/packages/:id/pickup', (req, res) => {
    const { id } = req.params;
    const { pickupCode } = req.body;
    const pkg = packageDeliveries.find((p) => p.id === id);

    if (!pkg) {
      return res.status(404).json({ error: 'Encomenda não encontrada.' });
    }

    if (pkg.status === 'entregue') {
      return res.status(400).json({ error: 'Esta encomenda já foi retirada anteriormente.' });
    }

    // RBAC: Se for morador, só pode retirar encomendas da própria unidade
    if (currentSession.role === 'morador' && pkg.unitId !== currentSession.unitId) {
      logAudit(currentSession.name, currentSession.role, 'TENTATIVA_RETIRADA_UNIDADE_TERCEIROS', `Encomenda ${id}`, 'NEGADO', {});
      return res.status(403).json({ error: 'Você não tem permissão para retirar encomendas de outra unidade.' });
    }

    // Se fornecido código (Geralmente validado na portaria), valida correspondência
    // Se o morador estiver logado em seu próprio app, o código pode ser omitido caso o app permita "auto-baixa"
    if (pickupCode && pkg.pickupCode !== pickupCode.trim()) {
      logAudit(currentSession.name, currentSession.role, 'RETIRADA_ENCOMENDA_PIN_INVALIDO', `Encomenda ${id}`, 'NEGADO', {
        attemptedCode: pickupCode,
      });
      return res.status(403).json({ error: 'Código PIN de retirada incorreto.' });
    }

    pkg.status = 'entregue';
    pkg.pickedUpAt = new Date().toISOString();

    const targetUnit = units.find((u) => u.id === pkg.unitId);

    logAudit(currentSession.name, currentSession.role, 'RETIRADA_ENCOMENDA_CONCLUIDA', `Unidade ${targetUnit?.number || 'Geral'}`, 'PERMITIDO', {
      packageId: pkg.id,
      pickedUpAt: pkg.pickedUpAt,
      retiradoPor: currentSession.name,
    });

    res.json({ success: true, package: pkg });
  });

  app.post('/api/v1/packages/:id/notify', (req, res) => {
    const { id } = req.params;
    const pkg = packageDeliveries.find((p) => p.id === id);
    if (!pkg) return res.status(404).json({ error: 'Encomenda não encontrada.' });

    const targetUnit = units.find((u) => u.id === pkg.unitId);

    publishEvent('PACKAGE_RECEIVED', 'portaria_manual_notify', {
      packageId: pkg.id,
      unitNumber: targetUnit?.number,
      courier: pkg.courier,
      pickupCode: pkg.pickupCode,
    });

    logAudit(currentSession.name, currentSession.role, 'NOTIFICACAO_ENCOMENDA_REENVIADA', `Unidade ${targetUnit?.number}`, 'PERMITIDO', {
      packageId: pkg.id,
    });

    res.json({ success: true, message: `Morador do Apto ${targetUnit?.number} notificado com sucesso via WebPhone / Interfone.` });
  });

  app.get('/api/v1/visitors/invites', (req, res) => {
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      const unit = units.find((u) => u.number === currentSession.unitNumber);
      return res.json(visitorInvites.filter((v) => v.unitId === unit?.id));
    }
    res.json(visitorInvites);
  });

  app.post('/api/v1/visitors/invites', (req, res) => {
    const { visitorName, type, targetUnitNumber } = req.body;
    
    if (!visitorName || !type) {
      return res.status(400).json({ error: 'Nome do visitante e tipo são obrigatórios.' });
    }

    // RBAC: Morador só pode convidar para a própria unidade
    let finalTargetUnitNumber = targetUnitNumber;
    if (currentSession.role === 'morador') {
      finalTargetUnitNumber = currentSession.unitNumber;
    } else {
      // Se for portaria ou síndico, precisa especificar para qual unidade é o convite
      if (!targetUnitNumber) {
        return res.status(400).json({ error: 'Número da unidade de destino é obrigatório para este perfil.' });
      }
    }

    const unit = units.find((u) => u.number === finalTargetUnitNumber);
    if (!unit) {
      return res.status(404).json({ error: 'Unidade de destino não encontrada.' });
    }

    const newInvite: VisitorInvite = {
      id: `inv-${Date.now()}`,
      unitId: unit.id,
      visitorName,
      type,
      qrToken: `door_qr_sec_${crypto.randomBytes(4).toString('hex')}`,
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString(), // 24h
      status: 'ativo',
      entryCount: 0,
    };

    visitorInvites.unshift(newInvite);
    logAudit(currentSession.name, currentSession.role, 'CRIACAO_CONVITE_QR', `Unidade ${unit.number}`, 'PERMITIDO', {
      visitorName,
      qrToken: newInvite.qrToken,
    });

    res.json({ success: true, invite: newInvite });
  });

  app.delete('/api/v1/visitors/invites/:id', (req, res) => {
    const { id } = req.params;
    const invite = visitorInvites.find((v) => v.id === id);
    if (!invite) return res.status(404).json({ error: 'Convite não encontrado.' });

    // RBAC: Morador só pode excluir convites da sua própria unidade
    if (currentSession.role === 'morador' && invite.unitId !== currentSession.unitId) {
      logAudit(currentSession.name, currentSession.role, 'TENTATIVA_EXCLUSAO_CONVITE_TERCEIROS', `Convite ${id}`, 'NEGADO', {});
      return res.status(403).json({ error: 'Você só pode excluir convites da sua própria unidade.' });
    }

    invite.status = 'revogado';
    logAudit(currentSession.name, currentSession.role, 'REVOGACAO_CONVITE_QR', `Convite ${id}`, 'PERMITIDO', {
      visitorName: invite.visitorName,
    });

    res.json({ success: true, invite });
  });

  app.get('/api/v1/vehicles', (req, res) => {
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      const unit = units.find((u) => u.number === currentSession.unitNumber);
      return res.json(vehicles.filter((v) => v.unitId === unit?.id));
    }
    res.json(vehicles);
  });

  app.get('/api/v1/vehicles/lpr-logs', (req, res) => {
    res.json(lprLogs);
  });

  app.post('/api/v1/vehicles/lpr-simulate', (req, res) => {
    const { plate } = req.body;
    if (!plate) return res.status(400).json({ error: 'Placa obrigatória.' });

    const cleanPlate = plate.trim().toUpperCase();
    const matchedVehicle = vehicles.find((v) => v.plate.toUpperCase() === cleanPlate);
    const matchedUnit = matchedVehicle ? units.find((u) => u.id === matchedVehicle.unitId) : undefined;

    const garageGate = gates.find((g) => g.type === 'garagem')!;

    if (matchedVehicle && matchedUnit) {
      // Política de acesso: veículo autorizado
      const newEntry: LprLogEntry = {
        id: `lpr-${Date.now()}`,
        timestamp: new Date().toISOString(),
        plate: cleanPlate,
        confidence: Number((97.5 + Math.random() * 2.4).toFixed(1)),
        cameraName: 'Câmera Portão Garagem (cam-02)',
        matchedVehicle,
        matchedUnitNumber: matchedUnit.number,
        action: 'ABERTURA_AUTOMATICA',
        reason: `Placa reconhecida via OCR ONVIF. ${matchedVehicle.brand} ${matchedVehicle.model} (${matchedVehicle.parkingSpot}) - Apto ${matchedUnit.number}. Portão liberado via DTMF *08.`,
      };

      lprLogs.unshift(newEntry);
      if (lprLogs.length > 50) lprLogs.pop();

      // Aciona o portão de garagem
      garageGate.status = 'aberto';
      garageGate.lastOpenedAt = new Date().toISOString();
      garageGate.lastOpenedBy = `LPR Automático (${cleanPlate})`;

      publishEvent('ACCESS_GRANTED', 'lpr_system', {
        plate: cleanPlate,
        unitNumber: matchedUnit.number,
        gate: 'garagem',
        dtmf: '*08',
      });
      publishEvent('GATE_OPENED', 'lpr_controller', { gateId: garageGate.id, plate: cleanPlate });

      logAudit('Sistema LPR / Câmera Garagem', 'sistema', 'LPR_ACESSO_AUTORIZADO', `Portão Garagem`, 'PERMITIDO', {
        plate: cleanPlate,
        unitNumber: matchedUnit.number,
        parkingSpot: matchedVehicle.parkingSpot,
      }, undefined, '*08');

      setTimeout(() => {
        garageGate.status = 'fechado';
        publishEvent('DOOR_OPENED', 'gate_controller', { gateId: garageGate.id, status: 'fechado_apos_timer' });
      }, 5000);

      return res.json({
        success: true,
        authorized: true,
        lprEntry: newEntry,
        gate: garageGate,
      });
    } else {
      // Veículo desconhecido / não cadastrado
      const newEntry: LprLogEntry = {
        id: `lpr-${Date.now()}`,
        timestamp: new Date().toISOString(),
        plate: cleanPlate,
        confidence: Number((93.0 + Math.random() * 5.0).toFixed(1)),
        cameraName: 'Câmera Portão Garagem (cam-02)',
        action: 'NEGADO_DESCONHECIDO',
        reason: `Placa ${cleanPlate} não vinculada a nenhuma unidade do condomínio. Portão mantido fechado conforme Master PRD.`,
      };

      lprLogs.unshift(newEntry);
      if (lprLogs.length > 50) lprLogs.pop();

      publishEvent('ACCESS_DENIED', 'lpr_system', {
        plate: cleanPlate,
        reason: 'Veículo não cadastrado na base de dados',
      });

      logAudit('Sistema LPR / Câmera Garagem', 'sistema', 'LPR_ACESSO_NEGADO', `Portão Garagem`, 'NEGADO', {
        plate: cleanPlate,
      });

      return res.json({
        success: false,
        authorized: false,
        lprEntry: newEntry,
        message: `Veículo com placa ${cleanPlate} não autorizado. Portão de garagem permaneceu fechado.`,
      });
    }
  });

  // 8. IoT & Automação (NovaDigital HNZ-CB3)
  app.get('/api/v1/iot/devices', (req, res) => {
    res.json(iotDevices);
  });

  app.get('/api/v1/iot/automations', (req, res) => {
    res.json(automationRules);
  });

  app.post('/api/v1/iot/devices/:id/toggle', (req, res) => {
    const dev = iotDevices.find((d) => d.id === req.params.id);
    if (!dev) return res.status(404).json({ error: 'Dispositivo IoT não encontrado.' });

    dev.state = dev.state === 'ligado' ? 'desligado' : 'ligado';
    publishEvent('DOOR_OPENED', 'iot_controller', { deviceId: dev.id, newState: dev.state });
    res.json({ success: true, device: dev });
  });

  // 9. Auditoria & Event Bus
  app.get('/api/v1/audit', (req, res) => {
    // Morador não tem acesso a auditoria geral do condomínio
    if (currentSession.role === 'morador') {
      const myLogs = auditLogs.filter((l) => l.actor.includes(currentSession.unitNumber || ''));
      return res.json(myLogs);
    }
    res.json(auditLogs);
  });

  app.get('/api/v1/events', (req, res) => {
    res.json(eventBusHistory);
  });

  // Auditoria Forense de Gravação (Seção 12 do Master PRD)
  app.get('/api/v1/recordings/:id/audit', (req, res) => {
    const recordingId = req.params.id;

    // Avaliação no Policy Engine (Regra de Ouro #10 e LGPD)
    const policy = PolicyEngine.evaluate({
      actor: { id: currentSession.id, role: currentSession.role, unitNumber: currentSession.unitNumber },
      action: 'VER_GRAVACAO',
      resource: { target: recordingId },
      context: {},
    });

    if (!policy.allowed) {
      logAudit(
        currentSession.name,
        currentSession.role,
        'ACESSO_GRAVACAO_BLOQUEADO',
        `Gravação ${recordingId}`,
        'NEGADO',
        { recordingId },
        policy.reason
      );
      return res.status(403).json({
        success: false,
        error: policy.reason || 'Acesso restrito ao síndico e administradores auditados conforme LGPD.',
      });
    }

    // Encontrar chamada correspondente
    const call = callHistory.find((c) => c.recordingId === recordingId || c.id === recordingId) || callHistory[0];

    // Transcrição forense com metadados auditáveis
    const auditData: CallRecordingAuditData = {
      recordingId: recordingId,
      callId: call.id,
      unitNumber: call.unitNumber,
      origin: call.origin,
      purpose: call.purpose,
      startedAt: call.startedAt,
      durationSeconds: call.durationSeconds,
      hashSha256: crypto.createHash('sha256').update(`${recordingId}-${call.id}-local-key-2026`).digest('hex'),
      answeredBy: call.answeredBy || 'Morador WebPhone',
      transcript: [
        {
          speaker: 'maia_ura',
          text: `Portaria Inteligente Solar das Palmeiras. Direcionando chamada para a unidade ${call.unitNumber} (${call.purpose}).`,
          timestamp: '00:02',
        },
        {
          speaker: 'visitante',
          text: call.purpose === 'entrega' ? 'Olá, entrega para o apartamento 101, por gentileza.' : 'Boa tarde, vim para uma visita ao morador.',
          timestamp: '00:08',
        },
        {
          speaker: 'morador',
          text: 'Boa tarde! Pode deixar na eclusa, estou liberando o portão social pelo interfone.',
          timestamp: '00:15',
        },
        {
          speaker: 'maia_ura',
          text: 'Comando DTMF *07 recebido. Política de acesso validada. Portão Pedestre Social destravado.',
          timestamp: '00:20',
        },
      ],
      aiAuditSummary: {
        sentiment: 'pacifico',
        gateOpened: !!call.gateOpened,
        authorizedRule: 'POLICY_ENGINE_RULE_04_DTMF_CALL_ACTIVE',
        observations: 'Comportamento do visitante dentro dos parâmetros normais. Portão destravado por 4s com retorno automático seguro.',
      },
    };

    logAudit(
      currentSession.name,
      currentSession.role,
      'AUDITORIA_GRAVACAO_CONSULTADA',
      `Gravação ${recordingId}`,
      'PERMITIDO',
      {
        recordingId,
        hashVerified: auditData.hashSha256,
      }
    );

    res.json({ success: true, audit: auditData });
  });

  // Alerta de Pânico / Coação da Portaria
  app.post('/api/v1/panic/trigger', (req, res) => {
    const { reason, location } = req.body;

    const alertEvent = publishEvent('SOS_TRIGGERED', 'panic_core', {
      triggeredBy: currentSession.name,
      role: currentSession.role,
      reason: reason || 'Alerta de pânico/emergência acionado na portaria',
      location: location || 'Entrada Social / Calçada',
    });

    logAudit(
      currentSession.name,
      currentSession.role,
      'ALARME_PANICO_ACIONADO',
      'Portaria Central',
      'ALERTA',
      { reason, location }
    );

    // Acionar refletores e trava de segurança via IoT
    const lamp = iotDevices.find((d) => d.id === 'iot-1');
    if (lamp) lamp.state = 'ligado';

    res.json({
      success: true,
      message: 'Protocolo de Emergência / Pânico Ativado. Registro imutável lavrado e síndico notificado.',
      eventId: alertEvent.id,
    });
  });

  // 10. Status Geral do Sistema (Local-First Monitor)
  app.get('/api/v1/system/status', async (req, res) => {
    const dbHealth = await checkPostgresHealth();
    const status: SystemStatus = {
      asterisk: {
        status: 'online',
        version: 'Asterisk 20.8 LTS Pure (No FreePBX)',
        pjsipEndpoints: 14,
        activeChannels: activeCall ? 2 : 0,
        uptime: '99.98% (42 dias, 8 horas)',
      },
      xpe3115: {
        status: 'online',
        ip: '192.168.1.150',
        firmware: 'v3.2.0-secure',
        audioCodec: 'G.711u / Opus',
        videoCodec: 'H.264 Baseline',
      },
      zigbeeGateway: {
        model: 'NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet',
        ip: '192.168.1.160',
        status: 'online',
        localFirstNoCloud: true,
        devicesConnected: iotDevices.length,
      },
      policyEngine: {
        status: 'online',
        rulesActive: 28,
        lastDecisionLatencyMs: 2.4,
      },
      maiaAiGateway: {
        provider: aiClient ? 'Gemini 3.8 Flash' : 'Offline URA Mode',
        status: 'ready',
        fallbackActive: !aiClient,
      },
      localNetwork: {
        isOnline: true,
        localFirstModeActive: true,
        ipRange: '192.168.1.0/24',
      },
      database: {
        engine: 'PostgreSQL 16 LTS',
        status: dbHealth.connected ? 'online' : 'standby',
        host: dbHealth.host,
        port: dbHealth.port,
        database: dbHealth.database,
        mode: 'Puro Local (Local-First Guarita)',
        tablesCount: dbHealth.tablesCount,
        latencyMs: dbHealth.latencyMs,
      },
    };
    res.json(status);
  });

  // 11. MaIA - Endpoint de Inteligência Operacional
  
  // --- ENDPOINTS: DISPOSITIVOS & DISCOVERY DE CÂMERAS ---
  app.get('/api/v1/devices/cameras', (req, res) => {
    res.json(cameras);
  });

  app.post('/api/v1/devices/cameras', express.json(), (req, res) => {
    const newCam = req.body;
    newCam.id = `cam-${Date.now()}`;
    cameras.push(newCam);
    publishEvent('CAMERA_ADDED', 'device_manager', { id: newCam.id, name: newCam.name });
    res.json({ success: true, camera: newCam });
  });

  app.delete('/api/v1/devices/cameras/:id', (req, res) => {
    const { id } = req.params;
    cameras = cameras.filter((c) => c.id !== id);
    publishEvent('CAMERA_REMOVED', 'device_manager', { id });
    res.json({ success: true, removedId: id });
  });

  // Discovery de Câmeras na LAN (WS-Discovery / SSDP / ARP)
  app.get('/api/v1/discovery/cameras', (req, res) => {
    // Atualiza o status 'isConfigured' de acordo com as câmeras ativas
    const updated = discoveredCamerasPool.map((disc) => ({
      ...disc,
      isConfigured: cameras.some(
        (cam) => (cam.ip && cam.ip === disc.ip) || cam.rtspUrl.includes(disc.ip)
      ),
    }));
    res.json(updated);
  });

  app.post('/api/v1/discovery/scan', express.json(), async (req, res) => {
    const { subnet = '192.168.1.0/24' } = req.body || {};
    
    // Simula tempo de varredura real via multicast UDP (WS-Discovery + ARP)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Recalcula status
    const scanResults = discoveredCamerasPool.map((disc) => ({
      ...disc,
      isConfigured: cameras.some(
        (cam) => (cam.ip && cam.ip === disc.ip) || cam.rtspUrl.includes(disc.ip)
      ),
    }));

    publishEvent('DISCOVERY_SCAN_COMPLETED', 'network_discovery', {
      subnet,
      foundCount: scanResults.length,
      protocols: ['WS-Discovery (UDP 3702)', 'SSDP/UPnP (UDP 1900)', 'ARP/OUI Analysis'],
    });

    res.json({
      success: true,
      subnet,
      scanDurationMs: 640,
      protocols: ['WS-Discovery (UDP 3702)', 'SSDP/UPnP (UDP 1900)', 'ARP/OUI Scan'],
      camerasFound: scanResults.length,
      devices: scanResults,
    });
  });

  app.post('/api/v1/discovery/import', express.json(), (req, res) => {
    const {
      discoveredId,
      customName,
      customLocation,
      username = 'admin',
      password = 'admin_password',
      selectedProfile,
      useSubStream,
    } = req.body;

    const disc = discoveredCamerasPool.find((d) => d.id === discoveredId);
    if (!disc) {
      return res.status(404).json({ error: 'Câmera descoberta não encontrada.' });
    }

    const profile = MANUFACTURER_PROFILES[disc.manufacturer] || MANUFACTURER_PROFILES['ONVIF Genérica'];
    const streamBuilder = useSubStream ? profile.subStreamPattern : profile.mainStreamPattern;
    const rtspUrl = streamBuilder(disc.ip, username, password, disc.rtspPort);
    const streamAlias = `cam_${disc.ip.replace(/\./g, '_')}`;

    const newCam: CameraDevice = {
      id: `cam-${Date.now()}`,
      name: customName || disc.model,
      location: customLocation || 'Área Comum (Descoberta LAN)',
      profile: selectedProfile || profile.recommendedProfile,
      rtspUrl,
      webrtcStreamUrl: `/streams/webrtc/${streamAlias}`,
      resolution: disc.manufacturer === 'Hikvision' ? '2560x1440 @ 30fps' : '1920x1080 @ 30fps',
      status: 'online',
      isXpeIntegrated: disc.model.toLowerCase().includes('xpe'),
      manufacturer: disc.manufacturer,
      model: disc.model,
      ip: disc.ip,
    };

    // Adiciona às câmeras ativas
    cameras.push(newCam);

    // Registra auditoria com hash
    publishEvent('CAMERA_PARAMETRIZED_VIA_DISCOVERY', 'device_manager', {
      ip: disc.ip,
      manufacturer: disc.manufacturer,
      model: disc.model,
      onvifProfile: newCam.profile,
      rtspGenerated: rtspUrl.replace(password, '*****'),
      go2rtcAlias: streamAlias,
    });

    res.json({
      success: true,
      message: `Câmera ${disc.manufacturer} parametrizada e importada com sucesso no go2rtc!`,
      camera: newCam,
      go2rtcConfigSnippet: profile.generateGo2rtcConfig(streamAlias, rtspUrl),
    });
  });

  app.post('/api/v1/discovery/test-stream', express.json(), async (req, res) => {
    const { ip, manufacturer, username = 'admin', password = 'password', rtspPort = 554 } = req.body;
    
    // Simula handshake RTSP OPTIONS e DESCRIBE
    await new Promise((resolve) => setTimeout(resolve, 400));

    res.json({
      success: true,
      ip,
      manufacturer,
      rtspHandshake: '200 OK (OPTIONS, DESCRIBE, SETUP)',
      videoCodec: 'H.264 (High Profile, Level 4.1)',
      audioCodec: 'G.711u / AAC',
      latencyEstimateMs: 42,
      onvifDeviceServiceAccessible: true,
    });
  });

  app.get('/api/v1/devices/iot', (req, res) => {
    res.json(iotDevices);
  });

  app.post('/api/v1/ai/maia', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt obrigatório.' });

    try {
      const result = await executeMaiaPrompt(prompt, currentSession);
      publishEvent('MAIA_ACTION_EXECUTED', 'maia_engine', { promptLength: prompt.length });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Erro no processamento da MaIA.', details: err?.message });
    }
  });

  // Endpoints de Notificações Push PWA
  const pushSubscriptions: Array<{ endpoint: string; userAgent: string; timestamp: number }> = [];

  app.post('/api/v1/notifications/subscribe', (req, res) => {
    const { endpoint, userAgent } = req.body;
    pushSubscriptions.push({
      endpoint: endpoint || 'browser-native-pwa',
      userAgent: userAgent || 'unknown',
      timestamp: Date.now(),
    });

    publishEvent('PUSH_SUBSCRIPTION_REGISTERED', 'pwa_service_worker', {
      totalSubscribers: pushSubscriptions.length,
      userAgent,
    });

    res.json({
      success: true,
      message: 'Dispositivo registrado com sucesso no serviço de Notificações Push da Portaria.',
      totalSubscribers: pushSubscriptions.length,
    });
  });

  app.get('/api/v1/notifications/status', (req, res) => {
    res.json({
      activeSubscribers: pushSubscriptions.length,
      channels: ['intercom_calls', 'packages', 'gates', 'sos'],
      serviceWorkerSupport: true,
    });
  });

  app.post('/api/v1/notifications/test', (req, res) => {
    const { type } = req.body;
    let title = '🔔 Chamada de Interfone: Portaria Social';
    let body = 'Visitante aguardando no XPE 3115-IP (Portaria Externa). Toque para atender.';

    if (type === 'package') {
      title = '📦 Encomenda Recebida na Portaria';
      body = 'Um novo pacote da Amazon/Mercado Livre foi registrado para seu apartamento.';
    } else if (type === 'gate') {
      title = '🚪 Abertura de Portão Registrada';
      body = 'Portão Pedestre Social acionado com sucesso via comando autorizado DTMF (*07).';
    }

    publishEvent('PUSH_NOTIFICATION_DISPATCHED', 'push_gateway', {
      type: type || 'intercom',
      title,
      subscribersCount: Math.max(1, pushSubscriptions.length),
    });

    res.json({
      success: true,
      title,
      body,
      timestamp: Date.now(),
    });
  });

  // ============================================================================
  // ENDPOINTS: ASSISTENTE DE INTEGRAÇÃO & RELÉS DO INTELBRAS XPE 3115-IP
  // ============================================================================
  let xpeConfig: XpeConfig = {
    ip: '192.168.1.150',
    netmask: '255.255.255.0',
    gateway: '192.168.1.1',
    httpPort: 80,
    sipServer: '192.168.1.200',
    sipPort: 5060,
    sipExtension: '8000',
    sipSecret: 'xpe_sec_intelbras_2026',
    audioCodec: 'PCMU',
    videoCodec: 'H.264',
    dtmfMode: 'RFC2833',
    relay1: {
      name: 'Portão Pedestre Social (FA)',
      lockType: 'eletromecanica',
      contactType: 'NA',
      retentionSeconds: 3,
      dtmfCommand: '*07',
      httpTriggerUrl: 'http://192.168.1.150/cgi-bin/relay.cgi?action=open&relay=1',
      targetGateId: 'gate-pedestre',
    },
    relay2: {
      name: 'Portão Garagem Veicular (AUX)',
      lockType: 'portao_garagem_botoeira',
      contactType: 'NA',
      retentionSeconds: 1,
      dtmfCommand: '*08',
      httpTriggerUrl: 'http://192.168.1.150/cgi-bin/relay.cgi?action=open&relay=2',
      targetGateId: 'gate-garagem',
    },
    rtspStream: {
      enabled: true,
      channel: 1,
      subType: 0,
      rtspPort: 554,
      username: 'admin',
      password: 'admin_password',
      url: 'rtsp://admin:admin_password@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0',
    },
    lastSyncedAt: new Date().toISOString(),
    status: 'online',
  };

  app.get('/api/v1/xpe/config', (req, res) => {
    res.json(xpeConfig);
  });

  app.post('/api/v1/xpe/test-connection', express.json(), async (req, res) => {
    const { ip = xpeConfig.ip, httpPort = xpeConfig.httpPort } = req.body || {};
    // Simula handshake ICMP ping e HTTP options
    await new Promise((resolve) => setTimeout(resolve, 500));

    res.json({
      success: true,
      ip,
      httpPort,
      pingLatencyMs: 1.4,
      httpStatusCode: 200,
      hardwareModel: 'Intelbras XPE 3115-IP (Versão de Hardware 2.0)',
      firmwareVersion: 'v2.600.0000000.1.R, Build: 2024-11-20',
      macAddress: '3C:83:B5:72:A1:FE',
      status: 'online',
      message: 'Conectividade LAN e interface HTTP validadas com sucesso.',
    });
  });

  app.post('/api/v1/xpe/test-sip', express.json(), async (req, res) => {
    const { sipServer, sipExtension, sipPort = 5060, dtmfMode = 'RFC2833' } = req.body || {};
    await new Promise((resolve) => setTimeout(resolve, 600));

    res.json({
      success: true,
      sipExtension: sipExtension || xpeConfig.sipExtension,
      sipServer: sipServer || xpeConfig.sipServer,
      sipPort,
      status: 'registered',
      sipResponse: 'SIP/2.0 200 OK (Registration Successful)',
      contactUri: `sip:${sipExtension || xpeConfig.sipExtension}@${xpeConfig.ip}:${sipPort}`,
      rttMs: 2.1,
      dtmfNegotiated: dtmfMode,
      codecsAccepted: ['PCMU (G.711u)', 'Opus', 'H.264 Baseline'],
      message: `Ramal ${sipExtension || xpeConfig.sipExtension} registrado com sucesso no Asterisk PJSIP.`,
    });
  });

  app.post('/api/v1/xpe/test-relay', express.json(), async (req, res) => {
    const { relayNumber, durationSeconds = 3 } = req.body || {};
    const relayNum = relayNumber === 2 ? 2 : 1;
    const gateTarget = relayNum === 1 ? gates.find((g) => g.type === 'pedestre') : gates.find((g) => g.type === 'garagem');

    if (gateTarget) {
      gateTarget.status = 'aberto';
      gateTarget.lastOpenedAt = new Date().toISOString();
      gateTarget.lastOpenedBy = `${currentSession.name} [Assistente XPE 3115]`;
      setTimeout(() => {
        gateTarget.status = 'fechado';
        publishEvent('GATE_CLOSED', 'xpe_relay_controller', { gateId: gateTarget.id, relayNumber: relayNum });
      }, (durationSeconds || 3) * 1000);
    }

    publishEvent('XPE_RELAY_TRIGGERED', 'xpe_controller', {
      relayNumber: relayNum,
      durationSeconds,
      method: 'CGI_HTTP_DIRECT',
      targetGate: gateTarget?.name,
    });

    logAudit(
      currentSession.name,
      currentSession.role,
      'TESTE_RELE_XPE_3115',
      gateTarget ? gateTarget.name : `Relé ${relayNum}`,
      'PERMITIDO',
      { relayNumber: relayNum, durationSeconds }
    );

    res.json({
      success: true,
      relayNumber: relayNum,
      gateName: gateTarget?.name || `Relé ${relayNum}`,
      durationSeconds,
      cgiResponse: 'HTTP/1.1 200 OK - result=success&relay=' + relayNum,
      message: `Relé ${relayNum} (${gateTarget?.name || 'Saída'}) acionado com sucesso por ${durationSeconds}s!`,
    });
  });

  app.post('/api/v1/xpe/save-config', express.json(), (req, res) => {
    const newConfig: XpeConfig = req.body;
    if (!newConfig || !newConfig.ip) {
      return res.status(400).json({ error: 'Configurações inválidas fornecidas.' });
    }

    xpeConfig = {
      ...newConfig,
      lastSyncedAt: new Date().toISOString(),
      status: 'online',
    };

    // Sincroniza códigos DTMF com a lista de gates
    const pedGate = gates.find((g) => g.type === 'pedestre');
    if (pedGate && xpeConfig.relay1?.dtmfCommand) {
      pedGate.dtmfCode = xpeConfig.relay1.dtmfCommand;
      pedGate.name = xpeConfig.relay1.name || pedGate.name;
    }

    const garGate = gates.find((g) => g.type === 'garagem');
    if (garGate && xpeConfig.relay2?.dtmfCommand) {
      garGate.dtmfCode = xpeConfig.relay2.dtmfCommand;
      garGate.name = xpeConfig.relay2.name || garGate.name;
    }

    // Sincroniza a câmera do XPE caso exista
    const xpeCam = cameras.find((c) => c.isXpeIntegrated);
    if (xpeCam && xpeConfig.rtspStream) {
      xpeCam.ip = xpeConfig.ip;
      xpeCam.rtspUrl = xpeConfig.rtspStream.url;
    }

    publishEvent('XPE_CONFIG_SAVED', 'xpe_controller', {
      ip: xpeConfig.ip,
      sipExtension: xpeConfig.sipExtension,
      relay1Dtmf: xpeConfig.relay1.dtmfCommand,
      relay2Dtmf: xpeConfig.relay2.dtmfCommand,
    });

    logAudit(
      currentSession.name,
      currentSession.role,
      'CONFIGURACAO_XPE_3115_ATUALIZADA',
      `Totem XPE-3115 (${xpeConfig.ip})`,
      'PERMITIDO',
      { ip: xpeConfig.ip, extension: xpeConfig.sipExtension }
    );

    res.json({
      success: true,
      message: 'Integração do Intelbras XPE 3115-IP configurada e sincronizada com sucesso!',
      config: xpeConfig,
    });
  });

  // Vite Middleware para Dev & Fallback Estático para Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Enlace-DoorIA] Servidor operacional na porta ${PORT} (0.0.0.0)`);
    console.log(`[Enlace-DoorIA] Piloto São Luís - MA | 12 Unidades | Asterisk 20+ PJSIP | MaIA AI Gateway`);
    console.log(`[Enlace-DoorIA] Banco de Dados: PostgreSQL 16 LTS Puro Local (Porta 5432)`);

    // Inicialização assíncrona do schema no PostgreSQL local
    initializePostgresSchema().catch((err) => {
      console.warn('[PostgreSQL Local] Inicialização assíncrona em espera:', err.message);
    });
  });
}

startServer().catch((err) => {
  console.error('[Enlace-DoorIA] Falha ao iniciar servidor:', err);
});
