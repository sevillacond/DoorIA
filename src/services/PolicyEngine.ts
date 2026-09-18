import type { UserRole } from '../types.ts';

export interface PolicyEvaluationRequest {
  actor: {
    id: string;
    role: UserRole | string;
    unitNumber?: string;
  };
  action:
    | 'ABRIR_PORTAO'
    | 'VER_GRAVACAO'
    | 'ACESSAR_CAMERA'
    | 'CONSULTAR_FINANCEIRO'
    | 'CONFIGURAR_SISTEMA'
    | 'EMITIR_CONVITE_QR'
    | 'EXEC_AMI_COMMAND';
  resource: {
    target: string;
    targetUnitNumber?: string;
    dtmfCommand?: string;
    cameraLocation?: string;
    amiAction?: string;
  };
  context: {
    callActive?: boolean;
    activeCallTargetUnit?: string;
    ipAddress?: string;
  };
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
  policyCode?: string;
}

export class PolicyEngine {
  /**
   * Avalia rigorosamente a concessão de privilégios de acesso e acionamento de hardware
   */
  public static evaluate(req: PolicyEvaluationRequest): PolicyEvaluationResult {
    const { actor, action, resource, context } = req;

    // 1. REGRA DE OURO: ACIONAMENTO FÍSICO DE PORTÕES E RELÉS
    if (action === 'ABRIR_PORTAO') {
      // Morador: acionamento permitido exclusivamente durante chamada ativa direcionada ao seu apartamento
      if (actor.role === 'morador') {
        if (!context.callActive) {
          return {
            allowed: false,
            policyCode: 'DENY_NO_ACTIVE_CALL',
            reason: 'Política de Segurança: Abertura por morador só é autorizada durante chamada ativa de interfone.',
          };
        }
        if (context.activeCallTargetUnit && context.activeCallTargetUnit !== actor.unitNumber) {
          return {
            allowed: false,
            policyCode: 'DENY_CROSS_UNIT_CALL',
            reason: `Política de Isolamento: Morador da Unidade ${actor.unitNumber} não tem permissão para acionar portão para a Unidade ${context.activeCallTargetUnit}.`,
          };
        }
        return { allowed: true };
      }

      // Síndico, Operador de Portaria e Super Admin têm permissão operacional direta
      if (['sindico', 'operador', 'admin_condominio', 'super_admin', 'admin_sistema'].includes(actor.role)) {
        return { allowed: true };
      }

      return {
        allowed: false,
        policyCode: 'DENY_UNAUTHORIZED_ROLE',
        reason: `Papel '${actor.role}' sem privilégio de acionamento de portão ou relé.`,
      };
    }

    // 2. REGRA DE OURO: GRAVAÇÕES BRUTAS DE ÁUDIO E VÍDEO (LGPD E PRIVACIDADE)
    if (action === 'VER_GRAVACAO') {
      if (actor.role === 'morador') {
        return {
          allowed: false,
          policyCode: 'DENY_RESIDENT_RAW_MEDIA',
          reason: 'Regra de Ouro #10: Morador tem acesso ao histórico de logs, mas NÃO tem acesso à mídia bruta das gravações.',
        };
      }
      if (['sindico', 'admin_condominio', 'super_admin'].includes(actor.role)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        policyCode: 'DENY_MEDIA_ACCESS',
        reason: 'Acesso a gravações restrito a administradores e auditores credenciados.',
      };
    }

    // 3. ISOLAMENTO DE DADOS FINANCEIROS
    if (action === 'CONSULTAR_FINANCEIRO') {
      if (actor.role === 'morador') {
        if (resource.targetUnitNumber && resource.targetUnitNumber !== actor.unitNumber) {
          return {
            allowed: false,
            policyCode: 'DENY_CROSS_UNIT_FINANCE',
            reason: 'Isolamento de Dados: Moradores só podem visualizar informações financeiras de sua própria unidade.',
          };
        }
        return { allowed: true };
      }
      if (['sindico', 'admin_condominio', 'super_admin'].includes(actor.role)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        policyCode: 'DENY_FINANCIAL_ACCESS',
        reason: 'Acesso ao módulo financeiro não autorizado.',
      };
    }

    // 4. ACESSO ÀS CÂMERAS CFTV
    if (action === 'ACESSAR_CAMERA') {
      // Câmeras de áreas comuns e totem são autorizadas para moradores e equipe de gestão
      return { allowed: true };
    }

    // 5. EMISSÃO DE CONVITES QR CODE
    if (action === 'EMITIR_CONVITE_QR') {
      if (actor.role === 'morador') {
        if (resource.targetUnitNumber && resource.targetUnitNumber !== actor.unitNumber) {
          return {
            allowed: false,
            policyCode: 'DENY_CROSS_UNIT_INVITE',
            reason: 'Morador só pode emitir convites para a sua própria unidade.',
          };
        }
        return { allowed: true };
      }
      return { allowed: true };
    }

    // 6. COMANDOS ASTERISK AMI
    if (action === 'EXEC_AMI_COMMAND') {
      const allowedAmiActions = ['Ping', 'SIPpeers', 'PJSIPShowEndpoints', 'CoreShowChannels', 'Status', 'Hangup', 'PlayDTMF'];
      if (!resource.amiAction || !allowedAmiActions.includes(resource.amiAction)) {
        return {
          allowed: false,
          policyCode: 'DENY_INVALID_AMI_ACTION',
          reason: `Ação AMI '${resource.amiAction}' não consta na lista de comandos permitidos (whitelist).`,
        };
      }
      if (!['super_admin', 'sindico', 'operador'].includes(actor.role)) {
        return {
          allowed: false,
          policyCode: 'DENY_AMI_ROLE',
          reason: 'Comandos diretos ao Asterisk AMI exigem privilégio administrativo.',
        };
      }
      return { allowed: true };
    }

    return { allowed: true };
  }
}
