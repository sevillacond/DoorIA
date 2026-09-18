import crypto from 'crypto';
import type { UserRole, UserSession } from '../types.ts';
import { db } from '../db/index.ts';
import { systemUsers } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

// Verificação de Segredos Críticos: Em produção, falha imediata se SESSION_SECRET estiver ausente
function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL STARTUP ERROR: A variável de ambiente SESSION_SECRET é estritamente obrigatória em ambiente de produção. ' +
        'O DoorIA não pode iniciar com segredos ausentes ou padrões inseguros.'
      );
    }
    console.warn(
      '[AuthService] ⚠️ AVISO DE SEGURANÇA: SESSION_SECRET ausente em modo de desenvolvimento. ' +
      'Gerando segredo criptográfico randômico efêmero para esta execução.'
    );
    return crypto.randomBytes(32).toString('hex');
  }
  return secret;
}

const SESSION_SECRET = resolveSessionSecret();

// Sessões ativas em memória (indexadas por token assinado)
const activeSessions = new Map<string, { session: UserSession; expiresAt: number }>();

export class AuthService {
  /**
   * Autentica um usuário contra a tabela oficial system_users no PostgreSQL
   */
  public static async authenticateUser(username: string, plainPassword: string): Promise<UserSession | null> {
    try {
      const records = await db.select().from(systemUsers).where(eq(systemUsers.username, username)).limit(1);
      if (!records || records.length === 0) {
        return null;
      }

      const user = records[0];
      if (!user.active) {
        return null;
      }

      // Validação do hash com salt utilizando scrypt
      const derivedHash = crypto.scryptSync(plainPassword, user.salt, 64).toString('hex');
      if (!crypto.timingSafeEqual(Buffer.from(derivedHash), Buffer.from(user.passwordHash))) {
        return null;
      }

      return {
        id: user.id,
        name: user.displayName,
        email: user.email || `${user.username}@condominio.local`,
        role: user.role as UserRole,
        unitId: user.unitId || undefined,
        unitNumber: user.unitNumber || undefined,
        mfaEnabled: user.mfaEnabled || false,
      };
    } catch (error: any) {
      console.error('[AuthService] Erro ao consultar banco para autenticação:', error.message);
      return null;
    }
  }

  /**
   * Gera um token de sessão criptográfico assinado com HMAC-SHA256
   */
  public static createSessionToken(session: UserSession, ttlHours = 24): string {
    const payload = JSON.stringify({
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      unitId: session.unitId,
      unitNumber: session.unitNumber,
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlHours * 3600 * 1000,
    });

    const b64Payload = Buffer.from(payload).toString('base64url');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
    const token = `${b64Payload}.${signature}`;

    activeSessions.set(token, {
      session,
      expiresAt: Date.now() + ttlHours * 3600 * 1000,
    });

    return token;
  }

  /**
   * Valida e decodifica um token de sessão assinado
   */
  public static verifySessionToken(token: string): UserSession | null {
    if (!token) return null;

    // Checa cache ativo
    const cached = activeSessions.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.session;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;

      const [b64Payload, signature] = parts;
      const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');

      // Proteção contra timing attacks
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf-8'));
      if (decoded.expiresAt < Date.now()) {
        activeSessions.delete(token);
        return null;
      }

      const session: UserSession = {
        id: decoded.id,
        name: decoded.name || decoded.email,
        email: decoded.email,
        role: decoded.role,
        unitId: decoded.unitId,
        unitNumber: decoded.unitNumber,
        mfaEnabled: true,
      };

      activeSessions.set(token, { session, expiresAt: decoded.expiresAt });
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Revoga uma sessão ativa (logout)
   */
  public static revokeSession(token: string): void {
    activeSessions.delete(token);
  }

  /**
   * Gera sessões para ambiente exclusivo de testes/demonstração.
   * Em produção, lança erro fatal e é expressamente proibido.
   */
  public static getPresetSession(role: UserRole, unitNumber = '101'): UserSession {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Falha de Segurança: Sessões pré-configuradas (demo) são terminantemente proibidas em ambiente de produção.');
    }

    if (role === 'sindico') {
      return {
        id: 'usr-dev-sindico',
        name: 'Síndico Geral (Dev Demo)',
        email: 'sindico.demo@condominio.local',
        role: 'sindico',
        unitId: 'u-admin-01',
        unitNumber: '101',
        mfaEnabled: true,
      };
    }

    if (role === 'super_admin' || role === 'admin_sistema') {
      return {
        id: 'usr-dev-superadmin',
        name: 'Super Admin Técnico (Dev Demo)',
        email: 'admin.telecom@condominio.local',
        role: 'super_admin',
        mfaEnabled: true,
      };
    }

    return {
      id: `usr-dev-morador-${unitNumber}`,
      name: `Morador Unidade ${unitNumber} (Dev Demo)`,
      email: `morador.${unitNumber}@condominio.local`,
      role: 'morador',
      unitId: `u-${unitNumber}`,
      unitNumber,
      mfaEnabled: false,
    };
  }
}
