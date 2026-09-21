/**
 * Enlace-DoorIA: Diagnóstico Seguro do Caminho DoorIA Core ➔ Asterisk AMI
 *
 * Valida a conectividade TCP 5038, autenticação AMI, Ping de vitalidade,
 * CoreShowChannels e encerramento limpo (Logoff).
 *
 * REGRA DE OURO: NUNCA executa PlayDTMF, *07, *08, acionamento de relé ou
 * qualquer comando de hardware físico. Teste 100% somente diagnóstico e seguro.
 */

import { AsteriskManager } from '../src/services/AsteriskAMI.ts';

async function main() {
  console.log('🔍 [AMI Diagnostic] Iniciando validação do caminho DoorIA Core ➔ Asterisk AMI...');

  const host = process.env.ASTERISK_HOST || '127.0.0.1';
  const port = parseInt(process.env.ASTERISK_AMI_PORT || '5038', 10);
  const username = process.env.ASTERISK_AMI_USERNAME || process.env.ASTERISK_AMI_USER || '';
  const secret = process.env.ASTERISK_AMI_SECRET || '';

  console.log(`📡 [AMI Diagnostic] Alvo: ${host}:${port} | Usuário: ${username ? username : '(não informado)'}`);

  const res = await AsteriskManager.testCoreToAmiPath({
    host,
    port,
    username,
    secret,
    includeCoreShowChannels: true,
    timeoutMs: 5000,
  });

  if (res.success) {
    console.log(`✔ [AMI Diagnostic] SUCESSO: Caminho DoorIA Core ➔ Asterisk AMI plenamente operacional!`);
    console.log(`   - Latência medida: ${res.latencyMs}ms`);
    console.log(`   - Canais ativos inspecionados: ${res.channelCount}`);
    console.log(`   - Regra de Ouro: Nenhum DTMF ou comando físico foi transmitido.`);
    process.exit(0);
  } else {
    console.error(`❌ [AMI Diagnostic] FALHA no caminho DoorIA Core ➔ Asterisk AMI:`);
    console.error(`   - Etapa da falha: ${res.step}`);
    console.error(`   - Detalhes: ${res.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ [AMI Diagnostic] Erro fatal durante a execução do diagnóstico:', err);
  process.exit(1);
});
