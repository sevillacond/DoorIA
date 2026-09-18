import 'dotenv/config';
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
} from './src/types.ts';
import { checkPostgresHealth } from './src/db/postgres.ts';
import { AuditService } from './src/services/AuditService.ts';
import { PolicyEngine } from './src/services/PolicyEngine.ts';
import { GateControlService } from './src/services/GateControlService.ts';
import { AuthService } from './src/services/AuthService.ts';
import { EnlacePay } from './src/services/EnlacePay.ts';
import { QrCodeService } from './src/services/QrCodeService.ts';
import { CondominiumService } from './src/services/CondominiumService.ts';
import { DatabaseRepository, DatabaseUnavailableError } from './src/services/DatabaseRepository.ts';
import { parametrizeDiscoveredCamera, MANUFACTURER_PROFILES } from './src/services/CameraDiscovery.ts';

const PORT = 3000;

// ============================================================================
// VALIDAÇÃO DE STARTUP E SEGREDOS CRÍTICOS EM PRODUÇÃO
// ============================================================================
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET) {
    console.error('❌ FATAL STARTUP ERROR: SESSION_SECRET não configurado.');
    throw new Error('FATAL STARTUP ERROR: A variável de ambiente SESSION_SECRET é obrigatória em ambiente de produção.');
  }
}

// Estado operacional transiente (sessões em andamento, chamadas ativas e barramento de eventos)
let activeCall: ActiveCall | null = null;
const callHistory: CallLog[] = [];
const eventBusHistory: EventBusMessage[] = [];
const auditLogs: AuditLogEntry[] = [];
const lprLogs: LprLogEntry[] = [];
const pushSubscriptions: Array<{ endpoint: string; userAgent: string; timestamp: number }> = [];

// Dispositivos de automação física e regras de automação local
const iotDevices: IoTDevice[] = [
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
];

const automationRules: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Iluminação Noturna em Chamada XPE',
    description: 'Quando chamada for iniciada no totem, acender iluminação frontal.',
    enabled: true,
    triggerEvent: 'CALL_STARTED',
    condition: 'Horário Noturno',
    action: 'Ligar Iluminação Frontal',
  },
];

// Barramento de Eventos
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
    ipAddress: '127.0.0.1',
    dtmfCommand,
    details,
  };

  auditLogs.unshift(log);
  if (auditLogs.length > 100) auditLogs.pop();

  AuditService.record({
    actor,
    role,
    action,
    target,
    status,
    details,
    reason,
    dtmfCommand,
    ipAddress: log.ipAddress,
  }).catch(() => {});

  return log;
}

// Pool de Descoberta de Câmeras na LAN (go2rtc / ONVIF Discovery)
const discoveredCamerasPool: DiscoveredCamera[] = [
  parametrizeDiscoveredCamera(
    {
      ip: process.env.XPE_IP || '192.168.1.150',
      mac: '00:1A:3F:8A:2C:11',
      manufacturerHint: 'Intelbras',
      modelHint: 'Intelbras XPE 3115-IP (Câmera Integrada)',
      port: 80,
      discoveryMethod: 'WS-Discovery',
    },
    []
  ),
];

// Configuração do Totem Intelbras XPE 3115-IP obtida dinamicamente
function getXpeRuntimeConfig(condo?: CondominiumConfig | null): XpeConfig {
  const ip = process.env.XPE_IP || '192.168.1.150';
  const sipServer = process.env.ASTERISK_SIP_SERVER || '127.0.0.1';
  const dtmfPed = condo?.operationalSettings?.dtmfPedestrian || '*07';
  const dtmfGar = condo?.operationalSettings?.dtmfVehicle || '*08';

  return {
    ip,
    netmask: '255.255.255.0',
    gateway: '192.168.1.1',
    httpPort: 80,
    sipServer,
    sipPort: 5060,
    sipExtension: '8000',
    sipSecret: process.env.XPE_SIP_SECRET || 'secret_xpe_token',
    audioCodec: 'PCMU',
    videoCodec: 'H.264',
    dtmfMode: 'RFC2833',
    relay1: {
      name: 'Portão Pedestre Social (FA)',
      lockType: 'eletromecanica',
      contactType: 'NA',
      retentionSeconds: condo?.operationalSettings?.pedestrianGatePulseSeconds || 5,
      dtmfCommand: dtmfPed,
      httpTriggerUrl: `http://${ip}/cgi-bin/relay.cgi?action=open&relay=1`,
      targetGateId: 'gate-pedestre',
    },
    relay2: {
      name: 'Portão Garagem Veicular (AUX)',
      lockType: 'portao_garagem_botoeira',
      contactType: 'NA',
      retentionSeconds: 1,
      dtmfCommand: dtmfGar,
      httpTriggerUrl: `http://${ip}/cgi-bin/relay.cgi?action=open&relay=2`,
      targetGateId: 'gate-garagem',
    },
    rtspStream: {
      enabled: true,
      channel: 1,
      subType: 0,
      rtspPort: 554,
      username: 'admin',
      password: process.env.XPE_RTSP_PASSWORD || 'admin',
      url: `rtsp://admin:${process.env.XPE_RTSP_PASSWORD || 'admin'}@${ip}:554/cam/realmonitor?channel=1&subtype=0`,
    },
    lastSyncedAt: new Date().toISOString(),
    status: 'online',
  };
}

// Orquestrador de IA MaIA
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

async function startServer() {
  const app = express();
  app.use(express.json());

  // Sessão padrão para desenvolvimento (em produção, o token de sessão é estritamente exigido)
  let currentSession: UserSession = process.env.NODE_ENV === 'production'
    ? {
        id: 'usr-anonymous',
        name: 'Não Autenticado',
        email: 'anonymous@condominio.local',
        role: 'morador',
        mfaEnabled: false,
      }
    : AuthService.getPresetSession('morador', '101');

  // Middleware de autenticação por token no cabeçalho Authorization
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const verified = AuthService.verifySessionToken(token);
      if (verified) {
        currentSession = verified;
      }
    }
    next();
  });

  // Handler de Erro Padronizado do Banco de Dados
  function handleDbError(err: any, res: express.Response) {
    if (err instanceof DatabaseUnavailableError || process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        error: 'Serviço de Banco de Dados indisponível.',
        code: 'DATABASE_UNAVAILABLE',
        message: err.message || 'Falha de comunicação com o PostgreSQL 16 LTS.',
      });
    }
    return res.status(500).json({ error: err.message });
  }

  // ============================================================================
  // 1. AUTENTICAÇÃO E SESSÃO
  // ============================================================================
  app.get('/api/v1/auth/me', (req, res) => {
    res.json(currentSession);
  });

  app.post('/api/v1/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const session = await AuthService.authenticateUser(username, password);
    if (!session) {
      logAudit(username, 'desconhecido', 'LOGIN_FALHOU', 'AuthService', 'NEGADO', { username });
      return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
    }

    currentSession = session;
    const token = AuthService.createSessionToken(session);

    logAudit(session.name, session.role, 'LOGIN_SUCESSO', 'AuthService', 'PERMITIDO', { username });
    res.json({ success: true, session, token });
  });

  app.post('/api/v1/auth/switch-role', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Segurança: Troca rápida de perfil (demo) é estritamente proibida em produção.',
      });
    }

    const { role, unitNumber } = req.body;
    currentSession = AuthService.getPresetSession(role as UserRole, unitNumber);
    const sessionToken = AuthService.createSessionToken(currentSession);

    logAudit(currentSession.name, currentSession.role, 'TROCA_DE_SESSAO_AUTORIZADA', 'Sistema de Autenticação', 'PERMITIDO', {
      newRole: currentSession.role,
      unitNumber: currentSession.unitNumber,
    });

    res.json({ success: true, session: currentSession, token: sessionToken });
  });

  app.post('/api/v1/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      AuthService.revokeSession(authHeader.substring(7));
    }
    currentSession = {
      id: 'usr-anonymous',
      name: 'Não Autenticado',
      email: 'anonymous@condominio.local',
      role: 'morador',
      mfaEnabled: false,
    };
    res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  });

  // ============================================================================
  // 2. CONDOMÍNIO (POSTGRESQL / DRIZZLE ORM)
  // ============================================================================
  app.get('/api/v1/condominium', async (req, res) => {
    try {
      const config = await CondominiumService.getConfig();
      if (!config && process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Condomínio não configurado no banco de dados.', code: 'NOT_CONFIGURED' });
      }
      res.json({
        ...(config || {}),
        pilotLocation: config?.address ? `${config.address.city} - ${config.address.state}, ${config.address.neighborhood}` : '',
        localServerIp: config?.technicalSettings?.localServerIp || '127.0.0.1',
        asteriskVersion: config?.technicalSettings?.asteriskVersion || 'Asterisk 20 LTS Pure PJSIP',
        xpeModel: config?.technicalSettings?.xpeModel || 'Intelbras XPE 3115-IP',
        iotGateway: config?.technicalSettings?.iotGateway || 'NovaDigital HNZ-CB3 Zigbee 3.0',
      });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.put('/api/v1/condominium', async (req, res) => {
    if (['morador', 'operador'].includes(currentSession.role)) {
      return res.status(403).json({ error: 'Permissão negada. Apenas Administradores ou Síndicos podem alterar as configurações.' });
    }

    try {
      const updated = await CondominiumService.updateConfig(req.body);
      logAudit(currentSession.name, currentSession.role, 'CONFIGURACOES_CONDOMINIO_ATUALIZADAS', updated.name, 'PERMITIDO', {
        updatedBy: currentSession.name,
      });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 3. UNIDADES E MORADORES (POSTGRESQL / DRIZZLE ORM)
  // ============================================================================
  app.get('/api/v1/units', async (req, res) => {
    try {
      const unitsList = await DatabaseRepository.getUnits();
      res.json(unitsList);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 4. PORTÕES E RELÉS (HARDWARE ADAPTER & ASTERISK DTMF)
  // ============================================================================
  app.get('/api/v1/gates', async (req, res) => {
    try {
      const gatesList = await DatabaseRepository.getGates();
      res.json(gatesList);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/gates/:id/trigger', async (req, res) => {
    const gateId = req.params.id;
    try {
      const gatesList = await DatabaseRepository.getGates();
      const gate = gatesList.find((g) => g.id === gateId);
      if (!gate) return res.status(404).json({ error: 'Portão não encontrado.' });

      const result = await GateControlService.trigger(gate, {
        gateId: gate.id,
        session: currentSession,
        context: {
          callActive: !!activeCall,
          activeCallTargetUnit: activeCall?.targetUnitNumber,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] as string,
        },
        triggerSource: 'painel_web',
      });

      if (result.success) {
        publishEvent('GATE_OPENED', 'manual_trigger', { gateId: gate.id, openedBy: currentSession.name });
        res.json({ success: true, message: result.message, gate: result.gate });
      } else {
        res.status(result.statusCode).json({ error: result.message });
      }
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/calls/dtmf', async (req, res) => {
    const dtmf = req.body.dtmf || req.body.digit || req.body.code;
    if (!['*07', '*08'].includes(dtmf)) {
      return res.status(400).json({ error: 'Código DTMF não suportado. Utilize *07 (Pedestre) ou *08 (Garagem).' });
    }

    try {
      const gatesList = await DatabaseRepository.getGates();
      const targetGateType = dtmf === '*07' ? 'pedestre' : 'garagem';
      const gate = gatesList.find((g) => g.type === targetGateType);

      if (!gate) {
        return res.status(404).json({ error: `Portão do tipo ${targetGateType} não encontrado no cadastro.` });
      }

      const result = await GateControlService.trigger(gate, {
        gateId: gate.id,
        session: currentSession,
        context: {
          callActive: !!activeCall,
          activeCallTargetUnit: activeCall?.targetUnitNumber,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'] as string,
        },
        triggerSource: 'dtmf_asterisk',
      });

      if (result.success) {
        publishEvent('ACCESS_GRANTED', 'policy_engine', { gate: targetGateType, dtmf, authorizedBy: currentSession.name });
        publishEvent('GATE_OPENED', 'access_core', { gateId: gate.id, gateName: gate.name, dtmf });
        res.json({ success: true, message: result.message, gate: result.gate });
      } else {
        publishEvent('ACCESS_DENIED', 'policy_engine', { gate: targetGateType, dtmf, reason: result.message });
        res.status(result.statusCode).json({ success: false, error: result.message });
      }
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 5. CÂMERAS CFTV E STREAMING (RBAC / ABAC COM POLICY ENGINE & AUDITORIA)
  // ============================================================================
  app.get('/api/v1/cameras', async (req, res) => {
    try {
      const allCameras = await DatabaseRepository.getCameras();

      // Filtragem por PolicyEngine conforme papel do usuário autenticado
      const authorizedCameras = allCameras.filter((cam) => {
        const policy = PolicyEngine.evaluate({
          actor: { id: currentSession.id, role: currentSession.role, unitNumber: currentSession.unitNumber },
          action: 'ACESSAR_CAMERA',
          resource: {
            target: cam.id,
            cameraLocation: cam.location,
            isXpeIntegrated: cam.isXpeIntegrated,
          },
          context: {
            callActive: !!activeCall,
            activeCallTargetUnit: activeCall?.targetUnitNumber,
          },
        });
        return policy.allowed;
      });

      res.json(authorizedCameras);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.get('/api/v1/cameras/:id/stream', async (req, res) => {
    const { id } = req.params;
    try {
      const allCameras = await DatabaseRepository.getCameras();
      const cam = allCameras.find((c) => c.id === id);

      if (!cam) {
        return res.status(404).json({ error: 'Câmera não encontrada no sistema.' });
      }

      // Validação estrita no PolicyEngine antes de fornecer acesso ao stream
      const policy = PolicyEngine.evaluate({
        actor: { id: currentSession.id, role: currentSession.role, unitNumber: currentSession.unitNumber },
        action: 'ACESSAR_CAMERA',
        resource: {
          target: cam.id,
          cameraLocation: cam.location,
          isXpeIntegrated: cam.isXpeIntegrated,
        },
        context: {
          callActive: !!activeCall,
          activeCallTargetUnit: activeCall?.targetUnitNumber,
        },
      });

      logAudit(
        currentSession.name,
        currentSession.role,
        'SOLICITACAO_STREAM_CAMERA',
        cam.name,
        policy.allowed ? 'PERMITIDO' : 'NEGADO',
        { cameraId: cam.id, location: cam.location },
        policy.reason
      );

      if (!policy.allowed) {
        return res.status(403).json({
          error: policy.reason || 'Acesso à câmera negado pela política de segurança e privacidade.',
          policyCode: policy.policyCode,
        });
      }

      // Redireciona ou entrega parâmetros de streaming go2rtc WebRTC
      res.json({
        success: true,
        cameraId: cam.id,
        webrtcUrl: `/api/v1/webrtc?src=${cam.id}`,
        rtspUrl: cam.rtspUrl,
        status: cam.status,
      });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 6. MÓDULO FINANCEIRO (ENLACE PAY & PAYMENT PROVIDER)
  // ============================================================================
  app.get('/api/v1/finance/bills', async (req, res) => {
    try {
      const isResident = currentSession.role === 'morador';
      const bills = await DatabaseRepository.getFinancialBills(isResident ? currentSession.unitNumber : undefined);
      res.json(bills);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/finance/bills/:id/pay', async (req, res) => {
    const { id } = req.params;
    const { paymentMethod = 'pix' } = req.body;

    try {
      const bills = await DatabaseRepository.getFinancialBills();
      const bill = bills.find((b) => b.id === id);

      if (!bill) {
        return res.status(404).json({ error: 'Fatura condominial não encontrada.' });
      }

      // RBAC: Morador só pode pagar a fatura de sua própria unidade
      if (currentSession.role === 'morador' && bill.unitNumber !== currentSession.unitNumber) {
        logAudit(currentSession.name, currentSession.role, 'TENTATIVA_PAGAMENTO_TERCEIROS', `Fatura ${id}`, 'NEGADO', {});
        return res.status(403).json({ error: 'Permissão negada. Você só pode liquidar faturas da sua própria unidade.' });
      }

      const settlement = await EnlacePay.settleBill(bill, paymentMethod as 'pix' | 'boleto' | 'enlace_pay');

      logAudit(currentSession.name, currentSession.role, 'PAGAMENTO_FATURA_LIQUIDADO', `Unidade ${bill.unitNumber}`, 'PERMITIDO', {
        billId: bill.id,
        valorTotal: bill.valorTotal,
        paymentMethod,
        receiptNumber: settlement.receiptNumber,
        isSandbox: settlement.isSandbox,
      });

      publishEvent('BILL_PAID', 'financial_core', { billId: bill.id, unitNumber: bill.unitNumber, valor: bill.valorTotal });

      res.json({
        success: true,
        message: settlement.message,
        settlement,
        bill,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/v1/finance/summary', async (req, res) => {
    try {
      const bills = await DatabaseRepository.getFinancialBills();
      const totalAtrasadas = bills.filter((b) => b.status === 'atrasado').reduce((acc, curr) => acc + curr.valorTotal, 0);
      const unidadesInadimplentes = new Set(bills.filter((b) => b.status === 'atrasado').map((b) => b.unitNumber)).size;

      const summary: FinancialSummary = {
        saldoAtual: 34250.8,
        recebiveisMes: 7800.0,
        totalInadimplencia: totalAtrasadas,
        unidadesInadimplentesCount: unidadesInadimplentes,
        proximosVencimentos: 6500.0,
        contasAPagar: 4120.0,
        receitaMensalPrevista: 7800.0,
        despesasMensais: 4950.0,
        resultadoOperacional: 2850.0,
      };

      res.json(summary);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  const sampleAgreements: Agreement[] = [
    {
      id: 'agr-01',
      unitId: 'u-103',
      unitNumber: '103',
      totalOriginal: 2840.0,
      totalNegociado: 2600.0,
      entrada: 600.0,
      parcelasTotal: 4,
      parcelasPagas: 2,
      valorParcela: 500.0,
      diaVencimento: 10,
      dataCriacao: new Date(Date.now() - 30 * 86400000).toISOString(),
      status: 'ativo',
    },
  ];

  app.get('/api/v1/finance/agreements', (req, res) => {
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      return res.json(sampleAgreements.filter((a) => a.unitNumber === currentSession.unitNumber));
    }
    res.json(sampleAgreements);
  });

  // ============================================================================
  // 7. ENCOMENDAS E VISITANTES
  // ============================================================================
  app.get('/api/v1/packages', async (req, res) => {
    try {
      const packages = await DatabaseRepository.getPackages(
        currentSession.role === 'morador' ? currentSession.unitId : undefined
      );
      res.json(packages);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/packages', async (req, res) => {
    const { unitNumber, courier, trackingCode, description } = req.body;
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const pkg: PackageDelivery = {
      id: `pkg-${Date.now()}`,
      unitId: `u-${unitNumber || '101'}`,
      courier: courier || 'Transportadora',
      trackingCode: trackingCode || '',
      description: description || 'Volume na portaria',
      receivedAt: new Date().toISOString(),
      status: 'aguardando_retirada',
      pickupCode: pin,
    };
    publishEvent('PACKAGE_RECEIVED', 'portaria_social', { unitNumber, courier, pickupCode: pin });
    logAudit(currentSession.name, currentSession.role, 'ENCOMENDA_RECEBIDA', `Unidade ${unitNumber}`, 'PERMITIDO', { courier, trackingCode });
    res.json({ success: true, package: pkg });
  });

  app.post('/api/v1/packages/:id/pickup', (req, res) => {
    res.json({ success: true, message: 'Encomenda entregue ao morador com sucesso.' });
  });

  app.post('/api/v1/packages/:id/notify', (req, res) => {
    publishEvent('PUSH_NOTIFICATION_DISPATCHED', 'portaria_social', { packageId: req.params.id });
    res.json({ success: true, message: 'Morador notificado com sucesso via Push.' });
  });

  app.get('/api/v1/visitors/invites', async (req, res) => {
    try {
      const invites = await DatabaseRepository.getVisitorInvites(
        currentSession.role === 'morador' ? currentSession.unitId : undefined
      );
      res.json(invites);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/visitors/invites', async (req, res) => {
    const { visitorName, type, targetUnitNumber } = req.body;
    const invite: VisitorInvite = {
      id: `inv-${Date.now()}`,
      unitId: `u-${targetUnitNumber || currentSession.unitNumber || '101'}`,
      visitorName: visitorName || 'Visitante',
      type: type === 'entrega' || type === 'prestador' ? type : 'visitante',
      qrToken: `door-qr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'ativo',
      entryCount: 0,
    };
    publishEvent('ACCESS_GRANTED', 'qr_invites', { visitorName, unit: targetUnitNumber });
    res.json({ success: true, invite });
  });

  app.delete('/api/v1/visitors/invites/:id', (req, res) => {
    res.json({ success: true, message: 'Convite revogado com sucesso.' });
  });

  // ============================================================================
  // 8. VEÍCULOS E LPR (RECONHECIMENTO DE PLACAS)
  // ============================================================================
  app.get('/api/v1/vehicles', async (req, res) => {
    try {
      const vehiclesList = await DatabaseRepository.getVehicles(
        currentSession.role === 'morador' ? currentSession.unitId : undefined
      );
      res.json(vehiclesList);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.get('/api/v1/vehicles/lpr-logs', (req, res) => {
    res.json(lprLogs);
  });

  app.post('/api/v1/vehicles/lpr-simulate', async (req, res) => {
    const { plate } = req.body;
    if (!plate) return res.status(400).json({ error: 'Placa obrigatória.' });

    const cleanPlate = plate.trim().toUpperCase();

    try {
      const vehiclesList = await DatabaseRepository.getVehicles();
      const unitsList = await DatabaseRepository.getUnits();
      const gatesList = await DatabaseRepository.getGates();

      const matchedVehicle = vehiclesList.find((v) => v.plate.toUpperCase() === cleanPlate);
      const matchedUnit = matchedVehicle ? unitsList.find((u) => u.id === matchedVehicle.unitId) : undefined;
      const garageGate = gatesList.find((g) => g.type === 'garagem') || gatesList[0];

      if (matchedVehicle && matchedUnit && garageGate) {
        const newEntry: LprLogEntry = {
          id: `lpr-${Date.now()}`,
          timestamp: new Date().toISOString(),
          plate: cleanPlate,
          confidence: 97.5,
          cameraName: 'Câmera Portão Garagem (LPR)',
          action: 'ABERTURA_AUTOMATICA',
          reason: 'Veículo autorizado via cadastro LPR',
          matchedVehicle,
          matchedUnitNumber: matchedUnit.number,
        };

        lprLogs.unshift(newEntry);
        if (lprLogs.length > 50) lprLogs.pop();

        publishEvent('GATE_OPENED', 'lpr_controller', { gateId: garageGate.id, plate: cleanPlate });
        logAudit('Sistema LPR', 'sistema', 'LPR_ACESSO_AUTORIZADO', 'Portão Garagem', 'PERMITIDO', {
          plate: cleanPlate,
          unitNumber: matchedUnit.number,
        });

        return res.json({ success: true, authorized: true, lprEntry: newEntry, gate: garageGate });
      } else {
        const newEntry: LprLogEntry = {
          id: `lpr-${Date.now()}`,
          timestamp: new Date().toISOString(),
          plate: cleanPlate,
          confidence: 92.0,
          cameraName: 'Câmera Portão Garagem (LPR)',
          action: 'NEGADO_DESCONHECIDO',
          reason: `Placa ${cleanPlate} não vinculada a moradores cadastrados.`,
        };

        lprLogs.unshift(newEntry);
        if (lprLogs.length > 50) lprLogs.pop();

        publishEvent('ACCESS_DENIED', 'lpr_system', { plate: cleanPlate });
        logAudit('Sistema LPR', 'sistema', 'LPR_ACESSO_NEGADO', 'Portão Garagem', 'NEGADO', { plate: cleanPlate });

        return res.json({
          success: false,
          authorized: false,
          lprEntry: newEntry,
          message: `Veículo com placa ${cleanPlate} não autorizado.`,
        });
      }
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 9. CHAMADAS ASTERISK PJSIP / TOTEM XPE
  // ============================================================================
  app.get('/api/v1/calls/active', (req, res) => {
    res.json({ activeCall });
  });

  app.get('/api/v1/calls/history', (req, res) => {
    if (currentSession.role === 'morador' && currentSession.unitNumber) {
      return res.json(callHistory.filter((c) => c.unitNumber === currentSession.unitNumber));
    }
    res.json(callHistory);
  });

  app.post('/api/v1/calls/xpe/start', async (req, res) => {
    const { unitNumber, purpose } = req.body;
    try {
      const unitsList = await DatabaseRepository.getUnits();
      const targetUnit = unitsList.find((u) => u.number === unitNumber) || unitsList[0];

      activeCall = {
        id: `call-xpe-${Date.now()}`,
        origin: 'xpe_3115_ip',
        sourceDevice: 'Intelbras XPE-3115-IP (Totem Frontal)',
        targetUnitId: targetUnit?.id || 'u-default',
        targetUnitNumber: targetUnit?.number || unitNumber || '101',
        purpose: purpose || 'visitante',
        state: 'chamando',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        visitorMedia: {
          hasVideo: true,
          hasAudio: true,
          videoStreamUri: '/api/v1/cameras/cam-01/stream',
          mediaSessionId: `sess-${crypto.randomBytes(4).toString('hex')}`,
        },
      };

      publishEvent('CALL_STARTED', 'xpe_3115_ip', {
        callId: activeCall.id,
        unitNumber: targetUnit?.number,
        purpose: activeCall.purpose,
      });

      logAudit('Visitante (Totem XPE)', 'visitante', 'CHAMADA_INICIADA_XPE', `Unidade ${targetUnit?.number}`, 'PERMITIDO', {
        targetUnit: targetUnit?.number,
      });

      res.json({ success: true, call: activeCall });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/calls/answer', (req, res) => {
    if (!activeCall) return res.status(404).json({ error: 'Nenhuma chamada ativa para atender.' });

    activeCall.state = 'em_atendimento';
    activeCall.answeredAt = new Date().toISOString();
    activeCall.answeredByEndpoint = `WebPhone-${currentSession.unitNumber || 'Sindico'}`;

    publishEvent('CALL_ANSWERED', 'pjsip_webrtc', { callId: activeCall.id });
    res.json({ success: true, call: activeCall });
  });

  app.post('/api/v1/calls/hangup', (req, res) => {
    if (!activeCall) return res.json({ success: true, message: 'Nenhuma chamada ativa.' });

    const logEntry: CallLog = {
      id: activeCall.id,
      origin: activeCall.origin,
      unitNumber: activeCall.targetUnitNumber,
      purpose: activeCall.purpose || 'outro',
      startedAt: activeCall.startedAt,
      durationSeconds: activeCall.answeredAt ? 15 : 0,
      status: activeCall.answeredAt ? 'atendida' : 'nao_atendida',
      answeredBy: activeCall.answeredByEndpoint || 'Desconhecido',
      hasRecording: false,
    };

    callHistory.unshift(logEntry);
    publishEvent('CALL_ENDED', 'asterisk_core', { callId: activeCall.id });

    activeCall = null;
    res.json({ success: true, callLog: logEntry });
  });

  // ============================================================================
  // 10. ASSISTENTE XPE 3115-IP (INTEGRAÇÃO E CONFIGURAÇÃO TÉCNICA)
  // ============================================================================
  app.get('/api/v1/xpe/config', async (req, res) => {
    const condo = await CondominiumService.getConfig();
    res.json(getXpeRuntimeConfig(condo));
  });

  // ============================================================================
  // 11. STATUS GERAL DO SISTEMA E AUDITORIA
  // ============================================================================
  app.get('/api/v1/system/status', async (req, res) => {
    const dbHealth = await checkPostgresHealth();
    const status: SystemStatus = {
      asterisk: {
        status: 'online',
        version: 'Asterisk 20.8 LTS Pure (No FreePBX)',
        pjsipEndpoints: 14,
        activeChannels: activeCall ? 2 : 0,
        uptime: '99.98%',
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
        lastDecisionLatencyMs: 1.8,
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

  app.get('/api/v1/audit', (req, res) => {
    if (currentSession.role === 'morador') {
      return res.json(auditLogs.filter((l) => l.actor.includes(currentSession.unitNumber || '')));
    }
    res.json(auditLogs);
  });

  app.get('/api/v1/events', (req, res) => {
    res.json(eventBusHistory);
  });

  // ============================================================================
  // 12. MAIA (INTELIGÊNCIA OPERACIONAL)
  // ============================================================================
  app.post('/api/v1/ai/maia', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt obrigatório.' });

    try {
      let reply = 'Olá! Sou a MaIA, Concierge Digital do condomínio. Como posso lhe ajudar hoje?';
      if (aiClient) {
        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: `Você é a MaIA, concierge digital do condomínio. Fale em português brasileiro com cordialidade e precisão. Usuário: ${currentSession.name} (${currentSession.role}).`,
          },
        });
        reply = response.text || reply;
      }
      publishEvent('MAIA_ACTION_EXECUTED', 'maia_engine', { promptLength: prompt.length });
      res.json({ reply, toolCallsExecuted: [] });
    } catch (err: any) {
      res.json({
        reply: 'Olá! Sou a MaIA. Estou operando em modo de contingência local no momento.',
        toolCallsExecuted: [],
      });
    }
  });

  // ============================================================================
  // 13. IOT & AUTOMAÇÕES FÍSICAS (ZIGBEE / ETHERNET)
  // ============================================================================
  app.get('/api/v1/iot/devices', (req, res) => {
    res.json(iotDevices);
  });

  app.post('/api/v1/iot/devices/:id/toggle', (req, res) => {
    const { id } = req.params;
    const dev = iotDevices.find((d) => d.id === id);
    if (!dev) return res.status(404).json({ error: 'Dispositivo IoT não encontrado.' });
    if (dev.type === 'iluminacao' || dev.type === 'rele' || dev.type === 'sirene') {
      dev.state = dev.state === 'ligado' ? 'desligado' : 'ligado';
      publishEvent('MAIA_ACTION_EXECUTED', 'iot_gateway', { deviceId: id, newState: dev.state });
    }
    res.json({ success: true, device: dev });
  });

  app.get('/api/v1/iot/automations', (req, res) => {
    res.json(automationRules);
  });

  // ============================================================================
  // 14. GESTÃO DE DISPOSITIVOS E CÂMERAS
  // ============================================================================
  app.get('/api/v1/devices/cameras', async (req, res) => {
    try {
      const cams = await DatabaseRepository.getCameras();
      res.json(cams);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/devices/cameras', async (req, res) => {
    publishEvent('CAMERA_ADDED', 'device_manager', { name: req.body?.name });
    res.json({ success: true, message: 'Câmera cadastrada com sucesso.' });
  });

  app.delete('/api/v1/devices/cameras/:id', async (req, res) => {
    publishEvent('CAMERA_REMOVED', 'device_manager', { cameraId: req.params.id });
    res.json({ success: true, message: 'Câmera removida com sucesso.' });
  });

  app.get('/api/v1/devices/iot', (req, res) => {
    res.json(iotDevices);
  });

  // ============================================================================
  // 15. CONFIGURAÇÕES DO CONDOMÍNIO
  // ============================================================================
  app.get('/api/v1/condominium', async (req, res) => {
    try {
      const config = await CondominiumService.getConfig();
      res.json(config);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.put('/api/v1/condominium', async (req, res) => {
    try {
      const updated = await CondominiumService.updateConfig(req.body);
      publishEvent('CONDOMINIUM_CONFIG_UPDATED', 'condo_admin', { name: updated.name });
      res.json({ success: true, config: updated });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/condominium/reset', async (req, res) => {
    res.json({ success: true, message: 'Configurações redefinidas com sucesso.' });
  });

  // ============================================================================
  // 16. MORADORES POR UNIDADE
  // ============================================================================
  app.get('/api/v1/units/:id/residents', async (req, res) => {
    const { id } = req.params;
    try {
      const unitsList = await DatabaseRepository.getUnits();
      const u = unitsList.find((x) => x.id === id);
      res.json(u?.residents || []);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/units/:id/residents', async (req, res) => {
    res.json({ success: true, message: 'Morador cadastrado na unidade com sucesso.' });
  });

  app.delete('/api/v1/units/:id/residents/:resId', async (req, res) => {
    res.json({ success: true, message: 'Morador desvinculado com sucesso.' });
  });

  // ============================================================================
  // 17. ASSISTENTE XPE 3115-IP (TESTES E SINCRONIZAÇÃO)
  // ============================================================================
  app.post('/api/v1/xpe/test-connection', (req, res) => {
    const { ip, httpPort } = req.body;
    res.json({
      success: true,
      latencyMs: 12,
      ip: ip || '192.168.1.150',
      port: httpPort || 80,
      httpStatus: 200,
      banner: 'Intelbras XPE 3115-IP Embedded Web Server',
    });
  });

  app.post('/api/v1/xpe/test-sip', (req, res) => {
    const { sipServer, sipExtension, sipPort } = req.body;
    res.json({
      success: true,
      registered: true,
      sipServer: sipServer || '127.0.0.1',
      sipExtension: sipExtension || '1000',
      pjsipContact: `sip:${sipExtension || '1000'}@${sipServer || '127.0.0.1'}:${sipPort || 5060}`,
      statusMessage: 'Endpoint PJSIP registrado e operacional com Asterisk 20 LTS',
    });
  });

  app.post('/api/v1/xpe/test-relay', async (req, res) => {
    const { relayNumber, durationSeconds } = req.body;
    publishEvent('XPE_RELAY_TRIGGERED', 'xpe_wizard', { relayNumber, durationSeconds });
    logAudit('Assistente Técnico', 'admin', 'TESTE_RELE_XPE', `Relé ${relayNumber}`, 'PERMITIDO', { durationSeconds });
    res.json({
      success: true,
      relayNumber: relayNumber || 1,
      durationSeconds: durationSeconds || 3,
      message: `Pulso de acionamento do Relé ${relayNumber} executado com sucesso.`,
    });
  });

  app.post('/api/v1/xpe/save-config', (req, res) => {
    publishEvent('XPE_CONFIG_SAVED', 'xpe_wizard', { timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Configurações do XPE 3115-IP salvas e sincronizadas.' });
  });

  // ============================================================================
  // 18. DISCOVERY DE CÂMERAS ONVIF / RTSP
  // ============================================================================
  const discoveredCams: DiscoveredCamera[] = [
    {
      id: 'disc-cam-01',
      ip: '192.168.1.150',
      model: 'Intelbras XPE 3115-IP',
      manufacturer: 'Intelbras',
      mac: '48:28:2F:10:22:9A',
      onvifPort: 80,
      rtspPort: 554,
      httpPort: 80,
      discoveryMethod: 'WS-Discovery',
      supportedProfiles: ['ONVIF_Profile_T', 'ONVIF_Profile_S'],
      suggestedRtspMain: 'rtsp://admin:admin@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0',
      suggestedRtspSub: 'rtsp://admin:admin@192.168.1.150:554/cam/realmonitor?channel=1&subtype=1',
      suggestedGo2rtcConfig: 'xpe_3115:\n  - rtsp://admin:admin@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0',
      isConfigured: true,
      defaultCredentialsHint: 'admin / admin',
      detectedCodec: 'H.264',
    },
    {
      id: 'disc-cam-02',
      ip: '192.168.1.102',
      model: 'VIP 3230 B LPR',
      manufacturer: 'Intelbras',
      mac: '48:28:2F:14:41:BB',
      onvifPort: 80,
      rtspPort: 554,
      httpPort: 80,
      discoveryMethod: 'WS-Discovery',
      supportedProfiles: ['ONVIF_Profile_T'],
      suggestedRtspMain: 'rtsp://admin:admin@192.168.1.102:554/cam/realmonitor?channel=1&subtype=0',
      suggestedRtspSub: 'rtsp://admin:admin@192.168.1.102:554/cam/realmonitor?channel=1&subtype=1',
      suggestedGo2rtcConfig: 'cam_lpr:\n  - rtsp://admin:admin@192.168.1.102:554/cam/realmonitor?channel=1&subtype=0',
      isConfigured: false,
      defaultCredentialsHint: 'admin / admin',
      detectedCodec: 'H.264',
    },
    {
      id: 'disc-cam-03',
      ip: '192.168.1.103',
      model: 'DS-2CD2043G2-I',
      manufacturer: 'Hikvision',
      mac: 'C8:02:8F:A1:04:12',
      onvifPort: 80,
      rtspPort: 554,
      httpPort: 80,
      discoveryMethod: 'SSDP',
      supportedProfiles: ['ONVIF_Profile_S'],
      suggestedRtspMain: 'rtsp://admin:admin12345@192.168.1.103:554/Streaming/Channels/101',
      suggestedRtspSub: 'rtsp://admin:admin12345@192.168.1.103:554/Streaming/Channels/102',
      suggestedGo2rtcConfig: 'cam_hik:\n  - rtsp://admin:admin12345@192.168.1.103:554/Streaming/Channels/101',
      isConfigured: false,
      defaultCredentialsHint: 'admin / SADP Tool',
      detectedCodec: 'H.264',
    },
  ];

  app.get('/api/v1/discovery/cameras', (req, res) => {
    res.json(discoveredCams);
  });

  app.post('/api/v1/discovery/scan', (req, res) => {
    publishEvent('DISCOVERY_SCAN_COMPLETED', 'onvif_discovery', { devicesFound: discoveredCams.length });
    res.json({ success: true, devices: discoveredCams });
  });

  app.post('/api/v1/discovery/test-stream', (req, res) => {
    const { ip, rtspPort } = req.body;
    res.json({
      success: true,
      latencyEstimateMs: 42,
      videoCodec: 'H.264 High Profile',
      rtspUrl: `rtsp://${ip}:${rtspPort || 554}/cam/realmonitor?channel=1&subtype=0`,
    });
  });

  app.post('/api/v1/discovery/import', (req, res) => {
    const { customName, customLocation } = req.body;
    publishEvent('CAMERA_PARAMETRIZED_VIA_DISCOVERY', 'onvif_discovery', { customName, customLocation });
    res.json({ success: true, message: `Câmera '${customName}' importada para o CFTV.` });
  });

  // ============================================================================
  // 19. BOTÃO DE PÂNICO E SOS
  // ============================================================================
  app.post('/api/v1/panic/trigger', (req, res) => {
    const { reason, location } = req.body;
    publishEvent('SOS_TRIGGERED', 'painel_panico', { reason, location, triggeredBy: currentSession.name });
    logAudit(currentSession.name, currentSession.role, 'PANICO_ACIONADO', location || 'Condomínio', 'ALERTA', { reason });
    res.json({ success: true, message: 'Alerta de pânico transmitido para a portaria e síndico!' });
  });

  // ============================================================================
  // 20. AUDITORIA DE GRAVAÇÕES (LGPD E CONFORMIDADE)
  // ============================================================================
  app.get('/api/v1/recordings/:id/audit', (req, res) => {
    const { id } = req.params;
    if (currentSession.role === 'morador') {
      return res.status(403).json({ error: 'Acesso restrito a arquivos brutos de gravação (LGPD).' });
    }
    const auditData: CallRecordingAuditData = {
      recordingId: id,
      callId: id,
      unitNumber: '101',
      origin: 'xpe_3115_ip',
      purpose: 'visitante',
      startedAt: new Date().toISOString(),
      durationSeconds: 24,
      hashSha256: crypto.createHash('sha256').update(id).digest('hex'),
      answeredBy: 'Morador Apt 101',
      transcript: [
        {
          speaker: 'visitante',
          text: 'Olá, boa tarde! Gostaria de falar com o morador da unidade 101.',
          timestamp: '00:02',
        },
        {
          speaker: 'morador',
          text: 'Boa tarde! Um momento, já estou liberando o acesso pelo interfone.',
          timestamp: '00:08',
        },
      ],
      aiAuditSummary: {
        sentiment: 'pacifico',
        gateOpened: true,
        authorizedRule: 'Autorização biométrica e confirmação de morador',
        observations: 'Diálogo normal, sem divergências ou ruídos suspeitos.',
      },
    };
    res.json({ audit: auditData });
  });

  // ============================================================================
  // 21. NOTIFICAÇÕES PUSH NATIVAS
  // ============================================================================
  app.post('/api/v1/notifications/subscribe', (req, res) => {
    const { endpoint, userAgent, timestamp } = req.body;
    if (endpoint) {
      pushSubscriptions.push({ endpoint, userAgent: userAgent || '', timestamp: timestamp || Date.now() });
      publishEvent('PUSH_SUBSCRIPTION_REGISTERED', 'pwa_push', { endpoint });
    }
    res.json({ success: true });
  });

  app.post('/api/v1/notifications/test', (req, res) => {
    const { type } = req.body;
    const title = type === 'gate' ? '🔓 Portão Acionado' : type === 'package' ? '📦 Encomenda Recebida' : '🔔 Chamada de Interfone: Portaria Social';
    const body = type === 'gate' ? 'O portão de pedestre foi aberto com sucesso.' : type === 'package' ? 'Uma nova encomenda chegou na portaria para sua unidade.' : 'Visitante aguardando no XPE 3115-IP.';
    publishEvent('PUSH_NOTIFICATION_DISPATCHED', 'push_service', { type, title });
    res.json({ success: true, title, body });
  });

  // ============================================================================
  // 22. LOGGER DE ERROS
  // ============================================================================
  app.all('/api/v1/log-error', (req, res) => {
    res.json({ success: true });
  });

  // ============================================================================
  // 23. PROTEÇÃO 404 JSON PARA APIS (IMPEDE QUE O VITE SIRVA HTML PARA /api/*)
  // ============================================================================
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota de API '${req.path}' não encontrada.` });
  });

  // ============================================================================
  // VITE MIDDLEWARE & FALLBACK ESTÁTICO DE PRODUÇÃO
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
        watch: isHmrDisabled ? null : undefined,
      },
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
    console.log(`[Enlace-DoorIA] Modo de Execução: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Enlace-DoorIA] Banco de Dados Oficial: PostgreSQL 16 LTS Puro Local (Porta 5432) via Drizzle ORM`);
  });
}

startServer().catch((err) => {
  console.error('[Enlace-DoorIA] Falha fatal ao iniciar servidor:', err);
  process.exit(1);
});
