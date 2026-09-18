import crypto from 'crypto';
import type { PaymentProvider, CreateChargeParams, ProviderChargeResult, ProviderChargeDetails, ProviderWebhookResult } from './PaymentProvider.ts';

/**
 * Provedor de Pagamento em modo Sandbox/Simulado.
 * Utilizado para testes e desenvolvimento, deixando categoricamente explícito
 * que todas as transações são simuladas e NENHUM valor financeiro real é movimentado.
 */
export class SandboxPaymentProvider implements PaymentProvider {
  public readonly name = 'EnlacePay_Sandbox' as const;
  public readonly isSandbox = true;

  // Registro interno de cobranças simuladas
  private charges = new Map<string, ProviderChargeDetails>();

  public async createCharge(params: CreateChargeParams): Promise<ProviderChargeResult> {
    const externalId = `sandbox_chg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const amountStr = params.valorTotal.toFixed(2);
    
    // Identificação visual cristalina de modo Sandbox
    const pixCopiaCola = `SANDBOX_PIX_EMV_DOORIA_${params.billId}_VALOR_${amountStr}_NAO_PAGAVEL`;
    const codigoBarras = `0019000009${params.unitNumber.padStart(4, '0')}${Math.round(params.valorTotal * 100).toString().padStart(10, '0')}SANDBOX`;
    const linhaDigitavel = `00190.00009 ${params.unitNumber.padStart(4, '0')}0.000000 00000.000000 1 ${Math.round(params.valorTotal * 100).toString().padStart(10, '0')}`;

    const chargeDetails: ProviderChargeDetails = {
      externalId,
      provider: this.name,
      isSandbox: true,
      status: 'PENDING',
    };
    this.charges.set(externalId, chargeDetails);

    console.warn(
      `[SANDBOX_PAYMENT_PROVIDER] Cobrança simulada gerada para Unidade ${params.unitNumber} ` +
      `(ID: ${externalId}, Valor: R$ ${amountStr}). Modo SANDBOX ativo.`
    );

    return {
      success: true,
      externalId,
      provider: this.name,
      isSandbox: true,
      status: 'SANDBOX_PENDING',
      pixCopiaCola,
      codigoBarras,
      linhaDigitavel,
      dueDate: params.vencimentoIso,
      amount: params.valorTotal,
      createdAt: new Date().toISOString(),
      message: 'Cobrança emitida em modo SANDBOX/SIMULAÇÃO. Não efetuar pagamento real.',
    };
  }

  public async getCharge(externalId: string): Promise<ProviderChargeDetails> {
    const charge = this.charges.get(externalId);
    if (!charge) {
      return {
        externalId,
        provider: this.name,
        isSandbox: true,
        status: 'PENDING',
      };
    }
    return charge;
  }

  public async cancelCharge(externalId: string): Promise<boolean> {
    const charge = this.charges.get(externalId);
    if (charge) {
      charge.status = 'CANCELLED';
      return true;
    }
    return false;
  }

  public async processWebhook(payload: any, signature?: string): Promise<ProviderWebhookResult> {
    // Validação da estrutura de webhook simulado
    const { event, externalId, billId, amountPaid, method } = payload || {};

    if (!externalId) {
      return {
        valid: false,
        eventType: 'UNKNOWN',
        externalId: '',
        rawPayload: payload,
        message: 'Payload de webhook inválido: externalId ausente.',
      };
    }

    if (event === 'PAYMENT_CONFIRMED' || event === 'CHARGE_PAID') {
      const charge = this.charges.get(externalId);
      const paidAt = new Date().toISOString();
      if (charge) {
        charge.status = 'PAID';
        charge.paidAt = paidAt;
        charge.amountPaid = amountPaid;
        charge.paymentMethod = method || 'pix';
      }

      return {
        valid: true,
        eventType: 'CHARGE_PAID',
        billId: billId || '',
        externalId,
        amountPaid: Number(amountPaid) || 0,
        paidAt,
        paymentMethod: method || 'pix',
        rawPayload: payload,
        message: `[SANDBOX WEBHOOK] Pagamento confirmado pelo gateway simulado para ${externalId}.`,
      };
    }

    return {
      valid: true,
      eventType: 'UNKNOWN',
      externalId,
      rawPayload: payload,
      message: `Evento desconhecido: ${event}`,
    };
  }
}
