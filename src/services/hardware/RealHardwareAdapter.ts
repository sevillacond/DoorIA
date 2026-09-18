import type { Gate } from '../../types.ts';
import type { HardwareAdapter, HardwareRelayResult, HardwareDtmfResult, HardwareHealthResult } from './HardwareAdapter.ts';
import { AsteriskManager } from '../AsteriskAMI.ts';
import {
  type PhysicalSensorReader,
  type PhysicalSensorReading,
  type PhysicalSensorState,
  DefaultPhysicalSensorReader,
} from './SensorReader.ts';

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

  public async triggerRelay(gate: Gate, pulseDurationSeconds: number, correlationId?: string): Promise<HardwareRelayResult> {
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
      console.log(`[REAL_HARDWARE] [${correlationId || 'N/A'}] Enviando pulso elétrico para relé pino ${gate.relayPin} em ${relayIp} (DTMF: ${gate.dtmfCode})...`);

      // Acionamento real via protocolo Asterisk AMI (PJSIP / DTMF)
      const amiAction = await this.ami.executeSafeAction('PlayDTMF', {
        Digit: gate.dtmfCode.replace('*', ''),
        Duration: String(pulseDurationSeconds * 1000),
      });

      if (!amiAction.success) {
        throw new Error(amiAction.message || 'Falha de resposta no socket do Asterisk AMI');
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
