import crypto from 'crypto';
import type { FinancialBill } from '../types.ts';

export interface GenerateBillingParams {
  unitId: string;
  unitNumber: string;
  competencia: string;
  vencimento: string;
  taxaOrdinaria: number;
  taxaExtraordinaria?: number;
  fundoReserva?: number;
  consumoGasAgua?: number;
}

export interface PaymentSettlementResult {
  success: boolean;
  transactionId: string;
  billId: string;
  amountPaid: number;
  method: 'pix' | 'boleto' | 'enlace_pay';
  paidAt: string;
  receiptNumber: string;
}

export class EnlacePay {
  /**
   * Calcula encargos legais por atraso (Art. 1.336 § 1º do Código Civil Brasileiro)
   * Multa: 2% + Juros de 1% ao mês proporcional + Correção
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
   * Gera payload PIX Copia e Cola EMV padrão Banco Central do Brasil
   */
  public static generatePixPayload(
    chavePix: string,
    beneficiario: string,
    cidade: string,
    valor: number,
    txId: string
  ): string {
    const cleanKey = chavePix.replace(/[^a-zA-Z0-9]/g, '');
    const cleanBeneficiary = beneficiario.substring(0, 25).toUpperCase();
    const cleanCity = cidade.substring(0, 15).toUpperCase();
    const strValor = valor.toFixed(2);

    return `00020126580014br.gov.bcb.pix01${cleanKey.length.toString().padStart(2, '0')}${cleanKey}520400005303986540${strValor.length.toString().padStart(2, '0')}${strValor}5802BR59${cleanBeneficiary.length.toString().padStart(2, '0')}${cleanBeneficiary}60${cleanCity.length.toString().padStart(2, '0')}${cleanCity}62240520${txId.substring(0, 20)}6304`;
  }

  /**
   * Gera representação numérica de boleto bancário FEBRABAN
   */
  public static generateBarcode(unitNumber: string, valor: number): string {
    const prefix = '0019000009'; // Banco do Brasil
    const formattedValor = Math.round(valor * 100).toString().padStart(10, '0');
    const randomHash = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `${prefix}${unitNumber.padStart(4, '0')}${formattedValor}${randomHash}`.padEnd(44, '0');
  }

  /**
   * Processa a liquidação e conciliação de uma cobrança
   */
  public static async settleBill(
    bill: FinancialBill,
    method: 'pix' | 'boleto' | 'enlace_pay' = 'pix'
  ): Promise<PaymentSettlementResult> {
    const paidAt = new Date().toISOString();
    const transactionId = `txn-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    bill.status = 'pago';
    bill.pagoEm = paidAt;
    bill.diasAtraso = 0;

    return {
      success: true,
      transactionId,
      billId: bill.id,
      amountPaid: bill.valorTotal,
      method,
      paidAt,
      receiptNumber,
    };
  }
}
