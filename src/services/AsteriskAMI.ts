import EventEmitter from 'events';
import net from 'net';
import { AuditService } from './AuditService.ts';

// Whitelist canônica de comandos permitidos no Asterisk 20 LTS
export const ALLOWED_ASTERISK_ACTIONS = [
  'Ping',
  'Status',
  'CoreShowChannels',
  'PJSIPShowEndpoints',
  'PlayDTMF',
  'Hangup',
] as const;

export type AllowedAsteriskAction = typeof ALLOWED_ASTERISK_ACTIONS[number];

export interface ActiveChannelInfo {
  channel: string;          // Ex: "PJSIP/xpe_3115-00000001"
  channelState?: string;    // "Up", "Ring", "Ringing"
  channelStateDesc?: string;
  callerIdNum?: string;     // "1001", "8000"
  callerIdName?: string;
  connectedLineNum?: string; // "101"
  connectedLineName?: string;
  context?: string;
  exten?: string;
  accountCode?: string;
  uniqueid?: string;
  uniqueId?: string;
  linkedid?: string;
  linkedId?: string;
}

interface PendingAction {
  actionId: string;
  action: string;
  resolve: (value: { success: boolean; message: string; response?: Record<string, string> }) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

interface PendingListAction {
  actionId: string;
  action: string;
  items: any[];
  resolve: (value: { success: boolean; message: string; response?: any }) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

export class AsteriskManager extends EventEmitter {
  private connected: boolean = false;
  private authenticated: boolean = false;
  private socket: net.Socket | null = null;
  private host: string;
  private port: number;
  private username: string;
  private secret: string;
  private buffer: string = '';
  private actionCounter: number = 0;
  private pendingActions: Map<string, PendingAction> = new Map();
  private pendingListActions: Map<string, PendingListAction> = new Map();
  private activeChannels: Map<string, ActiveChannelInfo> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private intentionalDisconnect: boolean = false;
  private connectionTimeoutMs: number = 4000;
  private actionTimeoutMs: number = 5000;

  constructor(
    host: string = process.env.ASTERISK_HOST || '127.0.0.1',
    port: number = parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10),
    username: string = process.env.ASTERISK_AMI_USERNAME || process.env.ASTERISK_AMI_USER || '',
    secret: string = process.env.ASTERISK_AMI_SECRET || ''
  ) {
    super();
    this.host = host;
    this.port = port;
    this.username = username;
    this.secret = secret;
  }

  /**
   * Abre conexão TCP real com o Asterisk AMI e efetua o login de autenticação
   */
  public async connect(): Promise<boolean> {
    if (this.connected && this.authenticated) {
      return true;
    }

    if (this.isConnecting) {
      return false;
    }

    this.isConnecting = true;
    this.intentionalDisconnect = false;

    return new Promise<boolean>((resolve) => {
      let isResolved = false;
      const safeResolve = (val: boolean) => {
        if (!isResolved) {
          isResolved = true;
          this.isConnecting = false;
          resolve(val);
        }
      };

      try {
        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }

        const socket = new net.Socket();
        this.socket = socket;

        const timeout = setTimeout(() => {
          console.warn(`[Asterisk AMI] ⏱️ Timeout (${this.connectionTimeoutMs}ms) ao conectar ao Asterisk em ${this.host}:${this.port}`);
          socket.destroy();
          this.handleDisconnect();
          safeResolve(false);
        }, this.connectionTimeoutMs);

        socket.on('connect', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.buffer = '';
          // O login será iniciado assim que o banner Asterisk for recebido no evento 'data'
        });

        socket.on('data', (data: Buffer) => {
          this.handleIncomingData(data.toString('utf8'), safeResolve);
        });

        socket.on('error', (err: Error) => {
          clearTimeout(timeout);
          if (!err.message?.includes('ECONNREFUSED')) {
            console.warn(`[Asterisk AMI] ⚠️ Erro no socket TCP (${this.host}:${this.port}): ${err.message}`);
          }
          this.handleDisconnect();
          safeResolve(false);
        });

        socket.on('close', () => {
          clearTimeout(timeout);
          this.handleDisconnect();
          safeResolve(false);
        });

        socket.on('end', () => {
          this.handleDisconnect();
          safeResolve(false);
        });

        socket.connect(this.port, this.host);
      } catch (err: any) {
        console.warn(`[Asterisk AMI] ⚠️ Exceção ao abrir socket TCP: ${err.message}`);
        this.handleDisconnect();
        safeResolve(false);
      }
    });
  }

  private handleDisconnect(): void {
    const wasConnected = this.connected;
    this.connected = false;
    this.authenticated = false;
    this.isConnecting = false;

    // Rejeita ações pendentes
    for (const [id, pending] of this.pendingActions.entries()) {
      clearTimeout(pending.timer);
      pending.resolve({
        success: false,
        message: 'Conexão TCP com Asterisk AMI foi encerrada',
      });
      this.pendingActions.delete(id);
    }

    if (wasConnected) {
      this.emit('disconnected');
    }

    // Auto-reconexão com backoff seguro se não for desconexão intencional
    if (!this.intentionalDisconnect && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (!this.connected && !this.intentionalDisconnect) {
          this.connect().catch(() => {});
        }
      }, 5000);
      this.reconnectTimer.unref?.();
    }
  }

  private handleIncomingData(dataChunk: string, connectPromiseResolver?: (val: boolean) => void): void {
    this.buffer += dataChunk;

    // Detecta banner Asterisk inicial (ex: Asterisk Call Manager/5.0.3)
    if (this.buffer.startsWith('Asterisk Call Manager') && !this.authenticated) {
      const bannerEnd = this.buffer.indexOf('\r\n');
      if (bannerEnd !== -1) {
        this.buffer = this.buffer.slice(bannerEnd + 2);
        // Envia imediatamente a ação de Login sem registrar o segredo em logs
        this.sendLogin(connectPromiseResolver);
      }
    }

    // Processa blocos AMI completos delimitados por \r\n\r\n
    let delimiterIndex: number;
    while ((delimiterIndex = this.buffer.indexOf('\r\n\r\n')) !== -1) {
      const block = this.buffer.slice(0, delimiterIndex);
      this.buffer = this.buffer.slice(delimiterIndex + 4);
      this.processAmiMessageBlock(block);
    }
  }

  private sendLogin(connectPromiseResolver?: (val: boolean) => void): void {
    if (!this.socket || this.socket.destroyed) {
      if (connectPromiseResolver) connectPromiseResolver(false);
      return;
    }

    const actionId = `login-${Date.now()}`;
    const payload = [
      'Action: Login',
      `Username: ${this.username}`,
      `Secret: ${this.secret}`,
      `ActionID: ${actionId}`,
      '',
      '',
    ].join('\r\n');

    const timer = setTimeout(() => {
      this.pendingActions.delete(actionId);
      this.authenticated = false;
      this.isConnecting = false;
      if (connectPromiseResolver) connectPromiseResolver(false);
    }, this.actionTimeoutMs);

    this.pendingActions.set(actionId, {
      actionId,
      action: 'Login',
      resolve: (res) => {
        clearTimeout(timer);
        this.isConnecting = false;
        if (res.success) {
          this.authenticated = true;
          this.emit('connected');
          if (connectPromiseResolver) connectPromiseResolver(true);
        } else {
          this.authenticated = false;
          console.warn('[Asterisk AMI] ❌ Falha de autenticação no login AMI');
          if (connectPromiseResolver) connectPromiseResolver(false);
        }
      },
      reject: () => {
        clearTimeout(timer);
        this.authenticated = false;
        this.isConnecting = false;
        if (connectPromiseResolver) connectPromiseResolver(false);
      },
      timer,
    });

    // Envia o pacote de login sem vazar a senha em logs
    this.socket.write(payload, 'utf8');
  }

  private processAmiMessageBlock(block: string): void {
    const lines = block.split('\r\n');
    const parsed: Record<string, string> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        parsed[key] = value;
      }
    }

    const actionId = parsed['ActionID'];

    // 1. Tratamento de listas com múltiplos eventos (ex: CoreShowChannels)
    if (actionId && this.pendingListActions.has(actionId)) {
      const pendingList = this.pendingListActions.get(actionId)!;
      const eventName = parsed['Event'] || '';

      if (eventName === 'CoreShowChannel') {
        const ch = parsed['Channel'];
        if (ch) {
          const info: ActiveChannelInfo = {
            channel: ch,
            channelState: parsed['ChannelState'],
            channelStateDesc: parsed['ChannelStateDesc'],
            callerIdNum: parsed['CallerIDNum'],
            callerIdName: parsed['CallerIDName'],
            connectedLineNum: parsed['ConnectedLineNum'],
            connectedLineName: parsed['ConnectedLineName'],
            context: parsed['Context'],
            exten: parsed['Exten'],
            accountCode: parsed['AccountCode'],
            uniqueid: parsed['Uniqueid'] || parsed['UniqueID'],
            linkedid: parsed['Linkedid'] || parsed['LinkedId'],
          };
          pendingList.items.push(info);
          this.activeChannels.set(ch, info);
        }
        return;
      }

      if (
        eventName === 'CoreShowChannelsComplete' ||
        parsed['EventList'] === 'Complete' ||
        parsed['Response'] === 'Error'
      ) {
        this.pendingListActions.delete(actionId);
        clearTimeout(pendingList.timer);
        pendingList.resolve({
          success: parsed['Response'] !== 'Error',
          message: parsed['Message'] || 'Lista de canais obtida com sucesso',
          response: { channels: pendingList.items },
        });
        return;
      }
    }

    // 2. Resposta de comando individual com ActionID
    if (actionId && this.pendingActions.has(actionId)) {
      const pending = this.pendingActions.get(actionId)!;
      this.pendingActions.delete(actionId);
      clearTimeout(pending.timer);

      const isSuccess = parsed['Response'] === 'Success';
      pending.resolve({
        success: isSuccess,
        message: parsed['Message'] || (isSuccess ? 'Comando executado com sucesso' : 'Falha na resposta do Asterisk AMI'),
        response: parsed,
      });
      return;
    }

    // 3. Atualização contínua de canais em tempo real (Eventos Asterisk)
    const eventName = parsed['Event'];
    if (eventName) {
      const ch = parsed['Channel'];
      if (eventName === 'Newchannel' && ch) {
        this.activeChannels.set(ch, {
          channel: ch,
          channelState: parsed['ChannelState'],
          channelStateDesc: parsed['ChannelStateDesc'],
          callerIdNum: parsed['CallerIDNum'],
          callerIdName: parsed['CallerIDName'],
          connectedLineNum: parsed['ConnectedLineNum'],
          connectedLineName: parsed['ConnectedLineName'],
          context: parsed['Context'],
          exten: parsed['Exten'],
          accountCode: parsed['AccountCode'],
          uniqueid: parsed['Uniqueid'] || parsed['UniqueID'],
          linkedid: parsed['Linkedid'] || parsed['LinkedId'],
        });
      } else if ((eventName === 'Newstate' || eventName === 'ChannelStateChange') && ch) {
        const existing = this.activeChannels.get(ch);
        if (existing) {
          existing.channelState = parsed['ChannelState'] || existing.channelState;
          existing.channelStateDesc = parsed['ChannelStateDesc'] || existing.channelStateDesc;
          if (parsed['ConnectedLineNum']) existing.connectedLineNum = parsed['ConnectedLineNum'];
          if (parsed['Linkedid'] || parsed['LinkedId']) existing.linkedid = parsed['Linkedid'] || parsed['LinkedId'];
        }
      } else if (eventName === 'Hangup' && ch) {
        this.activeChannels.delete(ch);
      }

      this.emit('event', parsed);
      this.emit(eventName, parsed);
    }
  }

  public isConnected(): boolean {
    return this.connected && this.authenticated;
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Executa Ping AMI com medição de latência sem expor credenciais
   */
  public async ping(): Promise<{ ok: boolean; latencyMs?: number; message?: string }> {
    const start = Date.now();
    try {
      const res = await this.executeSafeAction('Ping');
      const latencyMs = Date.now() - start;
      if (res.success) {
        return { ok: true, latencyMs, message: 'Asterisk AMI responsivo (Ping/Pong OK)' };
      }
      return { ok: false, latencyMs, message: res.message || 'Falha de ping no Asterisk AMI' };
    } catch (err: any) {
      return { ok: false, message: err.message || 'Erro inesperado no ping AMI' };
    }
  }

  /**
   * Retorna lista de canais ativos consultados em tempo real no Asterisk (uso geral/diagnóstico)
   */
  public async getActiveChannels(): Promise<ActiveChannelInfo[]> {
    if (!this.isConnected()) {
      return Array.from(this.activeChannels.values());
    }

    try {
      const res = await this.executeSafeAction('CoreShowChannels');
      if (res.response && Array.isArray(res.response.channels)) {
        return res.response.channels;
      }
    } catch {
      // Retorna canais do cache local mantido por eventos
    }

    return Array.from(this.activeChannels.values());
  }

  /**
   * Consulta canais ativos em tempo real EXCLUSIVAMENTE para decisões de acionamento físico (PlayDTMF).
   * NUNCA recorre ao cache local 'activeChannels' em caso de desconexão ou falha de CoreShowChannels.
   * Regra Absoluta: Falha de conexão AMI ou falha de CoreShowChannels -> Retorna [] -> findActiveChannelForXpe retorna null -> HARDWARE_FAILURE.
   */
  public async getActiveChannelsForPhysicalAction(): Promise<ActiveChannelInfo[]> {
    // 1. Exigir AMI conectado e autenticado
    if (!this.isConnected() || !this.isAuthenticated()) {
      const ok = await this.connect();
      if (!ok || !this.isConnected() || !this.isAuthenticated()) {
        console.warn('[Asterisk AMI Security] ❌ Sessão AMI indisponível ou não autenticada para ação física. Cache sumariamente ignorado.');
        return [];
      }
    }

    // 2. Executar "CoreShowChannels"
    try {
      const res = await this.executeSafeAction('CoreShowChannels');
      // 3. Exigir resposta estritamente válida
      if (res.success && res.response && Array.isArray(res.response.channels)) {
        // 4. Usar somente os canais retornados pela consulta atual
        return res.response.channels;
      }
      console.warn('[Asterisk AMI Security] ❌ Resposta inválida ou incompleta em CoreShowChannels para ação física. Cache sumariamente ignorado.');
      // 5. NUNCA consultar "activeChannels" nem "getActiveChannels()" como fallback
      return [];
    } catch (err: any) {
      console.warn(`[Asterisk AMI Security] ❌ Falha na execução de CoreShowChannels: ${err.message}. Cache sumariamente ignorado.`);
      // 6. Retorna lista vazia em caso de erro na consulta
      return [];
    }
  }

  /**
   * Identifica dinamicamente e valida com rigor absoluto o canal PJSIP real para envio de PlayDTMF.
   * Não inventa canais, não utiliza extensões fixas e NUNCA recorre a canais PJSIP arbitrários.
   * A chamada DEVE ser comprovadamente identificada como originada ou pertencente ao XPE 3115-IP.
   * Ordem de prioridade de correlação:
   * 1. UniqueID
   * 2. LinkedID
   * 3. Channel
   * 4. ConnectedLine
   * 5. CallerID
   * 6. Exten
   * 7. Context
   * 8. Endpoint PJSIP
   * 9. Estado do canal ('Up', 'Ring', 'Ringing')
   */
  public async findActiveChannelForXpe(options?: {
    preferredChannel?: string;
    targetUnit?: string;
    xpeIdentifier?: string;
    uniqueId?: string;
    linkedId?: string;
    context?: string;
  }): Promise<string | null> {
    // 1. Consulta os canais ativos em tempo real no Asterisk (NUNCA usa cache para decisão de acionamento físico)
    const channels = await this.getActiveChannelsForPhysicalAction();
    const pjsipChannels = channels.filter((c) => c.channel && c.channel.startsWith('PJSIP/'));

    if (pjsipChannels.length === 0) {
      return null;
    }

    const xpeId = (options?.xpeIdentifier || process.env.XPE_SIP_USERNAME || process.env.XPE_SIP_USER || '8000').toLowerCase().trim();
    const targetUnit = options?.targetUnit?.trim();
    const targetUniqueId = options?.uniqueId?.trim();
    const targetLinkedId = options?.linkedId?.trim();
    const targetContext = options?.context?.trim();

    // Helper: Verifica se o canal está em estado ativo de toque ou conversação
    const isChannelActive = (c: ActiveChannelInfo): boolean => {
      const desc = (c.channelStateDesc || '').toLowerCase();
      const state = c.channelState || '';
      return desc === 'up' || desc === 'ring' || desc === 'ringing' || state === '6' || state === '4' || state === '5';
    };

    // Helper: Comprova determinística e estritamente que o canal pertence ao endpoint XPE
    // REGRA ANTI-HEURÍSTICA: Não confia em substrings soltas como 'contains(xpe)', 'totem' ou 'portaria'.
    // Exige comprovação objetiva de endpoint PJSIP oficial, Caller ID oficial ou Extensão do XPE.
    const isDirectXpeChannel = (c: ActiveChannelInfo): boolean => {
      const chName = c.channel.toLowerCase();
      const callerNum = (c.callerIdNum || '').toLowerCase().trim();
      const ext = (c.exten || '').toLowerCase().trim();
      const acc = (c.accountCode || '').toLowerCase().trim();
      const ctx = (c.context || '').toLowerCase().trim();

      // Critério 1: Endpoint PJSIP oficial do XPE (ex: PJSIP/8000-00000001 ou PJSIP/xpe_3115-00000001)
      const isConfiguredEndpoint = chName.startsWith(`pjsip/${xpeId}-`) || chName.startsWith(`pjsip/${xpeId}_`);
      // Critério 2: Caller ID Num oficial do XPE
      const isCallerIdXpe = callerNum === xpeId;
      // Critério 3: Extensão ou AccountCode oficial do XPE
      const isExtenOrAccXpe = ext === xpeId || acc === xpeId;
      // Critério 4: Contexto SIP de portaria configurado com endpoint coerente
      const isPortariaContext = targetContext && ctx === targetContext.toLowerCase() && (isCallerIdXpe || isConfiguredEndpoint);

      return isConfiguredEndpoint || isCallerIdXpe || isExtenOrAccXpe || isPortariaContext;
    };

    // Helper: Extrai UniqueID e LinkedID normalizados independente de casing (uniqueid vs uniqueId)
    const getUid = (c: ActiveChannelInfo): string => (c.uniqueid || c.uniqueId || '').trim();
    const getLid = (c: ActiveChannelInfo): string => (c.linkedid || c.linkedId || '').trim();

    // Identifica todos os canais diretos do XPE ativos no Asterisk
    const activeXpeChannels = pjsipChannels.filter((c) => isDirectXpeChannel(c) && isChannelActive(c));

    // Mapeia todos os LinkedIDs e UniqueIDs relacionados ao XPE ativo
    const xpeLinkedIds = new Set<string>();
    const xpeUniqueIds = new Set<string>();
    for (const xc of activeXpeChannels) {
      const lid = getLid(xc);
      const uid = getUid(xc);
      if (lid) xpeLinkedIds.add(lid);
      if (uid) xpeUniqueIds.add(uid);
    }

    // 2. VALIDAÇÃO OBRIGATÓRIA DO preferredChannel:
    // Se o DoorIA receber preferredChannel (ou sipChannel), DEVE validar:
    // - canal existe;
    // - canal está ativo;
    // - canal é PJSIP;
    // - canal pertence à chamada XPE;
    // - "UniqueID"/"LinkedID" são compatíveis quando disponíveis;
    // - canal não é de outra chamada.
    // SE QUALQUER VALIDAÇÃO FALHAR: Retorna null imediatamente (HARDWARE_FAILURE).
    // REGRA DE OURO: NUNCA fazer fallback para outro canal PJSIP se o preferredChannel falhar.
    if (options?.preferredChannel) {
      const pref = options.preferredChannel.trim();
      const foundPref = pjsipChannels.find((c) => c.channel === pref);

      // Validação a: canal existe na lista ativa do Asterisk
      if (!foundPref) {
        console.warn(`[Asterisk AMI Correlation] ❌ preferredChannel '${pref}' não existe nos canais ativos do Asterisk.`);
        return null;
      }

      // Validação b: canal é PJSIP
      if (!foundPref.channel.startsWith('PJSIP/')) {
        console.warn(`[Asterisk AMI Correlation] ❌ preferredChannel '${pref}' não é um canal PJSIP.`);
        return null;
      }

      // Validação c: canal está ativo
      if (!isChannelActive(foundPref)) {
        console.warn(`[Asterisk AMI Correlation] ❌ preferredChannel '${pref}' não está em estado ativo.`);
        return null;
      }

      // Validação d: compatibilidade de UniqueID / LinkedID quando fornecidos
      if (targetUniqueId) {
        const matchesUnique = getUid(foundPref) === targetUniqueId || getLid(foundPref) === targetUniqueId;
        if (!matchesUnique) {
          console.warn(`[Asterisk AMI Correlation] ❌ preferredChannel '${pref}' possui UniqueID divergente da chamada esperada.`);
          return null;
        }
      }

      if (targetLinkedId) {
        const matchesLinked = getLid(foundPref) === targetLinkedId || getUid(foundPref) === targetLinkedId;
        if (!matchesLinked) {
          console.warn(`[Asterisk AMI Correlation] ❌ preferredChannel '${pref}' possui LinkedID divergente da chamada esperada.`);
          return null;
        }
      }

      // Validação e: comprovação inequívoca de que o canal pertence à chamada XPE
      const isDirect = isDirectXpeChannel(foundPref);
      const isLinkedToXpe =
        (getLid(foundPref) && xpeLinkedIds.has(getLid(foundPref))) ||
        (getUid(foundPref) && xpeLinkedIds.has(getUid(foundPref))) ||
        (getLid(foundPref) && xpeUniqueIds.has(getLid(foundPref)));

      const isConnectedToXpe =
        (foundPref.connectedLineNum || '').toLowerCase() === xpeId;

      const isTargetUnitMatched =
        targetUnit &&
        (foundPref.connectedLineNum === targetUnit || foundPref.exten === targetUnit || foundPref.callerIdNum === targetUnit) &&
        (activeXpeChannels.some((xc) => xc.connectedLineNum === targetUnit || (getLid(xc) && getLid(xc) === getLid(foundPref))));

      const belongsToXpeCall = isDirect || isLinkedToXpe || isConnectedToXpe || isTargetUnitMatched;

      if (!belongsToXpeCall) {
        console.warn(`[Asterisk AMI Correlation] ❌ preferredChannel '${pref}' pertence a outra chamada não originada pelo XPE. DTMF cancelado.`);
        return null;
      }

      // Se for o próprio canal do XPE, retorna ele
      if (isDirect) {
        return foundPref.channel;
      }

      // Se for a bridge do morador, localiza o canal direto do XPE pareado na mesma chamada
      const pairedXpe = activeXpeChannels.filter(
        (xc) => (getLid(xc) && getLid(xc) === getLid(foundPref)) || (xc.connectedLineNum === foundPref.callerIdNum && getLid(xc) === getLid(foundPref))
      );

      if (pairedXpe.length === 1) {
        return pairedXpe[0].channel;
      }
      if (pairedXpe.length > 1) {
        console.warn(`[Asterisk AMI Correlation] ❌ Ambiguidade: Múltiplos canais XPE pareados com preferredChannel '${pref}'.`);
        return null;
      }

      return foundPref.channel;
    }

    // 3. Resolução determinística quando preferredChannel NÃO for fornecido:
    // Prioridade 1: UniqueID informado explicitamente (DEVE casar com a chamada solicitada, sem fallback arbitrário)
    if (targetUniqueId) {
      const matchingXpe = activeXpeChannels.filter(
        (c) => getUid(c) === targetUniqueId || getLid(c) === targetUniqueId
      );
      if (matchingXpe.length === 1) {
        return matchingXpe[0].channel;
      }
      if (matchingXpe.length > 1) {
        console.warn(`[Asterisk AMI Correlation] ❌ Ambiguidade: Múltiplos canais XPE associados ao UniqueID '${targetUniqueId}'.`);
        return null;
      }

      // Verifica canais bridge de moradores vinculados à mesma chamada por UniqueID/LinkedID
      const linkedMorador = pjsipChannels.filter(
        (c) => isChannelActive(c) && (getUid(c) === targetUniqueId || getLid(c) === targetUniqueId)
      );
      if (linkedMorador.length === 1) {
        const lid = getLid(linkedMorador[0]);
        const paired = activeXpeChannels.filter((xc) => getLid(xc) && getLid(xc) === lid);
        if (paired.length === 1) {
          return paired[0].channel;
        }
      }

      console.warn(`[Asterisk AMI Correlation] ❌ UniqueID '${targetUniqueId}' não encontrado em nenhum canal ativo comprovado do XPE.`);
      return null;
    }

    // Prioridade 2: LinkedID informado explicitamente (DEVE casar com a chamada solicitada, sem fallback arbitrário)
    if (targetLinkedId) {
      const matchingXpe = activeXpeChannels.filter(
        (c) => getLid(c) === targetLinkedId || getUid(c) === targetLinkedId
      );
      if (matchingXpe.length === 1) {
        return matchingXpe[0].channel;
      }
      if (matchingXpe.length > 1) {
        console.warn(`[Asterisk AMI Correlation] ❌ Ambiguidade: Múltiplos canais XPE associados ao LinkedID '${targetLinkedId}'.`);
        return null;
      }

      console.warn(`[Asterisk AMI Correlation] ❌ LinkedID '${targetLinkedId}' não encontrado em nenhum canal ativo comprovado do XPE.`);
      return null;
    }

    // Prioridade 3: ConnectedLine para a targetUnit informada
    if (targetUnit) {
      const xpeForUnit = activeXpeChannels.filter(
        (c) => c.connectedLineNum === targetUnit || c.exten === targetUnit
      );
      if (xpeForUnit.length === 1) {
        return xpeForUnit[0].channel;
      }
      if (xpeForUnit.length > 1) {
        console.warn(
          `[Asterisk AMI Correlation] ❌ Ambiguidade: Múltiplos canais XPE chamando para a unidade '${targetUnit}'. Impossível determinar inequivocamente sem UniqueID/LinkedID.`
        );
        return null;
      }

      // Bridge vinculada à unidade por LinkedID
      if (xpeLinkedIds.size > 0) {
        const unitChannelLinked = pjsipChannels.filter(
          (c) =>
            isChannelActive(c) &&
            (c.connectedLineNum === targetUnit || c.callerIdNum === targetUnit || c.exten === targetUnit) &&
            getLid(c) &&
            xpeLinkedIds.has(getLid(c))
        );
        if (unitChannelLinked.length === 1) {
          const lid = getLid(unitChannelLinked[0]);
          const paired = activeXpeChannels.filter((xc) => getLid(xc) === lid);
          if (paired.length === 1) {
            return paired[0].channel;
          }
        }
      }

      console.warn(`[Asterisk AMI Correlation] ❌ Nenhuma chamada ativa inequívoca do XPE para a unidade '${targetUnit}'.`);
      return null;
    }

    // Prioridade 4: Canais diretos do XPE ativos gerais
    if (activeXpeChannels.length === 0) {
      console.warn('[Asterisk AMI Correlation] ❌ Nenhum canal PJSIP ativo comprovadamente pertencente à chamada do XPE foi localizado.');
      return null;
    }

    if (activeXpeChannels.length > 1) {
      // REGRA DE OURO DA AUDITORIA:
      // PROIBIDO selecionar activeXpeChannels[0]
      // PROIBIDO selecionar upChannel
      // Múltiplos canais XPE sem correlação inequívoca = HARDWARE_FAILURE imediato.
      console.warn(
        `[Asterisk AMI Correlation] ❌ Ambiguidade crítica: Existem múltiplos (${activeXpeChannels.length}) canais XPE ativos no Asterisk. Não foi possível determinar inequivocamente o canal SIP da chamada XPE. PlayDTMF cancelado por segurança.`
      );
      return null;
    }

    // activeXpeChannels.length === 1: rigorosamente UMA ÚNICA chamada XPE ativa comprovada
    const singleChannel = activeXpeChannels[0];
    if (isChannelActive(singleChannel) && isDirectXpeChannel(singleChannel)) {
      return singleChannel.channel;
    }

    // 4. REGRA ABSOLUTA: SEM FALLBACK PARA CANAIS ARBITRÁRIOS
    // Se não há canal ativo comprovadamente pertencente à chamada do XPE, retorna null (HARDWARE_FAILURE).
    return null;
  }

  /**
   * Executa uma ação segura no Asterisk validada contra a Whitelist estrita
   */
  public async executeSafeAction(
    action: AllowedAsteriskAction,
    params: Record<string, string> = {}
  ): Promise<{ success: boolean; message: string; response?: any }> {
    // 1. Validação estrita da Whitelist
    if (!ALLOWED_ASTERISK_ACTIONS.includes(action)) {
      throw new Error(`[Asterisk AMI Security] Ação não permitida na Whitelist: ${action}`);
    }

    // 1.1 Se a ação for PlayDTMF, validação estrita dos dígitos permitidos (*07, *08, 07, 08).
    // Rejeição sumária de *09, 09 ou dígitos não homologados.
    if (action === 'PlayDTMF') {
      const allowedDigits = ['07', '08', '*07', '*08'];
      const rawDigit = (params.Digit || '').trim();
      if (!allowedDigits.includes(rawDigit)) {
        console.warn(`[Asterisk AMI Security] ❌ PlayDTMF com dígito '${rawDigit}' rejeitado. Permitidos: ${allowedDigits.join(', ')}`);
        return {
          success: false,
          message: `Dígito DTMF '${rawDigit}' não autorizado para acionamento de portão físico.`,
        };
      }
    }

    // 2. Se não estiver conectado, tenta estabelecer conexão real
    if (!this.isConnected()) {
      const ok = await this.connect();
      if (!ok || !this.socket || this.socket.destroyed) {
        return {
          success: false,
          message: `Connection refused to Asterisk AMI socket on port ${this.port}`,
        };
      }
    }

    return new Promise((resolve, reject) => {
      this.actionCounter += 1;
      const actionId = `act-${Date.now()}-${this.actionCounter}`;

      const lines = [
        `Action: ${action}`,
        `ActionID: ${actionId}`,
      ];

      for (const [k, v] of Object.entries(params)) {
        lines.push(`${k}: ${v}`);
      }
      lines.push('', '');

      const payload = lines.join('\r\n');

      const timer = setTimeout(() => {
        this.pendingActions.delete(actionId);
        this.pendingListActions.delete(actionId);
        resolve({
          success: false,
          message: `Timeout de ${this.actionTimeoutMs}ms aguardando resposta da ação AMI: ${action}`,
        });
      }, this.actionTimeoutMs);

      // Se for ação com múltiplos eventos (como CoreShowChannels), registra em pendingListActions
      if (action === 'CoreShowChannels') {
        this.pendingListActions.set(actionId, {
          actionId,
          action,
          items: [],
          resolve: (val) => {
            clearTimeout(timer);
            resolve(val);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
          timer,
        });
      } else {
        this.pendingActions.set(actionId, {
          actionId,
          action,
          resolve: (val) => {
            clearTimeout(timer);
            resolve(val);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
          timer,
        });
      }

      try {
        this.socket!.write(payload, 'utf8');
      } catch (err: any) {
        clearTimeout(timer);
        this.pendingActions.delete(actionId);
        this.pendingListActions.delete(actionId);
        resolve({
          success: false,
          message: `Falha ao escrever no socket AMI: ${err.message}`,
        });
      }
    });
  }

  /**
   * Injeta tom DTMF em canal PJSIP real ativo (*07 para pedestre, *08 para garagem)
   * Atende estritamente à Regra de Ouro #4 (Acionamento seguro sem contato seco na calçada)
   */
  public async injectDtmf(
    sipChannel: string,
    digit: string,
    actorName = 'Sistema'
  ): Promise<{ status: string; message: string; success?: boolean }> {
    const trimmedChannel = sipChannel?.trim();
    if (!trimmedChannel || !trimmedChannel.startsWith('PJSIP/') || trimmedChannel === 'PJSIP/' || trimmedChannel.includes('fixo')) {
      throw new Error(`[Asterisk AMI Security] Canal inválido para PlayDTMF: deve ser um canal PJSIP real ativo identificado dinamicamente (recebido: '${sipChannel || 'indefinido'}')`);
    }

    // Códigos permitidos para acionamento de portão e relé no DoorIA (*07 pedestre, *08 garagem)
    const allowedGateDtmf = ['*07', '*08', '07', '08'];
    if (!allowedGateDtmf.includes(digit)) {
      throw new Error(`[Asterisk AMI Security] Dígito DTMF não autorizado para acionamento de portão: ${digit}. Permitidos: *07 (pedestre) ou *08 (garagem).`);
    }

    // Validação Anti-Bypass: O canal deve ser comprovadamente correlacionado à chamada ativa do XPE em tempo real
    const validatedChannel = await this.findActiveChannelForXpe({ preferredChannel: trimmedChannel });
    if (!validatedChannel) {
      throw new Error(`[Asterisk AMI Security] Canal PJSIP '${trimmedChannel}' não comprovado como pertencente à chamada ativa do XPE no Asterisk. PlayDTMF recusado.`);
    }

    // No Asterisk AMI PlayDTMF, o parâmetro Digit recebe '07' ou '08'
    const cleanDigit = digit.replace('*', '');
    const result = await this.executeSafeAction('PlayDTMF', {
      Channel: validatedChannel,
      Digit: cleanDigit,
      Duration: '500',
    });

    if (!result.success) {
      return {
        status: 'Error',
        success: false,
        message: result.message || `Falha ao injetar DTMF ${digit} no Asterisk via PlayDTMF`,
      };
    }

    AuditService.record({
      actor: actorName,
      role: 'sistema',
      action: 'PLAY_DTMF',
      target: trimmedChannel,
      status: 'PERMITIDO',
      dtmfCommand: digit,
      details: { digit, cleanDigit, channel: trimmedChannel },
    }).catch(() => {});

    return {
      status: 'Success',
      success: true,
      message: `DTMF ${digit} (${cleanDigit}) injetado no canal PJSIP ${trimmedChannel} com sucesso via PlayDTMF.`,
    };
  }

  /**
   * Fecha o socket TCP de forma segura e limpa recursos
   */
  public disconnect(): void {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
    this.authenticated = false;
    this.isConnecting = false;
  }
}

export const asteriskAmi = new AsteriskManager();
export { AsteriskManager as AsteriskAMI };

