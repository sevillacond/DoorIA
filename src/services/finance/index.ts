import type { PaymentProvider } from './PaymentProvider.ts';
import { SandboxPaymentProvider } from './SandboxPaymentProvider.ts';

export * from './PaymentProvider.ts';
export * from './SandboxPaymentProvider.ts';

let activePaymentProvider: PaymentProvider | null = null;

/**
 * Retorna o provedor de pagamento ativo do Enlace-Pay.
 * Por padrão, opera em Sandbox até que credenciais de produção (ex: Asaas/C6) sejam configuradas.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!activePaymentProvider) {
    // Por padrão e para segurança, inicia em Sandbox
    console.warn('[PaymentProviderFactory] ⚠️ Utilizando SandboxPaymentProvider (Modo Simulado/Seguro).');
    activePaymentProvider = new SandboxPaymentProvider();
  }
  return activePaymentProvider;
}
