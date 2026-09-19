import 'dotenv/config';
import { AuthService } from '../services/AuthService.ts';
import { PolicyEngine } from '../services/PolicyEngine.ts';
import { GateControlService } from '../services/GateControlService.ts';
import { EnlacePay } from '../services/EnlacePay.ts';
import { getPaymentProvider } from '../services/finance/index.ts';
import { getHardwareAdapter } from '../services/hardware/index.ts';
import { RealHardwareAdapter } from '../services/hardware/RealHardwareAdapter.ts';
import { SimulationAdapter } from '../services/hardware/SimulationAdapter.ts';
import { CondominiumService } from '../services/CondominiumService.ts';
import { sanitizeRtspUrl, sanitizeCameraForClient } from '../utils/rtspSanitizer.ts';
import { validateProductionConfig } from '../config/productionValidator.ts';
import { AsteriskAMI } from '../services/AsteriskAMI.ts';
import type { FinancialBill, Gate, UserSession } from '../types.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ SUCESSO: ${message}`);
}

/**
 * Simula a lógica exata do middleware requireAuth do servidor DoorIA
 */
function simulateAuthMiddleware(authHeader?: string): { status: number; error?: string; user?: UserSession } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { status: 401, error: 'Acesso não autorizado. Cabeçalho Authorization Bearer ausente.' };
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const session = AuthService.verifySessionToken(token);
  if (!session) {
    return { status: 401, error: 'Sessão inválida ou expirada. Efetue novo login.' };
  }
  return { status: 200, user: session };
}

function simulateRoleMiddleware(user: UserSession | undefined, allowedRoles: string[]): { status: number; error?: string } {
  if (!user || !allowedRoles.includes(user.role)) {
    return { status: 403, error: 'Acesso negado. Nível de privilégio insuficiente.' };
  }
  return { status: 200 };
}

export async function runRegressionTests() {
  console.log('===============================================================');
  console.log('🧪 INICIANDO SUÍTE DE TESTES DE REGRESSÃO E SEGURANÇA (DOORIA)');
  console.log('===============================================================\n');

  // ==========================================================================
  // [1/7] REQUISIÇÃO SEM TOKEN → 401 & COM TOKEN INVÁLIDO/EXPIRADO → 401 & ROLE → 403
  // ==========================================================================
  console.log('--- [1/7] Testes de Autenticação Estrita (401 sem token / inválido / expirado / 403 role) ---');
  
  // 1.1 Requisição sem token (Authorization ausente)
  const noTokenReq = simulateAuthMiddleware(undefined);
  assert(noTokenReq.status === 401, 'Requisição sem token retorna HTTP 401 (Não Autorizado)');

  // 1.2 Requisição com formato inválido (sem prefixo Bearer)
  const malformedReq = simulateAuthMiddleware('Basic dXNlcjpwYXNz');
  assert(malformedReq.status === 401, 'Requisição sem prefixo Bearer retorna HTTP 401');

  // 1.3 Requisição com token arbitrário / adulterado
  const invalidTokenReq = simulateAuthMiddleware('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalido.12345');
  assert(invalidTokenReq.status === 401, 'Requisição com token inválido retorna HTTP 401');

  // 1.4 Token HMAC válido gerado pelo AuthService
  const testSession: UserSession = {
    id: 'usr-test-1',
    name: 'Morador Teste',
    email: 'morador@teste.local',
    role: 'morador',
    unitNumber: '101',
    mfaEnabled: true,
  };
  const validToken = AuthService.createSessionToken(testSession);
  const validReq = simulateAuthMiddleware(`Bearer ${validToken}`);
  assert(validReq.status === 200 && validReq.user?.role === 'morador', 'Requisição com token legítimo retorna HTTP 200');

  // 1.5 Token adulterado no payload
  const tamperedToken = validToken.slice(0, -4) + 'abcd';
  const tamperedReq = simulateAuthMiddleware(`Bearer ${tamperedToken}`);
  assert(tamperedReq.status === 401, 'Rejeição criptográfica de token adulterado (Anti-Tampering)');

  // 1.6 Token expirado
  const expiredToken = AuthService.createSessionToken(testSession, -1);
  const expiredReq = simulateAuthMiddleware(`Bearer ${expiredToken}`);
  assert(expiredReq.status === 401, 'Requisição com token expirado retorna HTTP 401');

  // 1.7 Usuário sem privilégio necessário na rota protegida
  const forbiddenReq = simulateRoleMiddleware(testSession, ['super_admin', 'sindico']);
  assert(forbiddenReq.status === 403, 'Usuário com papel "morador" recebe HTTP 403 ao acessar rota administrativa');

  // ==========================================================================
  // [2/7] MORADOR TENTANDO ACIONAR PORTÃO SEM PERMISSÃO → 403
  // ==========================================================================
  console.log('\n--- [2/7] Testes de Autorização e RBAC Portões (403 para Morador não autorizado) ---');
  
  // 2.1 Morador sem chamada ativa tenta abrir portão de pedestre
  const evalNoCall = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: { callActive: false },
  });
  assert(!evalNoCall.allowed && evalNoCall.policyCode === 'DENY_NO_ACTIVE_CALL', 'Morador sem chamada ativa tem abertura bloqueada (Regra de Ouro)');

  // 2.2 Morador em chamada para outra unidade (Cross-Unit Attack)
  const evalCrossUnit = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: { callActive: true, activeCallTargetUnit: '202' },
  });
  assert(!evalCrossUnit.allowed && evalCrossUnit.policyCode === 'DENY_CROSS_UNIT_CALL', 'Morador tentando abrir portão de chamada de outra unidade é bloqueado');

  // 2.3 Morador em chamada ativa legítima para a sua própria unidade
  const evalLegitCall = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: { callActive: true, activeCallTargetUnit: '101' },
  });
  assert(evalLegitCall.allowed, 'Morador em chamada ativa direcionada à sua própria unidade é autorizado');

  // 2.4 Síndico com autorização direta
  const evalSindico = PolicyEngine.evaluate({
    actor: { id: 'usr-sindico', role: 'sindico' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: {},
  });
  assert(evalSindico.allowed, 'Síndico possui permissão direta para acionamento de portão');

  // ==========================================================================
  // [3/7] TESTES DE HARDWARE: SIMULATIONADAPTER & REALHARDWAREADAPTER
  // ==========================================================================
  console.log('\n--- [3/7] Testes de Hardware (SimulationAdapter & RealHardwareAdapter) ---');
  
  const testGate: Gate = {
    id: 'gate-pedestre',
    name: 'Portão Pedestre Teste',
    type: 'pedestre',
    dtmfCode: '*07',
    status: 'fechado',
    sensorState: 'ok',
    relayPin: 1,
    relayIp: '192.168.1.160',
  };

  // 3.1 SimulationAdapter: Acionamento lógico seguro sem hardware físico
  const simAdapter = new SimulationAdapter();
  const simResult = await simAdapter.triggerRelay(testGate, 1);
  assert(simResult.success && simResult.isSimulated, 'SimulationAdapter executa com isSimulated: true');
  assert(simResult.commandStatus === 'COMMAND_SENT', 'SimulationAdapter reporta estritamente COMMAND_SENT');
  assert(!simResult.hasPhysicalFeedbackSensor, 'SimulationAdapter não atesta sensor de confirmação física');

  // 3.2 GateControlService com SimulationAdapter: transiciona visualmente em demonstração
  const gateForSim: Gate = { ...testGate };
  const adminSession: UserSession = { id: 'usr-admin', name: 'Administrador', email: 'admin@local', role: 'super_admin', mfaEnabled: true };
  const gateControlSim = await GateControlService.triggerGate(gateForSim, adminSession, { callActive: false }, simAdapter);
  assert(gateControlSim.success && gateControlSim.isSimulated, 'GateControlService opera em modo simulado');
  assert(gateForSim.status === 'aberto', 'Modo simulado atualiza status para aberto para projeção em painel');

  // 3.3 RealHardwareAdapter: Inicialização com AMI mockado
  const realAdapter = new RealHardwareAdapter();
  (realAdapter as any).ami = {
    executeSafeAction: async () => ({ success: true, message: 'PlayDTMF queued' }),
    findActiveChannelForXpe: async () => 'PJSIP/xpe_3115-00000001',
    getActiveChannels: async () => [{ channel: 'PJSIP/xpe_3115-00000001', channelStateDesc: 'Up' }],
  };

  // 3.4 Sem sensor físico real conectado (readPhysicalSensorFeedback retorna null)
  realAdapter.readPhysicalSensorFeedback = async () => null;
  const resultNoSensor = await realAdapter.triggerRelay(testGate, 1);
  assert(resultNoSensor.success, 'Disparo elétrico executado com sucesso no relé');
  assert(resultNoSensor.commandStatus === 'COMMAND_SENT', 'Status retornado é estritamente COMMAND_SENT na ausência de sensor');
  assert(resultNoSensor.commandStatus !== 'HARDWARE_CONFIRMED', 'NUNCA retornar HARDWARE_CONFIRMED sem leitura de sensor físico');
  assert(!resultNoSensor.hasPhysicalFeedbackSensor, 'hasPhysicalFeedbackSensor marcado como false');

  // 3.5 Falha de comunicação com socket AMI do Asterisk
  (realAdapter as any).ami = {
    findActiveChannelForXpe: async () => 'PJSIP/xpe_3115-00000001',
    executeSafeAction: async () => ({ success: false, message: 'Connection refused to Asterisk AMI socket on port 5038' }),
  };
  const resultAmiFailure = await realAdapter.triggerRelay(testGate, 1);
  assert(!resultAmiFailure.success, 'Falha de comunicação no AMI reporta success: false');
  assert(resultAmiFailure.commandStatus === 'HARDWARE_FAILURE', 'Falha no AMI retorna status HARDWARE_FAILURE');

  // Restaura AMI funcional
  (realAdapter as any).ami = {
    findActiveChannelForXpe: async () => 'PJSIP/xpe_3115-00000001',
    executeSafeAction: async () => ({ success: true, message: 'PlayDTMF queued' }),
  };

  // 3.6 Anti-Bypass: gate.status = "aberto" ou sensorState = "ok" NUNCA gera HARDWARE_CONFIRMED
  const trickyGate: Gate = {
    ...testGate,
    status: 'aberto',
    sensorState: 'ok',
  };
  realAdapter.readPhysicalSensorFeedback = async () => null;
  const resultAntiBypass = await realAdapter.triggerRelay(trickyGate, 1);
  assert(resultAntiBypass.commandStatus === 'COMMAND_SENT', 'RealHardwareAdapter ignora gate.status="aberto" e não forja HARDWARE_CONFIRMED');

  // 3.7 GateControlService com RealHardwareAdapter (Sem sensor -> status vira comando_enviado, NUNCA aberto)
  const gateRealNoSensor: Gate = { ...testGate, status: 'fechado' };
  const gateControlRealNoSensor = await GateControlService.triggerGate(gateRealNoSensor, adminSession, { callActive: false }, realAdapter);
  assert(gateControlRealNoSensor.success, 'Acionamento do portão com RealHardwareAdapter é bem-sucedido');
  assert(gateRealNoSensor.status === 'comando_enviado', 'Portão real sem sensor transiciona para comando_enviado (NUNCA aberto)');

  // ==========================================================================
  // [4/7] REALHARDWAREADAPTER: SENSOR FÍSICO REAL ABERTO → HARDWARE_CONFIRMED
  // ==========================================================================
  console.log('\n--- [4/7] Testes RealHardwareAdapter: Sensor Real Aberto → HARDWARE_CONFIRMED ---');

  // 4.1 Com sensor de fim de curso (reed switch) físico real aberto
  realAdapter.readPhysicalSensorFeedback = async () => 'aberto';
  const resultSensorOpen = await realAdapter.triggerRelay(testGate, 1);
  assert(resultSensorOpen.success, 'Disparo elétrico executado com sucesso no relé');
  assert(resultSensorOpen.commandStatus === 'HARDWARE_CONFIRMED', 'Status é HARDWARE_CONFIRMED quando sensor físico confirma abertura');
  assert(resultSensorOpen.hasPhysicalFeedbackSensor === true, 'hasPhysicalFeedbackSensor marcado como true');
  assert(resultSensorOpen.physicalSensorState === 'aberto', 'physicalSensorState reflete o estado lido do sensor');

  // 4.2 GateControlService com RealHardwareAdapter e sensor confirmado
  const gateRealWithSensor: Gate = { ...testGate, status: 'fechado' };
  const gateControlConfirmed = await GateControlService.triggerGate(gateRealWithSensor, adminSession, { callActive: false }, realAdapter);
  assert(gateControlConfirmed.success, 'Acionamento com sensor real confirmado');
  assert(gateRealWithSensor.status === 'aberto', 'Portão real com confirmação física de fim de curso transiciona para aberto');

  // ==========================================================================
  // [5/7] RTSP SANITIZATION & VAZAMENTO ZERO DE SEGREDOS NO FRONTEND
  // ==========================================================================
  console.log('\n--- [5/7] Testes de Sanitização RTSP e Proteção de Segredos ---');

  const rawRtsp1 = 'rtsp://admin:segredoForte123@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0';
  const cleanRtsp1 = sanitizeRtspUrl(rawRtsp1);
  assert(!cleanRtsp1.includes('admin') && !cleanRtsp1.includes('segredoForte123'), 'Sanitização remove usuário e senha da URL RTSP');
  assert(cleanRtsp1 === 'rtsp://192.168.1.150:554/cam/realmonitor?channel=1&subtype=0', 'URL RTSP sanitizada mantém host, porta e parâmetros');

  const rawRtsp2 = 'rtsp://operador:minhasenha@10.0.0.50:8554/live/ch0';
  const cleanRtsp2 = sanitizeRtspUrl(rawRtsp2);
  assert(!cleanRtsp2.includes('operador') && !cleanRtsp2.includes('minhasenha'), 'Sanitização genérica para qualquer credencial RTSP');

  const dirtyCameraObj = {
    id: 'cam-test',
    name: 'Câmera Teste',
    rtspUrl: 'rtsp://admin:intelbras2026@192.168.1.100:554/stream',
    username: 'admin',
    password: 'intelbras2026',
    credentials: { user: 'admin', pass: 'intelbras2026' },
    defaultCredentialsHint: 'admin/admin',
    suggestedRtspMain: 'rtsp://admin:intelbras2026@192.168.1.100:554/stream',
    suggestedRtspSub: 'rtsp://admin:intelbras2026@192.168.1.100:554/stream_sub',
  };
  const sanitizedCam = sanitizeCameraForClient(dirtyCameraObj);

  // Frontend NUNCA recebe URLs RTSP nem credenciais
  assert((sanitizedCam as any).rtspUrl === undefined, 'Campo rtspUrl completamente eliminado para o frontend');
  assert((sanitizedCam as any).suggestedRtspMain === undefined, 'Campo suggestedRtspMain eliminado');
  assert((sanitizedCam as any).suggestedRtspSub === undefined, 'Campo suggestedRtspSub eliminado');
  assert((sanitizedCam as any).password === undefined, 'Campo password eliminado do payload');
  assert((sanitizedCam as any).credentials === undefined, 'Objeto credentials eliminado do payload');
  assert((sanitizedCam as any).username === undefined, 'Campo username de hardware eliminado');
  assert((sanitizedCam as any).streamProtocol === 'webrtc', 'Mídia configurada para protocolo WebRTC seguro');
  assert((sanitizedCam as any).streamEndpoint === '/api/v1/stream/cam-test', 'Endpoint de streaming proxy local injetado');

  // Nenhuma resposta ou payload pode vazar segredos críticos da infraestrutura
  const serializedPayload = JSON.stringify(sanitizedCam);
  const bannedSecrets = [
    'intelbras2026',
    process.env.XPE_RTSP_PASSWORD || 'XPE_RTSP_PASSWORD',
    process.env.ASTERISK_AMI_SECRET || 'ASTERISK_AMI_SECRET',
    process.env.POSTGRES_PASSWORD || 'POSTGRES_PASSWORD',
  ];
  for (const secret of bannedSecrets) {
    if (secret && secret.length > 3) {
      assert(!serializedPayload.includes(secret), `Resposta de câmera não contém o segredo '${secret}'`);
    }
  }
  assert(!/rtsp:\/\/[^@\s]+@/.test(serializedPayload), 'Nenhum padrão rtsp://user:pass@ no payload para o cliente');

  // ==========================================================================
  // [6/7] PRODUCTIONVALIDATOR: FALHA AO DETECTAR VARIÁVEIS AUSENTES OU INSEGURAS
  // ==========================================================================
  console.log('\n--- [6/7] Testes do ProductionValidator (Abortar em Defaults Inseguros) ---');

  const originalEnv = { ...process.env };
  try {
    // 6.1 Teste com variáveis ausentes em produção (deve abortar e lançar exceção fatal)
    const criticalVars = [
      'SESSION_SECRET',
      'POSTGRES_PASSWORD',
      'XPE_IP',
      'RELAY_CONTROLLER_IP',
      'ASTERISK_AMI_SECRET',
      'XPE_RTSP_PASSWORD',
      'ASTERISK_HOST',
      'INITIAL_ADMIN_PASSWORD',
      'CONDO_CNPJ',
    ];

    for (const v of criticalVars) {
      const tempEnv = { ...process.env };
      delete process.env[v];

      let didThrow = false;
      let thrownMsg = '';
      try {
        validateProductionConfig(true);
      } catch (err: any) {
        didThrow = true;
        thrownMsg = err.message;
      }
      assert(didThrow, `ProductionValidator rejeita ausência da variável crítica: ${v}`);
      assert(thrownMsg.includes(v), `Mensagem de erro explícita identifica a variável: ${v}`);

      process.env = tempEnv;
    }

    // 6.2 Teste com defaults inseguros conhecidos em produção (ex: 192.168.1.150 para XPE_IP)
    process.env.SESSION_SECRET = 'dooria_session_secret_local_2026';
    process.env.XPE_IP = '192.168.1.150';
    process.env.RELAY_CONTROLLER_IP = '192.168.1.160';
    process.env.ASTERISK_HOST = '127.0.0.1';

    let didThrowDefaults = false;
    let thrownDefaultsMessage = '';
    try {
      validateProductionConfig(true);
    } catch (err: any) {
      didThrowDefaults = true;
      thrownDefaultsMessage = err.message;
    }

    assert(didThrowDefaults, 'ProductionValidator aborta no bootstrap ao detectar defaults conhecidos');
    assert(thrownDefaultsMessage.includes('192.168.1.150'), 'Rejeição do IP padrão 192.168.1.150 para XPE em produção');
    assert(thrownDefaultsMessage.includes('127.0.0.1'), 'Rejeição de 127.0.0.1 para ASTERISK_HOST em produção');
    assert(thrownDefaultsMessage.includes('SESSION_SECRET não pode utilizar valor padrão'), 'Rejeição de secret padrão de exemplo em produção');
  } finally {
    // Restaura ambiente
    process.env = originalEnv;
  }

  // ==========================================================================
  // [7/7] INTEGRAÇÃO DO POLICY ENGINE COM CFTV E ENLACE PAY
  // ==========================================================================
  console.log('\n--- [7/7] Testes CFTV RBAC e Enlace Pay ---');

  // Morador tentando ver câmera de área restrita
  const evalCamRestricted = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ACESSAR_CAMERA',
    resource: { target: 'cam-tecnica-01', isRestrictedArea: true },
    context: {},
  });
  assert(!evalCamRestricted.allowed, 'Bloqueio de visualização de câmera restrita para morador');

  // Enlace Pay - Cálculo de juros e multa legal
  const charges = EnlacePay.calculateLateCharges(500.0, new Date(Date.now() - 10 * 86400000).toISOString());
  assert(charges.diasAtraso >= 9 && charges.multa === 10.0, 'Cálculo legal de multa (2% Art. 1.336 Código Civil)');

  const paymentProvider = getPaymentProvider();
  assert(paymentProvider.isSandbox, 'PaymentProvider opera em modo sandbox');

  const testBill: FinancialBill = {
    id: 'bill-test-01',
    unitId: 'u-101',
    unitNumber: '101',
    competencia: '09/2026',
    vencimento: new Date().toISOString(),
    valorOriginal: 500.0,
    diasAtraso: 0,
    multa: 0,
    juros: 0,
    correcao: 0,
    valorTotal: 500.0,
    codigoBarras: '23793.38128 60000.123456 12000.650009 1 98760000050000',
    status: 'pendente',
  };
  const settlement = await EnlacePay.settleBill(testBill, 'pix');
  assert(settlement.success && testBill.status === 'pago', 'Liquidação de fatura com recibo e transação');

  // ==========================================================================
  // [8/8] ROTEAMENTO DINÂMICO PJSIP, PING AMI E SIMULAÇÃO DE CLEAN INSTALL
  // ==========================================================================
  console.log('\n--- [8/8] Testes de Roteamento Dinâmico PJSIP, Ping AMI e Clean Install ---');

  // 8.1 Validação rigorosa de canal preferencial (Requisito 5)
  const testAmi = new AsteriskAMI('127.0.0.1', 5038, 'test', 'test');
  (testAmi as any).getActiveChannels = async () => [
    { channel: 'PJSIP/xpe_3115-0000001a', state: 'Up', channelStateDesc: 'Up', callerIdNum: '8000', connectedLineNum: '101', linkedid: 'link-101' },
    { channel: 'PJSIP/ramal_101-0000001b', state: 'Up', channelStateDesc: 'Up', callerIdNum: '101', connectedLineNum: '8000', linkedid: 'link-101' },
  ];

  // Canal preferencial legítimo que realmente existe no Asterisk e pertence à chamada
  const resolvedValidPreferred = await testAmi.findActiveChannelForXpe({ preferredChannel: 'PJSIP/xpe_3115-0000001a' });
  assert(resolvedValidPreferred === 'PJSIP/xpe_3115-0000001a', 'Canal preferencial existente e ativo é validado com sucesso');

  // Canal preferencial forjado/inexistente NÃO é aceito cegamente
  (testAmi as any).getActiveChannels = async () => [];
  const resolvedFakePreferred = await testAmi.findActiveChannelForXpe({ preferredChannel: 'PJSIP/custom_trunk_fantasma' });
  assert(resolvedFakePreferred === null, 'Canal preferencial inexistente no Asterisk é rejeitado (Anti-Bypass)');

  // Restaura canais do XPE para os próximos testes
  (testAmi as any).getActiveChannels = async () => [
    { channel: 'PJSIP/xpe_3115-0000001a', state: 'Up', channelStateDesc: 'Up', callerIdNum: '8000', connectedLineNum: '101', linkedid: 'link-101' },
    { channel: 'PJSIP/ramal_202-0000001b', state: 'Ring', channelStateDesc: 'Ring', callerIdNum: '202', connectedLineNum: '8000', linkedid: 'link-202' },
  ];

  // 8.2 Resolução por identificador do XPE
  const resolvedByXpe = await testAmi.findActiveChannelForXpe({ xpeIdentifier: '8000' });
  assert(resolvedByXpe === 'PJSIP/xpe_3115-0000001a', 'Identificação dinâmica de canal pelo callerId/nome do XPE');

  // 8.3 Resolução por unidade de destino
  const resolvedByTarget = await testAmi.findActiveChannelForXpe({ targetUnit: '101' });
  assert(resolvedByTarget === 'PJSIP/xpe_3115-0000001a', 'Roteamento dinâmico pelo número do apartamento em chamada');

  // 8.4 Ausência de canal ativo retorna null (sem inventar canais fictícios)
  (testAmi as any).getActiveChannels = async () => [];
  const resolvedNull = await testAmi.findActiveChannelForXpe();
  assert(resolvedNull === null, 'Sem chamada ativa retorna null (Anti-Invenção de canais)');

  // 8.5 Teste do Ping AMI seguro (mockando resposta Ping/Pong)
  (testAmi as any).executeSafeAction = async () => ({ success: true, message: 'Pong' });
  const pingResult = await testAmi.ping();
  assert(pingResult.ok === true, 'Ping AMI reporta status booleano ok: true quando Asterisk responde Pong');
  assert(typeof pingResult.latencyMs === 'number' && pingResult.latencyMs >= 0, 'Ping AMI calcula tempo de resposta (latência em ms)');
  assert(pingResult.message?.includes('Ping/Pong OK') === true, 'Ping AMI atesta mensagem sanitizada sem vazar credenciais');

  // 8.6 Simulação de Clean Install em Produção com Configuração 100% Válida
  const prodCleanEnv = {
    ...process.env,
    NODE_ENV: 'production',
    SESSION_SECRET: 'super_segredo_criptografico_hmac_sha256_com_alta_entropia_32_chars',
    POSTGRES_PASSWORD: 'SenhaFortePostgres2026!#Segura',
    CONDO_CNPJ: '12.345.678/0001-99',
    CONDO_NAME: 'Condomínio Residencial Sevilha',
    CONDO_CITY: 'São Luís',
    CONDO_STATE: 'MA',
    CONDO_UNITS_COUNT: '48',
    LOCAL_SERVER_IP: '192.168.1.100',
    INITIAL_ADMIN_USER: 'admin_sevilha',
    INITIAL_ADMIN_PASSWORD: 'SenhaForte2026!#AdminSeguro',
    INITIAL_ADMIN_EMAIL: 'admin@sevilha.com.br',
    XPE_IP: '192.168.1.200',
    XPE_SIP_SECRET: 'SegredoXpe2026#Forte',
    XPE_RTSP_USERNAME: 'intelbras',
    XPE_RTSP_PASSWORD: 'IntelbrasSegura2026!',
    RELAY_CONTROLLER_IP: '192.168.1.210',
    ASTERISK_HOST: '192.168.1.220',
    ASTERISK_AMI_PORT: '5038',
    ASTERISK_AMI_USERNAME: 'dooria_ami',
    ASTERISK_AMI_SECRET: 'AmiSegredo2026!',
    ASTERISK_SIP_SERVER: '192.168.1.220',
    ASTERISK_SIP_PORT: '5060',
  };

  const backupEnv = { ...process.env };
  try {
    process.env = prodCleanEnv as any;
    const cleanInstallValidation = validateProductionConfig(true);
    assert(cleanInstallValidation.valid === true, 'Simulação de Clean Install: Validação de produção aprovada com 100% de conformidade');
    assert(cleanInstallValidation.errors.length === 0, 'Simulação de Clean Install: Zero erros críticos de segurança');
  } finally {
    process.env = backupEnv;
  }

  // ==========================================================================
  // [9/9] TESTES DO FLUXO COMPLETO DE PORTÃO (CASOS 1 A 5 - HOMOLOGAÇÃO FÍSICA)
  // ==========================================================================
  console.log('\n--- [9/9] Testes do Fluxo de Portão: Casos 1 a 5 (Homologação Física) ---');

  // CASO 1: Canal PJSIP válido e ativo -> PlayDTMF executado -> Retorno COMMAND_SENT
  const case1Ami = new AsteriskAMI('127.0.0.1', 5038, 'admin', 'secret');
  (case1Ami as any).getActiveChannels = async () => [
    { channel: 'PJSIP/xpe_3115-0000004f', state: 'Up', channelStateDesc: 'Up', callerIdNum: '8000', connectedLineNum: '101', linkedid: 'link-4f' },
  ];
  let case1CapturedAction: any = null;
  (case1Ami as any).executeSafeAction = async (action: string, params: any) => {
    case1CapturedAction = { action, params };
    return { success: true, message: 'DTMF successfully queued' };
  };

  const case1Adapter = new RealHardwareAdapter();
  (case1Adapter as any).ami = case1Ami;
  case1Adapter.readPhysicalSensorFeedback = async () => null; // Sem sensor de fim de curso

  const gateCase1: Gate = { ...testGate, status: 'fechado' };
  const case1Result = await GateControlService.trigger(gateCase1, {
    gateId: testGate.id,
    session: adminSession,
    context: { callActive: true, sipChannel: 'PJSIP/xpe_3115-0000004f', activeCallTargetUnit: '101' },
    triggerSource: 'painel_web',
    adapterOverride: case1Adapter,
  });

  assert(case1Result.success === true, 'Caso 1: Acionamento autorizado e transmitido com sucesso');
  assert(case1Result.commandStatus === 'COMMAND_SENT', 'Caso 1: Status retornado é rigorosamente COMMAND_SENT');
  assert(case1CapturedAction?.action === 'PlayDTMF', 'Caso 1: Ação AMI executada foi PlayDTMF');
  assert(case1CapturedAction?.params?.Channel === 'PJSIP/xpe_3115-0000004f', 'Caso 1: PlayDTMF direcionado ao canal PJSIP real ativo');
  assert(case1CapturedAction?.params?.Digit === '07', 'Caso 1: Dígito transmitido foi 07 (*07 sem asterisco para PlayDTMF)');
  assert(gateCase1.status === 'comando_enviado', 'Caso 1: Estado do portão transiciona para comando_enviado (NUNCA aberto)');

  // CASO 2: Canal preferencial inexistente -> NÃO enviar PlayDTMF -> HARDWARE_FAILURE
  const case2Ami = new AsteriskAMI('127.0.0.1', 5038, 'admin', 'secret');
  (case2Ami as any).getActiveChannels = async () => []; // Nenhum canal ativo no Asterisk
  let case2PlayDtmfCalled = false;
  (case2Ami as any).executeSafeAction = async (action: string) => {
    if (action === 'PlayDTMF') case2PlayDtmfCalled = true;
    return { success: true };
  };

  const case2Adapter = new RealHardwareAdapter();
  (case2Adapter as any).ami = case2Ami;
  const gateCase2: Gate = { ...testGate, status: 'fechado' };

  const case2Result = await GateControlService.trigger(gateCase2, {
    gateId: testGate.id,
    session: adminSession,
    context: { callActive: true, sipChannel: 'PJSIP/canal_fantasma_inexistente' },
    triggerSource: 'painel_web',
    adapterOverride: case2Adapter,
  });

  assert(case2Result.success === false, 'Caso 2: Operação retorna success: false');
  assert(case2Result.commandStatus === 'HARDWARE_FAILURE', 'Caso 2: Status é HARDWARE_FAILURE para canal inexistente');
  assert(!case2PlayDtmfCalled, 'Caso 2: PlayDTMF NÃO foi enviado ao Asterisk para canal inexistente');
  assert(gateCase2.status === 'fechado', 'Caso 2: Portão permanece com status fechado');

  // CASO 3: Nenhuma chamada XPE ativa (somente ramais terceiros) -> NÃO escolher aleatório -> HARDWARE_FAILURE
  const case3Ami = new AsteriskAMI('127.0.0.1', 5038, 'admin', 'secret');
  // Canais ativos entre moradores (ramal 201 falando com 202, NENHUM XPE)
  (case3Ami as any).getActiveChannels = async () => [
    { channel: 'PJSIP/ramal_201-000000aa', state: 'Up', channelStateDesc: 'Up', callerIdNum: '201', connectedLineNum: '202' },
    { channel: 'PJSIP/ramal_202-000000bb', state: 'Up', channelStateDesc: 'Up', callerIdNum: '202', connectedLineNum: '201' },
  ];
  let case3PlayDtmfCalled = false;
  (case3Ami as any).executeSafeAction = async (action: string) => {
    if (action === 'PlayDTMF') case3PlayDtmfCalled = true;
    return { success: true };
  };

  const case3Adapter = new RealHardwareAdapter();
  (case3Adapter as any).ami = case3Ami;
  const gateCase3: Gate = { ...testGate, status: 'fechado' };

  const case3Result = await GateControlService.trigger(gateCase3, {
    gateId: testGate.id,
    session: adminSession,
    context: { callActive: true },
    triggerSource: 'painel_web',
    adapterOverride: case3Adapter,
  });

  assert(case3Result.success === false, 'Caso 3: Recusa acionamento quando não há chamada do XPE');
  assert(case3Result.commandStatus === 'HARDWARE_FAILURE', 'Caso 3: Status é HARDWARE_FAILURE');
  assert(!case3PlayDtmfCalled, 'Caso 3: Anti-Slop: DoorIA NÃO escolheu canal de ramal aleatório (ramal 201/202)');

  // CASO 4: Sensor físico inexistente -> COMMAND_SENT e nunca HARDWARE_CONFIRMED
  const case4Ami = new AsteriskAMI('127.0.0.1', 5038, 'admin', 'secret');
  (case4Ami as any).getActiveChannels = async () => [
    { channel: 'PJSIP/xpe_3115-00000055', state: 'Up', channelStateDesc: 'Up', callerIdNum: '8000', connectedLineNum: '102' },
  ];
  (case4Ami as any).executeSafeAction = async () => ({ success: true, message: 'OK' });

  const case4Adapter = new RealHardwareAdapter();
  (case4Adapter as any).ami = case4Ami;
  case4Adapter.readPhysicalSensorFeedback = async () => null; // Sem sensor

  const gateCase4: Gate = { ...testGate, status: 'fechado', sensorState: 'ok' };
  const case4Result = await GateControlService.trigger(gateCase4, {
    gateId: testGate.id,
    session: adminSession,
    context: { callActive: true, activeCallTargetUnit: '102' },
    triggerSource: 'painel_web',
    adapterOverride: case4Adapter,
  });

  assert(case4Result.success === true, 'Caso 4: Pulso elétrico disparado com sucesso');
  assert(case4Result.commandStatus === 'COMMAND_SENT', 'Caso 4: Status é COMMAND_SENT');
  assert(case4Result.commandStatus !== 'HARDWARE_CONFIRMED', 'Caso 4: NUNCA gera HARDWARE_CONFIRMED sem sensor físico');
  assert(case4Result.hasPhysicalFeedbackSensor === false, 'Caso 4: hasPhysicalFeedbackSensor é false');
  assert(gateCase4.status === 'comando_enviado', 'Caso 4: Status do portão é comando_enviado');

  // CASO 5: Sensor físico realmente confirma abertura -> HARDWARE_CONFIRMED
  const case5Ami = new AsteriskAMI('127.0.0.1', 5038, 'admin', 'secret');
  (case5Ami as any).getActiveChannels = async () => [
    { channel: 'PJSIP/xpe_3115-00000055', state: 'Up', channelStateDesc: 'Up', callerIdNum: '8000', connectedLineNum: '102' },
  ];
  (case5Ami as any).executeSafeAction = async () => ({ success: true, message: 'OK' });

  const case5Adapter = new RealHardwareAdapter();
  (case5Adapter as any).ami = case5Ami;
  case5Adapter.readPhysicalSensorFeedback = async () => 'aberto'; // Sensor físico reed switch atesta abertura real

  const gateCase5: Gate = { ...testGate, status: 'fechado' };
  const case5Result = await GateControlService.trigger(gateCase5, {
    gateId: testGate.id,
    session: adminSession,
    context: { callActive: true, activeCallTargetUnit: '102' },
    triggerSource: 'painel_web',
    adapterOverride: case5Adapter,
  });

  assert(case5Result.success === true, 'Caso 5: Acionamento bem-sucedido');
  assert(case5Result.commandStatus === 'HARDWARE_CONFIRMED', 'Caso 5: Status é HARDWARE_CONFIRMED após leitura real do sensor');
  assert(case5Result.hasPhysicalFeedbackSensor === true, 'Caso 5: hasPhysicalFeedbackSensor é true');
  assert(case5Result.physicalSensorState === 'aberto', 'Caso 5: physicalSensorState reporta aberto');
  assert(gateCase5.status === 'aberto', 'Caso 5: Portão transiciona legitimamente para aberto após confirmação física');

  // --- [10/10] Testes de Correlação Avançada (UniqueID/LinkedID), Driver HTTP CGI e Mocks ---
  console.log('\n--- [10/10] Testes de Correlação Avançada (UniqueID/LinkedID), Driver HTTP CGI e Mocks ---');

  // Teste 1: Driver HTTP CGI dedicado
  const { HttpCgiRelayDriver } = await import('../services/hardware/drivers/HttpCgiRelayDriver.ts');
  const cgiDriver = new HttpCgiRelayDriver({ host: '192.168.1.160', port: 80, timeoutMs: 500 });
  
  // Mock global fetch para simular resposta HTTP 200 da controladora
  const originalFetch = global.fetch;
  (global as any).fetch = async (url: string) => {
    if (url.includes('192.168.1.160')) {
      return { ok: true, status: 200, text: async () => 'RELAY 1 PULSED' } as any;
    }
    throw new Error('Host unreachable');
  };

  const cgiSuccessResult = await cgiDriver.pulseRelay(1, 3, 'test-corr-cgi-01');
  assert(cgiSuccessResult.success === true, 'HttpCgiRelayDriver: pulso aceito com status HTTP 200');
  assert(cgiSuccessResult.commandStatus === 'COMMAND_SENT', 'HttpCgiRelayDriver: status retornado é estritamente COMMAND_SENT');
  assert((cgiSuccessResult.commandStatus as string) !== 'HARDWARE_CONFIRMED', 'HttpCgiRelayDriver: NUNCA gera HARDWARE_CONFIRMED sem sensor');
  assert(cgiSuccessResult.hasPhysicalFeedbackSensor === false, 'HttpCgiRelayDriver: hasPhysicalFeedbackSensor é false');

  // Mock fetch para simular falha de rede/timeout
  (global as any).fetch = async () => {
    throw new Error('Connection refused by hardware');
  };
  const cgiFailResult = await cgiDriver.pulseRelay(1, 3, 'test-corr-cgi-fail');
  assert(cgiFailResult.success === false, 'HttpCgiRelayDriver: falha de rede retorna success: false');
  assert(cgiFailResult.commandStatus === 'HARDWARE_FAILURE', 'HttpCgiRelayDriver: falha de comunicação reporta HARDWARE_FAILURE');

  // Restaura fetch
  global.fetch = originalFetch;

  // Teste 2: Correlação Estrita de UniqueID e LinkedID no AsteriskAMI
  const amiCorrelationTest = new AsteriskAMI('127.0.0.1', 5038, 'admin', 'secret');
  (amiCorrelationTest as any).getActiveChannels = async () => [
    {
      channel: 'PJSIP/xpe_3115-00000088',
      state: 'Up',
      channelStateDesc: 'Up',
      callerIdNum: '8000',
      connectedLineNum: '101',
      uniqueId: 'ast-unique-12345.678',
      linkedId: 'ast-unique-12345.678',
    },
    {
      channel: 'PJSIP/ramal_interno-00000099',
      state: 'Up',
      channelStateDesc: 'Up',
      callerIdNum: '202',
      connectedLineNum: '203',
      uniqueId: 'ast-unique-88888.999',
      linkedId: 'ast-unique-88888.999',
    },
  ];

  const matchedByUniqueId = await amiCorrelationTest.findActiveChannelForXpe({
    uniqueId: 'ast-unique-12345.678',
  });
  assert(matchedByUniqueId === 'PJSIP/xpe_3115-00000088', 'AsteriskAMI: Localiza com precisão canal pelo UniqueID da chamada do XPE');

  const matchedByLinkedId = await amiCorrelationTest.findActiveChannelForXpe({
    linkedId: 'ast-unique-12345.678',
  });
  assert(matchedByLinkedId === 'PJSIP/xpe_3115-00000088', 'AsteriskAMI: Localiza com precisão canal pelo LinkedID da chamada do XPE');

  const nonExistentUniqueId = await amiCorrelationTest.findActiveChannelForXpe({
    uniqueId: 'ast-unique-inexistente-999',
  });
  assert(nonExistentUniqueId === null, 'AsteriskAMI: UniqueId desconhecido retorna null e não sequestra canais de terceiros');

  // Teste 3: Diferenciação de Mocks e Sanitização de Câmeras
  const mockCamera = {
    id: 'disc-cam-02',
    ip: '192.168.1.102',
    model: 'VIP 3230 B LPR (Demo)',
    classification: 'MOCK_DEMO',
    isMock: true,
    rtspUrl: 'rtsp://admin:secret123@192.168.1.102:554/cam',
    defaultCredentialsHint: 'admin/secret123',
  };
  const sanitizedMockCam = sanitizeCameraForClient(mockCamera as any);
  assert((sanitizedMockCam as any).rtspUrl === undefined, 'Sanitizer: Deleta qualquer URL RTSP do objeto enviado ao frontend');
  assert((sanitizedMockCam as any).defaultCredentialsHint === undefined, 'Sanitizer: Deleta credenciais ou dicas de senha');
  assert(sanitizedMockCam.classification === 'MOCK_DEMO', 'Discovery: Preserva classificação clara MOCK_DEMO para identificação');
  assert(sanitizedMockCam.isMock === true, 'Discovery: Preserva isMock: true para evitar confusão de hardware na guarita');

  console.log('\n===============================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DE SEGURANÇA E HARDWARE PASSARAM COM SUCESSO!`);
  console.log('===============================================================');
  return true;
}

if (process.argv[1]?.includes('regression.ts')) {
  runRegressionTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Falha na suíte de testes de regressão:', err);
      process.exit(1);
    });
}

