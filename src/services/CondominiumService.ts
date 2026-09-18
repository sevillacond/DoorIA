import { db } from '../db/index.ts';
import { condominiums } from '../db/schema.ts';
import type { CondominiumConfig } from '../types.ts';

/**
 * Serviço de Gerenciamento da Configuração Mestre do Condomínio
 * Fonte da Verdade: Tabela 'condominiums' no PostgreSQL 16 LTS via Drizzle ORM
 * Elimina dados hardcoded em código operacional.
 */
export class CondominiumService {
  /**
   * Obtém a configuração ativa a partir do PostgreSQL
   */
  public static async getConfig(): Promise<CondominiumConfig | null> {
    try {
      const records = await db.select().from(condominiums).limit(1);
      if (records && records.length > 0) {
        const r = records[0];
        return {
          id: r.id,
          name: r.name,
          tradingName: r.tradingName || undefined,
          cnpj: r.cnpj,
          address: (r.address as any) || {
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: '',
          },
          unitsCount: r.unitsCount || 0,
          blocks: r.blocks || ['Bloco A'],
          floorsCount: r.floorsCount || 1,
          parkingSpotsCount: r.parkingSpotsCount || 0,
          managementPhone: r.managementPhone || '',
          emergencyPhone: r.emergencyPhone || '',
          email: r.email || '',
          sindico: (r.sindico as any) || {
            name: '',
            phone: '',
            email: '',
          },
          administrator: (r.administrator as any) || {
            name: '',
            cnpj: '',
            phone: '',
            email: '',
          },
          operationalSettings: (r.operationalSettings as any) || {
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
          financialSettings: (r.financialSettings as any) || {
            dueDay: 10,
            standardFee: 0.0,
            reserveFundPercentage: 10,
            latePenaltyPercentage: 2.0,
            monthlyInterestPercentage: 1.0,
          },
          technicalSettings: (r.technicalSettings as any) || {
            localServerIp: process.env.LOCAL_SERVER_IP || '127.0.0.1',
            asteriskVersion: 'Asterisk 20 LTS Pure PJSIP',
            asteriskWssPort: 8089,
            allowSelfSignedCerts: true,
          },
          updatedAt: r.updatedAt ? r.updatedAt.toISOString() : new Date().toISOString(),
          updatedBy: 'PostgreSQL 16 LTS',
        };
      }

      // Se não houver registro no banco de dados:
      if (process.env.NODE_ENV === 'production') {
        return null;
      }

      // Em desenvolvimento, carrega estrutura neutra baseada em variáveis de ambiente se disponíveis
      return {
        id: process.env.CONDO_ID || 'condo-master',
        name: process.env.CONDO_NAME || 'Condomínio (Não Configurado)',
        tradingName: process.env.CONDO_TRADING_NAME || 'Condomínio',
        cnpj: process.env.CONDO_CNPJ || '00.000.000/0001-00',
        address: {
          street: '',
          number: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: '',
        },
        unitsCount: 0,
        blocks: ['Bloco A'],
        floorsCount: 1,
        parkingSpotsCount: 0,
        managementPhone: '',
        emergencyPhone: '',
        email: '',
        sindico: {
          name: '',
          document: '',
          phone: '',
          email: '',
          mandateStart: new Date().toISOString(),
          mandateEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
          apartment: '',
        },
        administrator: {
          name: '',
          cnpj: '',
          phone: '',
          email: '',
          contactPerson: '',
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
          standardFee: 0.0,
          reserveFundPercentage: 10,
          latePenaltyPercentage: 2.0,
          monthlyInterestPercentage: 1.0,
          pixKeyType: 'cnpj',
          pixKey: '',
          bankName: '',
          bankAgency: '',
          bankAccount: '',
        },
        technicalSettings: {
          localServerIp: '127.0.0.1',
          asteriskVersion: 'Asterisk 20.8 LTS Pure (No FreePBX)',
          xpeModel: 'Intelbras XPE 3115-IP',
          xpeIp: '192.168.1.150',
          iotGateway: 'NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet',
          iotGatewayIp: '192.168.1.160',
          subnetRange: '192.168.1.0/24',
          asteriskWssPort: 8089,
          allowSelfSignedCerts: true,
        },
        updatedAt: new Date().toISOString(),
        updatedBy: 'Ambiente Local',
      };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[CondominiumService] Erro ao carregar configurações do PostgreSQL:', error.message);
        throw error;
      }
      // Em ambiente de desenvolvimento sem PostgreSQL ativo, retorna a configuração neutra
      if (!error.message?.includes('ECONNREFUSED') && !error.message?.includes('Failed query')) {
        console.warn('[CondominiumService] PostgreSQL não disponível:', error.message);
      }
      return CondominiumService.getNeutralFallbackConfig();
    }
  }

  /**
   * Configuração neutra e estruturada utilizada como fallback estritamente em desenvolvimento
   */
  public static getNeutralFallbackConfig(): CondominiumConfig {
    return {
      id: process.env.CONDO_ID || 'condo-master',
      name: process.env.CONDO_NAME || 'Condomínio (Não Configurado)',
      tradingName: process.env.CONDO_TRADING_NAME || 'Condomínio',
      cnpj: process.env.CONDO_CNPJ || '00.000.000/0001-00',
      address: {
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      },
      unitsCount: 0,
      blocks: ['Bloco A'],
      floorsCount: 1,
      parkingSpotsCount: 0,
      managementPhone: '',
      emergencyPhone: '',
      email: '',
      sindico: {
        name: '',
        document: '',
        phone: '',
        email: '',
        mandateStart: new Date().toISOString(),
        mandateEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
        apartment: '',
      },
      administrator: {
        name: '',
        cnpj: '',
        phone: '',
        email: '',
        contactPerson: '',
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
        standardFee: 0.0,
        reserveFundPercentage: 10,
        latePenaltyPercentage: 2.0,
        monthlyInterestPercentage: 1.0,
        pixKeyType: 'cnpj',
        pixKey: '',
        bankName: '',
        bankAgency: '',
        bankAccount: '',
      },
      technicalSettings: {
        localServerIp: '127.0.0.1',
        asteriskVersion: 'Asterisk 20.8 LTS Pure (No FreePBX)',
        xpeModel: 'Intelbras XPE 3115-IP',
        xpeIp: '192.168.1.150',
        iotGateway: 'NovaDigital HNZ-CB3 Zigbee 3.0 Ethernet',
        iotGatewayIp: '192.168.1.160',
        subnetRange: '192.168.1.0/24',
        asteriskWssPort: 8089,
        allowSelfSignedCerts: true,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'Ambiente Local (Desenvolvimento)',
    };
  }

  /**
   * Atualiza a configuração do condomínio no PostgreSQL
   */
  public static async updateConfig(newConfig: Partial<CondominiumConfig>): Promise<CondominiumConfig> {
    const current = await this.getConfig();
    const updated = {
      ...(current || {}),
      ...newConfig,
      updatedAt: new Date().toISOString(),
    } as CondominiumConfig;

    try {
      const records = await db.select().from(condominiums).limit(1);
      if (records && records.length > 0) {
        await db
          .update(condominiums)
          .set({
            name: updated.name,
            tradingName: updated.tradingName,
            cnpj: updated.cnpj,
            address: updated.address,
            unitsCount: updated.unitsCount,
            blocks: updated.blocks,
            floorsCount: updated.floorsCount,
            parkingSpotsCount: updated.parkingSpotsCount,
            managementPhone: updated.managementPhone,
            emergencyPhone: updated.emergencyPhone,
            email: updated.email,
            sindico: updated.sindico,
            administrator: updated.administrator,
            operationalSettings: updated.operationalSettings,
            financialSettings: updated.financialSettings,
            technicalSettings: updated.technicalSettings,
            updatedAt: new Date(),
          });
      } else {
        await db.insert(condominiums).values({
          id: updated.id || 'condo-master',
          name: updated.name,
          tradingName: updated.tradingName,
          cnpj: updated.cnpj,
          address: updated.address,
          unitsCount: updated.unitsCount,
          blocks: updated.blocks,
          floorsCount: updated.floorsCount,
          parkingSpotsCount: updated.parkingSpotsCount,
          managementPhone: updated.managementPhone,
          emergencyPhone: updated.emergencyPhone,
          email: updated.email,
          sindico: updated.sindico,
          administrator: updated.administrator,
          operationalSettings: updated.operationalSettings,
          financialSettings: updated.financialSettings,
          technicalSettings: updated.technicalSettings,
        });
      }
    } catch (error: any) {
      console.error('[CondominiumService] Erro ao persistir configurações no PostgreSQL:', error.message);
      throw error;
    }

    return updated;
  }
}
