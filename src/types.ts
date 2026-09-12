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

export interface Gate {
  id: string;
  name: string;
  type: 'pedestre' | 'garagem';
  dtmfCode: '*07' | '*08';
  status: 'fechado' | 'abrindo' | 'aberto' | 'fechando';
  sensorState: 'ok' | 'alerta_aberto_tempo_excessivo' | 'sensor_obstruido';
  lastOpenedAt?: string;
  lastOpenedBy?: string;
  relayPin: number;
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
  valorOriginal: number;
  diasAtraso: number;
  multa: number; // 2%
  juros: number; // 1% ao mês proporcional
  correcao: number;
  valorTotal: number;
  status: 'pago' | 'pendente' | 'atrasado' | 'em_acordo';
  pagoEm?: string;
  codigoBarras: string;
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
  | 'GATE_OPENED'
  | 'MAIA_ACTION_EXECUTED';

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
    ip: '192.168.1.150';
    firmware: 'v3.2.0-secure';
    audioCodec: 'G.711u / Opus';
    videoCodec: 'H.264 Baseline';
  };
  zigbeeGateway: {
    model: 'NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet';
    ip: '192.168.1.160';
    status: 'online';
    localFirstNoCloud: true;
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
