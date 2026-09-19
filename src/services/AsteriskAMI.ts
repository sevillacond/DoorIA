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
  linkedid?: string;
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
    username: string = process.env.ASTERISK_AMI_USERNAME || process.env.ASTERISK_AMI_USER || 'dooria_admin',
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
      try {
        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }

        const socket = new net.Socket();
        this.socket = socket;

        const timeout = setTimeout(() => {
          if (this.isConnecting) {
            console.warn(`[Asterisk AMI] ⏱️ Timeout (${this.connectionTimeoutMs}ms) ao conectar ao Asterisk em ${this.host}:${this.port}`);
            socket.destroy();
            this.handleDisconnect();
            resolve(false);
          }
        }, this.connectionTimeoutMs);

        socket.on('connect', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.buffer = '';
          // O login será iniciado assim que o banner Asterisk for recebido no evento 'data'
        });

        socket.on('data', (data: Buffer) => {
          this.handleIncomingData(data.toString('utf8'), resolve);
        });

        socket.on('error', (err: Error) => {
          clearTimeout(timeout);
          console.warn(`[Asterisk AMI] ⚠️ Erro no socket TCP (${this.host}:${this.port}): ${err.message}`);
          this.handleDisconnect();
          if (this.isConnecting) {
            resolve(false);
          }
        });

        socket.on('close', () => {
          clearTimeout(timeout);
          this.handleDisconnect();
          if (this.isConnecting) {
            resolve(false);
          }
        });

        socket.on('end', () => {
          this.handleDisconnect();
        });

        socket.connect(this.port, this.host);
      } catch (err: any) {
        console.warn(`[Asterisk AMI] ⚠️ Exceção ao abrir socket TCP: ${err.message}`);
        this.handleDisconnect();
        resolve(false);
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
   * Retorna lista de canais ativos consultados em tempo real no Asterisk
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
   * Identifica dinamicamente e valida com rigor absoluto o canal PJSIP real para envio de PlayDTMF.
   * Não inventa canais, não utiliza extensões fixas e NÃO recorre a canais PJSIP arbitrários.
   * O canal DEVE pertencer ou estar comprovadamente correlacionado à chamada ativa do XPE 3115-IP.
   */
  public async findActiveChannelForXpe(options?: {
    preferredChannel?: string;
    targetUnit?: string;
    xpeIdentifier?: string;
    linkedId?: string;
  }): Promise<string | null> {
    // 1. Consulta os canais ativos em tempo real no Asterisk
    const channels = await this.getActiveChannels();
    const pjsipChannels = channels.filter((c) => c.channel && c.channel.startsWith('PJSIP/'));

    if (pjsipChannels.length === 0) {
      return null;
    }

    const xpeId = (options?.xpeIdentifier || process.env.XPE_SIP_USERNAME || process.env.XPE_SIP_USER || '8000').toLowerCase().trim();
    const targetUnit = options?.targetUnit?.trim();
    const targetLinkedId = options?.linkedId?.trim();

    // Helper: Verifica se o canal está em estado ativo de toque ou conversação
    const isChannelActive = (c: ActiveChannelInfo): boolean => {
      const desc = (c.channelStateDesc || '').toLowerCase();
      const state = c.channelState || '';
      return desc === 'up' || desc === 'ring' || desc === 'ringing' || state === '6' || state === '4' || state === '5';
    };

    // Helper: Verifica se o canal pertence diretamente ao XPE (identificador, callerid, extensão, contexto)
    const isDirectXpeChannel = (c: ActiveChannelInfo): boolean => {
      const chName = c.channel.toLowerCase();
      const callerNum = (c.callerIdNum || '').toLowerCase();
      const callerName = (c.callerIdName || '').toLowerCase();
      const ext = (c.exten || '').toLowerCase();
      const acc = (c.accountCode || '').toLowerCase();

      return (
        chName.includes(`pjsip/${xpeId}-`) ||
        chName.includes(`pjsip/${xpeId}_`) ||
        chName.includes('pjsip/xpe') ||
        chName.includes('pjsip/totem') ||
        chName.includes('pjsip/portaria') ||
        callerNum === xpeId ||
        callerNum.includes('xpe') ||
        callerName.includes('xpe') ||
        callerName.includes('totem') ||
        ext === xpeId ||
        acc === xpeId
      );
    };

    // Identifica os canais diretos do XPE ativos
    const activeXpeChannels = pjsipChannels.filter((c) => isDirectXpeChannel(c) && isChannelActive(c));

    // Mapeia todos os LinkedIDs e UniqueIDs relacionados ao XPE
    const xpeLinkedIds = new Set<string>();
    for (const xc of activeXpeChannels) {
      if (xc.linkedid) xpeLinkedIds.add(xc.linkedid);
      if (xc.uniqueid) xpeLinkedIds.add(xc.uniqueid);
    }

    // 2. VALIDAÇÃO DO preferredChannel (Requisito 5):
    // Se o DoorIA receber sipChannel = PJSIP/... deve:
    // 1. consultar os canais ativos do Asterisk;
    // 2. verificar se o canal realmente existe;
    // 3. verificar se está ativo;
    // 4. verificar se pertence à chamada correta;
    // Somente então permitir PlayDTMF. Se não houver correspondência: não aceita.
    if (options?.preferredChannel) {
      const pref = options.preferredChannel.trim();
      const foundPref = pjsipChannels.find((c) => c.channel === pref);

      if (foundPref && isChannelActive(foundPref)) {
        // Verifica se é o próprio canal do XPE
        if (isDirectXpeChannel(foundPref)) {
          return foundPref.channel;
        }

        // Verifica se compartilha LinkedID com chamada do XPE (bridge morador <-> XPE)
        const matchesLinkedId =
          (foundPref.linkedid && xpeLinkedIds.has(foundPref.linkedid)) ||
          (foundPref.uniqueid && xpeLinkedIds.has(foundPref.uniqueid)) ||
          (targetLinkedId && foundPref.linkedid === targetLinkedId);

        if (matchesLinkedId) {
          return foundPref.channel;
        }

        // Verifica se a linha conectada corresponde ao XPE
        const connectedToXpe =
          (foundPref.connectedLineNum || '').toLowerCase() === xpeId ||
          (foundPref.connectedLineName || '').toLowerCase().includes('xpe') ||
          (foundPref.connectedLineName || '').toLowerCase().includes('totem');

        if (connectedToXpe) {
          return foundPref.channel;
        }

        // Se targetUnit foi informada e o canal corresponde a essa targetUnit com chamada do XPE ativa
        if (targetUnit && (foundPref.connectedLineNum === targetUnit || foundPref.exten === targetUnit || foundPref.callerIdNum === targetUnit)) {
          const matchingXpe = activeXpeChannels.find((xc) => xc.connectedLineNum === targetUnit || (xc.linkedid && xc.linkedid === foundPref.linkedid));
          if (matchingXpe) {
            return matchingXpe.channel;
          }
        }
      }
      // Se não passou nos 4 critérios de validação rigorosa, não aceita o preferredChannel
    }

    // 3. Resolução dinâmica estritamente correlacionada ao XPE:
    // Prioridade A: Canal ativo do XPE conectado à targetUnit informada
    if (targetUnit) {
      const xpeWithTarget = activeXpeChannels.find(
        (c) => c.connectedLineNum === targetUnit || c.exten === targetUnit
      );
      if (xpeWithTarget) {
        return xpeWithTarget.channel;
      }
    }

    // Prioridade B: Canal do XPE pareado com o targetLinkedId informado
    if (targetLinkedId) {
      const xpeWithLinked = activeXpeChannels.find(
        (c) => c.linkedid === targetLinkedId || c.uniqueid === targetLinkedId
      );
      if (xpeWithLinked) {
        return xpeWithLinked.channel;
      }
    }

    // Prioridade C: Qualquer canal ativo do XPE em estado Up ou Ring
    if (activeXpeChannels.length > 0) {
      // Prioriza canal em estado 'Up' (conversação ativa) sobre 'Ring'
      const upChannel = activeXpeChannels.find((c) => (c.channelStateDesc || '').toLowerCase() === 'up' || c.channelState === '6');
      return upChannel ? upChannel.channel : activeXpeChannels[0].channel;
    }

    // Prioridade D: Se a targetUnit foi informada e há canal de morador ligado por linkedid comprovado à chamada do XPE
    if (targetUnit && xpeLinkedIds.size > 0) {
      const unitChannelLinked = pjsipChannels.find(
        (c) => isChannelActive(c) && (c.connectedLineNum === targetUnit || c.callerIdNum === targetUnit) && c.linkedid && xpeLinkedIds.has(c.linkedid)
      );
      if (unitChannelLinked) {
        return unitChannelLinked.channel;
      }
    }

    // 4. REGRA DE OURO: SEM FALLBACK PARA CANAIS ARBITRÁRIOS
    // Se não há canal ativo correlacionado à chamada do XPE, retorna null.
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

    // Códigos permitidos para acionamento de portão e relé no DoorIA
    const allowedGateDtmf = ['*07', '*08', '07', '08', '*09', '09'];
    if (!allowedGateDtmf.includes(digit)) {
      throw new Error(`[Asterisk AMI Security] Dígito DTMF não autorizado para acionamento de portão: ${digit}. Permitidos: *07 (pedestre) ou *08 (garagem).`);
    }

    // No Asterisk AMI PlayDTMF, o parâmetro Digit recebe '07' ou '08'
    const cleanDigit = digit.replace('*', '');
    const result = await this.executeSafeAction('PlayDTMF', {
      Channel: trimmedChannel,
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

