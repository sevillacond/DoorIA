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
    isRestrictedArea?: boolean;
    isXpeIntegrated?: boolean;
    isPrivateArea?: boolean;
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

    // 4. AUTORIZAÇÃO RIGOROSA DE CÂMERAS CFTV (RBAC / ABAC)
    if (action === 'ACESSAR_CAMERA') {
      const loc = (resource.cameraLocation || '').toLowerCase();
      const target = (resource.target || '').toLowerCase();
      
      const isRestricted = resource.isRestrictedArea || 
        loc.includes('técnica') || loc.includes('servidor') || loc.includes('quadro') ||
        loc.includes('guarita interna') || loc.includes('administração') || loc.includes('administracao') ||
        loc.includes('máquinas') || loc.includes('maquinas');

      // Super Admin: auditoria e manutenção técnica irrestrita
      if (['super_admin', 'admin_sistema'].includes(actor.role)) {
        return { allowed: true };
      }

      // Síndico / Gestor: acesso às áreas sociais, técnicas e operacionais (bloqueio de áreas estritamente privativas)
      if (['sindico', 'admin_condominio'].includes(actor.role)) {
        if (resource.isPrivateArea) {
          return {
            allowed: false,
            policyCode: 'DENY_PRIVATE_AREA',
            reason: 'LGPD: Imagens de áreas privativas não podem ser visualizadas pela sindicância sem mandato judicial.',
          };
        }
        return { allowed: true };
      }

      // Operador de Portaria: acesso a câmeras de acesso e perímetros operacionais
      if (actor.role === 'operador') {
        if (isRestricted || resource.isPrivateArea) {
          return {
            allowed: false,
            policyCode: 'DENY_OPERATOR_RESTRICTED',
            reason: 'Acesso a câmeras de infraestrutura técnica interna restrito ao corpo de engenharia e sindicância.',
          };
        }
        return { allowed: true };
      }

      // Morador: acesso restrito a áreas sociais comuns permitidas ou ao totem de chamada ativa
      if (actor.role === 'morador') {
        // Bloqueio categórico de áreas restritas
        if (isRestricted) {
          return {
            allowed: false,
            policyCode: 'DENY_RESTRICTED_CAMERA_AREA',
            reason: 'Política de Segurança CFTV: Câmera de área técnica/restrita não autorizada para moradores.',
          };
        }

        // Câmera integrada do Totem XPE: morador só pode assistir durante chamada ativa para sua unidade ou visualização externa geral
        if (resource.isXpeIntegrated) {
          if (context.callActive && context.activeCallTargetUnit && context.activeCallTargetUnit !== actor.unitNumber) {
            return {
              allowed: false,
              policyCode: 'DENY_CROSS_UNIT_INTERCOM_VIDEO',
              reason: 'Privacidade: Não é permitido interceptar vídeo de chamada destinada a outra unidade.',
            };
          }
          return { allowed: true };
        }

        // Áreas sociais permitidas (lazer, circulação comum, portaria social, garagens gerais)
        const isSocialCommon = 
          loc.includes('comum') || loc.includes('lazer') || loc.includes('piscina') || 
          loc.includes('salão') || loc.includes('social') || loc.includes('calçada') || 
          loc.includes('garagem') || loc.includes('estacionamento') || loc.includes('hall');

        if (isSocialCommon) {
          return { allowed: true };
        }

        return {
          allowed: false,
          policyCode: 'DENY_CAMERA_NOT_PERMITTED_FOR_RESIDENT',
          reason: 'Acesso não liberado pelo regimento interno de visualização de câmeras.',
        };
      }

      return {
        allowed: false,
        policyCode: 'DENY_UNKNOWN_ROLE_CAMERA',
        reason: 'Perfil de usuário não autorizado para visualização de CFTV.',
      };
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
          policyCode: 'DENY_ROLE_AMI',
          reason: 'Apenas Super Admin, Síndico ou Operador de Portaria podem disparar comandos de telefonia via AMI.',
        };
      }
      return { allowed: true };
    }

    // 7. CONFIGURAÇÕES CRÍTICAS DO SISTEMA
    if (action === 'CONFIGURAR_SISTEMA') {
      if (['super_admin', 'admin_sistema', 'sindico'].includes(actor.role)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        policyCode: 'DENY_SYSTEM_CONFIG',
        reason: 'Apenas Super Admin ou Síndico têm permissão para alterar configurações estruturais do sistema.',
      };
    }

    return { allowed: false, reason: 'Ação não mapeada na política de segurança.' };
  }
}
