import 'dotenv/config';
import { AuthService } from '../services/AuthService.ts';
import { PolicyEngine } from '../services/PolicyEngine.ts';
import { GateControlService } from '../services/GateControlService.ts';
import { EnlacePay } from '../services/EnlacePay.ts';
import { getPaymentProvider } from '../services/finance/index.ts';
import { getHardwareAdapter } from '../services/hardware/index.ts';
import { CondominiumService } from '../services/CondominiumService.ts';
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

export async function runRegressionTests() {
  console.log('===============================================================');
  console.log('🧪 INICIANDO SUÍTE DE TESTES DE REGRESSÃO E SEGURANÇA (DOORIA)');
  console.log('===============================================================\n');

  // 1. TESTES DE AUTENTICAÇÃO E SESSÕES
  console.log('--- [1/6] Testes de Autenticação e Token HMAC ---');
  const testSession: UserSession = {
    id: 'usr-test-1',
    name: 'Morador Teste',
    email: 'morador@teste.local',
    role: 'morador',
    unitNumber: '101',
    mfaEnabled: true,
  };

  const token = AuthService.createSessionToken(testSession);
  assert(typeof token === 'string' && token.includes('.'), 'Geração de token de sessão assinado HMAC-SHA256');

  const verified = AuthService.verifySessionToken(token);
  assert(verified !== null && verified.role === 'morador' && verified.unitNumber === '101', 'Validação criptográfica de token autêntico');

  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedVerified = AuthService.verifySessionToken(tamperedToken);
  assert(tamperedVerified === null, 'Rejeição de token adulterado (Anti-Tampering)');

  // 2. TESTES DO POLICY ENGINE - REGRAS DE OURO E ACIONAMENTO
  console.log('\n--- [2/6] Testes de Autorização e PolicyEngine (Portões) ---');
  // 2.1 Morador sem chamada ativa
  const eval1 = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: { callActive: false },
  });
  assert(!eval1.allowed && eval1.policyCode === 'DENY_NO_ACTIVE_CALL', 'Bloqueio de abertura por morador sem chamada ativa (Regra de Ouro)');

  // 2.2 Morador em chamada ativa cruzada (para outra unidade)
  const eval2 = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: { callActive: true, activeCallTargetUnit: '202' },
  });
  assert(!eval2.allowed && eval2.policyCode === 'DENY_CROSS_UNIT_CALL', 'Bloqueio de abertura de chamada cruzada (Cross-Unit Attack)');

  // 2.3 Morador em chamada ativa legítima
  const eval3 = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: { callActive: true, activeCallTargetUnit: '101' },
  });
  assert(eval3.allowed, 'Autorização de abertura por morador durante chamada ativa direcionada à sua unidade');

  // 2.4 Síndico com autorização direta
  const evalSindico = PolicyEngine.evaluate({
    actor: { id: 'usr-sindico', role: 'sindico' },
    action: 'ABRIR_PORTAO',
    resource: { target: 'gate-pedestre' },
    context: {},
  });
  assert(evalSindico.allowed, 'Autorização operacional direta para papel de Síndico');

  // 3. TESTES DO POLICY ENGINE - CÂMERAS E CFTV
  console.log('\n--- [3/6] Testes de Autorização de Câmeras CFTV (RBAC / ABAC) ---');
  // 3.1 Morador tentando acessar câmera de área restrita
  const evalCamRestricted = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ACESSAR_CAMERA',
    resource: {
      target: 'cam-tecnica-01',
      cameraLocation: 'Sala Técnica de Máquinas e Servidores',
      isRestrictedArea: true,
    },
    context: {},
  });
  assert(!evalCamRestricted.allowed && evalCamRestricted.policyCode === 'DENY_RESTRICTED_CAMERA_AREA', 'Bloqueio de visualização de câmera em área restrita para morador');

  // 3.2 Morador acessando câmera de área social comum permitida
  const evalCamSocial = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'ACESSAR_CAMERA',
    resource: {
      target: 'cam-social-01',
      cameraLocation: 'Área Comum e Salão Social',
    },
    context: {},
  });
  assert(evalCamSocial.allowed, 'Autorização de visualização de câmera de área comum/lazer para morador');

  // 3.3 Morador tentando ver mídia bruta de gravação
  const evalMedia = PolicyEngine.evaluate({
    actor: { id: 'usr-m1', role: 'morador', unitNumber: '101' },
    action: 'VER_GRAVACAO',
    resource: { target: 'rec-1234' },
    context: {},
  });
  assert(!evalMedia.allowed && evalMedia.policyCode === 'DENY_RESIDENT_RAW_MEDIA', 'Bloqueio de acesso a arquivos brutos de gravação para moradores (LGPD)');

  // 4. TESTES DE HARDWARE ADAPTER & GATE CONTROL
  console.log('\n--- [4/6] Testes de Abstração de Hardware (Simulation vs Real) ---');
  const hwAdapter = getHardwareAdapter();
  assert(hwAdapter.mode === 'simulated' || hwAdapter.mode === 'real_hardware', 'Inicialização do HardwareAdapter');

  const testGate: Gate = {
    id: 'gate-pedestre',
    name: 'Portão Pedestre Teste',
    type: 'pedestre',
    dtmfCode: '*07',
    status: 'fechado',
    sensorState: 'ok',
    relayPin: 1,
  };

  const triggerResult = await GateControlService.trigger(testGate, {
    gateId: 'gate-pedestre',
    session: { id: 'usr-sindico', name: 'Síndico Teste', role: 'sindico', email: 's@teste.local', mfaEnabled: true },
    context: {},
    triggerSource: 'painel_web',
  });
  assert(triggerResult.success, 'Acionamento de portão validado pelo GateControlService com HardwareAdapter');

  // 5. TESTES FINANCEIROS & ENLACE PAY
  console.log('\n--- [5/6] Testes Financeiros e Provedor de Pagamento ---');
  const charges = EnlacePay.calculateLateCharges(500.0, new Date(Date.now() - 10 * 86400000).toISOString());
  assert(charges.diasAtraso >= 9 && charges.multa === 10.0, 'Cálculo legal de multa (2% Art. 1.336 Código Civil)');

  const paymentProvider = getPaymentProvider();
  assert(paymentProvider.isSandbox, 'PaymentProvider ativo em modo Sandbox de isolamento');

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

  const chargeResult = await EnlacePay.emitCharge(testBill, 'Morador Teste');
  assert(chargeResult.success && chargeResult.isSandbox, 'Emissão de cobrança com código Pix Copia e Cola');

  const settlement = await EnlacePay.settleBill(testBill, 'pix');
  assert(settlement.success && testBill.status === 'pago', 'Liquidação de fatura com recibo e transação');

  // 6. TESTES DE CONFIGURAÇÃO LIMPA (SEM DADOS ESPECÍFICOS EM CÓDIGO)
  console.log('\n--- [6/6] Verificação de Configuração Neutra e Local-First ---');
  const condoConfig = await CondominiumService.getConfig();
  assert(condoConfig !== null, 'CondominiumService entrega configuração estruturada');
  assert(typeof condoConfig?.operationalSettings?.dtmfPedestrian === 'string', 'Parâmetros operacionais DTMF configurados');

  console.log('\n===============================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DE REGRESSÃO PASSARAM COM SUCESSO!`);
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
