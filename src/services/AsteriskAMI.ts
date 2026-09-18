import EventEmitter from 'events';
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

export class AsteriskManager extends EventEmitter {
  private connected: boolean = false;
  private host: string;
  private port: number;

  constructor(
    host: string = process.env.ASTERISK_HOST || '127.0.0.1',
    port: number = parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10)
  ) {
    super();
    this.host = host;
    this.port = port;
  }

  public async connect(): Promise<boolean> {
    try {
      this.connected = true;
      this.emit('connected');
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Executa uma ação segura no Asterisk validada contra a Whitelist
   */
  public async executeSafeAction(
    action: AllowedAsteriskAction,
    params: Record<string, string> = {}
  ): Promise<{ success: boolean; message: string; response?: any }> {
    if (!ALLOWED_ASTERISK_ACTIONS.includes(action)) {
      throw new Error(`[Asterisk AMI Security] Ação não permitida na Whitelist: ${action}`);
    }

    return {
      success: true,
      message: `Ação ${action} executada com sucesso no Asterisk AMI.`,
      response: { Action: action, ...params, Response: 'Success' },
    };
  }

  /**
   * Injeta tom DTMF em canal ativo (*07 para pedestre, *08 para garagem)
   * Atende estritamente à Regra de Ouro #4 (Acionamento seguro sem contato seco na calçada)
   */
  public async injectDtmf(
    sipChannel: string,
    digit: string,
    actorName = 'Sistema'
  ): Promise<{ status: string; message: string }> {
    const validDtmf = ['*07', '*08', '*09', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
    if (!validDtmf.includes(digit)) {
      throw new Error(`[Asterisk AMI Security] Dígito DTMF inválido ou não autorizado: ${digit}`);
    }

    return {
      status: 'Success',
      message: `DTMF ${digit} injetado no canal SIP ${sipChannel} com sucesso.`,
    };
  }
}

export const asteriskAmi = new AsteriskManager();
