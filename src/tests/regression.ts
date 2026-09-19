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
    executeSafeAction: async () => ({ success: false, message: 'Connection refused to Asterisk AMI socket on port 5038' }),
  };
  const resultAmiFailure = await realAdapter.triggerRelay(testGate, 1);
  assert(!resultAmiFailure.success, 'Falha de comunicação no AMI reporta success: false');
  assert(resultAmiFailure.commandStatus === 'HARDWARE_FAILURE', 'Falha no AMI retorna status HARDWARE_FAILURE');

  // Restaura AMI funcional
  (realAdapter as any).ami = {
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

