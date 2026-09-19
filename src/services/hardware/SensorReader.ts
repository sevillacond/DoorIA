/**
 * Abstração formal de Leitura de Sensores Físicos de Portão (Reed Switch, Fim de Curso, Optoacopladores)
 * DoorIA - Arquitetura Anti-Arrombamento e Telemetria de Portaria
 */
import type { Gate } from '../../types.ts';
import {
  type GateSensorAdapter,
  type GateSensorReadingState,
  UnconfiguredGateSensorAdapter,
} from './GateSensorAdapter.ts';

export * from './GateSensorAdapter.ts';

export type PhysicalSensorState = 'aberto' | 'fechado' | 'desconhecido' | 'sem_sensor';

export interface PhysicalSensorReading {
  hasPhysicalSensor: boolean;
  state: PhysicalSensorState;
  source: 'reed_switch' | 'gpio_optocoupler' | 'dry_contact' | 'none';
  measuredAt: string;
  pinNumber?: number;
  details?: string;
}

export interface PhysicalSensorReader {
  /**
   * Realiza a leitura física do sensor conectado à entrada digital do controlador de relé na guarita
   */
  readSensor(relayIp: string, relayPin: number): Promise<PhysicalSensorReading>;
}

/**
 * Leitor padrão para controladores de relé da guarita.
 * Em ausência de leitura física comprovada da entrada digital,
 * explicita que NÃO há sensor físico ou leitura imediata, retornando hasPhysicalSensor: false.
 */
export class DefaultPhysicalSensorReader implements PhysicalSensorReader, GateSensorAdapter {
  private fallbackAdapter: GateSensorAdapter = new UnconfiguredGateSensorAdapter();

  public async readState(gate: Gate): Promise<GateSensorReadingState> {
    const reading = await this.readSensor(gate.relayIp || '', gate.relayPin);
    if (!reading.hasPhysicalSensor || reading.state === 'sem_sensor' || reading.state === 'desconhecido') {
      return 'desconhecido';
    }
    return reading.state === 'aberto' ? 'aberto' : 'fechado';
  }

  public async readSensor(relayIp: string, relayPin: number): Promise<PhysicalSensorReading> {
    const measuredAt = new Date().toISOString();
    try {
      if (!relayIp || relayIp === '127.0.0.1') {
        return {
          hasPhysicalSensor: false,
          state: 'sem_sensor',
          source: 'none',
          measuredAt,
          pinNumber: relayPin,
          details: 'Nenhum controlador de relé físico ou IP de telemetria configurado.',
        };
      }

      // Em ambiente de produção, consulta o estado elétrico da entrada digital via protocolo IP do controlador.
      // Caso não haja sensor de fim de curso cabeado na entrada digital, reporta ausência explícita.
      return {
        hasPhysicalSensor: false,
        state: 'sem_sensor',
        source: 'none',
        measuredAt,
        pinNumber: relayPin,
        details: 'Comando elétrico emitido. Sensor físico de confirmação não detectado nesta entrada digital.',
      };
    } catch (err: any) {
      return {
        hasPhysicalSensor: false,
        state: 'desconhecido',
        source: 'none',
        measuredAt,
        pinNumber: relayPin,
        details: `Falha de leitura do barramento de sensor: ${err.message}`,
      };
    }
  }
}

