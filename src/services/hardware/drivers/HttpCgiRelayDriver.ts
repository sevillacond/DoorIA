/**
 * DRIVER DE HARDWARE ESPECÍFICO: PLACA CONTROLADORA DE RELÉ IP (HTTP CGI)
 * 
 * ESPECIFICAÇÃO TÉCNICA FORMAL DO DRIVER:
 * - Fabricante: Módulos Ethernet CGI / Fabricantes de WebRelay / Placas IP Relé compatíveis
 * - Modelo: Controladora Ethernet IP com firmware CGI legado (ex: WebRelay-Dual/Quad)
 * - Endpoint: http://{host}/cgi-bin/relay.cgi?action=open&relay={relayPin}&duration={durationSeconds}
 * - Autenticação: Opcional HTTP Basic Authentication via credenciais de rede local isolada
 * - Relay: Pino numérico do relé (1 para pedestre/social, 2 para garagem/veicular)
 * - Duração: Pulso em segundos (padrão 1 a 5 segundos)
 * - Resposta esperada: HTTP 200 OK contendo payload de confirmação de recebimento de comando
 * - Método de confirmação física: O endpoint /cgi-bin/relay.cgi NÃO reporta status de sensor
 *   de fim de curso (reed switch). Portanto, uma resposta HTTP 200 representa UNICAMENTE o
 *   recebimento do comando pela controladora.
 * - Resultado Obrigatório: COMMAND_SENT (e NUNCA HARDWARE_CONFIRMED).
 * 
 * HOMOLOGAÇÃO DO PILOTO DOORIA / INTELBRAS XPE 3115-IP:
 * - O mecanismo homologado e canônico do piloto é Asterisk 20 LTS SIP/PJSIP PlayDTMF (*07 / *08).
 * - Este driver HTTP CGI permanece disponível para instalações com controladora de contato seco IP
 *   dedicada no quadro elétrico, ativado via configuração explícita (TRIGGER_METHOD=http_cgi).
 */

export interface HttpCgiDriverConfig {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  timeoutMs?: number;
}

export interface HttpCgiExecutionResult {
  success: boolean;
  statusCode?: number;
  commandStatus: 'COMMAND_SENT' | 'HARDWARE_FAILURE';
  hasPhysicalFeedbackSensor: false;
  message: string;
  failureReason?: string;
}

export class HttpCgiRelayDriver {
  private config: HttpCgiDriverConfig;

  constructor(config: HttpCgiDriverConfig) {
    this.config = {
      timeoutMs: 1500,
      port: 80,
      ...config,
    };
  }

  /**
   * Dispara pulso de abertura para o relé físico configurado
   */
  public async pulseRelay(
    relayPin: number,
    pulseDurationSeconds: number,
    correlationId?: string
  ): Promise<HttpCgiExecutionResult> {
    const { host, port, username, password, timeoutMs } = this.config;

    // Validação estrita de parâmetros de rede
    if (!host || host === '127.0.0.1' || host === 'localhost') {
      return {
        success: false,
        commandStatus: 'HARDWARE_FAILURE',
        hasPhysicalFeedbackSensor: false,
        message: 'Falha no driver HTTP CGI: IP da controladora inválido ou em loopback.',
        failureReason: 'IP da controladora inválido',
      };
    }

    const portSuffix = port && port !== 80 ? `:${port}` : '';
    const url = `http://${host}${portSuffix}/cgi-bin/relay.cgi?action=open&relay=${relayPin}&duration=${pulseDurationSeconds}`;

    const headers: Record<string, string> = {
      'User-Agent': 'Enlace-DoorIA-RelayDriver/1.0',
    };

    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    try {
      const timeoutSignal = typeof AbortSignal !== 'undefined' && (AbortSignal as any).timeout
        ? (AbortSignal as any).timeout(timeoutMs || 1500)
        : undefined;

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: timeoutSignal,
      });

      if (response.ok) {
        console.log(
          `[HttpCgiRelayDriver] [${correlationId || 'N/A'}] Pulso de ${pulseDurationSeconds}s aceito pela controladora ${host} (Pino: ${relayPin}, Status HTTP: ${response.status})`
        );

        // Regra Arquitetural: HTTP 200 neste driver representa apenas COMMAND_SENT, NUNCA confirmação física.
        return {
          success: true,
          statusCode: response.status,
          commandStatus: 'COMMAND_SENT',
          hasPhysicalFeedbackSensor: false,
          message: `Comando elétrico aceito pela controladora IP ${host} (Pino ${relayPin}).`,
        };
      } else {
        const errorMsg = `Controladora HTTP CGI ${host} retornou código de erro HTTP ${response.status}`;
        console.warn(`[HttpCgiRelayDriver] [${correlationId || 'N/A'}] ❌ ${errorMsg}`);
        return {
          success: false,
          statusCode: response.status,
          commandStatus: 'HARDWARE_FAILURE',
          hasPhysicalFeedbackSensor: false,
          message: errorMsg,
          failureReason: errorMsg,
        };
      }
    } catch (err: any) {
      const errorMsg = `Controladora HTTP CGI ${host} inacessível: ${err.message}`;
      console.warn(`[HttpCgiRelayDriver] [${correlationId || 'N/A'}] ❌ ${errorMsg}`);
      return {
        success: false,
        commandStatus: 'HARDWARE_FAILURE',
        hasPhysicalFeedbackSensor: false,
        message: errorMsg,
        failureReason: err.message,
      };
    }
  }
}
