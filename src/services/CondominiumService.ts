import { db } from '../db/index.ts';
import { condominiums } from '../db/schema.ts';
import type { CondominiumConfig } from '../types.ts';

// Configuração baseline de contingência operacional (São Luís - MA / 12 Unidades)
const FALLBACK_CONFIG: CondominiumConfig = {
  id: 'condo-slz-01',
  name: 'Condomínio Residencial Solar das Palmeiras',
  tradingName: 'Solar das Palmeiras Residencial',
  cnpj: '34.891.022/0001-85',
  address: {
    street: 'Av. dos Holandeses, Quadra 14',
    number: '250',
    complement: 'Torre Única',
    neighborhood: 'Calhau',
    city: 'São Luís',
    state: 'MA',
    zipCode: '65071-380',
  },
  unitsCount: 12,
  blocks: ['Bloco A'],
  floorsCount: 3,
  parkingSpotsCount: 18,
  managementPhone: '(98) 3235-9000',
  emergencyPhone: '(98) 98112-9900',
  email: 'administracao@solardaspalmeiras.com.br',
  sindico: {
    name: 'Henrique Vasconcelos de Alencar',
    document: '482.319.403-12',
    phone: '(98) 98455-2020',
    email: 'sindico@solardaspalmeiras.com.br',
    mandateStart: '2025-03-01',
    mandateEnd: '2027-02-28',
    apartment: '304',
  },
  administrator: {
    name: 'Enlace Administradora de Condomínios & Soluções Imobiliárias',
    cnpj: '18.420.981/0001-30',
    phone: '(98) 3227-4000',
    email: 'contato@enlacegestao.com.br',
    contactPerson: 'Dra. Roberta Fontenele',
  },
  operationalSettings: {
    pedestrianGatePulseSeconds: 5,
    vehicleGatePulseSeconds: 15,
    openGateAlertSeconds: 60,
    dtmfPedestrian: '*07',
    dtmfVehicle: '*08',
    silencePeriodStart: '22:00',
    silencePeriodEnd: '08:00',
    packageDeliveryWindowStart: '08:00',
    packageDeliveryWindowEnd: '20:00',
    callTimeoutSeconds: 30,
    autoUraFallback: true,
    localFirstOfflineMode: true,
    requireVisitorPhoto: true,
  },
  financialSettings: {
    dueDay: 10,
    standardFee: 480.0,
    reserveFundPercentage: 10,
    latePenaltyPercentage: 2.0,
    monthlyInterestPercentage: 1.0,
    pixKeyType: 'cnpj',
    pixKey: '34.891.022/0001-85',
    bankName: 'Banco do Brasil (001)',
    bankAgency: '1612-8',
    bankAccount: '48.910-2',
  },
  technicalSettings: {
    localServerIp: '192.168.1.100',
    asteriskVersion: 'Asterisk 20.8 LTS Pure (No FreePBX / Vanilla PJSIP)',
    xpeModel: 'Intelbras XPE-3115-IP (Firmware v3.2.0)',
    xpeIp: '192.168.1.150',
    iotGateway: 'NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet (Local-First)',
    iotGatewayIp: '192.168.1.160',
    subnetRange: '192.168.1.0/24',
    publicDomain: 'https://pwa.condominio-solar.com.br',
    stunTurnServer: 'stun:stun.l.google.com:19302',
    asteriskWssPort: 8089,
    allowSelfSignedCerts: true,
    localIpRange: '192.168.1.0/24',
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'Sistema Piloto',
};

let cachedConfig: CondominiumConfig = JSON.parse(JSON.stringify(FALLBACK_CONFIG));

export class CondominiumService {
  /**
   * Obtém a configuração do condomínio ativa a partir do PostgreSQL
   */
  public static async getConfig(): Promise<CondominiumConfig> {
    try {
      const records = await db.select().from(condominiums).limit(1);
      if (records && records.length > 0) {
        const r = records[0];
        cachedConfig = {
          id: r.id,
          name: r.name,
          tradingName: r.tradingName || undefined,
          cnpj: r.cnpj,
          address: r.address as any,
          unitsCount: r.unitsCount,
          blocks: r.blocks,
          floorsCount: r.floorsCount,
          parkingSpotsCount: r.parkingSpotsCount,
          managementPhone: r.managementPhone || '',
          emergencyPhone: r.emergencyPhone || '',
          email: r.email || '',
          sindico: r.sindico as any,
          administrator: r.administrator as any,
          operationalSettings: r.operationalSettings as any,
          financialSettings: r.financialSettings as any,
          technicalSettings: r.technicalSettings as any,
          updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
          updatedBy: 'PostgreSQL 16 LTS',
        };
      }
    } catch {
      // Retorna o cache resiliente em caso de banco offline
    }
    return cachedConfig;
  }

  /**
   * Atualiza a configuração do condomínio
   */
  public static async updateConfig(newConfig: Partial<CondominiumConfig>): Promise<CondominiumConfig> {
    cachedConfig = {
      ...cachedConfig,
      ...newConfig,
      updatedAt: new Date().toISOString(),
    };

    try {
      await db
        .update(condominiums)
        .set({
          name: cachedConfig.name,
          tradingName: cachedConfig.tradingName,
          cnpj: cachedConfig.cnpj,
          address: cachedConfig.address,
          unitsCount: cachedConfig.unitsCount,
          blocks: cachedConfig.blocks,
          floorsCount: cachedConfig.floorsCount,
          parkingSpotsCount: cachedConfig.parkingSpotsCount,
          managementPhone: cachedConfig.managementPhone,
          emergencyPhone: cachedConfig.emergencyPhone,
          email: cachedConfig.email,
          sindico: cachedConfig.sindico,
          administrator: cachedConfig.administrator,
          operationalSettings: cachedConfig.operationalSettings,
          financialSettings: cachedConfig.financialSettings,
          technicalSettings: cachedConfig.technicalSettings,
          updatedAt: new Date(),
        })
        .where(undefined as any);
    } catch {
      // Continua sem quebras
    }

    return cachedConfig;
  }
}
