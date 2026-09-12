// Este módulo orquestra a comunicação do backend Node.js com o binário/serviço do go2rtc.
// O go2rtc roda na porta 1984 por padrão e é o rei da baixa latência para WebRTC.

export class VideoGateway {
  public static async proxyCameraRtsp(rtspUrl: string, clientId: string) {
    console.log(`[Video Gateway - go2rtc] Recebida solicitação de Vídeo (Client: ${clientId})`);
    console.log(`[Video Gateway - go2rtc] Mapeando stream RTSP para API do go2rtc...`);
    
    // Na arquitetura real:
    // O Node.js solicita ao go2rtc via API REST para registrar o RTSP da câmera.
    // O Frontend (React) então conecta direto via WebSocket no go2rtc (ws://IP:1984/api/ws?src=camera_portaria)
    
    return {
      status: 'active',
      streamProtocol: 'webrtc',
      gateway: 'go2rtc',
      codec: 'H264/H265 -> WebRTC Direct',
      latency: '<50ms'
    };
  }
}
