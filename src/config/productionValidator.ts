/**
 * Enlace-DoorIA - Validador Central de Configurações Críticas de Produção
 * Garante que em ambientes de produção (NODE_ENV=production):
 * 1. Secrets obrigatórios (SESSION_SECRET, POSTGRES_PASSWORD) estejam definidos com entropia suficiente
 *    e sem nenhum valor padrão, previsível ou de exemplo.
 * 2. Identidade real do condomínio (CNPJ, Nome, Cidade, Estado, Unidades) esteja configurada
 *    sem dados fictícios (ex: 00.000.000/0001-00).
 * 3. Configurações de infraestrutura (LOCAL_SERVER_IP, credenciais de Super Admin) sejam válidas.
 * 
 * Se qualquer requisito falhar em produção: LANÇA ERRO FATAL IMEDIATO (STARTUP FAILURE).
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateProductionConfig(isProduction = process.env.NODE_ENV === 'production'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Padrões proibidos de secrets em qualquer ambiente de produção
  const BANNED_SECRETS = [
    'dooria_local_pass_2026',
    'dooria_session_secret_local_2026',
    'dooria_local',
    'dooria_secret',
    'admin123',
    'secret_xpe_token',
    'admin',
    'password',
    '123456',
  ];

  // 1. SESSION_SECRET (Obrigatório e de alta entropia)
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    if (isProduction) {
      errors.push('[CRÍTICO] SESSION_SECRET é estritamente obrigatório em ambiente de produção.');
    } else {
      warnings.push('[DEV] SESSION_SECRET ausente em desenvolvimento. Um segredo efêmero será gerado.');
    }
  } else {
    if (BANNED_SECRETS.includes(sessionSecret) || sessionSecret.toLowerCase().includes('dooria_session_secret')) {
      errors.push('[CRÍTICO] SESSION_SECRET não pode utilizar valor padrão ou de exemplo conhecido.');
    }
    if (isProduction && sessionSecret.length < 32) {
      errors.push('[CRÍTICO] SESSION_SECRET em produção deve possuir no mínimo 32 caracteres para assinatura HMAC-SHA256 segura.');
    }
  }

  // 2. POSTGRES_PASSWORD (Obrigatório e não-trivial)
  const pgPassword = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
  if (!pgPassword) {
    if (isProduction) {
      errors.push('[CRÍTICO] POSTGRES_PASSWORD é estritamente obrigatório em ambiente de produção.');
    } else {
      warnings.push('[DEV] POSTGRES_PASSWORD ausente em ambiente de desenvolvimento.');
    }
  } else {
    if (BANNED_SECRETS.includes(pgPassword) || pgPassword.toLowerCase().includes('dooria_local_pass')) {
      errors.push('[CRÍTICO] POSTGRES_PASSWORD não pode conter senhas padrão ou previsíveis.');
    }
  }

  // 3. IDENTIDADE DO CONDOMÍNIO (Em produção, não são aceitos dados fictícios)
  if (isProduction) {
    const condoCnpj = (process.env.CONDO_CNPJ || '').trim();
    if (!condoCnpj) {
      errors.push('[CRÍTICO] CONDO_CNPJ é obrigatório em produção.');
    } else if (condoCnpj === '00.000.000/0001-00' || condoCnpj.replace(/\D/g, '') === '00000000000100') {
      errors.push('[CRÍTICO] CONDO_CNPJ não pode utilizar CNPJ fictício (00.000.000/0001-00) em produção.');
    } else if (condoCnpj.replace(/\D/g, '').length !== 14) {
      errors.push('[CRÍTICO] CONDO_CNPJ deve conter 14 dígitos válidos.');
    }

    const condoName = (process.env.CONDO_NAME || '').trim();
    if (!condoName || condoName.toLowerCase() === 'condomínio' || condoName.toLowerCase() === 'condomínio residencial') {
      errors.push('[CRÍTICO] CONDO_NAME deve ser configurado com a razão social/nome real do condomínio.');
    }

    const condoCity = (process.env.CONDO_CITY || '').trim();
    if (!condoCity) {
      errors.push('[CRÍTICO] CONDO_CITY é obrigatório em produção.');
    }

    const condoState = (process.env.CONDO_STATE || '').trim();
    if (!condoState || condoState.length !== 2) {
      errors.push('[CRÍTICO] CONDO_STATE deve ser a sigla da UF (ex: SP, MA, RJ).');
    }

    const unitsCount = parseInt(process.env.CONDO_UNITS_COUNT || '0', 10);
    if (isNaN(unitsCount) || unitsCount <= 0) {
      errors.push('[CRÍTICO] CONDO_UNITS_COUNT deve ser maior que zero em produção.');
    }

    // 4. IP DO SERVIDOR FÍSICO NA GUARITA (Local-First LAN)
    const localServerIp = (process.env.LOCAL_SERVER_IP || '').trim();
    if (!localServerIp || localServerIp === '127.0.0.1') {
      errors.push('[CRÍTICO] LOCAL_SERVER_IP em produção deve ser o endereço IP estático do Mini PC na rede local da guarita (ex: 192.168.1.100), e não 127.0.0.1.');
    }

    // 5. SUPER ADMINISTRADOR INICIAL
    const initialAdminUser = (process.env.INITIAL_ADMIN_USER || '').trim();
    if (!initialAdminUser) {
      errors.push('[CRÍTICO] INITIAL_ADMIN_USER é obrigatório em produção.');
    }

    const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!initialAdminPassword) {
      errors.push('[CRÍTICO] INITIAL_ADMIN_PASSWORD deve ser fornecida via variável de ambiente segura para o bootstrap de produção.');
    } else {
      if (BANNED_SECRETS.includes(initialAdminPassword)) {
        errors.push('[CRÍTICO] INITIAL_ADMIN_PASSWORD não pode conter senhas padrão ou fracas (ex: admin, 123456).');
      }
      if (initialAdminPassword.length < 10) {
        errors.push('[CRÍTICO] INITIAL_ADMIN_PASSWORD deve ter no mínimo 10 caracteres em produção.');
      }
    }

    const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').trim();
    if (!initialAdminEmail || !initialAdminEmail.includes('@') || initialAdminEmail.endsWith('@condominio.local')) {
      errors.push('[CRÍTICO] INITIAL_ADMIN_EMAIL em produção deve ser um endereço de e-mail corporativo/oficial válido.');
    }

    // 6. CREDENCIAIS DE INFRAESTRUTURA (XPE / RTSP)
    const xpeIp = process.env.XPE_IP;
    if (xpeIp) {
      const xpeSipSecret = process.env.XPE_SIP_SECRET;
      if (!xpeSipSecret || BANNED_SECRETS.includes(xpeSipSecret)) {
        errors.push('[CRÍTICO] XPE_SIP_SECRET é obrigatório e não pode ser um secret padrão conhecido quando XPE_IP estiver definido.');
      }

      const xpeRtspPassword = process.env.XPE_RTSP_PASSWORD;
      if (!xpeRtspPassword || BANNED_SECRETS.includes(xpeRtspPassword)) {
        errors.push('[CRÍTICO] XPE_RTSP_PASSWORD é obrigatório e não pode ser "admin" ou valor padrão conhecido.');
      }
    }
  }

  const valid = errors.length === 0;

  if (!valid && isProduction) {
    const errorLog = [
      '=========================================================================',
      ' ❌ FATAL STARTUP ERROR: FALHA NA VALIDAÇÃO DE CONFIGURAÇÃO DE PRODUÇÃO',
      ' O DoorIA recusou a inicialização para proteger a integridade da portaria.',
      ' Motivos:',
      ...errors.map((e) => `   -> ${e}`),
      '=========================================================================',
    ].join('\n');
    console.error(errorLog);
    throw new Error(`STARTUP FAILURE: Configuração de produção inválida ou insegura.\n${errors.join('\n')}`);
  }

  return { valid, errors, warnings };
}
