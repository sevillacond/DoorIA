export interface CreateChargeParams {
  unitId: string;
  unitNumber: string;
  billId: string;
  competencia: string;
  vencimentoIso: string;
  valorTotal: number;
  payerName: string;
  payerDocument?: string;
  payerEmail?: string;
  payerPhone?: string;
  condominiumCnpj?: string;
}

export interface ProviderChargeResult {
  success: boolean;
  externalId: string;
  provider: string;
  isSandbox: boolean;
  status: 'PENDING' | 'SANDBOX_PENDING' | 'PAID' | 'FAILED';
  pixCopiaCola: string;
  codigoBarras: string;
  linhaDigitavel: string;
  qrCodeImageUrl?: string;
  dueDate: string;
  amount: number;
  createdAt: string;
  message: string;
}

export interface ProviderChargeDetails {
  externalId: string;
  provider: string;
  isSandbox: boolean;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
  paidAt?: string;
  amountPaid?: number;
  paymentMethod?: 'pix' | 'boleto' | 'credit_card';
  receiptUrl?: string;
}

export interface ProviderWebhookResult {
  valid: boolean;
  eventType: 'CHARGE_PAID' | 'CHARGE_CANCELLED' | 'CHARGE_EXPIRED' | 'UNKNOWN';
  billId?: string;
  externalId: string;
  amountPaid?: number;
  paidAt?: string;
  paymentMethod?: 'pix' | 'boleto' | 'credit_card';
  rawPayload: any;
  message: string;
}

/**
 * Interface canônica para Provedores de Pagamento do Enlace-Pay (Asaas, C6 Bank, Sandbox)
 */
export interface PaymentProvider {
  readonly name: string;
  readonly isSandbox: boolean;

  createCharge(params: CreateChargeParams): Promise<ProviderChargeResult>;
  getCharge(externalId: string): Promise<ProviderChargeDetails>;
  cancelCharge(externalId: string): Promise<boolean>;
  processWebhook(payload: any, signature?: string): Promise<ProviderWebhookResult>;
}
