/**
 * Enlace-DoorIA: Gerador Dinâmico de Configuração para o Gateway go2rtc
 * 
 * Regras Estritas de Segurança e Arquitetura:
 * 1. Não incluir câmeras desabilitadas ou não utilizadas em go2rtc.yaml.
 * 2. Câmeras habilitadas devem possuir URL RTSP válida.
 * 3. Proibir origin: "*" (manter origin restrito).
 * 4. Utilizar LOCAL_SERVER_IP nos candidatos WebRTC (sem STUN público não auditado).
 * 5. Servidor RTSP interno amarrado a 127.0.0.1:8554.
 */

import fs from 'fs';
import path from 'path';

export interface CameraConfigItem {
  id: string;
  name: string;
  enabled: boolean;
  rtspUrl?: string;
  useOpusAudio?: boolean;
}

export function isValidRtspFormat(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  if (trimmed === 'rtsp://' || trimmed === 'rtsp:///' || !trimmed.startsWith('rtsp://')) return false;

  // Regex para formato RTSP estrito com host obrigatório
  const regex = /^rtsp:\/\/(?:([^:@\s]+)(?::([^@\s]+))?@)?([a-zA-Z0-9.-]+)(?::(\d+))?(\/[^\s]*)?$/;
  if (!regex.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'rtsp:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function getActiveCamerasConfig(env: NodeJS.ProcessEnv = process.env): CameraConfigItem[] {
  // Controle explícito: toda câmera exige CAMERA_<ID>_ENABLED === 'true'
  // Para portaria: habilitada por padrão (CAMERA_PORTARIA_ENABLED !== 'false') a menos que explicitamente desabilitada ('false' ou '0')
  // Para secundárias (garagem, hall, gourmet): estritamente CAMERA_<ID>_ENABLED === 'true'
  // A presença isolada de uma URL RTSP NUNCA habilita a câmera se ENABLED for false
  const isPortariaEnabled = env.CAMERA_PORTARIA_ENABLED !== 'false' && env.CAMERA_PORTARIA_ENABLED !== '0';
  const isGaragemEnabled = env.CAMERA_GARAGEM_ENABLED === 'true';
  const isHallEnabled = env.CAMERA_HALL_ENABLED === 'true';
  const isGourmetEnabled = env.CAMERA_GOURMET_ENABLED === 'true';

  const cameras: CameraConfigItem[] = [];

  if (isPortariaEnabled) {
    cameras.push({
      id: 'camera_portaria',
      name: 'Totem Portaria Social (Intelbras XPE 3115 IP)',
      enabled: true,
      rtspUrl: env.GO2RTC_CAMERA_PORTARIA_URL?.trim(),
      useOpusAudio: true,
    });
  }

  if (isGaragemEnabled) {
    cameras.push({
      id: 'camera_garagem',
      name: 'Portão Garagem LPR (Intelbras VIP 3230 B)',
      enabled: true,
      rtspUrl: env.GO2RTC_CAMERA_GARAGEM_URL?.trim(),
    });
  }

  if (isHallEnabled) {
    cameras.push({
      id: 'camera_hall',
      name: 'Hall de Entrada Social (Hikvision DS-2CD1123G0-I)',
      enabled: true,
      rtspUrl: env.GO2RTC_CAMERA_HALL_URL?.trim(),
    });
  }

  if (isGourmetEnabled) {
    cameras.push({
      id: 'camera_gourmet',
      name: 'Espaço Gourmet (Dahua IPC-HDBW1230E)',
      enabled: true,
      rtspUrl: env.GO2RTC_CAMERA_GOURMET_URL?.trim(),
    });
  }

  return cameras;
}

export function generateGo2rtcYaml(env: NodeJS.ProcessEnv = process.env): string {
  const localServerIp = env.LOCAL_SERVER_IP?.trim() || '127.0.0.1';
  const activeCameras = getActiveCamerasConfig(env);

  // FAIL-FAST Mandatório:
  // Toda câmera explicitamente habilitada DEVE possuir configuração RTSP válida.
  // Se estiver habilitada sem URL válida: disparar erro crítico imediatamente.
  // Não gerar stream vazia. Não criar configuração parcialmente válida.
  for (const cam of activeCameras) {
    if (!cam.rtspUrl || !isValidRtspFormat(cam.rtspUrl)) {
      throw new Error(
        `[Go2RTC Config FAIL-FAST] A câmera "${cam.id}" está habilitada (${cam.id.toUpperCase()}_ENABLED=true) mas a URL RTSP é inválida ou ausente (recebido: "${cam.rtspUrl || ''}"). Nenhuma stream vazia ou configuração parcialmente válida é permitida.`
      );
    }
  }

  const streamsYaml = activeCameras
    .map((cam) => {
      const lines = [`  # ${cam.name}`, `  ${cam.id}:`, `    - "${cam.rtspUrl}"`];
      if (cam.useOpusAudio) {
        lines.push(`    - "ffmpeg:${cam.id}#video=copy#audio=opus"`);
      }
      return lines.join('\n');
    })
    .join('\n\n');

  return `# ==============================================================================
# ENLACE-DOORIA: GO2RTC GATEWAY DE VÍDEO CFTV
# Configuração Dinâmica Endurecida para Rede Local Segura (LAN / Guarita Física)
# Gerada a partir de variáveis de ambiente com apenas as câmeras habilitadas
# Versão: go2rtc v1.9.4
# ==============================================================================

api:
  listen: ":1984"
  # Restricao de origem estrita: proibir wildcard origin indiscriminado
  origin: ""

webrtc:
  listen: ":8555/tcp"
  # Candidatos ICE locais da guarita (utiliza IP do servidor na rede local física)
  # Operação estritamente local-first sem dependência de servidores STUN públicos não auditados
  candidates:
    - "${localServerIp}:8555"

rtsp:
  # Servidor RTSP local interno
  listen: "127.0.0.1:8554"

streams:
${streamsYaml ? streamsYaml : '  # Nenhuma câmera externa adicional ativada no momento\n'}
`;
}

export function syncGo2rtcConfigFile(filePath = path.join(process.cwd(), 'config', 'go2rtc.yaml'), env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    const yamlContent = generateGo2rtcYaml(env);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, yamlContent, 'utf-8');
    return true;
  } catch (err: any) {
    console.error('[Go2RTC Config] Erro ao sincronizar go2rtc.yaml:', err.message);
    return false;
  }
}
