/**
 * Enlace-DoorIA - Validador Físico e Protocolar de Câmeras ONVIF/RTSP
 * 
 * Regra Obrigatória de Auditoria:
 * Uma porta TCP aberta NÃO significa que existe uma câmera RTSP válida.
 * O sistema diferencia estritamente:
 * - TCP_REACHABLE: socket TCP abriu, mas protocolo ainda não comprovado.
 * - RTSP_VALIDATED: handshake RTSP/1.0 bem-sucedido (OPTIONS/status 200 ou 401 autenticado).
 * - ONVIF_VALIDATED: comunicação ONVIF comprovada.
 * - STREAM_VALIDATED: DESCRIBE/SDP com track de mídia confirmado.
 * - FAILED: inalcançável, timeout, erro de rede, protocolo não-RTSP (ex: HTTP na porta 554) ou autenticação recusada.
 * - MOCK_DEMO: dispositivo mock/simulado (restrito a ambientes de desenvolvimento/sandbox).
 * 
 * "REAL_HARDWARE" é atribuído EXCLUSIVAMENTE mediante prova protocolar RTSP/SDP real.
 * Codec, latência e endpoints NUNCA são inventados ou estimados por fallback estático.
 */

import net from 'net';
import crypto from 'crypto';

export type CameraValidationStatus = 'PENDING' | 'VALIDATED' | 'FAILED';

export type CameraDetailedStatus =
  | 'DISCOVERED'
  | 'TCP_REACHABLE'
  | 'RTSP_VALIDATED'
  | 'ONVIF_VALIDATED'
  | 'STREAM_VALIDATED'
  | 'MOCK_DEMO'
  | 'FAILED';

export type CameraClassification = 'REAL_HARDWARE' | 'MOCK_DEMO' | 'FAILED';

export interface CameraValidationResult {
  success: boolean;
  status: CameraValidationStatus;
  detailedStatus: CameraDetailedStatus;
  classification: CameraClassification;
  isMock: boolean;
  step: 'ip_check' | 'tcp_connect' | 'rtsp_options' | 'auth_check' | 'rtsp_describe' | 'completed';
  latencyMs?: number;
  detectedCodec?: string;
  streamProtocol?: 'webrtc';
  streamEndpoint?: string;
  streamValidated?: boolean;
  authRequired?: boolean;
  authSuccess?: boolean;
  error?: string;
  details?: Record<string, any>;
}

export interface ValidatedCameraRecord {
  ip: string;
  status: CameraValidationStatus;
  detailedStatus?: CameraDetailedStatus;
  classification: CameraClassification;
  isMock: boolean;
  validatedAt: number;
  latencyMs?: number;
  error?: string;
  detectedCodec?: string;
  streamValidated?: boolean;
}

interface ParsedRtspResponse {
  isRtsp: boolean;
  protocol: string;
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: string;
  raw: string;
}

export class CameraValidationService {
  private static registry = new Map<string, ValidatedCameraRecord>();

  public static getRecord(ip: string): ValidatedCameraRecord | undefined {
    return this.registry.get(ip.trim());
  }

  public static setRecord(record: ValidatedCameraRecord): void {
    this.registry.set(record.ip.trim(), record);
  }

  public static isIpValidated(ip: string, maxAgeMs = 5 * 60 * 1000): boolean {
    const record = this.getRecord(ip);
    if (!record) return false;
    if (record.status !== 'VALIDATED') return false;
    if (record.classification !== 'REAL_HARDWARE') return false;
    if (record.isMock) return false;
    if (Date.now() - record.validatedAt > maxAgeMs) return false;
    return true;
  }

  public static clear(): void {
    this.registry.clear();
  }

  /**
   * Extrai e analisa uma mensagem de resposta RTSP
   */
  private static parseRtspResponse(raw: string): ParsedRtspResponse {
    const lines = raw.split(/\r?\n/);
    const firstLine = (lines[0] || '').trim();

    // Uma resposta RTSP válida OBRIGATORIAMENTE deve começar com RTSP/1.0
    // Respostas iniciadas com HTTP/1.0 ou HTTP/1.1 NÃO são RTSP e devem ser rejeitadas
    const statusMatch = firstLine.match(/^(RTSP\/1\.0)\s+(\d{3})\s*(.*)$/i);
    if (!statusMatch) {
      return {
        isRtsp: false,
        protocol: firstLine.split(' ')[0] || 'UNKNOWN',
        statusCode: 0,
        statusMessage: firstLine,
        headers: {},
        body: '',
        raw,
      };
    }

    const headers: Record<string, string> = {};
    let lineIdx = 1;
    for (; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      if (!line) {
        lineIdx++;
        break;
      }
      const sep = line.indexOf(':');
      if (sep !== -1) {
        const key = line.slice(0, sep).trim().toLowerCase();
        const val = line.slice(sep + 1).trim();
        headers[key] = val;
      }
    }

    const body = lines.slice(lineIdx).join('\n');

    return {
      isRtsp: true,
      protocol: 'RTSP/1.0',
      statusCode: parseInt(statusMatch[2], 10),
      statusMessage: statusMatch[3] || '',
      headers,
      body,
      raw,
    };
  }

  /**
   * Extrai codec a partir de conteúdo SDP real retornado pelo comando DESCRIBE
   */
  private static extractCodecFromSdp(sdp: string): string | undefined {
    if (!sdp) return undefined;

    // Linhas típicas de SDP:
    // a=rtpmap:96 H264/90000
    // a=rtpmap:97 H265/90000
    // a=rtpmap:26 JPEG/90000
    const lines = sdp.split(/\r?\n/);
    for (const line of lines) {
      const rtpmapMatch = line.match(/^a=rtpmap:\d+\s+([A-Za-z0-9_\-]+)\//i);
      if (rtpmapMatch) {
        const codecRaw = rtpmapMatch[1].toUpperCase();
        if (codecRaw === 'H264' || codecRaw === 'AVC') return 'H.264';
        if (codecRaw === 'H265' || codecRaw === 'HEVC') return 'H.265';
        if (codecRaw === 'JPEG' || codecRaw === 'MJPEG') return 'MJPEG';
        return codecRaw;
      }
    }

    // Busca textual secundária caso rtpmap esteja em formato simplificado
    if (sdp.includes('H264') || sdp.includes('h264')) return 'H.264';
    if (sdp.includes('H265') || sdp.includes('h265')) return 'H.265';
    if (sdp.includes('MJPEG') || sdp.includes('mjpeg')) return 'MJPEG';

    return undefined;
  }

  /**
   * Gera header de autorização Digest ou Basic
   */
  private static generateAuthHeader(
    authHeaderValue: string,
    username: string,
    password: string,
    method: string,
    uri: string
  ): string | null {
    if (!authHeaderValue) return null;

    // 1. Digest Authentication (RFC 2617 / RFC 2068)
    if (authHeaderValue.toLowerCase().startsWith('digest')) {
      const getParam = (paramName: string): string => {
        const match = authHeaderValue.match(new RegExp(`${paramName}="([^"]+)"`, 'i'));
        return match ? match[1] : '';
      };

      const realm = getParam('realm');
      const nonce = getParam('nonce');

      if (!realm || !nonce) return null;

      const ha1 = crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
      const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
      const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');

      return `Authorization: Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
    }

    // 2. Basic Authentication
    if (authHeaderValue.toLowerCase().startsWith('basic')) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      return `Authorization: Basic ${credentials}`;
    }

    return null;
  }

  /**
   * Executa validação física e protocolar real do dispositivo de câmera.
   */
  public static async validateDevice(params: {
    ip: string;
    rtspPort?: number;
    onvifPort?: number;
    httpPort?: number;
    username?: string;
    password?: string;
    timeoutMs?: number;
    isStrict?: boolean;
    allowDemo?: boolean;
  }): Promise<CameraValidationResult> {
    const {
      ip,
      username,
      password,
      isStrict = false,
      allowDemo = false,
      timeoutMs = 3000,
    } = params;

    const targetIp = (ip || '').trim();

    // 1. Verificação preliminar de IP
    if (!targetIp) {
      return {
        success: false,
        status: 'FAILED',
        detailedStatus: 'FAILED',
        classification: 'FAILED',
        isMock: false,
        step: 'ip_check',
        error: 'Endereço IP do dispositivo não especificado ou inválido.',
      };
    }

    // 2. Identificação de mock / simulação
    const isMock =
      targetIp === '192.168.1.102' ||
      targetIp === '192.168.1.103' ||
      targetIp === '192.168.1.200' ||
      targetIp.toLowerCase().includes('mock') ||
      targetIp.toLowerCase().includes('demo');

    if (isMock) {
      if (isStrict && !allowDemo) {
        return {
          success: false,
          status: 'FAILED',
          detailedStatus: 'MOCK_DEMO',
          classification: 'MOCK_DEMO',
          isMock: true,
          step: 'ip_check',
          error: 'Câmeras simuladas/demo são bloqueadas em ambiente de produção física (ALLOW_DEMO_CAMERAS=false).',
        };
      }

      // Em sandbox/teste: identificar expressamente como MOCK_DEMO
      // NUNCA retornar status 'online' nem inventar latência ou codec de hardware real
      return {
        success: true,
        status: 'PENDING',
        detailedStatus: 'MOCK_DEMO',
        classification: 'MOCK_DEMO',
        isMock: true,
        step: 'completed',
        streamProtocol: 'webrtc',
        streamEndpoint: `/api/v1/stream/preview?ip=${encodeURIComponent(targetIp)}&mock=true`,
        streamValidated: false,
        latencyMs: undefined,
        detectedCodec: undefined,
        details: {
          simulation: true,
          note: 'Câmera de demonstração (Fluxo simulado para testes locais).',
        },
      };
    }

    // 3. Conexão TCP e Handshake RTSP Real
    const portToTest = params.rtspPort || 554;
    const startTime = Date.now();

    return new Promise<CameraValidationResult>((resolve) => {
      const socket = new net.Socket();
      let timer: NodeJS.Timeout;
      let buffer = '';
      let currentStep: 'tcp_connect' | 'rtsp_options' | 'auth_check' | 'rtsp_describe' = 'tcp_connect';
      let cseq = 1;
      let authHeaderUsed: string | null = null;
      let optionsResponse: ParsedRtspResponse | null = null;

      const finish = (result: CameraValidationResult) => {
        clearTimeout(timer);
        socket.removeAllListeners();
        try {
          socket.destroy();
        } catch {
          // ignore
        }
        resolve(result);
      };

      timer = setTimeout(() => {
        finish({
          success: false,
          status: 'FAILED',
          detailedStatus: 'FAILED',
          classification: 'FAILED',
          isMock: false,
          step: currentStep,
          error: `Timeout de comunicação física (${timeoutMs}ms) com ${targetIp}:${portToTest} no passo ${currentStep}.`,
        });
      }, timeoutMs);

      socket.on('error', (err) => {
        finish({
          success: false,
          status: 'FAILED',
          detailedStatus: 'FAILED',
          classification: 'FAILED',
          isMock: false,
          step: currentStep,
          error: `Falha de conexão com ${targetIp}:${portToTest}: ${err.message}`,
        });
      });

      socket.on('data', (data) => {
        buffer += data.toString('utf8');

        // Aguarda cabeçalhos completos terminados em \r\n\r\n
        if (!buffer.includes('\r\n\r\n')) {
          return;
        }

        const parsed = CameraValidationService.parseRtspResponse(buffer);

        // REGRA DE AUDITORIA:
        // Se a resposta NÃO for RTSP/1.0 (ex: HTTP/1.1 ou texto arbitrário),
        // o teste é FAILED. Porta TCP aberta com HTTP NÃO é câmera RTSP válida!
        if (!parsed.isRtsp) {
          return finish({
            success: false,
            status: 'FAILED',
            detailedStatus: 'FAILED',
            classification: 'FAILED',
            isMock: false,
            step: currentStep,
            error: `Protocolo inválido na porta ${portToTest}: resposta não é RTSP/1.0 (recebido: ${parsed.protocol} ${parsed.statusMessage || ''}).`,
          });
        }

        const measuredLatency = Date.now() - startTime;

        // Trata passo rtsp_options
        if (currentStep === 'rtsp_options') {
          optionsResponse = parsed;

          // Se equipamento exige autenticação (401 Unauthorized)
          if (parsed.statusCode === 401) {
            const wwwAuth = parsed.headers['www-authenticate'];

            // Se usuário forneceu credenciais, tenta autenticar
            if (username && password && wwwAuth) {
              const uri = `rtsp://${targetIp}:${portToTest}/`;
              authHeaderUsed = CameraValidationService.generateAuthHeader(
                wwwAuth,
                username,
                password,
                'OPTIONS',
                uri
              );

              if (authHeaderUsed) {
                currentStep = 'auth_check';
                buffer = '';
                cseq++;
                const authReq = `OPTIONS ${uri} RTSP/1.0\r\nCSeq: ${cseq}\r\nUser-Agent: DoorIA-CameraValidator/2.0\r\n${authHeaderUsed}\r\n\r\n`;
                socket.write(authReq);
                return;
              }
            }

            // Se não forneceu credenciais, mas o dispositivo respondeu 401 com cabeçalhos RTSP:
            // O protocolo RTSP físico está comprovado, mas exige credenciais.
            return finish({
              success: true,
              status: 'VALIDATED',
              detailedStatus: 'RTSP_VALIDATED',
              classification: 'REAL_HARDWARE',
              isMock: false,
              step: 'completed',
              latencyMs: measuredLatency,
              detectedCodec: undefined, // Nunca inventar!
              streamProtocol: 'webrtc',
              streamEndpoint: `/api/v1/stream/preview?ip=${encodeURIComponent(targetIp)}`,
              streamValidated: false,
              authRequired: true,
              authSuccess: false,
              details: {
                statusCode: 401,
                authScheme: wwwAuth ? wwwAuth.split(' ')[0] : 'Unknown',
                message: 'Protocolo RTSP comprovado. Dispositivo requer autenticação com credenciais.',
              },
            });
          }

          // Se OPTIONS foi 200 OK (ou código de sucesso RTSP 2xx)
          if (parsed.statusCode >= 200 && parsed.statusCode < 300) {
            // Tenta avançar para validação de stream via DESCRIBE
            currentStep = 'rtsp_describe';
            buffer = '';
            cseq++;
            const uri = `rtsp://${targetIp}:${portToTest}/`;
            const describeReq = `DESCRIBE ${uri} RTSP/1.0\r\nCSeq: ${cseq}\r\nAccept: application/sdp\r\nUser-Agent: DoorIA-CameraValidator/2.0\r\n\r\n`;
            socket.write(describeReq);
            return;
          }

          // Qualquer outro status de erro no OPTIONS (ex: 404, 500, etc.)
          return finish({
            success: false,
            status: 'FAILED',
            detailedStatus: 'FAILED',
            classification: 'FAILED',
            isMock: false,
            step: 'rtsp_options',
            error: `Comando RTSP OPTIONS retornou erro ${parsed.statusCode} ${parsed.statusMessage}.`,
          });
        }

        // Trata passo auth_check (resposta após envio de credenciais)
        if (currentStep === 'auth_check') {
          if (parsed.statusCode === 401) {
            return finish({
              success: false,
              status: 'FAILED',
              detailedStatus: 'FAILED',
              classification: 'FAILED',
              isMock: false,
              step: 'auth_check',
              error: 'Falha de autenticação RTSP: credenciais recusadas pelo equipamento (401 Unauthorized persistente).',
            });
          }

          if (parsed.statusCode >= 200 && parsed.statusCode < 300) {
            // Autenticação bem-sucedida! Tenta DESCRIBE autenticado
            currentStep = 'rtsp_describe';
            buffer = '';
            cseq++;
            const uri = `rtsp://${targetIp}:${portToTest}/`;
            const describeAuthHeader = CameraValidationService.generateAuthHeader(
              optionsResponse?.headers['www-authenticate'] || '',
              username || '',
              password || '',
              'DESCRIBE',
              uri
            );
            const describeReq = `DESCRIBE ${uri} RTSP/1.0\r\nCSeq: ${cseq}\r\nAccept: application/sdp\r\nUser-Agent: DoorIA-CameraValidator/2.0\r\n${describeAuthHeader ? describeAuthHeader + '\r\n' : ''}\r\n`;
            socket.write(describeReq);
            return;
          }

          return finish({
            success: false,
            status: 'FAILED',
            detailedStatus: 'FAILED',
            classification: 'FAILED',
            isMock: false,
            step: 'auth_check',
            error: `Erro após envio de autenticação RTSP: ${parsed.statusCode} ${parsed.statusMessage}.`,
          });
        }

        // Trata passo rtsp_describe
        if (currentStep === 'rtsp_describe') {
          let detectedCodec: string | undefined = undefined;
          let isStreamValidated = false;

          // Se o DESCRIBE retornou 200 OK com SDP contendo mídia
          if (parsed.statusCode === 200 && (parsed.body.includes('m=video') || parsed.headers['content-type']?.includes('sdp'))) {
            detectedCodec = CameraValidationService.extractCodecFromSdp(parsed.body);
            isStreamValidated = true;
          }

          return finish({
            success: true,
            status: 'VALIDATED',
            detailedStatus: isStreamValidated ? 'STREAM_VALIDATED' : 'RTSP_VALIDATED',
            classification: 'REAL_HARDWARE',
            isMock: false,
            step: 'completed',
            latencyMs: measuredLatency,
            detectedCodec, // Undefined se não detectado no SDP! NUNCA inventado!
            streamProtocol: 'webrtc',
            streamEndpoint: `/api/v1/stream/preview?ip=${encodeURIComponent(targetIp)}`,
            streamValidated: isStreamValidated,
            authRequired: !!authHeaderUsed,
            authSuccess: !!authHeaderUsed,
            details: {
              cseq,
              optionsStatus: optionsResponse?.statusCode,
              describeStatus: parsed.statusCode,
              publicMethods: optionsResponse?.headers['public'] || optionsResponse?.headers['server'],
            },
          });
        }
      });

      // Inicia o handshake conectando via TCP
      socket.connect(portToTest, targetIp, () => {
        // Conexão TCP estabelecida -> Envia imediatamente probe RTSP OPTIONS
        currentStep = 'rtsp_options';
        const uri = `rtsp://${targetIp}:${portToTest}/`;
        const optionsReq = `OPTIONS ${uri} RTSP/1.0\r\nCSeq: ${cseq}\r\nUser-Agent: DoorIA-CameraValidator/2.0\r\n\r\n`;
        socket.write(optionsReq, 'utf8');
      });
    });
  }
}
