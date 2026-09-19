import { PolicyEngine } from './PolicyEngine.ts';
import { AuditService } from './AuditService.ts';
import type { Gate, UserSession } from '../types.ts';
import { getHardwareAdapter, type HardwareAdapter, type HardwareRelayResult, type HardwareCommandStatus } from './hardware/index.ts';

export interface TriggerGateParams {
  gateId: string;
  session: UserSession;
  context: {
    callActive?: boolean;
    activeCallTargetUnit?: string;
    ipAddress?: string;
    userAgent?: string;
    correlationId?: string;
  };
  triggerSource: 'painel_web' | 'dtmf_asterisk' | 'maia_ia' | 'totem_rfid' | 'qr_code';
  adapterOverride?: HardwareAdapter;
}

export interface TriggerGateResult {
  success: boolean;
  message: string;
  gate?: Gate;
  statusCode: number;
  isSimulated: boolean;
  hardwareMode: 'simulated' | 'real_hardware';
  commandStatus: HardwareCommandStatus;
  hasPhysicalFeedbackSensor: boolean;
  relayResult?: HardwareRelayResult;
}

export class GateControlService {
  /**
   * Executa o fluxo de segurança obrigatório para liberação de portões:
   * Autenticação -> RBAC -> Policy Engine -> Validação de Contexto -> Auditoria -> Hardware Adapter
   * 
   * Correção 7 (Separação Rigorosa):
   * - Modo Simulado: Apenas computação lógica e previsão visual. Não finge acionar equipamento real.
   * - Modo Real: Diferencia claramente COMMAND_SENT de HARDWARE_CONFIRMED e HARDWARE_FAILURE.
   *   O setTimeout() NUNCA é usado como confirmação de estado de hardware físico real.
   */
  public static async trigger(
    gate: Gate,
    params: TriggerGateParams
  ): Promise<TriggerGateResult> {
    const { session, context, triggerSource, adapterOverride } = params;
    const adapter = adapterOverride || getHardwareAdapter();
    const correlationId = context.correlationId || `gate-trig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 1. AVALIAÇÃO RIGOROSA PELO POLICY ENGINE
    const evaluation = PolicyEngine.evaluate({
      actor: {
        id: session.id,
        role: session.role,
        unitNumber: session.unitNumber,
      },
      action: 'ABRIR_PORTAO',
      resource: {
        target: gate.name,
        dtmfCommand: gate.dtmfCode,
      },
      context: {
        callActive: context.callActive,
        activeCallTargetUnit: context.activeCallTargetUnit,
        ipAddress: context.ipAddress,
      },
    });

    // 2. TRATAMENTO DE ACESSO NEGADO PELO POLICY ENGINE
    if (!evaluation.allowed) {
      await AuditService.record({
        actor: session.name,
        role: session.role,
        action: 'ABRIR_PORTAO',
        target: `${gate.name} (${gate.dtmfCode})`,
        status: 'NEGADO',
        reason: evaluation.reason,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        correlationId,
        dtmfCommand: gate.dtmfCode,
        details: {
          triggerSource,
          gateId: gate.id,
          policyCode: evaluation.policyCode,
          callActive: context.callActive,
          activeCallTargetUnit: context.activeCallTargetUnit,
          hardwareMode: adapter.mode,
          isSimulated: adapter.isSimulated,
          commandStatus: 'HARDWARE_FAILURE',
        },
      });

      return {
        success: false,
        message: evaluation.reason || 'Acionamento de portão negado pelas políticas de segurança.',
        statusCode: 403,
        isSimulated: adapter.isSimulated,
        hardwareMode: adapter.mode,
        commandStatus: 'HARDWARE_FAILURE',
        hasPhysicalFeedbackSensor: false,
      };
    }

    // 3. EXECUÇÃO VIA HARDWARE ADAPTER
    const pulseDuration = gate.type === 'garagem' ? 2 : 1;
    const relayResult = await adapter.triggerRelay(gate, pulseDuration, correlationId);

    // 4. REGISTRO IMUTÁVEL DE AUDITORIA COM IDENTIFICAÇÃO ESTRITA DE MODO E RESULTADO
    await AuditService.record({
      actor: session.name,
      role: session.role,
      action: adapter.isSimulated ? 'ABRIR_PORTAO_SIMULADO' : 'ABRIR_PORTAO_FISICO',
      target: `${gate.name} (${gate.dtmfCode})`,
      status: relayResult.success ? 'PERMITIDO' : 'ALERTA',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId,
      dtmfCommand: gate.dtmfCode,
      details: {
        triggerSource,
        gateId: gate.id,
        relayPin: gate.relayPin,
        relayIp: relayResult.relayIp,
        callActive: context.callActive,
        activeCallTargetUnit: context.activeCallTargetUnit,
        hardwareMode: adapter.mode,
        isSimulated: adapter.isSimulated,
        commandStatus: relayResult.commandStatus,
        hasPhysicalFeedbackSensor: relayResult.hasPhysicalFeedbackSensor,
        physicalSensorState: relayResult.physicalSensorState,
        hardwareFailureDetails: relayResult.failureDetails,
        timestamp: relayResult.timestamp,
      },
    });

    if (!relayResult.success) {
      return {
        success: false,
        message: relayResult.message,
        statusCode: relayResult.statusCode,
        isSimulated: adapter.isSimulated,
        hardwareMode: adapter.mode,
        commandStatus: 'HARDWARE_FAILURE',
        hasPhysicalFeedbackSensor: relayResult.hasPhysicalFeedbackSensor,
        relayResult,
      };
    }

    // 5. TRATAMENTO DO ESTADO DO PORTÃO
    gate.lastOpenedAt = relayResult.timestamp;
    gate.lastOpenedBy = `${session.name} (${session.role}) [${adapter.isSimulated ? 'SIMULADO' : 'HARDWARE_REAL'}]`;

    if (adapter.isSimulated) {
      // No modo simulado, setTimeout é usado EXCLUSIVAMENTE para projeção visual no painel de demonstração
      gate.status = 'aberto';
      setTimeout(() => {
        gate.status = 'fechando';
        setTimeout(() => {
          gate.status = 'fechado';
        }, 3000);
      }, gate.type === 'garagem' ? 10000 : 5000);
    } else {
      // No modo real de hardware:
      // TIMERS NÃO PODEM SIMULAR CONFIRMAÇÃO FÍSICA NO REAL HARDWARE ADAPTER!
      // 'aberto' e 'fechado' somente devem ser atribuídos como estados físicos quando houver confirmação real (HARDWARE_CONFIRMED).
      // COMMAND_SENT altera para o estado intermediário 'comando_enviado' e NUNCA para 'aberto' automaticamente.
      if (relayResult.commandStatus === 'HARDWARE_CONFIRMED') {
        gate.status = 'aberto';
      } else if (relayResult.commandStatus === 'COMMAND_SENT') {
        gate.status = 'comando_enviado';
      } else {
        gate.status = 'falha';
      }
    }

    return {
      success: true,
      message: relayResult.message,
      gate,
      statusCode: 200,
      isSimulated: adapter.isSimulated,
      hardwareMode: adapter.mode,
      commandStatus: relayResult.commandStatus,
      hasPhysicalFeedbackSensor: relayResult.hasPhysicalFeedbackSensor,
      relayResult,
    };
  }

  /**
   * Método de conveniência para acionamento direto de portão com suporte a injeção de adaptador
   */
  public static async triggerGate(
    gate: Gate,
    session: UserSession,
    context: {
      callActive?: boolean;
      activeCallTargetUnit?: string;
      ipAddress?: string;
      userAgent?: string;
      correlationId?: string;
    } = {},
    adapterOverride?: HardwareAdapter,
    triggerSource: 'painel_web' | 'dtmf_asterisk' | 'maia_ia' | 'totem_rfid' | 'qr_code' = 'painel_web'
  ): Promise<TriggerGateResult> {
    return this.trigger(gate, {
      gateId: gate.id,
      session,
      context,
      triggerSource,
      adapterOverride,
    });
  }
}
