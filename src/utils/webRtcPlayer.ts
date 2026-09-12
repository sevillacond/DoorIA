export class WebRTCPlayer {
  private videoElement: HTMLVideoElement;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private url: string;
  private iceServers: string[];

  constructor(videoElement: HTMLVideoElement, url: string, customStunServer?: string) {
    this.videoElement = videoElement;
    this.url = url;
    this.iceServers = customStunServer ? [customStunServer] : ['stun:stun.l.google.com:19302'];
  }

  public async start() {
    console.log(`[WebRTC Gateway] Starting connection to video gateway: ${this.url}`);
    
    // In a real environment, we connect to our Node.js Media Gateway over WebSocket
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('[WebRTC Gateway] WebSocket Connected');
      this.initPeerConnection();
    };

    this.ws.onmessage = async (event) => {
      if (!this.pc) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'offer') {
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this.ws!.send(JSON.stringify(this.pc.localDescription));
        } else if (msg.type === 'ice') {
          await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      } catch (e) {
        console.error('[WebRTC Gateway] Error parsing signaling message', e);
      }
    };
  }

  private initPeerConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: this.iceServers }]
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws) {
        this.ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
      }
    };

    this.pc.ontrack = (event) => {
      console.log('[WebRTC Gateway] Received video track from Node.js Video Gateway');
      if (this.videoElement.srcObject !== event.streams[0]) {
        this.videoElement.srcObject = event.streams[0];
      }
    };
  }

  public stop() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.videoElement.srcObject = null;
  }
}
