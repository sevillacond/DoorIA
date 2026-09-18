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
    // Regex para substituir 'protocol://user:password@' por 'protocol://'
    return url.replace(/^(rtsp|rtsps|http|https):\/\/([^:@]+):([^@]+)@/i, '$1://');
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
 * Sanitiza um objeto de câmera para envio seguro à API ou interface web
 */
export function sanitizeCameraForClient<T extends { rtspUrl?: string; suggestedRtspMain?: string; suggestedRtspSub?: string; defaultCredentialsHint?: string }>(camera: T): T {
  const sanitized = { ...camera };
  if (sanitized.rtspUrl) {
    sanitized.rtspUrl = sanitizeRtspUrl(sanitized.rtspUrl);
  }
  if (sanitized.suggestedRtspMain) {
    sanitized.suggestedRtspMain = sanitizeRtspUrl(sanitized.suggestedRtspMain);
  }
  if (sanitized.suggestedRtspSub) {
    sanitized.suggestedRtspSub = sanitizeRtspUrl(sanitized.suggestedRtspSub);
  }
  // Remove pistas ou sugestões de senhas padrão
  if ('defaultCredentialsHint' in sanitized) {
    delete (sanitized as any).defaultCredentialsHint;
  }
  return sanitized;
}
