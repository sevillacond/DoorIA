/**
 * Enlace-DoorIA - Tipagens Centrais da Plataforma de Portaria Autônoma Inteligente
 * Master PRD v1.0 - Piloto São Luís - MA (1 condomínio / 12 unidades)
 */

export type UserRole =
  | 'super_admin'
  | 'admin_sistema'
  | 'admin_condominio'
  | 'sindico'
  | 'operador'
  | 'zelador'
  | 'morador';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unitId?: string;
  unitNumber?: string;
  mfaEnabled: boolean;
}

export interface Unit {
  id: string;
  number: string;
  block: string;
  floor: number;
  sipExtension: string;
  intercomCode: string;
  ownerName: string;
  ownerPhone: string;
  residents: Resident[];
  financialStatus: 'em_dia' | 'inadimplente' | 'em_acordo';
}

export interface Resident {
  id: string;
  unitId: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  isMainContact: boolean;
  sipDevice: {
    extension: string;
    registered: boolean;
    webrtcSupported: boolean;
  };
}

export interface Vehicle {
  id: string;
  unitId: string;
  brand: string;
  model: string;
  plate: string;
  color: string;
  parkingSpot: string;
}

export interface VisitorInvite {
  id: string;
  unitId: string;
  visitorName: string;
  document?: string;
  type: 'visitante' | 'entrega' | 'prestador';
  qrToken: string;
  validFrom: string;
  validUntil: string;
  status: 'ativo' | 'usado' | 'expirado' | 'revogado';
  entryCount: number;
}

export interface PackageDelivery {
  id: string;
  unitId: string;
  trackingCode: string;
  courier: string;
  description: string;
  receivedAt: string;
  status: 'aguardando_retirada' | 'entregue';
  pickupCode: string;
  pickedUpAt?: string;
}

export interface LprLogEntry {
  id: string;
  timestamp: string;
  plate: string;
  confidence: number;
  cameraName: string;
  matchedVehicle?: Vehicle;
  matchedUnitNumber?: string;
  action: 'ABERTURA_AUTOMATICA' | 'NEGADO_DESCONHECIDO' | 'ALERTA_SUSPEITO';
  reason: string;
  snapshotUrl?: string;
}

export interface Gate {
  id: string;
  name: string;
  type: 'pedestre' | 'garagem';
  dtmfCode: string;
  status: 'fechado' | 'abrindo' | 'aberto' | 'fechando' | 'comando_enviado' | 'falha';
  sensorState: 'ok' | 'alerta_aberto_tempo_excessivo' | 'sensor_obstruido';
  lastOpenedAt?: string;
  lastOpenedBy?: string;
  relayPin: number;
  relayIp?: string;
  isOpen?: boolean;
}

export interface CameraDevice {
  id: string;
  name: string;
  location: string;
  profile: 'ONVIF_Profile_T' | 'ONVIF_Profile_S';
  rtspUrl: string;
  webrtcStreamUrl: string;
  resolution: string;
  status: 'online' | 'offline';
  isXpeIntegrated?: boolean;
  manufacturer?: string;
  model?: string;
  ip?: string;
}

export interface DiscoveredCamera {
  id: string;
  ip: string;
  mac: string;
  manufacturer: 'Intelbras' | 'Hikvision' | 'Dahua' | 'Axis' | 'Uniview' | 'ONVIF Genérica';
  model: string;
  firmwareVersion?: string;
  onvifPort: number;
  rtspPort: number;
  httpPort: number;
  discoveryMethod: 'WS-Discovery' | 'SSDP' | 'ARP/OUI Scan';
  supportedProfiles: ('ONVIF_Profile_S' | 'ONVIF_Profile_T')[];
  suggestedRtspMain: string;
  suggestedRtspSub: string;
  suggestedGo2rtcConfig: string;
  isConfigured: boolean;
  defaultCredentialsHint?: string;
  detectedCodec: string;
}

export type CallOrigin = 'xpe_3115_ip' | 'qr_virtual_intercom' | 'app_webrtc';
export type CallPurpose = 'entrega' | 'visitante' | 'prestador' | 'outro';
export type CallState =
  | 'iniciando'
  | 'ura_maia'
  | 'chamando'
  | 'em_atendimento'
  | 'encerrada'
  | 'rejeitada'
  | 'nao_atendida';

export interface ActiveCall {
  id: string;
  origin: CallOrigin;
  sourceDevice: string;
  targetUnitId: string;
  targetUnitNumber: string;
  purpose?: CallPurpose;
  notes?: string;
  state: CallState;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  answeredByEndpoint?: string;
  visitorMedia: {
    hasVideo: boolean;
    hasAudio: boolean;
    videoStreamUri: string;
    mediaSessionId: string;
  };
  recording?: {
    recordingId: string;
    hashSha256: string;
    duration: number;
    encrypted: boolean;
  };
}

export interface CallLog {
  id: string;
  origin: CallOrigin;
  unitNumber: string;
  purpose: CallPurpose;
  startedAt: string;
  durationSeconds: number;
  status: 'atendida' | 'nao_atendida' | 'recusada';
  answeredBy?: string;
  gateOpened?: string;
  hasRecording: boolean;
  recordingId?: string;
}

export interface FinancialBill {
  id: string;
  unitId: string;
  unitNumber: string;
  competencia: string; // ex: "08/2026"
  vencimento: string; // ISO
  valorOriginal?: number;
  diasAtraso?: number;
  multa?: number; // 2%
  juros?: number; // 1% ao mês proporcional
  correcao?: number;
  valorTotal: number;
  status: 'pago' | 'pendente' | 'atrasado' | 'em_acordo';
  pagoEm?: string;
  codigoBarras?: string;
  taxaOrdinaria?: number;
  pixCopiaCola?: string;
  linhaDigitavel?: string;
  metodoPagamento?: string;
  externalId?: string;
}

export interface FinancialSummary {
  saldoAtual: number;
  recebiveisMes: number;
  totalInadimplencia: number;
  unidadesInadimplentesCount: number;
  proximosVencimentos: number;
  contasAPagar: number;
  receitaMensalPrevista: number;
  despesasMensais: number;
  resultadoOperacional: number;
}

export interface Agreement {
  id: string;
  unitId: string;
  unitNumber: string;
  totalOriginal: number;
  totalNegociado: number;
  entrada: number;
  parcelasTotal: number;
  parcelasPagas: number;
  valorParcela: number;
  diaVencimento: number;
  dataCriacao: string;
  status: 'ativo' | 'concluido' | 'rompido';
}

export interface IoTDevice {
  id: string;
  name: string;
  type: 'rele' | 'sensor_presenca' | 'iluminacao' | 'sirene';
  protocol: 'zigbee_3_0' | 'ethernet';
  gateway: 'NovaDigital_HNZ_CB3';
  state: 'ligado' | 'desligado' | 'detectado' | 'sem_movimento';
  batteryLevel?: number;
  online: boolean;
  location: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerEvent: string; // ex: "MOTION_GARAGEM", "XPE_CALL_STARTED"
  condition: string;
  action: string;
  lastExecutedAt?: string;
}

export type EventBusEventType =
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'DOOR_OPENED'
  | 'DOOR_FORCED'
  | 'CALL_STARTED'
  | 'CALL_ANSWERED'
  | 'CALL_ENDED'
  | 'CAMERA_OFFLINE'
  | 'DEVICE_OFFLINE'
  | 'MOTION_DETECTED'
  | 'PACKAGE_RECEIVED'
  | 'SOS_TRIGGERED'
  | 'PAYMENT_OVERDUE'
  | 'BILL_PAID'
  | 'GATE_OPENED'
  | 'CAMERA_ADDED'
  | 'CAMERA_REMOVED'
  | 'DISCOVERY_SCAN_COMPLETED'
  | 'CAMERA_PARAMETRIZED_VIA_DISCOVERY'
  | 'MAIA_ACTION_EXECUTED'
  | 'PUSH_SUBSCRIPTION_REGISTERED'
  | 'PUSH_NOTIFICATION_DISPATCHED'
  | 'CONDOMINIUM_CONFIG_UPDATED'
  | 'GATE_CLOSED'
  | 'XPE_RELAY_TRIGGERED'
  | 'XPE_CONFIG_SAVED';

export interface CondominiumConfig {
  id: string;
  name: string;
  tradingName: string;
  cnpj: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  unitsCount: number;
  blocks: string[];
  floorsCount: number;
  parkingSpotsCount: number;
  managementPhone: string;
  emergencyPhone: string;
  email: string;
  sindico: {
    name: string;
    document: string;
    phone: string;
    email: string;
    mandateStart: string;
    mandateEnd: string;
    apartment: string;
  };
  administrator: {
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    contactPerson: string;
  };
  operationalSettings: {
    pedestrianGatePulseSeconds: number;
    vehicleGatePulseSeconds: number;
    openGateAlertSeconds: number;
    dtmfPedestrian: string;
    dtmfVehicle: string;
    silencePeriodStart: string;
    silencePeriodEnd: string;
    packageDeliveryWindowStart: string;
    packageDeliveryWindowEnd: string;
    callTimeoutSeconds: number;
    autoUraFallback: boolean;
    localFirstOfflineMode: boolean;
    requireVisitorPhoto: boolean;
  };
  financialSettings: {
    dueDay: number;
    standardFee: number;
    reserveFundPercentage: number;
    latePenaltyPercentage: number;
    monthlyInterestPercentage: number;
    pixKeyType: 'cnpj' | 'email' | 'telefone' | 'aleatoria';
    pixKey: string;
    bankName: string;
    bankAgency: string;
    bankAccount: string;
  };
  technicalSettings: {
    localServerIp: string;
    asteriskVersion: string;
    xpeModel: string;
    xpeIp: string;
    iotGateway: string;
    iotGatewayIp: string;
    subnetRange: string;
    publicDomain?: string; // New field for public domain (e.g. pwa.meucondominio.com.br)
    stunTurnServer?: string; // New field for ICE servers
    asteriskWssPort?: number; // E.g., 8089 for secure websockets
    allowSelfSignedCerts?: boolean; // Accept invalid SSL for local networks
    localIpRange?: string; // E.g. 192.168.1.0/24
  };
  cloudIntegration?: {
    geminiApiKey?: string;
    aiGatewayUrl?: string; // e.g. 9router.enlace.slz.br
    geminiStatus?: 'not_configured' | 'active' | 'invalid';
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface EventBusMessage {
  id: string;
  timestamp: string;
  type: EventBusEventType;
  source: string;
  payload: Record<string, unknown>;
  audited: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  status: 'PERMITIDO' | 'NEGADO' | 'ALERTA';
  reason?: string;
  ipAddress: string;
  dtmfCommand?: string;
  details: Record<string, unknown>;
}

export interface MaiaMessage {
  id: string;
  sender: 'user' | 'maia' | 'system';
  content: string;
  timestamp: string;
  toolInvocations?: {
    toolName: string;
    params: Record<string, unknown>;
    result: Record<string, unknown>;
    authorized: boolean;
  }[];
}

export interface SystemStatus {
  asterisk: {
    status: 'online' | 'degraded' | 'offline';
    version: 'Asterisk 20.8 LTS Pure (No FreePBX)';
    pjsipEndpoints: number;
    activeChannels: number;
    uptime: string;
  };
  xpe3115: {
    status: 'online' | 'offline';
    ip: string;
    firmware: string;
    audioCodec: string;
    videoCodec: string;
  };
  zigbeeGateway: {
    model: string;
    ip: string;
    status: 'online' | 'offline';
    localFirstNoCloud: boolean;
    devicesConnected: number;
  };
  policyEngine: {
    status: 'online';
    rulesActive: number;
    lastDecisionLatencyMs: number;
  };
  maiaAiGateway: {
    provider: 'Gemini 3.8 Flash' | '9Router Fallback' | 'Offline URA Mode';
    status: 'ready' | 'fallback_ready';
    fallbackActive: boolean;
  };
  localNetwork: {
    isOnline: boolean;
    localFirstModeActive: boolean;
    ipRange: '192.168.1.0/24';
  };
  database?: {
    engine: string;
    status: 'online' | 'standby';
    host: string;
    port: number;
    database: string;
    mode: string;
    tablesCount?: number;
    latencyMs?: number;
  };
}

export interface CallRecordingAuditData {
  recordingId: string;
  callId: string;
  unitNumber: string;
  origin: CallOrigin;
  purpose: CallPurpose;
  startedAt: string;
  durationSeconds: number;
  hashSha256: string;
  audioUrl?: string;
  answeredBy: string;
  transcript: {
    speaker: 'visitante' | 'morador' | 'maia_ura';
    text: string;
    timestamp: string;
  }[];
  aiAuditSummary: {
    sentiment: 'pacifico' | 'atencao' | 'suspeito';
    gateOpened: boolean;
    authorizedRule: string;
    observations: string;
  };
}

// AMENITIES E RESERVAS
export interface Amenity {
  id: string;
  name: string;
  description: string;
  capacity: number;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  requiresFee: boolean;
  feeAmount?: number;
  requiresApproval: boolean;
  status: 'disponivel' | 'manutencao' | 'interditado';
  maxDurationHours: number;
  imageUrl?: string;
}

export interface Reservation {
  id: string;
  amenityId: string;
  unitId: string;
  unitNumber: string;
  residentName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada' | 'concluida';
  guestCount: number;
  notes?: string;
  feeAddedToBill?: boolean;
}

// INTEGRAÇÃO VISUAL INTELBRAS XPE 3115-IP
export interface XpeRelayConfig {
  name: string;
  lockType: 'eletroima' | 'eletromecanica' | 'solenoide' | 'portao_garagem_botoeira';
  contactType: 'NA' | 'NF';
  retentionSeconds: number;
  dtmfCommand: string;
  httpTriggerUrl: string;
  targetGateId: string;
}

export interface XpeConfig {
  ip: string;
  netmask: string;
  gateway: string;
  httpPort: number;
  sipServer: string;
  sipPort: number;
  sipExtension: string;
  sipSecret: string;
  audioCodec: 'PCMU' | 'PCMA' | 'Opus';
  videoCodec: 'H.264' | 'None';
  dtmfMode: 'RFC2833' | 'SIP_INFO' | 'INBAND';
  relay1: XpeRelayConfig;
  relay2: XpeRelayConfig;
  rtspStream: {
    enabled: boolean;
    channel: number;
    subType: number;
    rtspPort: number;
    username: string;
    password: string;
    url: string;
  };
  lastSyncedAt?: string;
  status: 'online' | 'offline' | 'verificando';
}
