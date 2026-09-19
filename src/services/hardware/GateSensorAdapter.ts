import type { Gate } from '../../types.ts';

/**
 * Interface formal para leitura abstrata de sensores físicos de portão
 * (Reed Switch, Fim de Curso, Sensores Magnéticos, Entrada Digital de Controladores)
 */
export type GateSensorReadingState = 'aberto' | 'fechado' | 'desconhecido';

export interface GateSensorAdapter {
  /**
   * Realiza a leitura física do estado real do portão
   */
  readState(gate: Gate): Promise<GateSensorReadingState>;
}

/**
 * Adaptador padrão para controladores sem telemetria de feedback físico configurada
 * Retorna estritamente 'desconhecido', impedindo qualquer inferência errônea de abertura física
 */
export class UnconfiguredGateSensorAdapter implements GateSensorAdapter {
  public async readState(_gate: Gate): Promise<GateSensorReadingState> {
    return 'desconhecido';
  }
}

/**
 * Adaptador para controladores e totens Intelbras (ex: XPE 3115-IP)
 * Entrada sensor de abertura / sensor de porta via barramento digital
 */
export class IntelbrasGateSensorAdapter implements GateSensorAdapter {
  public async readState(_gate: Gate): Promise<GateSensorReadingState> {
    // Protocolo documentado: se não houver leitura física real comprovada, retorna desconhecido
    return 'desconhecido';
  }
}

/**
 * Adaptador para controladoras de acesso Control iD (iDFace, iDAccess)
 */
export class ControlIdGateSensorAdapter implements GateSensorAdapter {
  public async readState(_gate: Gate): Promise<GateSensorReadingState> {
    return 'desconhecido';
  }
}

/**
 * Adaptador para relés e controladores HTTP/REST na guarita
 */
export class HttpRelayGateSensorAdapter implements GateSensorAdapter {
  public async readState(_gate: Gate): Promise<GateSensorReadingState> {
    return 'desconhecido';
  }
}

/**
 * Adaptador para entradas digitais GPIO/Optoacopladas do Mini PC
 */
export class GpioGateSensorAdapter implements GateSensorAdapter {
  public async readState(_gate: Gate): Promise<GateSensorReadingState> {
    return 'desconhecido';
  }
}

/**
 * Factory para obtenção do sensor adapter adequado conforme o fabricante ou tipo configurado
 */
export function getGateSensorAdapter(driverType?: string): GateSensorAdapter {
  switch (driverType?.toLowerCase()) {
    case 'intelbras':
      return new IntelbrasGateSensorAdapter();
    case 'control_id':
    case 'controlid':
      return new ControlIdGateSensorAdapter();
    case 'http':
    case 'http_relay':
      return new HttpRelayGateSensorAdapter();
    case 'gpio':
      return new GpioGateSensorAdapter();
    default:
      return new UnconfiguredGateSensorAdapter();
  }
}
