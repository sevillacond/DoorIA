import type { Gate } from '../../types.ts';
import type { PhysicalSensorReader, PhysicalSensorReading, PhysicalSensorState } from './SensorReader.ts';

export type { PhysicalSensorReader, PhysicalSensorReading, PhysicalSensorState };

export type HardwareCommandStatus = 'COMMAND_SENT' | 'HARDWARE_CONFIRMED' | 'HARDWARE_FAILURE';

export interface HardwareRelayResult {
  success: boolean;
  executed: boolean;
  isSimulated: boolean;
  hardwareMode: 'simulated' | 'real_hardware';
  commandStatus: HardwareCommandStatus;
  message: string;
  statusCode: number;
  relayPin: number;
  relayIp?: string;
  pulseDurationMs: number;
  timestamp: string;
  hasPhysicalFeedbackSensor: boolean;
  physicalSensorState?: PhysicalSensorState;
  sensorReading?: PhysicalSensorReading;
  correlationId?: string;
  failureDetails?: string;
}

export interface HardwareDtmfResult {
  success: boolean;
  isSimulated: boolean;
  digit: string;
  channel: string;
  message: string;
  commandStatus: HardwareCommandStatus;
}

export interface HardwareHealthResult {
  device: string;
  status: 'online' | 'offline' | 'simulated';
  pingMs?: number;
  lastChecked: string;
}

/**
 * Interface canônica para adaptadores de hardware (Relés, Totens XPE, Asterisk AMI)
 */
export interface HardwareAdapter {
  readonly mode: 'simulated' | 'real_hardware';
  readonly isSimulated: boolean;

  /**
   * Envia comando de pulso para relé físico ou simulado
   */
  triggerRelay(gate: Gate, pulseDurationSeconds: number, correlationId?: string): Promise<HardwareRelayResult>;

  /**
   * Injeta sinalização DTMF no Asterisk
   */
  injectDtmf(sipChannel: string, digit: string): Promise<HardwareDtmfResult>;

  /**
   * Verifica o estado de conectividade do equipamento
   */
  checkHealth(deviceId: string): Promise<HardwareHealthResult>;
}
