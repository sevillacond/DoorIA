import { PolicyEngine } from './PolicyEngine.ts';
import { AuditService } from './AuditService.ts';
import type { Gate, UserSession } from '../types.ts';
import { getHardwareAdapter, type HardwareRelayResult } from './hardware/index.ts';

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
}

export interface TriggerGateResult {
  success: boolean;
  message: string;
  gate?: Gate;
  statusCode: number;
  isSimulated: boolean;
  hardwareMode: 'simulated' | 'real_hardware';
  relayResult?: HardwareRelayResult;
}

export class GateControlService {
  /**
   * Executa o fluxo de segurança obrigatório para liberação de portões:
   * Autenticação -> RBAC -> Policy Engine -> Validação de Contexto -> Auditoria -> Hardware Adapter (Real vs Simulado)
   */
  public static async trigger(
    gate: Gate,
    params: TriggerGateParams
  ): Promise<TriggerGateResult> {
    const { session, context, triggerSource } = params;
    const adapter = getHardwareAdapter();

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

    // 2. TRATAMENTO DE ACESSO NEGADO
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
        correlationId: context.correlationId,
        dtmfCommand: gate.dtmfCode,
        details: {
          triggerSource,
          gateId: gate.id,
          policyCode: evaluation.policyCode,
          callActive: context.callActive,
          activeCallTargetUnit: context.activeCallTargetUnit,
          hardwareMode: adapter.mode,
          isSimulated: adapter.isSimulated,
        },
      });

      return {
        success: false,
        message: evaluation.reason || 'Acionamento de portão negado pelas políticas de segurança.',
        statusCode: 403,
        isSimulated: adapter.isSimulated,
        hardwareMode: adapter.mode,
      };
    }

    // 3. EXECUÇÃO VIA HARDWARE ADAPTER (SEPARANDO REAL DE SIMULAÇÃO)
    const pulseDuration = gate.type === 'garagem' ? 2 : 1;
    const relayResult = await adapter.triggerRelay(gate, pulseDuration);

    // 4. REGISTRO IMUTÁVEL DE AUDITORIA COM IDENTIFICAÇÃO DE MODO
    await AuditService.record({
      actor: session.name,
      role: session.role,
      action: adapter.isSimulated ? 'ABRIR_PORTAO_SIMULADO' : 'ABRIR_PORTAO_FISICO',
      target: `${gate.name} (${gate.dtmfCode})`,
      status: relayResult.success ? 'PERMITIDO' : 'ALERTA',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
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
        hardwareExecuted: relayResult.executed,
        hardwareExecutionStatus: relayResult.success ? 'SUCCESS' : 'HARDWARE_FAILURE',
      },
    });

    if (!relayResult.success) {
      return {
        success: false,
        message: relayResult.message,
        statusCode: relayResult.statusCode,
        isSimulated: adapter.isSimulated,
        hardwareMode: adapter.mode,
        relayResult,
      };
    }

    // 5. ATUALIZAÇÃO DO ESTADO DO PORTÃO
    gate.status = adapter.isSimulated ? 'aberto' : 'abrindo';
    gate.lastOpenedAt = new Date().toISOString();
    gate.lastOpenedBy = `${session.name} (${session.role}) [${adapter.isSimulated ? 'SIMULADO' : 'HARDWARE_REAL'}]`;

    // Ciclo eletromecânico
    setTimeout(() => {
      gate.status = 'aberto';
      setTimeout(() => {
        gate.status = 'fechando';
        setTimeout(() => {
          gate.status = 'fechado';
        }, 3000);
      }, gate.type === 'garagem' ? 10000 : 5000);
    }, 1200);

    return {
      success: true,
      message: relayResult.message,
      gate,
      statusCode: 200,
      isSimulated: adapter.isSimulated,
      hardwareMode: adapter.mode,
      relayResult,
    };
  }
}
