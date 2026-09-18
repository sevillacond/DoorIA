import { PolicyEngine } from './PolicyEngine.ts';
import { AuditService } from './AuditService.ts';
import type { Gate, UserSession } from '../types.ts';

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
}

export class GateControlService {
  /**
   * Executa o fluxo de segurança obrigatório para liberação física de portões:
   * Autenticação -> RBAC -> Policy Engine -> Validação de Contexto -> Auditoria -> Asterisk/Relé
   */
  public static async trigger(
    gate: Gate,
    params: TriggerGateParams
  ): Promise<TriggerGateResult> {
    const { session, context, triggerSource } = params;

    // 1. AVALIAÇÃO PELO POLICY ENGINE
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
        },
      });

      return {
        success: false,
        message: evaluation.reason || 'Acionamento físico de portão negado pelas políticas de segurança.',
        statusCode: 403,
      };
    }

    // 3. AUTORIZADO: REGISTRO IMUTÁVEL DE AUDITORIA
    await AuditService.record({
      actor: session.name,
      role: session.role,
      action: 'ABRIR_PORTAO',
      target: `${gate.name} (${gate.dtmfCode})`,
      status: 'PERMITIDO',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
      dtmfCommand: gate.dtmfCode,
      details: {
        triggerSource,
        gateId: gate.id,
        relayPin: gate.relayPin,
        relayIp: '192.168.1.160',
        callActive: context.callActive,
      },
    });

    // 4. ATUALIZAÇÃO DO ESTADO DO PORTÃO
    gate.status = 'abrindo';
    gate.lastOpenedAt = new Date().toISOString();
    gate.lastOpenedBy = `${session.name} (${session.role})`;

    // Simulação do ciclo eletromecânico do relé blindado (aberto -> fechando -> fechado)
    setTimeout(() => {
      gate.status = 'aberto';
      setTimeout(() => {
        gate.status = 'fechando';
        setTimeout(() => {
          gate.status = 'fechado';
        }, 3000);
      }, gate.type === 'garagem' ? 12000 : 5000);
    }, 1500);

    return {
      success: true,
      message: `Comando aceito pelo Policy Engine. ${gate.name} acionado com sucesso via Relé ${gate.relayPin} (${gate.dtmfCode}).`,
      gate,
      statusCode: 200,
    };
  }
}
