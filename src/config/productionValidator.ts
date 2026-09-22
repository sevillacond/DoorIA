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
    'dooria_ami_secret_2026',
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

    // 6. CREDENCIAIS E INFRAESTRUTURA DE PRODUÇÃO (XPE / ASTERISK / AMI / RELÉ / RTSP)
    const xpeIp = (process.env.XPE_IP || '').trim();
    if (!xpeIp) {
      errors.push('[CRÍTICO] XPE_IP é estritamente obrigatório em produção.');
    } else if (xpeIp === '192.168.1.150' || xpeIp === '127.0.0.1') {
      errors.push('[CRÍTICO] XPE_IP em produção não pode utilizar IP padrão de exemplo (192.168.1.150 ou 127.0.0.1).');
    }

    const xpeSipSecret = (process.env.XPE_SIP_SECRET || '').trim();
    if (!xpeSipSecret || BANNED_SECRETS.includes(xpeSipSecret)) {
      errors.push('[CRÍTICO] XPE_SIP_SECRET é obrigatório em produção e não pode ser um segredo padrão conhecido.');
    }

    const xpeRtspUser = (process.env.XPE_RTSP_USERNAME || '').trim();
    if (!xpeRtspUser) {
      errors.push('[CRÍTICO] XPE_RTSP_USERNAME é obrigatório em produção.');
    }

    const xpeRtspPassword = (process.env.XPE_RTSP_PASSWORD || '').trim();
    if (!xpeRtspPassword || BANNED_SECRETS.includes(xpeRtspPassword) || xpeRtspPassword === 'admin') {
      errors.push('[CRÍTICO] XPE_RTSP_PASSWORD é obrigatório em produção e não pode ser "admin" ou valor padrão conhecido.');
    }

    const relayControllerIp = (process.env.RELAY_CONTROLLER_IP || '').trim();
    if (!relayControllerIp) {
      errors.push('[CRÍTICO] RELAY_CONTROLLER_IP é obrigatório em produção para acionamento de relés blindados.');
    } else if (relayControllerIp === '192.168.1.160' || relayControllerIp === '127.0.0.1') {
      errors.push('[CRÍTICO] RELAY_CONTROLLER_IP em produção não pode ser o IP padrão de exemplo (192.168.1.160 ou 127.0.0.1).');
    }

    const asteriskHost = (process.env.ASTERISK_HOST || '').trim();
    if (!asteriskHost || asteriskHost === '127.0.0.1') {
      errors.push('[CRÍTICO] ASTERISK_HOST em produção deve ser o IP estático do servidor de telefonia na guarita, e não 127.0.0.1.');
    }

    const asteriskAmiPort = parseInt(process.env.ASTERISK_AMI_PORT || '', 10);
    if (isNaN(asteriskAmiPort) || asteriskAmiPort <= 0) {
      errors.push('[CRÍTICO] ASTERISK_AMI_PORT é obrigatório em produção (padrão 5038).');
    }

    const asteriskAmiUser = (process.env.ASTERISK_AMI_USERNAME || process.env.ASTERISK_AMI_USER || '').trim();
    if (!asteriskAmiUser) {
      errors.push('[CRÍTICO] ASTERISK_AMI_USERNAME é obrigatório em produção para autenticação no socket AMI.');
    } else if (asteriskAmiUser === 'dooria_admin' || asteriskAmiUser.toLowerCase() === 'admin') {
      errors.push('[CRÍTICO] ASTERISK_AMI_USERNAME não pode utilizar usuário padrão ("dooria_admin" ou "admin") em produção.');
    }

    const asteriskAmiSecret = (process.env.ASTERISK_AMI_SECRET || '').trim();
    if (!asteriskAmiSecret) {
      errors.push('[CRÍTICO] ASTERISK_AMI_SECRET é obrigatório em produção.');
    } else if (BANNED_SECRETS.includes(asteriskAmiSecret) || asteriskAmiSecret === 'dooria_ami_secret_2026') {
      errors.push('[CRÍTICO] ASTERISK_AMI_SECRET não pode utilizar valor padrão ou de exemplo conhecido (dooria_ami_secret_2026).');
    } else if (asteriskAmiSecret.length < 12) {
      errors.push('[CRÍTICO] ASTERISK_AMI_SECRET deve possuir no mínimo 12 caracteres em produção.');
    }

    const asteriskSipServer = (process.env.ASTERISK_SIP_SERVER || process.env.ASTERISK_HOST || '').trim();
    if (!asteriskSipServer || asteriskSipServer === '127.0.0.1') {
      errors.push('[CRÍTICO] ASTERISK_SIP_SERVER em produção não pode ser 127.0.0.1.');
    }

    const asteriskSipPort = parseInt(process.env.ASTERISK_SIP_PORT || '5060', 10);
    if (isNaN(asteriskSipPort) || asteriskSipPort <= 0) {
      errors.push('[CRÍTICO] ASTERISK_SIP_PORT deve ser uma porta SIP válida em produção (ex: 5060).');
    }

    const asteriskAmiPermit = (process.env.ASTERISK_AMI_PERMIT || '').trim();
    if (asteriskAmiPermit === '0.0.0.0/0.0.0.0' || asteriskAmiPermit === '0.0.0.0/0' || asteriskAmiPermit === '0.0.0.0') {
      errors.push('[CRÍTICO] ASTERISK_AMI_PERMIT não pode permitir 0.0.0.0/0.0.0.0 (exposição pública do AMI proibida).');
    }

    // 7. BLOQUEIO DE BYPASS HTTP CGI NO MODO FÍSICO DA GUARITA
    const deployTarget = (process.env.DEPLOY_TARGET || '').trim();
    const isPhysicalGuarita = deployTarget === 'physical_guarita' || deployTarget === 'guarita';
    const triggerMethod = (process.env.TRIGGER_METHOD || '').trim().toLowerCase();

    if (isPhysicalGuarita && triggerMethod === 'http_cgi') {
      errors.push(
        `[CRÍTICO] TRIGGER_METHOD=http_cgi is not permitted when DEPLOY_TARGET=${deployTarget}. Use Asterisk AMI + PJSIP PlayDTMF (*07/*08). Bypass HTTP CGI rejeitado.`
      );
    }

    // 8. VALIDAÇÃO DETERMINÍSTICA DO GATEWAY DE VÍDEO GO2RTC
    const go2rtcApiUrl = (process.env.GO2RTC_API_URL || '').trim();
    if (!go2rtcApiUrl) {
      errors.push('[CRÍTICO] GO2RTC_API_URL é obrigatório em ambiente de guarita física.');
    } else {
      try {
        const parsedGo2rtcUrl = new URL(go2rtcApiUrl);
        const host = parsedGo2rtcUrl.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1') {
          errors.push(
            `[CRÍTICO] GO2RTC_API_URL não pode apontar para loopback (${host}) em ambiente de guarita física. O DoorIA Core roda em container bridge (dooria-network) e o go2rtc roda em network_mode: host. Utilize o IP da guarita (LOCAL_SERVER_IP), o gateway Docker (172.28.0.1) ou host.docker.internal.`
          );
        }
      } catch {
        errors.push('[CRÍTICO] GO2RTC_API_URL deve ser uma URL válida (ex: http://192.168.1.100:1984 ou http://172.28.0.1:1984).');
      }
    }

    // 9. VALIDAÇÃO DETERMINÍSTICA DE CÂMERAS HABILITADAS E URLS RTSP
    // Toda câmera cadastrada/ativada para produção deve possuir uma URL RTSP válida.
    // Não são aceitos silenciosamente: "", null, undefined, "rtsp://", ou formatos sem host.
    const isValidRtsp = (url: string | undefined | null): boolean => {
      if (!url || typeof url !== 'string') return false;
      const trimmed = url.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
      if (trimmed === 'rtsp://' || trimmed === 'rtsp:///' || !trimmed.startsWith('rtsp://')) return false;
      const regex = /^rtsp:\/\/(?:([^:@\s]+)(?::([^@\s]+))?@)?([a-zA-Z0-9.-]+)(?::(\d+))?(\/[^\s]*)?$/;
      if (!regex.test(trimmed)) return false;
      try {
        const parsed = new URL(trimmed);
        return parsed.protocol === 'rtsp:' && parsed.hostname.length > 0;
      } catch {
        return false;
      }
    };

    // 9.1 Câmera Portaria (Totem Social XPE 3115 IP) - Habilitada por padrão na guarita
    const isPortariaEnabled = process.env.CAMERA_PORTARIA_ENABLED !== 'false';
    const portariaRtspUrl = process.env.GO2RTC_CAMERA_PORTARIA_URL;
    if (isPortariaEnabled) {
      if (!portariaRtspUrl || !isValidRtsp(portariaRtspUrl)) {
        errors.push(
          `[CRÍTICO] A câmera "camera_portaria" está habilitada mas GO2RTC_CAMERA_PORTARIA_URL é inválida ou ausente (recebido: "${portariaRtspUrl || ''}"). Em produção, toda câmera habilitada exige uma URL RTSP válida.`
        );
      }
    } else if (portariaRtspUrl && portariaRtspUrl.trim() !== '' && !isValidRtsp(portariaRtspUrl)) {
      errors.push(`[CRÍTICO] GO2RTC_CAMERA_PORTARIA_URL informada é inválida (recebido: "${portariaRtspUrl}").`);
    }

    // 9.2 Câmera Garagem (LPR VIP 3230 B)
    const isGaragemEnabled = process.env.CAMERA_GARAGEM_ENABLED === 'true';
    const garagemRtspUrl = process.env.GO2RTC_CAMERA_GARAGEM_URL;
    if (isGaragemEnabled) {
      if (!garagemRtspUrl || !isValidRtsp(garagemRtspUrl)) {
        errors.push(
          `[CRÍTICO] A câmera "camera_garagem" está habilitada (CAMERA_GARAGEM_ENABLED=true) mas GO2RTC_CAMERA_GARAGEM_URL é inválida ou ausente (recebido: "${garagemRtspUrl || ''}").`
        );
      }
    } else if (garagemRtspUrl && garagemRtspUrl.trim() !== '' && !isValidRtsp(garagemRtspUrl)) {
      errors.push(`[CRÍTICO] GO2RTC_CAMERA_GARAGEM_URL informada é inválida (recebido: "${garagemRtspUrl}").`);
    }

    // 9.3 Câmera Hall de Entrada Social
    const isHallEnabled = process.env.CAMERA_HALL_ENABLED === 'true';
    const hallRtspUrl = process.env.GO2RTC_CAMERA_HALL_URL;
    if (isHallEnabled) {
      if (!hallRtspUrl || !isValidRtsp(hallRtspUrl)) {
        errors.push(
          `[CRÍTICO] A câmera "camera_hall" está habilitada (CAMERA_HALL_ENABLED=true) mas GO2RTC_CAMERA_HALL_URL é inválida ou ausente (recebido: "${hallRtspUrl || ''}").`
        );
      }
    } else if (hallRtspUrl && hallRtspUrl.trim() !== '' && !isValidRtsp(hallRtspUrl)) {
      errors.push(`[CRÍTICO] GO2RTC_CAMERA_HALL_URL informada é inválida (recebido: "${hallRtspUrl}").`);
    }

    // 9.4 Câmera Espaço Gourmet
    const isGourmetEnabled = process.env.CAMERA_GOURMET_ENABLED === 'true';
    const gourmetRtspUrl = process.env.GO2RTC_CAMERA_GOURMET_URL;
    if (isGourmetEnabled) {
      if (!gourmetRtspUrl || !isValidRtsp(gourmetRtspUrl)) {
        errors.push(
          `[CRÍTICO] A câmera "camera_gourmet" está habilitada (CAMERA_GOURMET_ENABLED=true) mas GO2RTC_CAMERA_GOURMET_URL é inválida ou ausente (recebido: "${gourmetRtspUrl || ''}").`
        );
      }
    } else if (gourmetRtspUrl && gourmetRtspUrl.trim() !== '' && !isValidRtsp(gourmetRtspUrl)) {
      errors.push(`[CRÍTICO] GO2RTC_CAMERA_GOURMET_URL informada é inválida (recebido: "${gourmetRtspUrl}").`);
    }
  }

  const valid = errors.length === 0;

  const deployTarget = (process.env.DEPLOY_TARGET || '').trim();
  const isPhysicalGuarita = deployTarget === 'physical_guarita' || deployTarget === 'guarita';

  if (!valid && (isProduction || isPhysicalGuarita)) {
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
