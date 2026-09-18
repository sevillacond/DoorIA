import type { Gate } from '../../types.ts';
import type { HardwareAdapter, HardwareRelayResult, HardwareDtmfResult, HardwareHealthResult } from './HardwareAdapter.ts';

/**
 * Adaptador de Simulação para ambientes de desenvolvimento/demonstração.
 * Deixa explicitamente claro em logs, respostas e auditoria que nenhum hardware físico foi acionado.
 */
export class SimulationAdapter implements HardwareAdapter {
  public readonly mode = 'simulated' as const;
  public readonly isSimulated = true;

  public async triggerRelay(gate: Gate, pulseDurationSeconds: number): Promise<HardwareRelayResult> {
    const timestamp = new Date().toISOString();
    console.warn(
      `[SIMULATION_ADAPTER] ⚠️ Acionamento SIMULADO para portão '${gate.name}' (ID: ${gate.id}, Relé: ${gate.relayPin}, DTMF: ${gate.dtmfCode}). ` +
      `NENHUM pulso elétrico real foi enviado a relé físico.`
    );

    return {
      success: true,
      executed: true,
      isSimulated: true,
      hardwareMode: 'simulated',
      message: `[MODO SIMULADO] Acionamento lógico do portão '${gate.name}' registrado. O relé físico não está conectado neste ambiente.`,
      statusCode: 200,
      relayPin: gate.relayPin,
      relayIp: gate.relayIp || '192.168.1.160 (simulado)',
      pulseDurationMs: pulseDurationSeconds * 1000,
      timestamp,
    };
  }

  public async injectDtmf(sipChannel: string, digit: string): Promise<HardwareDtmfResult> {
    console.warn(
      `[SIMULATION_ADAPTER] ⚠️ Injeção DTMF SIMULADA '${digit}' no canal '${sipChannel}'. ` +
      `Nenhum pacote RTP/RFC2833 físico gerado.`
    );

    return {
      success: true,
      isSimulated: true,
      digit,
      channel: sipChannel,
      message: `[MODO SIMULADO] DTMF ${digit} simulado com sucesso.`,
    };
  }

  public async checkHealth(deviceId: string): Promise<HardwareHealthResult> {
    return {
      device: deviceId,
      status: 'simulated',
      pingMs: 0,
      lastChecked: new Date().toISOString(),
    };
  }
}
