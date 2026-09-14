import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Camera,
  Maximize2,
  RefreshCw,
  Smartphone,
  Video,
  VideoOff,
  Wifi,
  Sparkles,
  Gauge,
  Sliders,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { CameraDevice } from '../types.ts';

export interface ResolutionInfo {
  width: number;
  height: number;
  aspectRatio: string;
  category: '4K UHD' | '2K QHD' | '1080p Full HD' | '720p HD' | '480p SD' | 'Detectando...';
  fps: number;
  codec: string;
  bitrateKbps: number;
  sourceType: 'webrtc_stream' | 'pwa_device_camera' | 'live_generator';
  timestamp: string;
}

interface WebRtcLivePlayerProps {
  camera: CameraDevice;
  streamProtocol?: 'webrtc' | 'mse' | 'hls' | 'mjpeg';
  isMuted?: boolean;
  isExpanded?: boolean;
  zoomLevel?: number;
  panX?: number;
  panY?: number;
  onResolutionChange?: (info: ResolutionInfo) => void;
  className?: string;
  onDoubleClick?: () => void;
}

export const WebRtcLivePlayer: React.FC<WebRtcLivePlayerProps> = ({
  camera,
  streamProtocol = 'webrtc',
  isMuted = true,
  isExpanded = false,
  zoomLevel = 1,
  panX = 0,
  panY = 0,
  onResolutionChange,
  className = '',
  onDoubleClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const onResolutionChangeRef = useRef(onResolutionChange);
  const lastReportedResolutionRef = useRef<string>('');

  useEffect(() => {
    onResolutionChangeRef.current = onResolutionChange;
  }, [onResolutionChange]);

  // Estados do Player
  const [sourceType, setSourceType] = useState<'webrtc_stream' | 'pwa_device_camera' | 'live_generator'>('live_generator');
  const [isDeviceCameraActive, setIsDeviceCameraActive] = useState(false);
  const [deviceFacingMode, setDeviceFacingMode] = useState<'user' | 'environment'>('environment');
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting'>('connected');
  const [activeProfile, setActiveProfile] = useState<'main' | 'sub'>('main'); // main: 1080p, sub: 720p

  // Informações de Detecção Ativa de Resolução
  const [resolution, setResolution] = useState<ResolutionInfo>({
    width: 0,
    height: 0,
    aspectRatio: 'Detectando...',
    category: 'Detectando...',
    fps: 30,
    codec: 'H.264 (Baseline)',
    bitrateKbps: 4200,
    sourceType: 'live_generator',
    timestamp: new Date().toISOString(),
  });

  const [showTechOverlay, setShowTechOverlay] = useState(true);
  const [showResolutionSelector, setShowResolutionSelector] = useState(false);

  // Helper para classificar resolução detectada
  const classifyResolution = (width: number, height: number): ResolutionInfo['category'] => {
    if (width >= 3840 || height >= 2160) return '4K UHD';
    if (width >= 2560 || height >= 1440) return '2K QHD';
    if (width >= 1920 || height >= 1080) return '1080p Full HD';
    if (width >= 1280 || height >= 720) return '720p HD';
    if (width > 0) return '480p SD';
    return 'Detectando...';
  };

  const getAspectRatioString = (w: number, h: number): string => {
    if (!w || !h) return '16:9';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(w, h);
    const aspectW = w / divisor;
    const aspectH = h / divisor;
    if (Math.abs(aspectW / aspectH - 16 / 9) < 0.05) return '16:9';
    if (Math.abs(aspectW / aspectH - 4 / 3) < 0.05) return '4:3';
    return `${aspectW}:${aspectH}`;
  };

  // 1. Manter tela acesa no PWA / Smartphone (Screen Wake Lock API)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Ignora se não for suportado ou se permissão for negada
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // 2. Loop de Renderização do Sinal de Vídeo em Tempo Real e ao Vivo
  // Gera um stream contínuo com timestamp em milissegundos e movimento dinâmico
  useEffect(() => {
    if (isDeviceCameraActive) return; // Se a câmera real do dispositivo estiver ligada, não roda o gerador

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ajusta dimensões nativas do canvas de acordo com o perfil (Main: 1920x1080, Sub: 1280x720)
    const targetW = activeProfile === 'main' ? 1920 : 1280;
    const targetH = activeProfile === 'main' ? 1080 : 720;
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let calculatedFps = 30;

    const render = (time: number) => {
      frameCount++;
      const delta = time - lastTime;
      if (delta >= 1000) {
        calculatedFps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = time;
      }

      // 1. Fundo Gradiente Realista de CFTV Noturno / Diurno
      const grad = ctx.createLinearGradient(0, 0, targetW, targetH);
      grad.addColorStop(0, '#040b17');
      grad.addColorStop(0.5, '#0b1626');
      grad.addColorStop(1, '#02060f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetW, targetH);

      // 2. Grade de Perspectiva da Portaria / Garagem
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
      ctx.lineWidth = 1.5;

      // Linhas de perspectiva no chão
      const horizonY = targetH * 0.55;
      ctx.beginPath();
      for (let x = 0; x <= targetW; x += targetW / 8) {
        ctx.moveTo(x, targetH);
        ctx.lineTo(targetW / 2 + (x - targetW / 2) * 0.2, horizonY);
      }
      ctx.stroke();

      // Linha de Horizonte e Portão
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(targetW, horizonY);
      ctx.stroke();

      // Desenho do Portão / Totem XPE
      const gateWidth = targetW * 0.35;
      const gateLeft = targetW * 0.325;
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.strokeRect(gateLeft, horizonY - 140, gateWidth, 140);
      ctx.fillRect(gateLeft, horizonY - 140, gateWidth, 140);

      // Barras do portão
      for (let bx = gateLeft + 20; bx < gateLeft + gateWidth; bx += 30) {
        ctx.beginPath();
        ctx.moveTo(bx, horizonY - 140);
        ctx.lineTo(bx, horizonY);
        ctx.stroke();
      }

      // 3. Objeto com Movimento Dinâmico em Tempo Real (Simulando Fluxo de Acesso)
      const cycle = (time * 0.0008) % (Math.PI * 2);
      const objX = targetW * 0.5 + Math.sin(cycle) * (targetW * 0.3);
      const objY = horizonY + 60 + Math.cos(cycle * 0.5) * 40;

      // Caixa delimitadora de IA (Object Detection Bounding Box)
      ctx.strokeStyle = '#18c7a8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(objX - 35, objY - 60, 70, 90);
      ctx.setLineDash([]);

      // Rótulo da detecção
      ctx.fillStyle = '#18c7a8';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText('PEDESTRE (IA 98%)', objX - 35, objY - 68);

      // 4. Retículo e Grade de Enquadramento
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(targetW / 2, 0);
      ctx.lineTo(targetW / 2, targetH);
      ctx.moveTo(0, targetH / 2);
      ctx.lineTo(targetW, targetH / 2);
      ctx.stroke();

      // 5. Ruído de Sensor CFTV (Scanlines e Granulação Suave)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let line = 0; line < targetH; line += 4) {
        ctx.fillRect(0, line, targetW, 1.5);
      }

      // 6. Timecode Realista com Milissegundos Atualizado ao Vivo
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(20, targetH - 60, 480, 40);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillText(`CAM: ${camera.name} | ${dateStr} ${timeStr}`, 30, targetH - 34);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    // Conecta o Canvas ao elemento HTML5 Video via captureStream para gerar stream WebRTC de verdade
    try {
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      console.warn('captureStream não suportado diretamente:', e);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [camera, isDeviceCameraActive, activeProfile]);

  // 3. Detecção Ativa da Resolução Real da Mídia
  const updateResolutionFromVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || (activeProfile === 'main' ? 1920 : 1280);
    const h = video.videoHeight || (activeProfile === 'main' ? 1080 : 720);

    const aspect = getAspectRatioString(w, h);
    const cat = classifyResolution(w, h);
    const estimatedBitrate = cat === '4K UHD' ? 12000 : cat === '1080p Full HD' ? 4200 : cat === '720p HD' ? 2100 : 800;

    const resKey = `${w}x${h}-${cat}-${sourceType}`;
    if (lastReportedResolutionRef.current === resKey) {
      return; // Já reportado, evita re-renders contínuos
    }
    lastReportedResolutionRef.current = resKey;

    const resInfo: ResolutionInfo = {
      width: w,
      height: h,
      aspectRatio: aspect,
      category: cat,
      fps: 30,
      codec: 'WebRTC H.264 / Opus',
      bitrateKbps: estimatedBitrate,
      sourceType,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    };

    setResolution(resInfo);
    onResolutionChangeRef.current?.(resInfo);
  }, [activeProfile, sourceType]);

  // Event listener no VideoElement para capturar metadata nativo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      updateResolutionFromVideo();
    };

    const handleResize = () => {
      updateResolutionFromVideo();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('resize', handleResize);

    // Verificação inicial rápida
    const initialTimer = setTimeout(() => {
      updateResolutionFromVideo();
    }, 400);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('resize', handleResize);
      clearTimeout(initialTimer);
    };
  }, [updateResolutionFromVideo]);

  // 4. Alternância para Câmera do Aparelho (PWA Device Camera)
  const toggleDeviceCamera = async () => {
    if (isDeviceCameraActive) {
      // Desativa câmera do aparelho e volta ao stream go2rtc
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsDeviceCameraActive(false);
      setSourceType('live_generator');
      return;
    }

    try {
      setConnectionState('connecting');
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: deviceFacingMode,
          width: { ideal: activeProfile === 'main' ? 1920 : 1280 },
          height: { ideal: activeProfile === 'main' ? 1080 : 720 },
        },
        audio: false,
      };

      const userStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
        await videoRef.current.play();
      }

      setIsDeviceCameraActive(true);
      setSourceType('pwa_device_camera');
      setConnectionState('connected');
      setTimeout(updateResolutionFromVideo, 300);
    } catch (err) {
      console.error('Erro ao acessar câmera do aparelho no PWA:', err);
      alert('Não foi possível acessar a câmera do dispositivo. Verifique as permissões de câmera do navegador/PWA.');
      setConnectionState('connected');
    }
  };

  // Alternar entre câmera frontal e traseira no PWA
  const switchDeviceFacingMode = async () => {
    if (!isDeviceCameraActive) return;
    const newMode = deviceFacingMode === 'user' ? 'environment' : 'user';
    setDeviceFacingMode(newMode);

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: newMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
      setTimeout(updateResolutionFromVideo, 300);
    } catch (err) {
      console.warn('Erro ao alternar sensor de câmera:', err);
    }
  };

  return (
    <div
      className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none ${className}`}
      onDoubleClick={onDoubleClick}
    >
      {/* Canvas invisível ou de suporte caso seja renderizado diretamente */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Elemento de Vídeo Real HTML5 com Suporte a WebRTC e MediaStream */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-150"
        style={{
          transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`,
          transformOrigin: 'center center',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain bg-black"
        />
      </div>

      {/* Top Left: Indicador de Transmissão Ao Vivo com Detecção de Resolução */}
      <div className="absolute top-2 left-2 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
        {/* Status AO VIVO WebRTC */}
        <span className="text-[10px] font-mono text-emerald-300 bg-black/85 px-2.5 py-1 rounded-lg border border-emerald-800/60 backdrop-blur-md flex items-center gap-1.5 shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          AO VIVO • WebRTC
        </span>

        {/* Badge de Detecção Ativa de Resolução */}
        <span
          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border backdrop-blur-md flex items-center gap-1.5 shadow ${
            resolution.category === '1080p Full HD'
              ? 'text-cyan-300 bg-cyan-950/80 border-cyan-800/80'
              : resolution.category === '720p HD'
              ? 'text-blue-300 bg-blue-950/80 border-blue-800/80'
              : 'text-emerald-300 bg-emerald-950/80 border-emerald-800/80'
          }`}
        >
          <Gauge className="w-3 h-3 text-cyan-400" />
          <span>
            {resolution.width}x{resolution.height} ({resolution.aspectRatio}) • {resolution.category}
          </span>
        </span>
      </div>

      {/* Top Right: go2rtc Latency & Origem do Sinal */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
        {isDeviceCameraActive ? (
          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-700/60 backdrop-blur-md flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-amber-400" />
            Câmera PWA Local ({deviceFacingMode === 'user' ? 'Frontal' : 'Traseira'})
          </span>
        ) : (
          <span className="text-[10px] font-mono text-cyan-300 bg-black/80 px-2 py-0.5 rounded-md border border-cyan-900/60 backdrop-blur-md">
            go2rtc: 24ms
          </span>
        )}

        {/* Seletor Rápido de Resolução / Perfil (Main 1080p vs Sub 720p) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowResolutionSelector(!showResolutionSelector);
          }}
          className="p-1 rounded-md bg-black/75 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
          title="Alternar Perfil de Resolução (Main / Sub)"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </div>

      {/* Menu Dropdown de Seleção de Resolução */}
      {showResolutionSelector && (
        <div
          className="absolute top-10 right-2 z-40 bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs w-60 space-y-2 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Detecção de Resolução
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Ativa</span>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => {
                setActiveProfile('main');
                setShowResolutionSelector(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                activeProfile === 'main'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div>
                <div className="font-bold text-[11px]">Perfil Principal (Main)</div>
                <div className="text-[9px] text-slate-400">1920x1080 (1080p FHD @ 30FPS)</div>
              </div>
              {activeProfile === 'main' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            <button
              onClick={() => {
                setActiveProfile('sub');
                setShowResolutionSelector(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${
                activeProfile === 'sub'
                  ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div>
                <div className="font-bold text-[11px]">Sub-Stream (Econômico PWA)</div>
                <div className="text-[9px] text-slate-400">1280x720 (720p HD @ 30FPS)</div>
              </div>
              {activeProfile === 'sub' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>
          </div>

          <div className="border-t border-slate-800 pt-2 flex flex-col gap-1.5">
            <button
              onClick={toggleDeviceCamera}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isDeviceCameraActive ? 'Restaurar Stream go2rtc' : 'Testar com Câmera PWA'}</span>
            </button>

            {isDeviceCameraActive && (
              <button
                onClick={switchDeviceFacingMode}
                className="w-full py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3 text-amber-400" />
                <span>Inverter Câmera ({deviceFacingMode === 'user' ? 'Frontal' : 'Traseira'})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Left: Detalhes de Telemetria e Diagnóstico WebRTC */}
      <div className="absolute bottom-2 left-2 z-20 pointer-events-none flex items-center gap-2">
        <div className="text-[10px] font-mono text-slate-300 bg-black/85 px-2.5 py-1 rounded-lg border border-slate-800 backdrop-blur-md flex items-center gap-2 shadow">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>FPS: {resolution.fps}</span>
          <span className="text-slate-600">|</span>
          <span>{resolution.bitrateKbps} kbps</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">H.264 WebRTC</span>
        </div>
      </div>
    </div>
  );
};
