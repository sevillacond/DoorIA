import crypto from 'crypto';
import type { FinancialBill } from '../types.ts';
import { getPaymentProvider, type ProviderChargeResult, type ProviderWebhookResult } from './finance/index.ts';

export interface GenerateBillingParams {
  unitId: string;
  unitNumber: string;
  competencia: string;
  vencimento: string;
  taxaOrdinaria: number;
  taxaExtraordinaria?: number;
  fundoReserva?: number;
  consumoGasAgua?: number;
  payerName?: string;
  payerDocument?: string;
}

export interface PaymentSettlementResult {
  success: boolean;
  transactionId: string;
  billId: string;
  amountPaid: number;
  method: 'pix' | 'boleto' | 'enlace_pay';
  paidAt: string;
  receiptNumber: string;
  isSandbox: boolean;
  message: string;
}

export class EnlacePay {
  /**
   * Calcula encargos legais por atraso (Art. 1.336 § 1º do Código Civil Brasileiro)
   * Multa: 2% + Juros de 1% ao mês proporcional + Correção
   * Responsabilidade: Domínio Financeiro DoorIA
   */
  public static calculateLateCharges(
    valorOriginal: number,
    vencimentoIso: string,
    latePenaltyPercentage = 2.0,
    monthlyInterestPercentage = 1.0
  ): { diasAtraso: number; multa: number; juros: number; correcao: number; valorTotal: number } {
    const vencimentoDate = new Date(vencimentoIso);
    const now = new Date();
    const diffMs = now.getTime() - vencimentoDate.getTime();
    const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (diasAtraso <= 0) {
      return {
        diasAtraso: 0,
        multa: 0,
        juros: 0,
        correcao: 0,
        valorTotal: valorOriginal,
      };
    }

    const multa = (valorOriginal * latePenaltyPercentage) / 100;
    const jurosDiarios = (monthlyInterestPercentage / 30 / 100) * valorOriginal;
    const juros = jurosDiarios * diasAtraso;
    const correcao = diasAtraso > 30 ? (valorOriginal * 0.005) : 0;
    const valorTotal = Number((valorOriginal + multa + juros + correcao).toFixed(2));

    return {
      diasAtraso,
      multa: Number(multa.toFixed(2)),
      juros: Number(juros.toFixed(2)),
      correcao: Number(correcao.toFixed(2)),
      valorTotal,
    };
  }

  /**
   * Emite uma cobrança bancária através do PaymentProvider ativo (Sandbox ou Banco Oficial)
   * Responsabilidade: EnlacePay Integration Gateway
   */
  public static async emitCharge(bill: FinancialBill, payerName: string): Promise<ProviderChargeResult> {
    const provider = getPaymentProvider();
    
    const result = await provider.createCharge({
      unitId: bill.unitId,
      unitNumber: bill.unitNumber,
      billId: bill.id,
      competencia: bill.competencia,
      vencimentoIso: bill.vencimento,
      valorTotal: bill.valorTotal,
      payerName,
    });

    bill.externalId = result.externalId;
    bill.pixCopiaCola = result.pixCopiaCola;
    bill.codigoBarras = result.codigoBarras;
    bill.linhaDigitavel = result.linhaDigitavel;

    return result;
  }

  /**
   * Processa webhook oficial do gateway de pagamentos
   * A fatura só é marcada como 'pago' após a confirmação válida pelo provider
   */
  public static async handleWebhook(payload: any, signature?: string): Promise<ProviderWebhookResult> {
    const provider = getPaymentProvider();
    return provider.processWebhook(payload, signature);
  }

  /**
   * Liquida uma fatura garantindo validação de segurança:
   * Em ambiente Sandbox/Dev, emite alerta explícito.
   * Em produção, exige confirmação do provedor via Webhook.
   */
  public static async settleBill(
    bill: FinancialBill,
    method: 'pix' | 'boleto' | 'enlace_pay' = 'pix',
    confirmedByProvider = false
  ): Promise<PaymentSettlementResult> {
    const provider = getPaymentProvider();

    // Se estiver em produção e sem confirmação real do gateway, bloqueia liquidação manual forjada
    if (process.env.NODE_ENV === 'production' && !confirmedByProvider) {
      throw new Error(
        'Segurança Bancária: Liquidação manual bloqueada em produção. ' +
        'A quitação exige confirmação eletrônica enviada pelo gateway bancário via Webhook ou arquivo de retorno CNAB.'
      );
    }

    const paidAt = new Date().toISOString();
    const transactionId = `${provider.isSandbox ? 'sandbox_' : ''}txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    bill.status = 'pago';
    bill.pagoEm = paidAt;
    bill.diasAtraso = 0;
    bill.metodoPagamento = method;

    return {
      success: true,
      transactionId,
      billId: bill.id,
      amountPaid: bill.valorTotal,
      method,
      paidAt,
      receiptNumber,
      isSandbox: provider.isSandbox,
      message: provider.isSandbox
        ? '[MODO SIMULADO] Fatura liquidada no ambiente de testes/sandbox. Nenhuma movimentação bancária real ocorreu.'
        : 'Pagamento confirmado com sucesso.',
    };
  }
}
