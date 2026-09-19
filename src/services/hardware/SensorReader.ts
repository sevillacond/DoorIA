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

      // Consulta de sensor físico real via entrada digital do controlador (se disponível na rede)
      const timeoutSignal = typeof AbortSignal !== 'undefined' && (AbortSignal as any).timeout 
        ? (AbortSignal as any).timeout(1200) 
        : undefined;

      const sensorUrl = process.env.SENSOR_ENDPOINT_TEMPLATE
        ? process.env.SENSOR_ENDPOINT_TEMPLATE.replace('{ip}', relayIp).replace('{pin}', String(relayPin))
        : `http://${relayIp}/cgi-bin/sensor.cgi?input=${relayPin}`;

      try {
        const response = await fetch(sensorUrl, {
          method: 'GET',
          signal: timeoutSignal,
        });

        if (response.ok) {
          const text = (await response.text()).toLowerCase();
          const isAberto = text.includes('open') || text.includes('1') || text.includes('true') || text.includes('aberto');
          const isFechado = text.includes('closed') || text.includes('0') || text.includes('false') || text.includes('fechado');

          if (isAberto || isFechado) {
            return {
              hasPhysicalSensor: true,
              state: isAberto ? 'aberto' : 'fechado',
              source: 'reed_switch',
              measuredAt,
              pinNumber: relayPin,
              details: `Leitura física confirmada via telemetria digital: ${isAberto ? 'aberto' : 'fechado'}.`,
            };
          }
        }
      } catch {
        // Falha de rede ou timeout: sem sensor físico respondendo nesta entrada
      }

      // Caso não haja sensor de fim de curso cabeado ou acessível, reporta ausência explícita (sem simulação)
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

