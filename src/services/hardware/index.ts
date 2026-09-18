import type { HardwareAdapter } from './HardwareAdapter.ts';
import { SimulationAdapter } from './SimulationAdapter.ts';
import { RealHardwareAdapter } from './RealHardwareAdapter.ts';

export * from './HardwareAdapter.ts';
export * from './SimulationAdapter.ts';
export * from './RealHardwareAdapter.ts';

let activeAdapter: HardwareAdapter | null = null;

/**
 * Retorna o adaptador de hardware configurado para o ambiente.
 * Por padrão, utiliza SimulationAdapter a menos que HARDWARE_MODE === 'real'
 * ou NODE_ENV === 'production' com HARDWARE_MODE explicitamente habilitado.
 */
export function getHardwareAdapter(): HardwareAdapter {
  if (!activeAdapter) {
    const isRealHardware = process.env.HARDWARE_MODE === 'real';
    if (isRealHardware) {
      console.log('[HardwareFactory] ✅ Inicializando REAL HARDWARE ADAPTER (Asterisk AMI / Relés IP)');
      activeAdapter = new RealHardwareAdapter();
    } else {
      console.warn('[HardwareFactory] ⚠️ Inicializando SIMULATION ADAPTER (Modo Seguro / Sem Acionamento Eletromecânico)');
      activeAdapter = new SimulationAdapter();
    }
  }
  return activeAdapter;
}
