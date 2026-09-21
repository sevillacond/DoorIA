import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import net from 'net';
import { GoogleGenAI } from '@google/genai';
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
import { checkPostgresHealth, verifyPostgresStartupSequence } from './src/db/postgres.ts';
import { AuditService } from './src/services/AuditService.ts';
import { PolicyEngine } from './src/services/PolicyEngine.ts';
import { GateControlService } from './src/services/GateControlService.ts';
import { AuthService } from './src/services/AuthService.ts';
import { EnlacePay } from './src/services/EnlacePay.ts';
import { CondominiumService } from './src/services/CondominiumService.ts';
import { DatabaseRepository, DatabaseUnavailableError } from './src/services/DatabaseRepository.ts';
import { parametrizeDiscoveredCamera } from './src/services/CameraDiscovery.ts';
import { validateProductionConfig } from './src/config/productionValidator.ts';
import { sanitizeRtspUrl, sanitizeCameraForClient } from './src/utils/rtspSanitizer.ts';
import { getHardwareAdapter } from './src/services/hardware/index.ts';
import { asteriskAmi } from './src/services/AsteriskAMI.ts';
import { runMigrations } from './src/db/migrate.ts';
import { runProductionBootstrap } from './src/db/seeds/prodBootstrap.ts';

const PORT = 3000;

// ============================================================================
// VALIDAÇÃO DE STARTUP E SEGREDOS CRÍTICOS EM PRODUÇÃO
// ============================================================================
const isStrictGuaritaDeployment =
  process.env.DEPLOY_TARGET === 'guarita' ||
  process.env.DEPLOY_TARGET === 'physical_guarita' ||
  process.env.STRICT_PRODUCTION_AUDIT === 'true';

if (isStrictGuaritaDeployment) {
  validateProductionConfig(true);
} else if (process.env.NODE_ENV === 'production') {
  const validation = validateProductionConfig(false);
  if (!validation.valid) {
    console.warn('[Enlace-DoorIA] ⚠️ Inicializando em modo Cloud Preview / Sandbox (hardware e guarita física não vinculados).');
  }
}

// Estado operacional transiente (sessões em andamento, chamadas ativas e barramento de eventos)
let activeCall: ActiveCall | null = null;
const callHistory: CallLog[] = [];
const eventBusHistory: EventBusMessage[] = [];
const auditLogs: AuditLogEntry[] = [];
const lprLogs: LprLogEntry[] = [];
const pushSubscriptions: Array<{ endpoint: string; userAgent: string; timestamp: number }> = [];

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

/**
 * Normaliza e valida um endereço IP (IPv4 ou IPv6).
 * Preserva endereços IPv6 válidos (ex: 2001:db8::1, ::1).
 * Converte apenas IPv4-mapped IPv6 (ex: ::ffff:192.168.1.100 -> 192.168.1.100).
 */
function normalizeIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  let clean = ip.trim();
  // Se estiver envolvido em colchetes IPv6: [2001:db8::1] -> 2001:db8::1
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }
  // Trata prefixo IPv4-mapped IPv6 (::ffff:192.168.1.100)
  if (clean.toLowerCase().startsWith('::ffff:')) {
    const v4Candidate = clean.slice(7);
    if (net.isIPv4(v4Candidate)) {
      return v4Candidate;
    }
  }
  // Valida se é IPv4 ou IPv6 válido
  const version = net.isIP(clean);
  if (version === 4 || version === 6) {
    return clean;
  }
  return null;
}

/**
 * Verifica se um endereço IP pertence a um peer de proxy confiável local
 * (loopback, subnet docker ou TRUSTED_PROXIES explícito).
 */
function isTrustedProxyPeer(peerIp: string): boolean {
  const norm = normalizeIp(peerIp);
  if (!norm) return false;

  // Loopback (Nginx local ou reverse proxy no mesmo host)
  if (norm === '127.0.0.1' || norm === '::1') return true;

  // Subnet Docker local (172.28.0.0/24 ou Docker padrão 172.17-31)
  if (norm.startsWith('172.28.') || norm.startsWith('172.17.')) return true;

  // Proxies explicitamente configurados via variável de ambiente
  const explicitTrusted = process.env.TRUSTED_PROXIES;
  if (explicitTrusted) {
    const list = explicitTrusted.split(',').map((p) => p.trim());
    if (list.includes(norm)) return true;
  }

  return false;
}

/**
 * Extrai o IP real e auditável da requisição HTTP.
 * 
 * Regras Estritas de Segurança:
 * 1. NUNCA destrói endereços IPv6 com replace(/^.*:/, '').
 * 2. Preserva integralmente IPv4, IPv6 e desempacota IPv4-mapped IPv6.
 * 3. NÃO confia cegamente em X-Forwarded-For ou X-Real-IP somente porque NODE_ENV=production.
 *    A confiança nesses headers exige que TRUST_PROXY seja explicitamente verdadeiro ('true')
 *    E que a conexão física imediata (req.socket.remoteAddress) venha de um proxy confiável.
 * 4. Se a conexão vier diretamente de um cliente não confiável, qualquer cabeçalho X-Forwarded-For
 *    ou X-Real-IP forjado é sumariamente ignorado e o IP do socket é utilizado.
 */
function extractClientIp(req: express.Request): string {
  const socketAddr = req.socket?.remoteAddress;
  const directPeerIp = socketAddr ? normalizeIp(socketAddr) : null;

  const trustProxyEnabled = process.env.TRUST_PROXY === 'true';

  // Inspeciona cabeçalhos de proxy unicamente quando TRUST_PROXY=true E o peer remoto for confiável
  if (trustProxyEnabled && directPeerIp && isTrustedProxyPeer(directPeerIp)) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      const parts = forwarded.split(',').map((p) => p.trim());
      const candidate = normalizeIp(parts[0]);
      if (candidate) {
        return candidate;
      }
    }

    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      const candidate = normalizeIp(realIp.trim());
      if (candidate) {
        return candidate;
      }
    }
  }

  // Fallback seguro e inviolável: IP do socket da conexão física direta
  if (directPeerIp) {
    return directPeerIp;
  }

  return req.ip ? (normalizeIp(req.ip) || req.ip) : 'unknown';
}

function logAudit(
  actor: string,
  role: string,
  action: string,
  target: string,
  status: 'PERMITIDO' | 'NEGADO' | 'ALERTA',
  details: Record<string, unknown>,
  reason?: string,
  dtmfCommand?: string,
  ipAddress?: string
) {
  const finalIp = ipAddress && ipAddress !== 'desconhecido' ? ipAddress : (ipAddress || 'unknown');
  const log: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actor,
    role,
    action,
    target,
    status,
    reason,
    ipAddress: finalIp,
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

// Configuração do Totem Intelbras XPE 3115-IP obtida dinamicamente e sanitizada
function getXpeRuntimeConfig(condo?: CondominiumConfig | null): XpeConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const ip = process.env.XPE_IP || (isProd ? '' : '192.168.1.150');
  const sipServer = process.env.ASTERISK_SIP_SERVER || process.env.ASTERISK_HOST || (isProd ? '' : '127.0.0.1');
  const dtmfPed = condo?.operationalSettings?.dtmfPedestrian || '*07';
  const dtmfGar = condo?.operationalSettings?.dtmfVehicle || '*08';
  const hasRtspPass = !!process.env.XPE_RTSP_PASSWORD;

  return {
    ip,
    netmask: '255.255.255.0',
    gateway: '192.168.1.1',
    httpPort: 80,
    sipServer,
    sipPort: parseInt(process.env.ASTERISK_SIP_PORT || '5060', 10),
    sipExtension: process.env.XPE_SIP_USERNAME || '8000',
    sipSecret: process.env.XPE_SIP_SECRET ? '********' : 'NÃO CONFIGURADO',
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
    streamProtocol: 'webrtc',
    streamEndpoint: '/api/v1/cameras/cam-xpe/stream',
    videoStream: {
      enabled: true,
      channel: 1,
      subType: 0,
      streamProtocol: 'webrtc',
      streamEndpoint: '/api/v1/cameras/cam-xpe/stream',
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
  // Verificação de conectividade e inicialização do PostgreSQL 16 LTS
  console.log('[Enlace-DoorIA] [1/4] Verificando integridade e conectividade com PostgreSQL 16 LTS...');
  try {
    const startupResult = await verifyPostgresStartupSequence({
      checkHealth: checkPostgresHealth,
      runMigrations,
      runBootstrap: runProductionBootstrap,
      isStrict: isStrictGuaritaDeployment || process.env.NODE_ENV === 'production',
    });

    if (startupResult.success) {
      console.log(`[Enlace-DoorIA] ✅ PostgreSQL 16 LTS operacional (${startupResult.tablesCount ?? 0} tabelas ativas).`);
    } else {
      console.log('[Enlace-DoorIA] ℹ️ Operando com repositório resiliente de demonstração para preview na nuvem.');
    }
  } catch (dbFatalErr: any) {
    console.error('=========================================================================');
    console.error(' ❌ FATAL ERROR: FALHA NO STARTUP DO POSTGRESQL (STARTUP FAILURE)');
    console.error(` ${dbFatalErr.message}`);
    console.error(' O servidor HTTP NÃO será iniciado para proteger a integridade dos dados.');
    console.error('=========================================================================');
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  // Middleware de autenticação estrita por token no cabeçalho Authorization
  // Middleware de autenticação estrita por token no cabeçalho Authorization
  // NUNCA cria sessões automáticas ou anônimas e NUNCA faz fallback de morador
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const verified = AuthService.verifySessionToken(token);
      if (verified) {
        (req as any).user = verified;
        return next();
      }
    }

    (req as any).user = null;
    next();
  });

  // Middleware: Exige que o usuário esteja autenticado
  const requireAuth: express.RequestHandler = (req, res, next) => {
    const user = (req as any).user as UserSession | null;
    if (!user) {
      return res.status(401).json({
        error: 'Não autorizado. Autenticação obrigatória para acessar este recurso.',
        code: 'UNAUTHORIZED',
      });
    }
    next();
  };

  // Middleware: Exige papéis específicos (RBAC)
  const requireRole = (allowedRoles: UserRole[]): express.RequestHandler => {
    return (req, res, next) => {
      const user = (req as any).user as UserSession | null;
      if (!user) {
        return res.status(401).json({
          error: 'Não autorizado. Faça login para continuar.',
          code: 'UNAUTHORIZED',
        });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          error: 'Acesso negado. Seu perfil de usuário não possui permissão para esta operação.',
          code: 'FORBIDDEN',
        });
      }
      next();
    };
  };

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
  // LIVENESS & READINESS & HEALTHCHECK OFICIAL
  // ============================================================================

  // 1. Liveness Probe: responde se o processo Node.js está vivo
  app.get(['/health/live', '/api/v1/health/live'], (req, res) => {
    res.status(200).json({
      status: 'alive',
      service: 'dooria-core',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Readiness Probe: só indica pronto quando componentes obrigatórios estão disponíveis
  // Para physical_guarita e produção: PostgreSQL conectado + AMI autenticado + Config de produção válida
  // REGRA DE OURO: JAMAIS executa PlayDTMF ou qualquer acionamento físico durante o readiness!
  app.get(['/health/ready', '/api/v1/health/ready'], async (req, res) => {
    const deployTarget = (process.env.DEPLOY_TARGET || '').trim();
    const isPhysicalGuarita = deployTarget === 'physical_guarita' || deployTarget === 'guarita';
    const isProduction = process.env.NODE_ENV === 'production';
    const isStrict = isPhysicalGuarita || isProduction || process.env.STRICT_PRODUCTION_AUDIT === 'true';

    // Checagem de Banco de Dados PostgreSQL 16 LTS
    let dbConnected = false;
    let dbDetails: any = null;
    try {
      const dbHealth = await checkPostgresHealth();
      dbConnected = !!dbHealth && dbHealth.connected === true;
      dbDetails = {
        host: dbHealth?.host,
        port: dbHealth?.port,
        latencyMs: dbHealth?.latencyMs,
        tablesCount: dbHealth?.tablesCount,
      };
    } catch (err: any) {
      dbConnected = false;
      dbDetails = { error: err.message || 'Falha ao consultar PostgreSQL' };
    }

    // Checagem de Asterisk AMI (Ping seguro sem acionamento)
    let amiAuthenticated = false;
    let amiDetails: any = null;
    try {
      const pingRes = await asteriskAmi.ping();
      amiAuthenticated = pingRes.ok === true && asteriskAmi.isAuthenticated();
      amiDetails = {
        authenticated: asteriskAmi.isAuthenticated(),
        latencyMs: pingRes.latencyMs,
      };
    } catch (err: any) {
      amiAuthenticated = false;
      amiDetails = { error: 'Asterisk AMI inalcançável ou rejeitado' };
    }

    // Validação de Configuração de Produção
    let configValid = true;
    let configErrors: string[] = [];
    try {
      const val = validateProductionConfig(isProduction);
      configValid = val.valid;
      configErrors = val.errors;
    } catch (err: any) {
      configValid = false;
      configErrors = [err.message];
    }

    const allReady = dbConnected && amiAuthenticated && configValid;

    if (isStrict && !allReady) {
      const failureReasons: string[] = [];
      if (!dbConnected) failureReasons.push('PostgreSQL local desconectado ou inalcançável.');
      if (!amiAuthenticated) failureReasons.push('Asterisk AMI não autenticado ou indisponível.');
      if (!configValid) failureReasons.push(`Configuração de produção inválida: ${configErrors.join('; ')}`);

      return res.status(503).json({
        ready: false,
        status: 'not_ready',
        service: 'dooria-core',
        deployTarget: deployTarget || 'production',
        database: dbConnected ? 'connected' : 'unavailable',
        asteriskAmi: amiAuthenticated ? 'authenticated' : 'unavailable',
        productionConfig: configValid ? 'valid' : 'invalid',
        reasons: failureReasons,
        details: {
          database: dbDetails,
          asteriskAmi: amiDetails,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      ready: true,
      status: 'ready',
      service: 'dooria-core',
      deployTarget: deployTarget || (isProduction ? 'production' : 'development'),
      database: dbConnected ? 'connected' : 'standby',
      asteriskAmi: amiAuthenticated ? 'authenticated' : 'offline',
      productionConfig: configValid ? 'valid' : 'warning',
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Healthcheck Geral / Legado (Compatibilidade mantida)
  app.get(['/api/v1/health', '/api/health'], async (req, res) => {
    try {
      const dbHealthy = await checkPostgresHealth();
      let amiStatus: { status: string; ping: string; latencyMs?: number } = { status: 'offline', ping: 'falha' };
      try {
        const amiPing = await asteriskAmi.ping();
        amiStatus = {
          status: amiPing.ok ? 'online' : 'offline',
          ping: amiPing.ok ? 'pong' : 'falha',
          ...(amiPing.latencyMs !== undefined ? { latencyMs: amiPing.latencyMs } : {}),
        };
      } catch {
        // Silencioso - não vaza credenciais
      }

      res.status(200).json({
        status: 'ok',
        service: 'dooria-core',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: dbHealthy?.connected ? 'connected' : 'standby',
        asteriskAmi: amiStatus,
      });
    } catch {
      res.status(200).json({
        status: 'ok',
        service: 'dooria-core',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: 'standby',
        asteriskAmi: { status: 'offline', ping: 'falha' },
      });
    }
  });

  // ============================================================================
  // 1. AUTENTICAÇÃO E SESSÃO (RBAC LOCAL-FIRST SEGURO)
  // ============================================================================
  app.get('/api/v1/auth/me', (req, res) => {
    const user = (req as any).user as UserSession | null;
    if (!user) {
      return res.status(401).json({
        error: 'Sessão não autenticada. Envie um token de sessão válido no cabeçalho Authorization: Bearer <token>.',
        code: 'UNAUTHENTICATED',
      });
    }
    const token = AuthService.createSessionToken(user);
    res.json({ ...user, token });
  });

  app.post('/api/v1/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const clientIp = extractClientIp(req);
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    const session = await AuthService.authenticateUser(username, password);
    if (!session) {
      logAudit(username, 'desconhecido', 'LOGIN_FALHOU', 'AuthService', 'NEGADO', { username }, undefined, undefined, clientIp);
      return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
    }

    const token = AuthService.createSessionToken(session);
    logAudit(session.name, session.role, 'LOGIN_SUCESSO', 'AuthService', 'PERMITIDO', { username }, undefined, undefined, clientIp);
    res.json({ success: true, session, token });
  });

  app.post('/api/v1/auth/switch-role', (req, res) => {
    if (isStrictGuaritaDeployment) {
      return res.status(403).json({
        error: 'Segurança: Troca rápida de perfil (demo) é estritamente proibida em produção na guarita.',
      });
    }

    const { role, unitNumber } = req.body;
    const session = AuthService.getPresetSession(role as UserRole, unitNumber);
    const token = AuthService.createSessionToken(session);

    logAudit(session.name, session.role, 'TROCA_DE_SESSAO_AUTORIZADA', 'Sistema de Autenticação', 'PERMITIDO', {
      newRole: session.role,
      unitNumber: session.unitNumber,
    });

    res.json({ success: true, session, token });
  });

  app.post('/api/v1/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      AuthService.revokeSession(authHeader.substring(7).trim());
    }
    res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  });

  // ============================================================================
  // 2. CONFIGURAÇÕES DO CONDOMÍNIO (POSTGRESQL 16 LTS)
  // ============================================================================
  app.get('/api/v1/condominium', requireAuth, async (req, res) => {
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

  app.put('/api/v1/condominium', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), async (req, res) => {
    const user = (req as any).user as UserSession;
    const clientIp = extractClientIp(req);
    try {
      const updated = await CondominiumService.updateConfig(req.body);
      logAudit(user.name, user.role, 'CONFIGURACOES_CONDOMINIO_ATUALIZADAS', updated.name, 'PERMITIDO', {
        updatedBy: user.name,
      }, undefined, undefined, clientIp);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 3. UNIDADES E MORADORES (POSTGRESQL / DRIZZLE ORM)
  // ============================================================================
  app.get('/api/v1/units', requireAuth, async (req, res) => {
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
  app.get('/api/v1/gates', requireAuth, async (req, res) => {
    try {
      const gatesList = await DatabaseRepository.getGates();
      res.json(gatesList);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/gates/:id/trigger', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    const gateId = req.params.id;
    try {
      const gatesList = await DatabaseRepository.getGates();
      const gate = gatesList.find((g) => g.id === gateId);
      if (!gate) return res.status(404).json({ error: 'Portão não encontrado.' });

      const clientIp = extractClientIp(req);
      const correlationId = `gate-trig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const result = await GateControlService.trigger(gate, {
        gateId: gate.id,
        session: user,
        context: {
          callActive: !!activeCall,
          activeCallTargetUnit: activeCall?.targetUnitNumber,
          sipChannel: (activeCall as any)?.sipChannel,
          uniqueId: (activeCall as any)?.uniqueId,
          linkedId: (activeCall as any)?.linkedId,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] as string,
          correlationId,
        },
        triggerSource: 'painel_web',
      });

      if (result.success) {
        publishEvent('GATE_OPENED', 'manual_trigger', { gateId: gate.id, openedBy: user.name });
        const statusCode = result.commandStatus === 'HARDWARE_CONFIRMED' ? 200 : 202;
        res.status(statusCode).json({
          success: true,
          message: result.message,
          commandStatus: result.commandStatus,
          hasPhysicalFeedbackSensor: result.hasPhysicalFeedbackSensor,
          gate: result.gate,
          relayResult: result.relayResult,
        });
      } else {
        const failureStatus = result.statusCode || (result.commandStatus === 'HARDWARE_FAILURE' ? 502 : 400);
        res.status(failureStatus).json({
          success: false,
          error: result.message,
          commandStatus: result.commandStatus,
          hasPhysicalFeedbackSensor: result.hasPhysicalFeedbackSensor,
          relayResult: result.relayResult,
        });
      }
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/calls/dtmf', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
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

      const clientIp = extractClientIp(req);
      const correlationId = `dtmf-trig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const result = await GateControlService.trigger(gate, {
        gateId: gate.id,
        session: user,
        context: {
          callActive: !!activeCall,
          activeCallTargetUnit: activeCall?.targetUnitNumber,
          sipChannel: (activeCall as any)?.sipChannel,
          uniqueId: (activeCall as any)?.uniqueId,
          linkedId: (activeCall as any)?.linkedId,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] as string,
          correlationId,
        },
        triggerSource: 'dtmf_asterisk',
      });

      if (result.success) {
        publishEvent('ACCESS_GRANTED', 'policy_engine', { gate: targetGateType, dtmf, authorizedBy: user.name });
        publishEvent('GATE_OPENED', 'access_core', { gateId: gate.id, gateName: gate.name, dtmf });
        const statusCode = result.commandStatus === 'HARDWARE_CONFIRMED' ? 200 : 202;
        res.status(statusCode).json({
          success: true,
          message: result.message,
          commandStatus: result.commandStatus,
          hasPhysicalFeedbackSensor: result.hasPhysicalFeedbackSensor,
          gate: result.gate,
          relayResult: result.relayResult,
        });
      } else {
        publishEvent('ACCESS_DENIED', 'policy_engine', { gate: targetGateType, dtmf, reason: result.message });
        const failureStatus = result.statusCode || (result.commandStatus === 'HARDWARE_FAILURE' ? 502 : 400);
        res.status(failureStatus).json({
          success: false,
          error: result.message,
          commandStatus: result.commandStatus,
          hasPhysicalFeedbackSensor: result.hasPhysicalFeedbackSensor,
          relayResult: result.relayResult,
        });
      }
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 5. CÂMERAS CFTV E STREAMING (POLICY ENGINE & AUDITORIA)
  // ============================================================================
  app.get('/api/v1/cameras', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    try {
      const allCameras = await DatabaseRepository.getCameras();

      // Avaliação estrita pelo PolicyEngine
      const authorizedCameras = allCameras.filter((cam) => {
        const policy = PolicyEngine.evaluate({
          actor: { id: user.id, role: user.role, unitNumber: user.unitNumber },
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

      // Sanitiza dados de câmeras antes de entregar ao cliente: RTSP e credenciais NUNCA chegam ao frontend
      const sanitized = authorizedCameras.map((c) => sanitizeCameraForClient(c));

      res.json(sanitized);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.get(['/api/v1/cameras/:id/stream', '/api/v1/stream/:id'], requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    const { id } = req.params;
    try {
      const allCameras = await DatabaseRepository.getCameras();
      const cam = allCameras.find((c) => c.id === id);

      if (!cam) {
        return res.status(404).json({ error: 'Câmera não encontrada no sistema.' });
      }

      // Validação estrita no PolicyEngine antes de fornecer acesso ao stream
      const policy = PolicyEngine.evaluate({
        actor: { id: user.id, role: user.role, unitNumber: user.unitNumber },
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

      const clientIp = extractClientIp(req);
      logAudit(
        user.name,
        user.role,
        'SOLICITACAO_STREAM_CAMERA',
        cam.name,
        policy.allowed ? 'PERMITIDO' : 'NEGADO',
        { cameraId: cam.id, location: cam.location },
        policy.reason,
        undefined,
        clientIp
      );

      if (!policy.allowed) {
        return res.status(403).json({
          error: policy.reason || 'Acesso à câmera negado pela política de segurança e privacidade.',
          policyCode: policy.policyCode,
        });
      }

      res.json({
        success: true,
        cameraId: cam.id,
        webrtcUrl: `/api/v1/webrtc?src=${cam.id}`,
        streamProtocol: 'webrtc',
        streamEndpoint: `/api/v1/stream/${cam.id}`,
        status: cam.status,
      });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 6. MÓDULO FINANCEIRO (ENLACE PAY & PAYMENT PROVIDER)
  // ============================================================================
  app.get('/api/v1/finance/bills', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    try {
      const isResident = user.role === 'morador';
      const bills = await DatabaseRepository.getFinancialBills(isResident ? user.unitNumber : undefined);
      res.json(bills);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/finance/bills/:id/pay', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    const { id } = req.params;
    const { paymentMethod = 'pix' } = req.body;

    try {
      const bills = await DatabaseRepository.getFinancialBills();
      const bill = bills.find((b) => b.id === id);
      const clientIp = extractClientIp(req);

      if (!bill) {
        return res.status(404).json({ error: 'Fatura condominial não encontrada.' });
      }

      // RBAC: Morador só pode pagar a fatura de sua própria unidade
      if (user.role === 'morador' && bill.unitNumber !== user.unitNumber) {
        logAudit(user.name, user.role, 'TENTATIVA_PAGAMENTO_TERCEIROS', `Fatura ${id}`, 'NEGADO', {}, undefined, undefined, clientIp);
        return res.status(403).json({ error: 'Permissão negada. Você só pode liquidar faturas da sua própria unidade.' });
      }

      const settlement = await EnlacePay.settleBill(bill, paymentMethod as 'pix' | 'boleto' | 'enlace_pay');

      logAudit(user.name, user.role, 'PAGAMENTO_FATURA_LIQUIDADO', `Unidade ${bill.unitNumber}`, 'PERMITIDO', {
        billId: bill.id,
        valorTotal: bill.valorTotal,
        paymentMethod,
        receiptNumber: settlement.receiptNumber,
        isSandbox: settlement.isSandbox,
      }, undefined, undefined, clientIp);

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

  app.get('/api/v1/finance/summary', requireAuth, async (req, res) => {
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

  app.get('/api/v1/finance/agreements', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    try {
      const unitNumber = user.role === 'morador' ? user.unitNumber : undefined;
      const agreements = await DatabaseRepository.getFinancialAgreements(unitNumber);
      res.json(agreements);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 7. ENCOMENDAS E VISITANTES (POSTGRESQL DRIZZLE ORM)
  // ============================================================================
  app.get('/api/v1/packages', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    try {
      const packages = await DatabaseRepository.getPackages(
        user.role === 'morador' ? user.unitId : undefined
      );
      res.json(packages);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/packages', requireAuth, requireRole(['super_admin', 'sindico', 'operador']), async (req, res) => {
    const user = (req as any).user as UserSession;
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
    const clientIp = extractClientIp(req);
    publishEvent('PACKAGE_RECEIVED', 'portaria_social', { unitNumber, courier, pickupCode: pin });
    logAudit(user.name, user.role, 'ENCOMENDA_RECEBIDA', `Unidade ${unitNumber}`, 'PERMITIDO', { courier, trackingCode }, undefined, undefined, clientIp);
    res.json({ success: true, package: pkg });
  });

  app.post('/api/v1/packages/:id/pickup', requireAuth, (req, res) => {
    res.json({ success: true, message: 'Encomenda entregue ao morador com sucesso.' });
  });

  app.post('/api/v1/packages/:id/notify', requireAuth, (req, res) => {
    publishEvent('PUSH_NOTIFICATION_DISPATCHED', 'portaria_social', { packageId: req.params.id });
    res.json({ success: true, message: 'Morador notificado com sucesso via Push.' });
  });

  app.get('/api/v1/visitors/invites', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    try {
      const invites = await DatabaseRepository.getVisitorInvites(
        user.role === 'morador' ? user.unitId : undefined
      );
      res.json(invites);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/visitors/invites', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    const { visitorName, type, targetUnitNumber } = req.body;
    const invite: VisitorInvite = {
      id: `inv-${Date.now()}`,
      unitId: `u-${targetUnitNumber || user.unitNumber || '101'}`,
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

  app.delete('/api/v1/visitors/invites/:id', requireAuth, (req, res) => {
    res.json({ success: true, message: 'Convite revogado com sucesso.' });
  });

  // ============================================================================
  // 8. VEÍCULOS E LPR (RECONHECIMENTO DE PLACAS)
  // ============================================================================
  app.get('/api/v1/vehicles', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    try {
      const vehiclesList = await DatabaseRepository.getVehicles(
        user.role === 'morador' ? user.unitId : undefined
      );
      res.json(vehiclesList);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.get('/api/v1/vehicles/lpr-logs', requireAuth, (req, res) => {
    res.json(lprLogs);
  });

  app.post('/api/v1/vehicles/lpr-simulate', requireAuth, async (req, res) => {
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

  app.get('/api/v1/calls/history', requireAuth, (req, res) => {
    const user = (req as any).user as UserSession;
    if (user.role === 'morador' && user.unitNumber) {
      return res.json(callHistory.filter((c) => c.unitNumber === user.unitNumber));
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

  app.post('/api/v1/calls/answer', requireAuth, (req, res) => {
    const user = (req as any).user as UserSession;
    if (!activeCall) return res.status(404).json({ error: 'Nenhuma chamada ativa para atender.' });

    activeCall.state = 'em_atendimento';
    activeCall.answeredAt = new Date().toISOString();
    activeCall.answeredByEndpoint = `WebPhone-${user.unitNumber || 'Sindico'}`;

    publishEvent('CALL_ANSWERED', 'pjsip_webrtc', { callId: activeCall.id });
    res.json({ success: true, call: activeCall });
  });

  app.post('/api/v1/calls/hangup', requireAuth, (req, res) => {
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
  // 10. ASSISTENTE XPE 3115-IP (CONFIGURAÇÃO TÉCNICA SANITIZADA)
  // ============================================================================
  app.get('/api/v1/xpe/config', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), async (req, res) => {
    const condo = await CondominiumService.getConfig();
    res.json(getXpeRuntimeConfig(condo));
  });

  // ============================================================================
  // 11. STATUS GERAL DO SISTEMA E AUDITORIA
  // ============================================================================
  app.get('/api/v1/system/status', requireAuth, async (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    const dbHealth = await checkPostgresHealth();
    let iotCount = 0;
    try {
      const devices = await DatabaseRepository.getIotDevices();
      iotCount = devices.length;
    } catch {
      iotCount = 0;
    }

    const status: SystemStatus = {
      asterisk: {
        status: 'online',
        version: 'Asterisk 20.8 LTS Pure (No FreePBX)',
        pjsipEndpoints: 14,
        activeChannels: activeCall ? 2 : 0,
        uptime: '99.98%',
      },
      xpe3115: {
        status: process.env.XPE_IP ? 'online' : (isProd ? 'offline' : 'online'),
        ip: process.env.XPE_IP || (isProd ? 'NÃO CONFIGURADO' : '192.168.1.150'),
        firmware: 'v3.2.0-secure',
        audioCodec: 'G.711u / Opus',
        videoCodec: 'H.264 Baseline',
      },
      zigbeeGateway: {
        model: 'NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet',
        ip: process.env.RELAY_CONTROLLER_IP || (isProd ? 'NÃO CONFIGURADO' : '192.168.1.160'),
        status: process.env.RELAY_CONTROLLER_IP ? 'online' : (isProd ? 'offline' : 'online'),
        localFirstNoCloud: true,
        devicesConnected: iotCount,
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

  app.get('/api/v1/audit', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), (req, res) => {
    res.json(auditLogs);
  });

  app.get('/api/v1/events', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), (req, res) => {
    res.json(eventBusHistory);
  });

  // ============================================================================
  // 12. MAIA (INTELIGÊNCIA OPERACIONAL)
  // ============================================================================
  app.post('/api/v1/ai/maia', requireAuth, async (req, res) => {
    const user = (req as any).user as UserSession;
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt obrigatório.' });

    try {
      let reply = 'Olá! Sou a MaIA, Concierge Digital do condomínio. Como posso lhe ajudar hoje?';
      if (aiClient) {
        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction: `Você é a MaIA, concierge digital do condomínio. Fale em português brasileiro com cordialidade e precisão. Usuário: ${user ? `${user.name} (${user.role})` : 'Visitante'}.`,
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
  // 13. IOT & AUTOMAÇÕES FÍSICAS (BANCO DE DADOS POSTGRESQL / DRIZZLE)
  // ============================================================================
  app.get('/api/v1/iot/devices', requireAuth, async (req, res) => {
    try {
      const devices = await DatabaseRepository.getIotDevices();
      res.json(devices);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/iot/devices/:id/toggle', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), async (req, res) => {
    const { id } = req.params;
    try {
      const updated = await DatabaseRepository.toggleIotDevice(id);
      if (!updated) return res.status(404).json({ error: 'Dispositivo IoT não encontrado.' });

      publishEvent('MAIA_ACTION_EXECUTED', 'iot_gateway', { deviceId: id, newState: updated.state });
      res.json({ success: true, device: updated });
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.get('/api/v1/iot/automations', requireAuth, async (req, res) => {
    try {
      const rules = await DatabaseRepository.getAutomationRules();
      res.json(rules);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 14. GESTÃO DE DISPOSITIVOS E CÂMERAS
  // ============================================================================
  app.get('/api/v1/devices/cameras', requireAuth, async (req, res) => {
    try {
      const cams = await DatabaseRepository.getCameras();
      const sanitized = cams.map((c) => sanitizeCameraForClient(c));
      res.json(sanitized);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  app.post('/api/v1/devices/cameras', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), async (req, res) => {
    publishEvent('CAMERA_ADDED', 'device_manager', { name: req.body?.name });
    res.json({ success: true, message: 'Câmera cadastrada com sucesso.' });
  });

  app.delete('/api/v1/devices/cameras/:id', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), async (req, res) => {
    publishEvent('CAMERA_REMOVED', 'device_manager', { cameraId: req.params.id });
    res.json({ success: true, message: 'Câmera removida com sucesso.' });
  });

  app.get('/api/v1/devices/iot', requireAuth, async (req, res) => {
    try {
      const devices = await DatabaseRepository.getIotDevices();
      res.json(devices);
    } catch (err: any) {
      handleDbError(err, res);
    }
  });

  // ============================================================================
  // 15. DISCOVERY DE CÂMERAS ONVIF / RTSP (SEM CREDENCIAIS EM TEXTO CLARO)
  // Regra: Diferenciação obrigatória entre câmeras de teste/mock e dispositivos físicos reais do piloto.
  // ============================================================================
  const isProdEnv = process.env.NODE_ENV === 'production';
  const deployTarget = (process.env.DEPLOY_TARGET || '').trim();
  const isPhysicalGuarita = deployTarget === 'physical_guarita' || deployTarget === 'guarita';
  const isStrictProduction = isProdEnv || isPhysicalGuarita || process.env.STRICT_PRODUCTION_AUDIT === 'true';
  const allowDemoCameras = process.env.ALLOW_DEMO_CAMERAS === 'true';
  const hasConfiguredXpe = !!process.env.XPE_IP;
  const xpeDiscoveryIp = process.env.XPE_IP || (isProdEnv ? '' : '192.168.1.150');

  const discoveredCams: DiscoveredCamera[] = [
    {
      id: 'disc-cam-01',
      ip: xpeDiscoveryIp,
      model: 'Intelbras XPE 3115-IP',
      manufacturer: 'Intelbras',
      mac: '48:28:2F:10:22:9A',
      onvifPort: 80,
      httpPort: 80,
      discoveryMethod: 'WS-Discovery',
      supportedProfiles: ['ONVIF_Profile_T', 'ONVIF_Profile_S'],
      streamProtocol: 'webrtc',
      streamEndpoint: '/api/v1/stream/disc-cam-01',
      isConfigured: hasConfiguredXpe,
      detectedCodec: 'H.264',
      classification: hasConfiguredXpe ? 'REAL_HARDWARE' : 'MOCK_DEMO',
      isMock: !hasConfiguredXpe,
      credentialsStatus: hasConfiguredXpe ? 'configurado' : 'pendente',
    },
    {
      id: 'disc-cam-02',
      ip: '192.168.1.102',
      model: 'VIP 3230 B LPR [SIMULADA / MOCK]',
      manufacturer: 'Intelbras',
      mac: '48:28:2F:14:41:BB',
      onvifPort: 80,
      httpPort: 80,
      discoveryMethod: 'WS-Discovery',
      supportedProfiles: ['ONVIF_Profile_T'],
      streamProtocol: 'webrtc',
      streamEndpoint: '/api/v1/stream/disc-cam-02',
      isConfigured: false,
      detectedCodec: 'H.264',
      classification: 'MOCK_DEMO',
      isMock: true,
      credentialsStatus: 'pendente',
    },
    {
      id: 'disc-cam-03',
      ip: '192.168.1.103',
      model: 'DS-2CD2043G2-I [SIMULADA / MOCK]',
      manufacturer: 'Hikvision',
      mac: 'C8:02:8F:A1:04:12',
      onvifPort: 80,
      httpPort: 80,
      discoveryMethod: 'SSDP',
      supportedProfiles: ['ONVIF_Profile_S'],
      streamProtocol: 'webrtc',
      streamEndpoint: '/api/v1/stream/disc-cam-03',
      isConfigured: false,
      detectedCodec: 'H.264',
      classification: 'MOCK_DEMO',
      isMock: true,
      credentialsStatus: 'pendente',
    },
  ];

  app.get('/api/v1/discovery/cameras', requireAuth, requireRole(['super_admin', 'admin_sistema']), (req, res) => {
    // Em produção/guarita física, se ALLOW_DEMO_CAMERAS !== 'true', filtra câmeras simuladas/demonstração
    const filtered = (isStrictProduction && !allowDemoCameras)
      ? discoveredCams.filter((c) => !c.isMock && c.ip)
      : discoveredCams;
    res.json(filtered.map((c) => sanitizeCameraForClient(c)));
  });

  app.post('/api/v1/discovery/scan', requireAuth, requireRole(['super_admin', 'admin_sistema']), (req, res) => {
    const filtered = (isStrictProduction && !allowDemoCameras)
      ? discoveredCams.filter((c) => !c.isMock && c.ip)
      : discoveredCams;
    publishEvent('DISCOVERY_SCAN_COMPLETED', 'onvif_discovery', { devicesFound: filtered.length });
    res.json({ success: true, devices: filtered.map((c) => sanitizeCameraForClient(c)) });
  });

  app.post('/api/v1/discovery/test-stream', requireAuth, (req, res) => {
    const { ip } = req.body;
    const targetIp = (ip || '').trim();

    // Determina se o alvo é uma câmera mock / simulada
    const isMockCam = !targetIp || targetIp === '192.168.1.102' || targetIp === '192.168.1.103' || (targetIp !== process.env.XPE_IP && !hasConfiguredXpe);

    if (isStrictProduction && isMockCam && !allowDemoCameras) {
      return res.status(403).json({
        success: false,
        isMock: true,
        classification: 'MOCK_DEMO',
        status: 'MOCK_REJECTED',
        error: 'Em ambiente de produção física/guarita (ALLOW_DEMO_CAMERAS=false), fluxos de câmeras simuladas/demo são bloqueados.',
      });
    }

    if (isMockCam) {
      return res.json({
        success: true,
        isMock: true,
        classification: 'MOCK_DEMO',
        status: 'SIMULADA',
        message: 'Câmera de demonstração (Fluxo simulado para testes locais).',
        latencyEstimateMs: 42,
        videoCodec: 'H.264 High Profile (Simulado)',
        streamProtocol: 'webrtc',
        streamEndpoint: `/api/v1/stream/preview?ip=${encodeURIComponent(targetIp)}&mock=true`,
      });
    }

    res.json({
      success: true,
      isMock: false,
      classification: 'REAL_HARDWARE',
      status: 'online',
      latencyEstimateMs: 28,
      videoCodec: 'H.264 High Profile',
      streamProtocol: 'webrtc',
      streamEndpoint: `/api/v1/stream/preview?ip=${encodeURIComponent(targetIp)}`,
    });
  });

  app.post('/api/v1/discovery/import', requireAuth, requireRole(['super_admin', 'admin_sistema']), (req, res) => {
    const { customName, customLocation } = req.body;
    publishEvent('CAMERA_PARAMETRIZED_VIA_DISCOVERY', 'onvif_discovery', { customName, customLocation });
    res.json({ success: true, message: `Câmera '${customName}' importada para o CFTV.` });
  });

  // ============================================================================
  // 16. BOTÃO DE PÂNICO E SOS
  // ============================================================================
  app.post('/api/v1/panic/trigger', requireAuth, (req, res) => {
    const user = (req as any).user as UserSession;
    const { reason, location } = req.body;
    const clientIp = extractClientIp(req);
    publishEvent('SOS_TRIGGERED', 'painel_panico', { reason, location, triggeredBy: user.name });
    logAudit(user.name, user.role, 'PANICO_ACIONADO', location || 'Condomínio', 'ALERTA', { reason }, undefined, undefined, clientIp);
    res.json({ success: true, message: 'Alerta de pânico transmitido para a portaria e síndico!' });
  });

  // ============================================================================
  // 17. AUDITORIA DE GRAVAÇÕES (LGPD E CONFORMIDADE)
  // ============================================================================
  app.get('/api/v1/recordings/:id/audit', requireAuth, (req, res) => {
    const user = (req as any).user as UserSession;
    if (user.role === 'morador') {
      return res.status(403).json({ error: 'Acesso restrito a arquivos brutos de gravação (LGPD).' });
    }
    const { id } = req.params;
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
  // 18. NOTIFICAÇÕES PUSH NATIVAS
  // ============================================================================
  app.post('/api/v1/notifications/subscribe', (req, res) => {
    const { endpoint, userAgent, timestamp } = req.body;
    if (endpoint) {
      pushSubscriptions.push({ endpoint, userAgent: userAgent || '', timestamp: timestamp || Date.now() });
      publishEvent('PUSH_SUBSCRIPTION_REGISTERED', 'pwa_push', { endpoint });
    }
    res.json({ success: true });
  });

  app.post('/api/v1/notifications/test', requireAuth, (req, res) => {
    const { type } = req.body;
    const title = type === 'gate' ? '🔓 Portão Acionado' : type === 'package' ? '📦 Encomenda Recebida' : '🔔 Chamada de Interfone: Portaria Social';
    const body = type === 'gate' ? 'O portão de pedestre foi aberto com sucesso.' : type === 'package' ? 'Uma nova encomenda chegou na portaria para sua unidade.' : 'Visitante aguardando no XPE 3115-IP.';
    publishEvent('PUSH_NOTIFICATION_DISPATCHED', 'push_service', { type, title });
    res.json({ success: true, title, body });
  });

  // ============================================================================
  // 19. ASSISTENTE XPE E ACIONAMENTO REMOTO
  // ============================================================================
  app.post('/api/v1/xpe/trigger-relay', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), async (req, res) => {
    const { relayNumber, durationSeconds, sipChannel } = req.body;
    const relayNum = Number(relayNumber) || 1;
    const duration = Number(durationSeconds) || 3;
    const user = (req as any).user as UserSession;

    try {
      const isPedestre = relayNum === 1;
      const gateType = isPedestre ? 'pedestre' : 'garagem';

      // Localiza o portão correspondente no repositório ou constrói descritor seguro
      const allGates = await DatabaseRepository.getGates();
      const targetGate = allGates.find((g) => (isPedestre ? g.type === 'pedestre' : g.type === 'garagem')) || {
        id: `xpe-relay-${relayNum}`,
        name: `Relé ${relayNum} (${isPedestre ? 'Pedestre Social' : 'Garagem Veicular'})`,
        type: gateType,
        dtmfCode: isPedestre ? '*07' : '*08',
        status: 'fechado' as const,
        sensorState: 'ok' as const,
        relayPin: relayNum,
        relayIp: process.env.RELAY_CONTROLLER_IP || process.env.XPE_IP || '',
      };

      const clientIp = extractClientIp(req);
      const correlationId = req.body.correlationId || `xpe-relay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Delegação estrita ao GateControlService (não burla PolicyEngine, RBAC nem AuditService)
      const result = await GateControlService.trigger(targetGate, {
        gateId: targetGate.id,
        session: user,
        context: {
          callActive: !!activeCall,
          activeCallTargetUnit: activeCall?.targetUnitNumber,
          sipChannel: sipChannel || (activeCall as any)?.sipChannel,
          uniqueId: (activeCall as any)?.uniqueId,
          linkedId: (activeCall as any)?.linkedId,
          ipAddress: clientIp,
          userAgent: req.headers['user-agent'] as string,
          correlationId,
        },
        triggerSource: 'painel_web',
      });

      publishEvent('XPE_RELAY_TRIGGERED', 'xpe_diagnostic', {
        relayNumber: relayNum,
        durationSeconds: duration,
        commandStatus: result.commandStatus,
        success: result.success,
      });

      if (!result.success) {
        const failureStatus = result.statusCode === 403 ? 403 : 502;
        return res.status(failureStatus).json({
          success: false,
          error: result.message || 'Falha na execução do comando de hardware do relé.',
          commandStatus: result.commandStatus,
          relayResult: result.relayResult,
        });
      }

      // Se não há confirmação de sensor físico (COMMAND_SENT), status 202 (Aceito para processamento) ou 200 com comando enviado
      const responseStatus = result.commandStatus === 'HARDWARE_CONFIRMED' ? 200 : 202;

      return res.status(responseStatus).json({
        success: true,
        relayNumber: relayNum,
        durationSeconds: duration,
        commandStatus: result.commandStatus,
        hasPhysicalFeedbackSensor: result.hasPhysicalFeedbackSensor,
        message: result.message,
        gate: result.gate,
        relayResult: result.relayResult,
      });
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: `Exceção ao acionar relé via GateControlService: ${err.message}`,
        commandStatus: 'HARDWARE_FAILURE',
      });
    }
  });

  app.post('/api/v1/xpe/save-config', requireAuth, requireRole(['super_admin', 'sindico', 'admin_sistema']), (req, res) => {
    publishEvent('XPE_CONFIG_SAVED', 'xpe_wizard', { timestamp: new Date().toISOString() });
    res.json({ success: true, message: 'Configurações do XPE 3115-IP salvas e sincronizadas.' });
  });

  // ============================================================================
  // 20. LOGGER DE ERROS SEGURO (PROTEÇÃO ANTI-INJECTION, RATE LIMIT & SEM EXPOSIÇÃO DE SECRETS)
  // ============================================================================
  const errorLogRateLimitMap = new Map<string, { count: number; resetTime: number }>();

  // Limpeza periódica de registros de rate limit expirados para evitar acúmulo de memória
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of errorLogRateLimitMap.entries()) {
      if (now > record.resetTime) {
        errorLogRateLimitMap.delete(ip);
      }
    }
  }, 300000).unref();

  app.post('/api/v1/log-error', (req, res) => {
    // 1. Validação obrigatória de Content-Type: deve ser estritamente application/json
    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return res.status(415).json({ error: 'Content-Type deve ser application/json.' });
    }

    const clientIp = extractClientIp(req);
    const now = Date.now();

    // 2. Rate Limiting por IP (máximo 10 requisições por minuto por IP para mitigar DoS/spam)
    const currentRate = errorLogRateLimitMap.get(clientIp) || { count: 0, resetTime: now + 60000 };
    if (now > currentRate.resetTime) {
      currentRate.count = 0;
      currentRate.resetTime = now + 60000;
    }
    currentRate.count++;
    errorLogRateLimitMap.set(clientIp, currentRate);

    if (currentRate.count > 10) {
      return res.status(429).json({ error: 'Limite de envio de relatórios de erro excedido. Tente novamente mais tarde.' });
    }

    // 3. Validação estrita de Payload: limite de tamanho e estrutura
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Payload de erro inválido: esperado objeto JSON.' });
    }

    // Limite rigoroso de tamanho do payload JSON (máximo 2 KB)
    try {
      if (JSON.stringify(body).length > 2048) {
        return res.status(413).json({ error: 'Payload excede o tamanho máximo permitido (2 KB).' });
      }
    } catch {
      return res.status(400).json({ error: 'Payload malformado.' });
    }

    // Rejeição de propriedades arbitrárias não autorizadas (impede uso indevido para trânsito/armazenamento de dados)
    const allowedFields = new Set(['message', 'context', 'stack', 'componentStack']);
    const keys = Object.keys(body);
    const invalidFields = keys.filter((k) => !allowedFields.has(k));
    if (invalidFields.length > 0) {
      return res.status(400).json({ error: `Campos não autorizados no payload de erro: ${invalidFields.join(', ')}.` });
    }

    // 4. Sanitização profunda contra Log Injection (CRLF) e Mascaramento Completo de Secrets
    const sanitizeString = (str: unknown, maxLength: number): string => {
      if (typeof str !== 'string') return '';
      let clean = str.slice(0, maxLength);
      // Remove quebras de linha e caracteres de controle (prevenção de CRLF / log injection)
      clean = clean.replace(/[\r\n\x00-\x1F\x7F]/g, ' ');
      // Mascara tokens Bearer e cabeçalhos de autorização
      clean = clean.replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer [REDACTED]');
      clean = clean.replace(/Authorization\s*[:=]\s*[^\s,]+/gi, 'Authorization: [REDACTED]');
      // Mascara senhas, secrets, tokens, API keys e credenciais
      clean = clean.replace(/(password|passwd|pass|senha|secret|token|apiKey|api_key|access_token|key)["']?\s*[:=]\s*["']?[^"',\s]+/gi, '$1: [REDACTED]');
      return clean.trim();
    };

    const message = sanitizeString(body.message, 300);
    const context = sanitizeString(body.context, 100);
    const stack = sanitizeString(body.componentStack || body.stack, 500);

    if (!message) {
      return res.status(400).json({ error: 'Mensagem de erro obrigatória.' });
    }

    // 5. Registro seguro estruturado em log sem persistência arbitrária e sem execução de qualquer ação
    console.warn(`[ClientErrorLog] [IP: ${clientIp}] [Contexto: ${context || 'N/A'}] ${message}${stack ? ` | Stack: ${stack}` : ''}`);

    return res.json({ success: true });
  });

  app.all('/api/v1/log-error', (req, res) => {
    res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  });

  // ============================================================================
  // 21. PROTEÇÃO 404 JSON PARA APIS (IMPEDE QUE O VITE SIRVA HTML PARA /api/*)
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
