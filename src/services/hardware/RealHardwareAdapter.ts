import type { Gate } from '../../types.ts';
import type { HardwareAdapter, HardwareRelayResult, HardwareDtmfResult, HardwareHealthResult } from './HardwareAdapter.ts';
import { AsteriskManager } from '../AsteriskAMI.ts';
import {
  type PhysicalSensorReader,
  type PhysicalSensorReading,
  type PhysicalSensorState,
  DefaultPhysicalSensorReader,
} from './SensorReader.ts';
import { HttpCgiRelayDriver } from './drivers/HttpCgiRelayDriver.ts';

/**
 * Adaptador de Hardware Real para ambiente de produção (Mini PC / Guarita).
 * Realiza a comunicação direta com o Asterisk 20 LTS via AMI/PJSIP e relés IP blindados.
 * 
 * Regra de Ouro (Correções 4, 5 e 6):
 * - COMMAND_SENT: Comando elétrico enviado ao relé / Asterisk AMI com sucesso.
 *   NUNCA afirmar que o portão fisicamente abriu ou fechou sem sensor de fim de curso físico.
 * - HARDWARE_CONFIRMED: Exclusivo para quando houver leitura física real de sensor (reed switch).
 * - HARDWARE_FAILURE: Falha de comunicação ou timeout no barramento com o equipamento.
 * - SEM SENSOR FÍSICO: Informar explicitamente no retorno: comando enviado sem sensor de confirmação.
 */
export class RealHardwareAdapter implements HardwareAdapter {
  public readonly mode = 'real_hardware' as const;
  public readonly isSimulated = false;
  private ami: AsteriskManager;
  public sensorReader: PhysicalSensorReader;

  constructor(ami?: AsteriskManager, sensorReader?: PhysicalSensorReader) {
    this.ami =
      ami ||
      new AsteriskManager(
        process.env.ASTERISK_HOST || '127.0.0.1',
        parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10)
      );
    this.sensorReader = sensorReader || new DefaultPhysicalSensorReader();
  }

  /**
   * Leitura formal de sensor físico via interface PhysicalSensorReader
   */
  public async readSensor(relayIp: string, relayPin: number): Promise<PhysicalSensorReading> {
    return this.sensorReader.readSensor(relayIp, relayPin);
  }

  /**
   * Consulta telemetria de entrada digital de sensor de fim de curso (reed switch) do controlador de relé.
   * Mantido para compatibilidade com a suíte de testes.
   * Retorna 'aberto', 'fechado' ou null se não houver sensor físico instalado na entrada digital.
   */
  public async readPhysicalSensorFeedback(relayIp: string, relayPin: number): Promise<'aberto' | 'fechado' | null> {
    const reading = await this.readSensor(relayIp, relayPin);
    if (!reading.hasPhysicalSensor || reading.state === 'sem_sensor' || reading.state === 'desconhecido') {
      return null;
    }
    return reading.state === 'aberto' ? 'aberto' : 'fechado';
  }

  public async triggerRelay(
    gate: Gate,
    pulseDurationSeconds: number,
    correlationId?: string,
    options?: { sipChannel?: string; activeCallTargetUnit?: string; uniqueId?: string; linkedId?: string }
  ): Promise<HardwareRelayResult> {
    const timestamp = new Date().toISOString();
    const isProd = process.env.NODE_ENV === 'production';
    const relayIp = gate.relayIp || process.env.RELAY_CONTROLLER_IP || (isProd ? '' : '192.168.1.160');

    if (isProd && !relayIp) {
      return {
        success: false,
        executed: false,
        isSimulated: false,
        hardwareMode: 'real_hardware',
        commandStatus: 'HARDWARE_FAILURE',
        message: 'Falha de hardware: IP do controlador de relé (RELAY_CONTROLLER_IP) não configurado no ambiente de produção.',
        statusCode: 502,
        relayPin: gate.relayPin,
        relayIp: '',
        pulseDurationMs: 0,
        timestamp,
        hasPhysicalFeedbackSensor: false,
        physicalSensorState: 'desconhecido',
        correlationId,
        failureDetails: 'RELAY_CONTROLLER_IP ausente em produção',
      };
    }

    try {
      console.log(`[REAL_HARDWARE] [${correlationId || 'N/A'}] Disparando pulso elétrico para relé pino ${gate.relayPin} em ${relayIp} (DTMF: ${gate.dtmfCode})...`);

      // Validação estrita do código DTMF de portão físico (*07, *08, 07, 08).
      // Códigos como *09 e 09 são estritamente proibidos e resultam em HARDWARE_FAILURE imediato sem acionar PlayDTMF.
      const allowedGateDtmf = ['*07', '*08', '07', '08'];
      const normalizedDtmf = (gate.dtmfCode || '').trim();
      if (!allowedGateDtmf.includes(normalizedDtmf)) {
        const errDetail = `Código DTMF '${gate.dtmfCode}' não autorizado para acionamento de portão físico (permitidos apenas *07/*08).`;
        console.warn(`[REAL_HARDWARE] [${correlationId || 'N/A'}] ❌ ${errDetail} PlayDTMF abortado.`);
        return {
          success: false,
          executed: false,
          isSimulated: false,
          hardwareMode: 'real_hardware',
          commandStatus: 'HARDWARE_FAILURE',
          message: `Falha de segurança: ${errDetail}`,
          statusCode: 400,
          relayPin: gate.relayPin,
          relayIp: relayIp || '',
          pulseDurationMs: 0,
          timestamp,
          hasPhysicalFeedbackSensor: false,
          physicalSensorState: 'desconhecido',
          correlationId,
          failureDetails: errDetail,
        };
      }

      let commandExecuted = false;
      let commandMethod = '';
      const failureReasons: string[] = [];

      // 1. Acionamento via driver de relé HTTP CGI dedicado (quando configurado explicitamente)
      // NOTA ARQUITETURAL: Para o piloto oficial DoorIA / XPE 3115-IP, o mecanismo padrão homologado é DTMF (*07/*08).
      // Uma resposta HTTP 200 de controladora externa representa apenas recebimento do comando elétrico (COMMAND_SENT),
      // e NUNCA confirmação física de abertura sem sensor de fim de curso (reed switch).
      if (relayIp && relayIp !== '127.0.0.1' && process.env.TRIGGER_METHOD === 'http_cgi') {
        const cgiDriver = new HttpCgiRelayDriver({ host: relayIp });
        const cgiResult = await cgiDriver.pulseRelay(gate.relayPin, pulseDurationSeconds, correlationId);
        if (cgiResult.success) {
          commandExecuted = true;
          commandMethod = 'HTTP_CGI';
        } else if (cgiResult.failureReason) {
          failureReasons.push(cgiResult.failureReason);
        }
      }

      // 2. Via canônica e oficial do piloto XPE 3115-IP: Asterisk AMI PlayDTMF (*07 / *08)
      if (!commandExecuted) {
        // Resolução dinâmica e validação estrita do canal PJSIP real ativo da chamada do XPE
        const targetChannel = await this.ami.findActiveChannelForXpe({
          preferredChannel: options?.sipChannel,
          targetUnit: options?.activeCallTargetUnit,
          uniqueId: options?.uniqueId,
          linkedId: options?.linkedId,
        });

        // Se nenhum canal PJSIP válido e ativo correlacionado à chamada do XPE foi localizado:
        // RECUSA envio de PlayDTMF, não inventa canais e retorna HARDWARE_FAILURE imediatamente.
        if (!targetChannel) {
          const detailMsg = options?.sipChannel
            ? `Canal preferencial '${options.sipChannel}' inexistente, inativo ou não correlacionado à chamada do XPE no Asterisk.`
            : `Não foi possível determinar inequivocamente o canal SIP da chamada XPE no Asterisk.`;
          console.warn(`[REAL_HARDWARE] [${correlationId || 'N/A'}] ❌ ${detailMsg} PlayDTMF abortado.`);
          return {
            success: false,
            executed: false,
            isSimulated: false,
            hardwareMode: 'real_hardware',
            commandStatus: 'HARDWARE_FAILURE',
            message: `Falha de hardware: ${detailMsg} O comando PlayDTMF foi cancelado por segurança.`,
            statusCode: 502,
            relayPin: gate.relayPin,
            relayIp: relayIp || '',
            pulseDurationMs: 0,
            timestamp,
            hasPhysicalFeedbackSensor: false,
            physicalSensorState: 'desconhecido',
            correlationId,
            failureDetails: detailMsg,
          };
        }

        // Parâmetros estritos para a ação PlayDTMF no Asterisk
        const dtmfParams: Record<string, string> = {
          Channel: targetChannel,
          Digit: gate.dtmfCode.replace('*', ''),
          Duration: String(pulseDurationSeconds * 1000),
        };

        // Acionamento real via protocolo Asterisk AMI (PJSIP / DTMF)
        const amiAction = await this.ami.executeSafeAction('PlayDTMF', dtmfParams);

        if (!amiAction.success) {
          return {
            success: false,
            executed: false,
            isSimulated: false,
            hardwareMode: 'real_hardware',
            commandStatus: 'HARDWARE_FAILURE',
            message: `Falha no Asterisk AMI ao injetar PlayDTMF no canal ${targetChannel}: ${amiAction.message}`,
            statusCode: 502,
            relayPin: gate.relayPin,
            relayIp: relayIp || '',
            pulseDurationMs: 0,
            timestamp,
            hasPhysicalFeedbackSensor: false,
            physicalSensorState: 'desconhecido',
            correlationId,
            failureDetails: amiAction.message,
          };
        }

        commandExecuted = true;
        commandMethod = 'ASTERISK_AMI_PLAYDTMF';
      }

      // Consulta de leitura física real do sensor de fim de curso (reed switch) via SensorReader formal
      // REGRA OBRIGATÓRIA: NÃO considerar gate.status === 'aberto' nem gate.sensorState === 'ok' como confirmação física!
      let reading: PhysicalSensorReading;
      // Permite que testes customizem readPhysicalSensorFeedback diretamente ou usem o sensorReader
      const legacyFeedback = await this.readPhysicalSensorFeedback(relayIp, gate.relayPin);
      if (legacyFeedback !== null) {
        reading = {
          hasPhysicalSensor: true,
          state: legacyFeedback,
          source: 'reed_switch',
          measuredAt: new Date().toISOString(),
          pinNumber: gate.relayPin,
        };
      } else {
        reading = await this.readSensor(relayIp, gate.relayPin);
      }

      const hasPhysicalFeedbackSensor = reading.hasPhysicalSensor;
      const physicalSensorState: PhysicalSensorState = reading.state;

      // HARDWARE_CONFIRMED: Só quando houver leitura física real comprovada de sensor/controlador.
      // Sem leitura física comprovada: estritamente COMMAND_SENT. Não inventar estado físico.
      const commandStatus = hasPhysicalFeedbackSensor && physicalSensorState === 'aberto'
        ? 'HARDWARE_CONFIRMED'
        : 'COMMAND_SENT';

      const message = commandStatus === 'HARDWARE_CONFIRMED'
        ? `Portão fisicamente confirmado como aberto via sensor de fim de curso (Relé ${gate.relayPin}).`
        : hasPhysicalFeedbackSensor
        ? `Comando elétrico enviado com sucesso (Relé ${gate.relayPin}, DTMF: ${gate.dtmfCode}). Aguardando resposta do sensor físico.`
        : `Comando elétrico enviado com sucesso ao equipamento (Relé ${gate.relayPin}, DTMF: ${gate.dtmfCode}) sem sensor de confirmação física. Status COMMAND_SENT.`;

      return {
        success: true,
        executed: true,
        isSimulated: false,
        hardwareMode: 'real_hardware',
        commandStatus,
        message,
        statusCode: 200,
        relayPin: gate.relayPin,
        relayIp,
        pulseDurationMs: pulseDurationSeconds * 1000,
        timestamp,
        hasPhysicalFeedbackSensor,
        physicalSensorState,
        sensorReading: reading,
        correlationId,
      };
    } catch (error: any) {
      console.error(`[REAL_HARDWARE] ❌ [${correlationId || 'N/A'}] Falha de hardware no relé:`, error.message);
      return {
        success: false,
        executed: false,
        isSimulated: false,
        hardwareMode: 'real_hardware',
        commandStatus: 'HARDWARE_FAILURE',
        message: `Falha de comunicação com hardware físico do relé: ${error.message}`,
        statusCode: 502,
        relayPin: gate.relayPin,
        relayIp,
        pulseDurationMs: 0,
        timestamp,
        hasPhysicalFeedbackSensor: false,
        physicalSensorState: 'desconhecido',
        correlationId,
        failureDetails: error.message,
      };
    }
  }

  public async injectDtmf(sipChannel: string, digit: string): Promise<HardwareDtmfResult> {
    try {
      const res = await this.ami.injectDtmf(sipChannel, digit);
      const isSuccess = res.status === 'Success';
      return {
        success: isSuccess,
        isSimulated: false,
        digit,
        channel: sipChannel,
        message: res.message || (isSuccess ? 'DTMF injetado no canal PJSIP' : 'Falha ao injetar DTMF'),
        commandStatus: isSuccess ? 'COMMAND_SENT' : 'HARDWARE_FAILURE',
      };
    } catch (err: any) {
      return {
        success: false,
        isSimulated: false,
        digit,
        channel: sipChannel,
        message: err.message,
        commandStatus: 'HARDWARE_FAILURE',
      };
    }
  }

  public async checkHealth(deviceId: string): Promise<HardwareHealthResult> {
    const isAmiConnected = this.ami.isConnected();
    return {
      device: deviceId,
      status: isAmiConnected ? 'online' : 'offline',
      lastChecked: new Date().toISOString(),
    };
  }
}
