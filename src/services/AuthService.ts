import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserRole, UserSession } from '../types.ts';
import { AuditService } from './AuditService.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dooria_local_auth_secret_key_2026';

// Sessões ativas em memória (indexadas por token)
const activeSessions = new Map<string, { session: UserSession; expiresAt: number }>();

export class AuthService {
  /**
   * Gera um token de sessão criptográfico assinado com HMAC-SHA256
   */
  public static createSessionToken(session: UserSession, ttlHours = 24): string {
    const payload = JSON.stringify({
      id: session.id,
      email: session.email,
      role: session.role,
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
   * Gera sessões padrão para o ambiente de testes/demonstração com isolamento
   */
  public static getPresetSession(role: UserRole, unitNumber = '101'): UserSession {
    if (role === 'sindico') {
      return {
        id: 'usr-fernando-201',
        name: 'Fernando Henrique Rocha (Síndico)',
        email: 'sindico.solar@gmail.com',
        role: 'sindico',
        unitId: 'u-201',
        unitNumber: '201',
        mfaEnabled: true,
      };
    }

    if (role === 'super_admin' || role === 'admin_sistema') {
      return {
        id: 'usr-superadmin',
        name: 'Engenheiro de Telecom / Super Admin',
        email: 'dev.telecom@enlace.ai',
        role: 'super_admin',
        mfaEnabled: true,
      };
    }

    return {
      id: `usr-morador-${unitNumber}`,
      name: `Morador Unidade ${unitNumber}`,
      email: `morador.${unitNumber}@solardaspalmeiras.com.br`,
      role: 'morador',
      unitId: `u-${unitNumber}`,
      unitNumber,
      mfaEnabled: false,
    };
  }
}
