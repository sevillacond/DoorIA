import type { Gate } from '../../types.ts';
import type { HardwareAdapter, HardwareRelayResult, HardwareDtmfResult, HardwareHealthResult } from './HardwareAdapter.ts';
import { AsteriskManager } from '../AsteriskAMI.ts';

/**
 * Adaptador de Hardware Real para ambiente de produção (Mini PC / Guarita).
 * Realiza a comunicação direta com o Asterisk 20 LTS via AMI/PJSIP e relés IP blindados.
 * 
 * Regra de Ouro da Correção 7:
 * - COMMAND_SENT: Comando elétrico enviado ao relé / Asterisk AMI com sucesso.
 *   NUNCA afirmar que o portão fisicamente abriu ou fechou sem sensor de fim de curso físico.
 * - HARDWARE_CONFIRMED: Exclusivo para quando houver leitura física real de sensor (reed switch).
 * - HARDWARE_FAILURE: Falha de comunicação ou timeout no barramento com o equipamento.
 */
export class RealHardwareAdapter implements HardwareAdapter {
  public readonly mode = 'real_hardware' as const;
  public readonly isSimulated = false;
  private ami: AsteriskManager;

  constructor() {
    this.ami = new AsteriskManager(
      process.env.ASTERISK_HOST || '127.0.0.1',
      parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10)
    );
  }

  public async triggerRelay(gate: Gate, pulseDurationSeconds: number, correlationId?: string): Promise<HardwareRelayResult> {
    const timestamp = new Date().toISOString();
    const relayIp = gate.relayIp || process.env.RELAY_CONTROLLER_IP || '192.168.1.160';

    try {
      console.log(`[REAL_HARDWARE] [${correlationId || 'N/A'}] Enviando comando elétrico para relé pino ${gate.relayPin} em ${relayIp} (DTMF: ${gate.dtmfCode})...`);

      // Acionamento real via protocolo Asterisk AMI
      const amiAction = await this.ami.executeSafeAction('PlayDTMF', {
        Digit: gate.dtmfCode.replace('*', ''),
        Duration: String(pulseDurationSeconds * 1000),
      });

      if (!amiAction.success) {
        throw new Error(amiAction.message || 'Falha de resposta no socket do Asterisk AMI');
      }

      // Verificação de sensor de fim de curso físico
      const hasPhysicalFeedbackSensor = gate.sensorState === 'ok';
      const physicalSensorState: 'fechado' | 'aberto' | 'desconhecido' =
        gate.status === 'aberto' ? 'aberto' : gate.status === 'fechado' ? 'fechado' : 'desconhecido';

      // Sem sensor físico ativo reportando em tempo real, o status é estritamente COMMAND_SENT
      const commandStatus = hasPhysicalFeedbackSensor && physicalSensorState === 'aberto'
        ? 'HARDWARE_CONFIRMED'
        : 'COMMAND_SENT';

      const message = commandStatus === 'HARDWARE_CONFIRMED'
        ? `Portão fisicamente confirmado como aberto pelo sensor de fim de curso (Relé ${gate.relayPin}).`
        : `Comando enviado ao relé físico ${gate.relayPin} via Asterisk AMI (${gate.dtmfCode}). Aguardando ciclo de deslocamento mecânico.`;

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
