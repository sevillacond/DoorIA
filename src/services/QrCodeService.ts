import crypto from 'crypto';
import type { VisitorInvite } from '../types.ts';

export class QrCodeService {
  /**
   * Gera um token QR criptográfico de alta entropia (256 bits)
   */
  public static generateSecureToken(): string {
    const raw = crypto.randomBytes(32).toString('hex');
    return `door_qr_sec_${raw}`;
  }

  /**
   * Gera um código PIN numérico de segurança (6 dígitos)
   */
  public static generatePinCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Valida a integridade temporal e status de um convite QR
   */
  public static validateInvite(invite: VisitorInvite): { valid: boolean; reason?: string } {
    if (invite.status === 'revogado') {
      return { valid: false, reason: 'Acesso revogado pelo morador ou administração.' };
    }

    if (invite.status === 'expirado') {
      return { valid: false, reason: 'Convite expirado.' };
    }

    const now = new Date().getTime();
    const validFrom = new Date(invite.validFrom).getTime();
    const validUntil = new Date(invite.validUntil).getTime();

    if (now < validFrom) {
      return { valid: false, reason: 'Convite ainda não está dentro da janela de validade autorizada.' };
    }

    if (now > validUntil) {
      invite.status = 'expirado';
      return { valid: false, reason: 'Validade do convite expirada.' };
    }

    // Para entregas e prestadores de uso único
    if (invite.type === 'entrega' && invite.entryCount > 0) {
      invite.status = 'usado';
      return { valid: false, reason: 'Convite de uso único já utilizado anteriormente.' };
    }

    return { valid: true };
  }
}
