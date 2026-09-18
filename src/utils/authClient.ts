/**
 * Cliente de Autenticação e Interceptador de Sessão (Enlace-DoorIA)
 * Garante que todas as requisições para a API incluam o token de autenticação
 * da sessão ativa, eliminando sessões anônimas.
 */

const TOKEN_STORAGE_KEY = 'dooria_session_token';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.warn('[AuthClient] Falha ao gravar token de sessão:', err);
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.warn('[AuthClient] Falha ao limpar token de sessão:', err);
  }
}

/**
 * Utilitário de fetch autenticado para chamadas da API Enlace-DoorIA
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getSessionToken();
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

let isInterceptorInstalled = false;

export function installFetchInterceptor(): void {
  if (isInterceptorInstalled || typeof window === 'undefined') return;

  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : undefined;
    if (!originalFetch) return;

    // Função de interceptação segura
    const customFetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request)?.url;
        if (typeof url === 'string' && (url.startsWith('/api/') || url.includes('/api/v1/'))) {
          const token = getSessionToken();
          if (token) {
            const headers = new Headers(init?.headers || {});
            if (!headers.has('Authorization')) {
              headers.set('Authorization', `Bearer ${token}`);
            }
            init = { ...init, headers };
          }
        }
      } catch {
        // Ignora erros ao inspecionar cabeçalhos
      }
      return originalFetch(input, init);
    };

    // Verifica se a propriedade 'fetch' no window ou seu prototype pode ser reconfigurada
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch') ||
                 Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');

    // Somente tenta redefinir se não for estritamente somente leitura com getter exclusivo
    if (!desc || desc.configurable || desc.writable || desc.set) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
        });
      } catch {
        try {
          (window as any).fetch = customFetch;
        } catch {
          // Iframe com restrição de sandbox: ignorar silenciosamente
        }
      }
    }
  } catch (err) {
    // Garante que nenhuma restrição do ambiente de iframe impeça o carregamento da aplicação
    console.warn('[AuthClient] Interceptação de fetch desativada devido às restrições do ambiente:', err);
  }

  isInterceptorInstalled = true;
}
