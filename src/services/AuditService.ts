import crypto from 'crypto';
import { db } from '../db/index.ts';
import { auditLogs as dbAuditLogs } from '../db/schema.ts';
import type { AuditLogEntry, UserRole } from '../types.ts';

// Cache em memória para consulta ultra-rápida na interface
const memoryAuditLogs: AuditLogEntry[] = [];

export interface CreateAuditLogParams {
  actor: string;
  role: UserRole | string;
  action: string;
  target: string;
  status: 'PERMITIDO' | 'NEGADO' | 'ALERTA';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  dtmfCommand?: string;
  details?: Record<string, unknown>;
}

export class AuditService {
  /**
   * Registra um evento de auditoria imutável com assinatura de integridade SHA-256
   */
  public static async record(params: CreateAuditLogParams): Promise<AuditLogEntry> {
    const timestamp = new Date().toISOString();
    const id = `aud-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const correlationId = params.correlationId || `corr-${crypto.randomBytes(6).toString('hex')}`;
    const ipAddress = params.ipAddress || '192.168.1.100';
    const details = params.details || {};

    // Geração do Hash SHA-256 de integridade criptográfica
    const rawPayload = `${id}|${timestamp}|${params.actor}|${params.role}|${params.action}|${params.target}|${params.status}|${params.reason || ''}|${ipAddress}|${params.dtmfCommand || ''}|${JSON.stringify(details)}`;
    const sha256Hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const entry: AuditLogEntry = {
      id,
      timestamp,
      actor: params.actor,
      role: params.role as any,
      action: params.action,
      target: params.target,
      status: params.status,
      reason: params.reason,
      ipAddress,
      dtmfCommand: params.dtmfCommand,
      details,
    };

    // Mantém no cache em memória
    memoryAuditLogs.unshift(entry);
    if (memoryAuditLogs.length > 200) memoryAuditLogs.pop();

    // Persistência assíncrona no PostgreSQL 16 LTS via Drizzle ORM
    try {
      await db
        .insert(dbAuditLogs)
        .values({
          id,
          timestamp: new Date(timestamp),
          actor: params.actor,
          role: params.role,
          action: params.action,
          target: params.target,
          status: params.status,
          reason: params.reason,
          ipAddress,
          userAgent: params.userAgent,
          correlationId,
          dtmfCommand: params.dtmfCommand,
          details,
          sha256Hash,
        })
        .onConflictDoNothing();
    } catch (err: any) {
      // Standby resiliente em caso de oscilação do banco local
      if (!err.message?.includes('ECONNREFUSED')) {
        console.warn('[AuditService] Erro ao persistir log no PostgreSQL:', err.message);
      }
    }

    return entry;
  }

  /**
   * Recupera histórico de logs para visualização de auditoria e compliance
   */
  public static async getRecentLogs(limit = 100): Promise<AuditLogEntry[]> {
    try {
      const records = await db
        .select()
        .from(dbAuditLogs)
        .limit(limit);

      if (records && records.length > 0) {
        return records.map((r) => ({
          id: r.id,
          timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
          actor: r.actor,
          role: r.role as any,
          action: r.action,
          target: r.target,
          status: r.status as any,
          reason: r.reason || undefined,
          ipAddress: r.ipAddress || undefined,
          dtmfCommand: r.dtmfCommand || undefined,
          details: (r.details as Record<string, unknown>) || {},
        }));
      }
    } catch {
      // Fallback para cache em memória caso DB esteja em inicialização
    }

    return memoryAuditLogs.slice(0, limit);
  }
}
