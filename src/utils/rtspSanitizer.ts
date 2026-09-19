/**
 * Utilitário de Sanitização de URLs RTSP e Credenciais de Infraestrutura
 * Regra: Nenhuma credencial de câmera ou totem deve aparecer em logs, mensagens de erro,
 * respostas de API, no frontend ou em auditorias.
 */

/**
 * Remove usuário e senha de qualquer URL RTSP ou HTTP, preservando apenas host, porta e caminho.
 * Exemplo:
 * rtsp://admin:admin12345@192.168.1.103:554/Streaming/Channels/101
 *   -> rtsp://192.168.1.103:554/Streaming/Channels/101
 */
export function sanitizeRtspUrl(url: string | undefined | null): string {
  if (!url) return '';
  try {
    // Remove completamente qualquer credencial (ex: user:pass@, admin:***@, user@) mantendo estritamente protocolo, host e caminho
    return url.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/[^@/]+@/i, '$1://');
  } catch {
    return '[STREAM_RESTRITO]';
  }
}

/**
 * Mascara a senha mantendo apenas a indicação de usuário autenticado
 * Exemplo: rtsp://admin:***@192.168.1.103:554/Streaming/Channels/101
 */
export function maskRtspCredentials(url: string | undefined | null): string {
  if (!url) return '';
  try {
    return url.replace(/^(rtsp|rtsps|http|https):\/\/([^:@]+):([^@]+)@/i, '$1://$2:***@');
  } catch {
    return '[STREAM_RESTRITO]';
  }
}

/**
 * Sanitiza um objeto de câmera para envio seguro à API ou interface web (PWA).
 * Regra Arquitetural Obrigatória:
 * O frontend NUNCA recebe URLs RTSP (rtsp://...), senhas, credenciais ou pistas.
 * A entrega de mídia ao navegador é exclusivamente controlada via WebRTC / Go2RTC backend proxy.
 */
export function sanitizeCameraForClient<T extends { id?: string; rtspUrl?: string; suggestedRtspMain?: string; suggestedRtspSub?: string; defaultCredentialsHint?: string }>(camera: T): T {
  const sanitized = { ...camera };

  // Remove completamente qualquer URL RTSP ou dados brutos de streaming local de câmera
  delete (sanitized as any).rtspUrl;
  delete (sanitized as any).rtspStream;
  delete (sanitized as any).rtspPort;
  delete (sanitized as any).suggestedRtspMain;
  delete (sanitized as any).suggestedRtspSub;
  delete (sanitized as any).suggestedGo2rtcConfig;

  // Remove campos de credenciais diretas, senhas, usuários de câmera ou pistas
  delete (sanitized as any).password;
  delete (sanitized as any).pass;
  delete (sanitized as any).credentials;
  delete (sanitized as any).secret;
  delete (sanitized as any).defaultCredentialsHint;
  delete (sanitized as any).username;

  // Injeta metadados de protocolo seguro WebRTC (Go2RTC)
  (sanitized as any).streamProtocol = 'webrtc';
  if ((sanitized as any).id) {
    (sanitized as any).streamEndpoint = `/api/v1/stream/${(sanitized as any).id}`;
  }

  return sanitized;
}
