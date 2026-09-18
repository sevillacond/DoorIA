import { db } from '../db/index.ts';
import {
  units as dbUnits,
  residents as dbResidents,
  gates as dbGates,
  cameraDevices as dbCameras,
  vehicles as dbVehicles,
  financialBills as dbBills,
  packageDeliveries as dbPackages,
  visitorInvites as dbInvites,
  systemUsers as dbUsers,
} from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import type { Unit, Resident, Gate, CameraDevice, Vehicle, FinancialBill, PackageDelivery, VisitorInvite } from '../types.ts';

export class DatabaseUnavailableError extends Error {
  public statusCode = 503;
  public code = 'DATABASE_UNAVAILABLE';
  constructor(message = 'O banco de dados PostgreSQL 16 LTS está temporariamente indisponível.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

export class DatabaseRepository {
  /**
   * Obtém todas as unidades e seus respectivos moradores associados
   */
  public static async getUnits(): Promise<Unit[]> {
    try {
      const unitsData = await db.select().from(dbUnits);
      const residentsData = await db.select().from(dbResidents);

      return unitsData.map((u) => {
        const matchingResidents: Resident[] = residentsData
          .filter((r) => r.unitId === u.id)
          .map((r) => ({
            id: r.id,
            unitId: r.unitId,
            name: r.name,
            document: r.document || '',
            phone: r.phone,
            email: r.email || '',
            isMainContact: r.isMainContact ?? false,
            sipDevice: {
              extension: r.sipExtension || u.number,
              registered: true,
              webrtcSupported: r.webrtcSupported ?? true,
            },
          }));

        return {
          id: u.id,
          number: u.number,
          block: u.block || 'Bloco A',
          floor: u.floor || 1,
          sipExtension: u.sipExtension || u.number,
          intercomCode: u.intercomCode || u.number,
          ownerName: u.ownerName,
          ownerPhone: u.ownerPhone || '',
          financialStatus: (u.financialStatus as any) || 'em_dia',
          residents: matchingResidents,
        };
      });
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new DatabaseUnavailableError(`Erro de conexão com PostgreSQL: ${error.message}`);
      }
      console.warn('[DatabaseRepository] PostgreSQL indisponível no ambiente de desenvolvimento/preview. Retornando lista vazia.');
      return [];
    }
  }

  /**
   * Obtém lista de portões cadastrados
   */
  public static async getGates(): Promise<Gate[]> {
    try {
      const records = await db.select().from(dbGates);
      return records.map((g) => ({
        id: g.id,
        name: g.name,
        type: (g.type === 'garagem' ? 'garagem' : 'pedestre') as 'pedestre' | 'garagem',
        dtmfCode: g.dtmfCode,
        status: (g.status as any) || 'fechado',
        sensorState: (g.sensorState as any) || 'ok',
        relayPin: g.relayPin,
        relayIp: g.relayIp || undefined,
        lastOpenedAt: g.lastOpenedAt ? g.lastOpenedAt.toISOString() : undefined,
        lastOpenedBy: g.lastOpenedBy || undefined,
      }));
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new DatabaseUnavailableError(`Erro ao consultar portões no PostgreSQL: ${error.message}`);
      }
      return [
        {
          id: 'gate-pedestre',
          name: 'Portão Social Pedestre',
          type: 'pedestre',
          dtmfCode: '*07',
          status: 'fechado',
          sensorState: 'ok',
          relayPin: 1,
        },
        {
          id: 'gate-garagem',
          name: 'Portão Garagem Veicular',
          type: 'garagem',
          dtmfCode: '*08',
          status: 'fechado',
          sensorState: 'ok',
          relayPin: 2,
        },
      ];
    }
  }

  /**
   * Obtém lista de câmeras registradas no banco
   */
  public static async getCameras(): Promise<CameraDevice[]> {
    try {
      const records = await db.select().from(dbCameras);
      return records.map((c) => ({
        id: c.id,
        name: c.name,
        location: c.location,
        profile: (c.profile as any) || 'ONVIF_Profile_T',
        rtspUrl: c.streamUrl,
        webrtcStreamUrl: `/api/v1/cameras/${c.id}/stream`,
        resolution: c.resolution || '1080p @ 30fps',
        status: (c.status as any) || 'online',
        isXpeIntegrated: c.isXpeIntegrated ?? false,
        ip: c.ipAddress || undefined,
        manufacturer: c.manufacturer || undefined,
        model: c.model || undefined,
      }));
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new DatabaseUnavailableError(`Erro ao consultar câmeras no PostgreSQL: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Obtém veículos cadastrados
   */
  public static async getVehicles(unitId?: string): Promise<Vehicle[]> {
    try {
      let queryBuilder = db.select().from(dbVehicles);
      if (unitId) {
        queryBuilder = db.select().from(dbVehicles).where(eq(dbVehicles.unitId, unitId)) as any;
      }
      const records = await queryBuilder;
      return records.map((v) => ({
        id: v.id,
        unitId: v.unitId,
        brand: v.brand || '',
        model: v.model,
        plate: v.plate,
        color: v.color || '',
        parkingSpot: v.parkingSpot || '',
        tagRfid: v.tagRfid || undefined,
      }));
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new DatabaseUnavailableError(`Erro ao consultar veículos no PostgreSQL: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Obtém faturas financeiras
   */
  public static async getFinancialBills(unitNumber?: string): Promise<FinancialBill[]> {
    try {
      let records;
      if (unitNumber) {
        records = await db.select().from(dbBills).where(eq(dbBills.unitNumber, unitNumber)).orderBy(desc(dbBills.vencimento));
      } else {
        records = await db.select().from(dbBills).orderBy(desc(dbBills.vencimento));
      }

      return records.map((b) => ({
        id: b.id,
        unitId: b.unitId,
        unitNumber: b.unitNumber,
        competencia: b.competencia,
        vencimento: b.vencimento ? b.vencimento.toISOString() : '',
        valorTotal: Number(b.valorTotal),
        taxaOrdinaria: Number(b.taxaOrdinaria),
        taxaExtraordinaria: Number(b.taxaExtraordinaria || 0),
        fundoReserva: Number(b.fundoReserva || 0),
        consumoGasAgua: Number(b.consumoGasAgua || 0),
        status: b.status as any,
        diasAtraso: b.diasAtraso || 0,
        multa: Number(b.multa || 0),
        juros: Number(b.juros || 0),
        correcao: Number(b.correcao || 0),
        pixCopiaCola: b.pixCopiaCola || undefined,
        codigoBarras: b.codigoBarras || undefined,
        linhaDigitavel: b.linhaDigitavel || undefined,
        pagoEm: b.pagoEm ? b.pagoEm.toISOString() : undefined,
        metodoPagamento: (b.metodoPagamento as any) || undefined,
      }));
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new DatabaseUnavailableError(`Erro ao consultar faturas no PostgreSQL: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Obtém encomendas recebidas
   */
  public static async getPackages(unitId?: string): Promise<PackageDelivery[]> {
    try {
      let records;
      if (unitId) {
        records = await db.select().from(dbPackages).where(eq(dbPackages.unitId, unitId)).orderBy(desc(dbPackages.receivedAt));
      } else {
        records = await db.select().from(dbPackages).orderBy(desc(dbPackages.receivedAt));
      }

      return records.map((p) => ({
        id: p.id,
        unitId: p.unitId,
        courier: p.courier,
        trackingCode: p.trackingCode || '',
        description: p.description || '',
        receivedAt: p.receivedAt ? p.receivedAt.toISOString() : new Date().toISOString(),
        deliveredAt: p.deliveredAt ? p.deliveredAt.toISOString() : undefined,
        status: p.status as any,
        pickupCode: p.pickupCode || undefined,
        photoUrl: p.photoUrl || undefined,
      }));
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new DatabaseUnavailableError(`Erro ao consultar encomendas no PostgreSQL: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Obtém convites de visitantes
   */
  public static async getVisitorInvites(unitId?: string): Promise<VisitorInvite[]> {
    try {
      let records;
      if (unitId) {
        records = await db.select().from(dbInvites).where(eq(dbInvites.unitId, unitId)).orderBy(desc(dbInvites.validFrom));
      } else {
        records = await db.select().from(dbInvites).orderBy(desc(dbInvites.validFrom));
      }

      return records.map((i) => ({
        id: i.id,
        unitId: i.unitId,
        visitorName: i.visitorName,
        document: i.document || undefined,
        type: i.type as any,
        qrToken: i.qrToken,
        pinCode: i.pinCode,
        validFrom: i.validFrom.toISOString(),
        validUntil: i.validUntil.toISOString(),
        status: i.status as any,
        entryCount: i.entryCount || 0,
        usedAt: i.usedAt ? i.usedAt.toISOString() : undefined,
      }));
    } catch (error: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new DatabaseUnavailableError(`Erro ao consultar convites no PostgreSQL: ${error.message}`);
      }
      return [];
    }
  }
}
