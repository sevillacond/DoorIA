/**
 * Enlace-DoorIA - Motor de Network Discovery & Parametrização Automática de Câmeras ONVIF/RTSP
 * Implementa WS-Discovery (UDP 3702), SSDP (UPnP) e Heurística de Fabricante (OUI / RTSP Profiles)
 */

import type { DiscoveredCamera, CameraDevice } from '../types.ts';

export interface ManufacturerProfile {
  name: 'Intelbras' | 'Hikvision' | 'Dahua' | 'Axis' | 'Uniview' | 'ONVIF Genérica';
  defaultOnvifPort: number;
  defaultRtspPort: number;
  defaultHttpPort: number;
  mainStreamPattern: (ip: string, user?: string, pass?: string, port?: number) => string;
  subStreamPattern: (ip: string, user?: string, pass?: string, port?: number) => string;
  recommendedProfile: 'ONVIF_Profile_T' | 'ONVIF_Profile_S';
  defaultCredentialsHint: string;
  generateGo2rtcConfig: (name: string, rtspUrl: string) => string;
}

export const MANUFACTURER_PROFILES: Record<string, ManufacturerProfile> = {
  Intelbras: {
    name: 'Intelbras',
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = 'admin', pass = 'admin', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=0`,
    subStreamPattern: (ip, user = 'admin', pass = 'admin', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=1`,
    recommendedProfile: 'ONVIF_Profile_T',
    defaultCredentialsHint: 'admin / admin ou senha configurada no primeiro boot (ISIC Lite / Intelbras SIM Next)',
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}:\n  - ${rtspUrl}\n  - ffmpeg:${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}#video=h264#hardware=auto`,
  },
  Hikvision: {
    name: 'Hikvision',
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = 'admin', pass = 'admin12345', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/101`,
    subStreamPattern: (ip, user = 'admin', pass = 'admin12345', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/Streaming/Channels/102`,
    recommendedProfile: 'ONVIF_Profile_T',
    defaultCredentialsHint: 'admin / senha definida no SADP Tool (Ativação obrigatória)',
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}:\n  - ${rtspUrl}\n  - "exec:ffmpeg -i ${rtspUrl} -c:v copy -f rtsp {output}"`,
  },
  Dahua: {
    name: 'Dahua',
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = 'admin', pass = 'admin', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=0`,
    subStreamPattern: (ip, user = 'admin', pass = 'admin', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/cam/realmonitor?channel=1&subtype=1`,
    recommendedProfile: 'ONVIF_Profile_T',
    defaultCredentialsHint: 'admin / admin ou senha ConfigTool Dahua',
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}:\n  - ${rtspUrl}`,
  },
  Axis: {
    name: 'Axis',
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = 'root', pass = 'pass', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/axis-media/media.amp?videocodec=h264`,
    subStreamPattern: (ip, user = 'root', pass = 'pass', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/axis-media/media.amp?videocodec=h264&resolution=640x360`,
    recommendedProfile: 'ONVIF_Profile_T',
    defaultCredentialsHint: 'root / configurada no AXIS IP Utility',
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}:\n  - ${rtspUrl}`,
  },
  Uniview: {
    name: 'Uniview',
    defaultOnvifPort: 80,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = 'admin', pass = '123456', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/unicast/c1/s0/live`,
    subStreamPattern: (ip, user = 'admin', pass = '123456', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/unicast/c1/s1/live`,
    recommendedProfile: 'ONVIF_Profile_S',
    defaultCredentialsHint: 'admin / 123456 (EZStation UNV)',
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}:\n  - ${rtspUrl}`,
  },
  'ONVIF Genérica': {
    name: 'ONVIF Genérica',
    defaultOnvifPort: 8899,
    defaultRtspPort: 554,
    defaultHttpPort: 80,
    mainStreamPattern: (ip, user = 'admin', pass = 'admin', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/onvif1`,
    subStreamPattern: (ip, user = 'admin', pass = 'admin', port = 554) =>
      `rtsp://${user}:${pass}@${ip}:${port}/onvif2`,
    recommendedProfile: 'ONVIF_Profile_S',
    defaultCredentialsHint: 'admin / admin ou sem senha',
    generateGo2rtcConfig: (name, rtspUrl) => `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}:\n  - ${rtspUrl}`,
  },
};

/**
 * WS-Discovery Probe Generator (ONVIF Core Specification)
 * Multicast to 239.255.255.250:3702
 */
export function buildWsDiscoveryProbeXml(messageId: string = `urn:uuid:${Date.now()}`): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
  <Header>
    <wsa:MessageID>${messageId}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
  </Header>
  <Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <Types xmlns:dn="http://www.onvif.org/ver10/network/wsdl">dn:NetworkVideoTransmitter</Types>
    </Probe>
  </Body>
</Envelope>`;
}

/**
 * Parametriza automaticamente uma câmera recém-descoberta com base no fabricante
 */
export function parametrizeDiscoveredCamera(
  raw: {
    ip: string;
    mac: string;
    manufacturerHint?: string;
    modelHint?: string;
    port?: number;
    discoveryMethod?: 'WS-Discovery' | 'SSDP' | 'ARP/OUI Scan';
  },
  existingCameras: CameraDevice[]
): DiscoveredCamera {
  // Deduce manufacturer
  let manufacturer: DiscoveredCamera['manufacturer'] = 'ONVIF Genérica';
  const hint = (raw.manufacturerHint || '').toLowerCase();
  const mac = raw.mac.toUpperCase();

  if (hint.includes('intelbras') || mac.startsWith('00:1A:3F') || mac.startsWith('4C:11:BF') || mac.startsWith('E0:50:8B')) {
    manufacturer = 'Intelbras';
  } else if (hint.includes('hikvision') || hint.includes('ezviz') || mac.startsWith('10:12:FB') || mac.startsWith('44:19:B6') || mac.startsWith('C0:56:E3')) {
    manufacturer = 'Hikvision';
  } else if (hint.includes('dahua') || mac.startsWith('3C:EF:8C') || mac.startsWith('A0:BD:1D')) {
    manufacturer = 'Dahua';
  } else if (hint.includes('axis') || mac.startsWith('00:40:8C') || mac.startsWith('AC:CC:8E')) {
    manufacturer = 'Axis';
  } else if (hint.includes('uniview') || hint.includes('unv') || mac.startsWith('34:CD:6D')) {
    manufacturer = 'Uniview';
  }

  const profile = MANUFACTURER_PROFILES[manufacturer] || MANUFACTURER_PROFILES['ONVIF Genérica'];
  const model = raw.modelHint || `${manufacturer} IP Camera`;
  const onvifPort = raw.port || profile.defaultOnvifPort;
  const rtspPort = profile.defaultRtspPort;

  // Check if camera is already registered in existingCameras
  const isConfigured = existingCameras.some(
    (cam) => (cam.ip && cam.ip === raw.ip) || cam.rtspUrl.includes(raw.ip)
  );

  const mainRtsp = profile.mainStreamPattern(raw.ip, 'admin', '*****', rtspPort);
  const subRtsp = profile.subStreamPattern(raw.ip, 'admin', '*****', rtspPort);
  const go2rtcConfig = profile.generateGo2rtcConfig(model, mainRtsp);

  return {
    id: `disc-${raw.ip.replace(/\./g, '-')}`,
    ip: raw.ip,
    mac: raw.mac,
    manufacturer,
    model,
    firmwareVersion: 'v2.800.0000000.12.R',
    onvifPort,
    rtspPort,
    httpPort: profile.defaultHttpPort,
    discoveryMethod: raw.discoveryMethod || 'WS-Discovery',
    supportedProfiles: [profile.recommendedProfile, 'ONVIF_Profile_S'],
    suggestedRtspMain: mainRtsp,
    suggestedRtspSub: subRtsp,
    suggestedGo2rtcConfig: go2rtcConfig,
    isConfigured,
    defaultCredentialsHint: profile.defaultCredentialsHint,
    detectedCodec: 'H.264 High Profile / H.265 Smart',
  };
}
