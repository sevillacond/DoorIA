import type { Gate } from '../../types.ts';
import type { HardwareAdapter, HardwareRelayResult, HardwareDtmfResult, HardwareHealthResult } from './HardwareAdapter.ts';
import { AsteriskManager } from '../AsteriskAMI.ts';

/**
 * Adaptador de Hardware Real para ambiente de produção (Mini PC / Guarita).
 * Realiza a comunicação direta com o Asterisk 20 LTS via AMI/PJSIP e relés IP blindados.
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

  public async triggerRelay(gate: Gate, pulseDurationSeconds: number): Promise<HardwareRelayResult> {
    const timestamp = new Date().toISOString();
    const relayIp = gate.relayIp || process.env.RELAY_CONTROLLER_IP || '192.168.1.160';

    try {
      // 1. Acionamento real via protocolo Asterisk AMI (DTMF RFC2833 para decodificador de relé ou comando AMI)
      console.log(`[REAL_HARDWARE] Acionando relé físico pino ${gate.relayPin} em ${relayIp} por ${pulseDurationSeconds}s...`);

      // Se houver canal SIP ativo ou porta de relé IP dedicada:
      const amiAction = await this.ami.executeSafeAction('PlayDTMF', {
        Digit: gate.dtmfCode.replace('*', ''),
        Duration: String(pulseDurationSeconds * 1000),
      });

      if (!amiAction.success) {
        throw new Error(amiAction.message || 'Falha na comunicação com o Asterisk AMI');
      }

      return {
        success: true,
        executed: true,
        isSimulated: false,
        hardwareMode: 'real_hardware',
        message: `Relé físico ${gate.relayPin} acionado com sucesso em ${relayIp} (${gate.dtmfCode}).`,
        statusCode: 200,
        relayPin: gate.relayPin,
        relayIp,
        pulseDurationMs: pulseDurationSeconds * 1000,
        timestamp,
      };
    } catch (error: any) {
      console.error(`[REAL_HARDWARE] ❌ Erro ao acionar relé físico:`, error.message);
      return {
        success: false,
        executed: false,
        isSimulated: false,
        hardwareMode: 'real_hardware',
        message: `Falha de acionamento do relé físico: ${error.message}`,
        statusCode: 502,
        relayPin: gate.relayPin,
        relayIp,
        pulseDurationMs: 0,
        timestamp,
      };
    }
  }

  public async injectDtmf(sipChannel: string, digit: string): Promise<HardwareDtmfResult> {
    const res = await this.ami.injectDtmf(sipChannel, digit);
    return {
      success: res.status === 'Success',
      isSimulated: false,
      digit,
      channel: sipChannel,
      message: res.message,
    };
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
