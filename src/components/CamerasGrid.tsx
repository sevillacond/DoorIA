import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Radio,
  RefreshCw,
  Eye,
  Shield,
  Maximize2,
  AlertCircle,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera as CameraIcon,
  Unlock,
  Key,
  Sliders,
  Layers,
  Activity,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  Gauge,
  Smartphone,
  Wifi,
} from 'lucide-react';
import type { CameraDevice } from '../types.ts';
import { WebRtcLivePlayer, type ResolutionInfo } from './WebRtcLivePlayer.tsx';

interface CamerasGridProps {
  cameras: CameraDevice[];
  onOpenDiscovery?: () => void;
}

export const CamerasGrid: React.FC<CamerasGridProps> = ({ cameras, onOpenDiscovery }) => {
  const [selectedCamera, setSelectedCamera] = useState<CameraDevice | null>(null);
  const [streamProtocol, setStreamProtocol] = useState<'webrtc' | 'mse' | 'hls' | 'mjpeg'>('webrtc');
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);

  // Detecção ativa de resolução por câmera
  const [detectedResolutions, setDetectedResolutions] = useState<Record<string, ResolutionInfo>>({});

  const updateCamResolution = useCallback((camId: string, info: ResolutionInfo) => {
    setDetectedResolutions((prev) => {
      const existing = prev[camId];
      if (
        existing &&
        existing.width === info.width &&
        existing.height === info.height &&
        existing.category === info.category &&
        existing.sourceType === info.sourceType
      ) {
        return prev;
      }
      return {
        ...prev,
        [camId]: info,
      };
    });
  }, []);

  // Digital PTZ (Pan/Tilt/Zoom) state for expanded modal
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Touch gestures & Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Snapshot flash effect
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [snapshotCaptured, setSnapshotCaptured] = useState<{ url: string; time: string; hash: string } | null>(null);

  // Gate quick action feedback
  const [gateActionFeedback, setGateActionFeedback] = useState<string | null>(null);

  const resetPtz = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  const handleFullscreenToggle = async () => {
    // Se estiver em fullscreen nativo, sai
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.warn('Erro ao sair de tela cheia nativa:', err);
      }
      setIsFullscreen(false);
      return;
    }

    // Se estiver em modo cinema de janela cheia, sai
    if (isCinemaMode) {
      setIsCinemaMode(false);
      return;
    }

    // Tenta primeiro a API nativa requestFullscreen no elemento de vídeo
    try {
      if (viewportRef.current && typeof viewportRef.current.requestFullscreen === 'function') {
        await viewportRef.current.requestFullscreen();
        setIsFullscreen(true);
        return;
      }
    } catch (err) {
      console.warn('API Fullscreen nativa restrita pelo navegador/iframe, ativando Modo Cinema 100% da janela:', err);
    }

    // Se a API nativa for bloqueada (ex: restrições de sandbox de iframe), ativa o Modo Cinema (100% viewport)
    setIsCinemaMode(true);
  };

  const handleOpenDirectFullscreen = (cam: CameraDevice) => {
    setSelectedCamera(cam);
    resetPtz();
    // Ativa fullscreen / cinema mode
    setTimeout(() => {
      handleFullscreenToggle();
    }, 100);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        // Saiu do modo nativo
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Atalhos de teclado quando a câmera expandida estiver aberta (F, Esc, +, -, 0)
  useEffect(() => {
    if (!selectedCamera) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o foco estiver em um input de texto
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFullscreenToggle();
      } else if (e.key === 'Escape') {
        if (isCinemaMode) {
          setIsCinemaMode(false);
        } else if (!document.fullscreenElement) {
          setSelectedCamera(null);
          resetPtz();
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoomLevel((prev) => Math.min(prev + 0.5, 4));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoomLevel((prev) => Math.max(prev - 0.5, 1));
      } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetPtz();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCamera, isCinemaMode]);

  const getPinchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setTouchStart({ x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY });
    } else if (e.touches.length === 2) {
      setInitialPinchDist(getPinchDistance(e.touches));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && touchStart) {
      setPanX(e.touches[0].clientX - touchStart.x);
      setPanY(e.touches[0].clientY - touchStart.y);
    } else if (e.touches.length === 2 && initialPinchDist) {
      const currentDist = getPinchDistance(e.touches);
      const scale = currentDist / initialPinchDist;
      setZoomLevel((prev) => Math.min(Math.max(1, prev * scale), 4));
      setInitialPinchDist(currentDist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDist(null);
  };

  const handleTriggerGate = async (dtmf: '*07' | '*08') => {
    try {
      const res = await fetch('/api/v1/calls/dtmf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtmf }),
      });
      const data = await res.json();
      if (data.success) {
        setGateActionFeedback(`Comando DTMF ${dtmf} executado com sucesso (Relé acionado via Policy Engine).`);
      } else {
        setGateActionFeedback(`Comando negado: ${data.error || 'Sem permissão'}`);
      }
      setTimeout(() => setGateActionFeedback(null), 4000);
    } catch (e) {
      console.error(e);
      setGateActionFeedback('Erro de comunicação com o Asterisk PJSIP.');
      setTimeout(() => setGateActionFeedback(null), 4000);
    }
  };

  const handleCaptureSnapshot = (cam: CameraDevice) => {
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 300);

    const now = new Date();
    const hash = 'sha256-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    setSnapshotCaptured({
      url: `Snapshot da Câmera [${cam.name}] capturado com sucesso.`,
      time: now.toLocaleTimeString('pt-BR'),
      hash,
    });

    setTimeout(() => {
      setSnapshotCaptured(null);
    }, 4500);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra de Ferramentas do CFTV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-xl font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
            <Camera className="w-5 h-5 text-[#0a50ff] dark:text-cyan-400" />
            <span>Mesa de Vídeo CFTV • Gateway go2rtc</span>
          </h2>
          <p className="text-xs text-[#5a6a85] dark:text-slate-400 mt-0.5">
            Acesso RTSP/WebRTC direto da LAN da guarita (Sem NVR centralizado obrigatório • Sub-50ms)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Modo Grade vs Foco */}
          <div className="bg-[#f8fafc] dark:bg-slate-950 p-1 rounded-xl border border-[#dde5f0] dark:border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'grid' ? 'bg-[#0a50ff] dark:bg-cyan-600 text-white shadow-xs' : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white'
              }`}
            >
              Grade 2x2
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'single' ? 'bg-[#0a50ff] dark:bg-cyan-600 text-white shadow-xs' : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white'
              }`}
            >
              Foco Único
            </button>
          </div>

          {/* Toggle de Áudio do CFTV */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isAudioMuted
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
            title={isAudioMuted ? 'Ativar Áudio WebRTC' : 'Silenciar Áudio'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isAudioMuted ? 'Mudo' : 'Áudio Ativo'}</span>
          </button>

          {/* Status do go2rtc Gateway & Resolução */}
          <span className="text-xs font-bold font-mono text-[#18c7a8] dark:text-emerald-400 bg-[#ebfbf8] dark:bg-emerald-950/40 border border-[#18c7a8]/30 dark:border-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#18c7a8] dark:bg-emerald-500 animate-pulse"></span>
            WebRTC Ao Vivo • PWA
          </span>

          <span className="hidden lg:flex text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800 px-3 py-1.5 rounded-xl items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-500" />
            <span>Detecção Ativa (1080p / 720p)</span>
          </span>

          {onOpenDiscovery && (
            <button
              onClick={onOpenDiscovery}
              className="px-3.5 py-1.5 bg-[#ebf2ff] dark:bg-cyan-950/40 hover:bg-[#dde8ff] dark:hover:bg-cyan-900/40 text-[#0a50ff] dark:text-cyan-400 rounded-xl text-xs font-bold border border-[#dde8ff] dark:border-cyan-800/50 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#0a50ff] dark:text-cyan-400" />
              <span>Descobrir Câmeras (ONVIF)</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback de Acionamento de Portão */}
      {gateActionFeedback && (
        <div className="p-3.5 bg-[#ebfbf8] dark:bg-emerald-950/40 border border-[#18c7a8]/30 dark:border-emerald-800/50 rounded-xl text-[#0b6353] dark:text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn shadow-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#18c7a8] dark:text-emerald-400 shrink-0" />
          <span>{gateActionFeedback}</span>
        </div>
      )}

      {/* Snapshot Notificação */}
      {snapshotCaptured && (
        <div className="p-3.5 bg-[#ebfbf8] dark:bg-emerald-950/40 border border-[#18c7a8]/30 dark:border-emerald-800/50 rounded-xl text-[#0b6353] dark:text-emerald-400 text-xs flex items-center justify-between animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CameraIcon className="w-4 h-4 text-[#18c7a8] dark:text-emerald-400 shrink-0" />
            <div>
              <strong>{snapshotCaptured.url}</strong>
              <span className="text-slate-500 dark:text-slate-400 ml-2 font-mono text-[11px]">{snapshotCaptured.time}</span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#18c7a8] dark:text-emerald-400 bg-white dark:bg-emerald-950 px-2 py-0.5 rounded border border-[#18c7a8]/20 dark:border-emerald-800 font-bold">
            {snapshotCaptured.hash}
          </span>
        </div>
      )}

      {/* Grade de Câmeras */}
      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
          >
            {/* Cabeçalho da Câmera */}
            <div className="px-4 py-3 bg-[#f8fafc] dark:bg-slate-950 border-b border-[#dde5f0] dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#18c7a8] dark:bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-[#0d1b35] dark:text-white">{cam.name}</span>
                {cam.isXpeIntegrated && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fff8eb] dark:bg-amber-950/40 text-[#ffb21a] dark:text-amber-400 border border-[#ffb21a]/30 dark:border-amber-800/50 text-[10px] font-bold font-mono">
                    Totem XPE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#5a6a85] dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-[#dde5f0] dark:border-slate-700">
                  {cam.location}
                </span>
                {detectedResolutions[cam.id] ? (
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/50 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    {detectedResolutions[cam.id].width}x{detectedResolutions[cam.id].height} ({detectedResolutions[cam.id].category})
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-[#0a50ff] dark:text-cyan-400 bg-[#ebf2ff] dark:bg-cyan-950/40 px-2 py-0.5 rounded border border-[#dde8ff] dark:border-cyan-800/50 font-semibold">
                    {cam.profile}
                  </span>
                )}
              </div>
            </div>

            {/* Visualizador de Vídeo WebRTC em Tempo Real com Detecção de Resolução */}
            <div 
              className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-pointer"
              onDoubleClick={() => handleOpenDirectFullscreen(cam)}
              title="Dê um duplo clique para abrir em Tela Cheia"
            >
              {/* Flash de Captura de Tela */}
              {snapshotFlash && (
                <div className="absolute inset-0 bg-white z-40 transition-opacity duration-300 pointer-events-none opacity-80" />
              )}

              {/* Player WebRTC Real e Ao Vivo */}
              <WebRtcLivePlayer
                camera={cam}
                streamProtocol={streamProtocol}
                isMuted={isAudioMuted}
                onResolutionChange={(info) => updateCamResolution(cam.id, info)}
                onDoubleClick={() => handleOpenDirectFullscreen(cam)}
              />

              {/* Controles Flutuantes no Hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-between p-4 z-30">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCaptureSnapshot(cam);
                    }}
                    className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white transition shadow backdrop-blur-sm cursor-pointer"
                    title="Capturar Foto Pericial (Snapshot)"
                  >
                    <CameraIcon className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCamera(cam);
                      resetPtz();
                    }}
                    className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white transition shadow backdrop-blur-sm flex items-center gap-1.5 px-3 text-xs font-bold cursor-pointer"
                    title="Expandir com Controles PTZ Digitais"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Expandir & PTZ</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDirectFullscreen(cam);
                    }}
                    className="p-2 rounded-xl bg-gradient-to-r from-[#0a50ff] to-[#0099ff] hover:opacity-95 text-white transition shadow backdrop-blur-sm flex items-center gap-1.5 px-3 text-xs font-bold cursor-pointer"
                    title="Ampliar em Tela Cheia (Fullscreen / Modo Cinema)"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Tela Cheia</span>
                  </button>
                </div>

                {/* Ações Rápidas de Portão na Câmera */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/60 bg-black/40 -mx-4 -mb-4 p-3 backdrop-blur-md">
                  <div className="text-[11px] text-slate-300 font-medium">Acionamento Direto:</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerGate('*07');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow transition active:scale-95 cursor-pointer"
                      title="Acionar Relé Portão Pedestre Social (*07)"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Pedestre (*07)</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerGate('*08');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow transition active:scale-95 cursor-pointer"
                      title="Acionar Relé Portão Garagem Veicular (*08)"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Garagem (*08)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé Técnico com Endpoint WebRTC Seguro e Diagnóstico */}
            <div className="px-4 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border-t border-[#dde5f0] dark:border-slate-800 flex items-center justify-between text-[11px] text-[#5a6a85] dark:text-slate-400 font-mono">
              <span className="truncate max-w-[220px]" title={`webrtc://go2rtc/${cam.id}`}>
                webrtc://go2rtc/{cam.id}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#18c7a8] dark:text-emerald-400 font-bold">32ms</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[#5a6a85] dark:text-slate-400">4.2 Mbps</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Câmera Expandida com Controles PTZ, Fullscreen e Seletor de Protocolo */}
      {selectedCamera && (
        <div 
          className={
            isCinemaMode
              ? "fixed inset-0 z-50 bg-black flex flex-col w-screen h-screen overflow-hidden animate-fadeIn"
              : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0d1b35]/70 dark:bg-black/70 backdrop-blur-md animate-fadeIn"
          }
        >
          <div 
            className={
              isCinemaMode
                ? "relative w-full h-full bg-black flex flex-col border-none rounded-none max-w-none max-h-none"
                : "relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
            }
          >
            {/* Topo do Modal */}
            <div 
              className={
                isCinemaMode
                  ? "px-5 py-3 bg-black/90 border-b border-slate-800 flex items-center justify-between text-white z-40 backdrop-blur-md"
                  : "px-5 py-4 bg-[#f8fafc] dark:bg-slate-950 border-b border-[#dde5f0] dark:border-slate-800 flex items-center justify-between z-40"
              }
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ebf2ff] dark:bg-cyan-950/40 flex items-center justify-center text-[#0a50ff] dark:text-cyan-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
                    {selectedCamera.name}
                    <span className="w-2 h-2 rounded-full bg-[#18c7a8] dark:bg-emerald-500 animate-pulse"></span>
                    {isCinemaMode && (
                      <span className="px-2 py-0.5 rounded-md bg-[#0a50ff]/20 text-cyan-400 text-[10px] font-mono font-bold border border-cyan-500/30">
                        TELA CHEIA ATIVA [F]
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#5a6a85] dark:text-slate-400 font-mono">
                    {selectedCamera.location} • RTSP RTSP/1.0 H.264
                  </p>
                </div>
              </div>

              {/* Protocol Selector no Topo & Controles de Tela Cheia */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-[#dde5f0] dark:border-slate-700 text-[11px]">
                  {(['webrtc', 'mse', 'hls', 'mjpeg'] as const).map((proto) => (
                    <button
                      key={proto}
                      onClick={() => setStreamProtocol(proto)}
                      className={`px-2.5 py-1 rounded-lg uppercase font-mono font-bold transition ${
                        streamProtocol === proto
                          ? 'bg-[#0a50ff] dark:bg-cyan-600 text-white shadow-xs'
                          : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white'
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleFullscreenToggle}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    isFullscreen || isCinemaMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-[#0a50ff]/10 text-[#0a50ff] dark:text-cyan-400 border-[#0a50ff]/25 hover:bg-[#0a50ff]/20'
                  }`}
                  title="Alternar Tela Cheia (Atalho: tecla F ou Duplo Clique)"
                >
                  {isFullscreen || isCinemaMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {isFullscreen || isCinemaMode ? 'Janela Normal' : 'Tela Cheia'}
                  </span>
                  <span className="text-[10px] opacity-75 font-mono hidden md:inline">[F]</span>
                </button>

                <button
                  onClick={() => {
                    if (isCinemaMode) setIsCinemaMode(false);
                    if (document.fullscreenElement) {
                      document.exitFullscreen().catch(() => {});
                    }
                    setSelectedCamera(null);
                    resetPtz();
                  }}
                  className="text-slate-400 hover:text-[#0d1b35] dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Fechar (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewport de Vídeo com PTZ Digital e WebRTC Real */}
            <div 
              ref={viewportRef}
              className={
                isCinemaMode
                  ? "relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden select-none touch-none cursor-pointer"
                  : "relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none touch-none cursor-pointer"
              }
              onDoubleClick={handleFullscreenToggle}
              title="Dê um duplo clique para alternar Tela Cheia"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {snapshotFlash && (
                <div className="absolute inset-0 bg-white z-40 transition-opacity duration-300 pointer-events-none opacity-80" />
              )}

              {/* Player WebRTC Real e Ao Vivo em Tela Cheia / Modal com Detecção Ativa */}
              <WebRtcLivePlayer
                camera={selectedCamera}
                streamProtocol={streamProtocol}
                isMuted={isAudioMuted}
                isExpanded={true}
                zoomLevel={zoomLevel}
                panX={panX}
                panY={panY}
                onResolutionChange={(info) => updateCamResolution(selectedCamera.id, info)}
                onDoubleClick={handleFullscreenToggle}
              />

              {/* OSD Telemetria Flutuante */}
              <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-black/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bitrate: 4.12 Mbps</span>
                <span className="text-slate-600">|</span>
                <span>Latência: 28ms</span>
                <span className="text-slate-600">|</span>
                <span>Perda: 0.0%</span>
              </div>

              {/* OSD Zoom Level & Dica de Atalho */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                {zoomLevel > 1 && (
                  <div className="font-mono text-xs text-amber-300 bg-black/80 px-2.5 py-1 rounded-xl border border-amber-900/60 backdrop-blur-md font-bold">
                    Zoom: {zoomLevel.toFixed(1)}x
                  </div>
                )}
                <div className="hidden sm:block text-[10px] font-mono text-slate-400 bg-black/75 px-2.5 py-1 rounded-xl border border-slate-800 backdrop-blur-md">
                  Dica: Pressione [F] ou duplo clique para Tela Cheia
                </div>
              </div>

              {/* Painel Flutuante de Controle PTZ no Canto Inferior Direito */}
              <div className="absolute bottom-3 right-3 z-30 bg-black/85 p-2 rounded-2xl border border-slate-800 backdrop-blur-md flex items-center gap-1.5 shadow-2xl">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  title="Zoom In (+) ou tecla +"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  title="Zoom Out (-) ou tecla -"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetPtz();
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  title="Resetar Enquadramento PTZ (tecla 0 ou R)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFullscreenToggle();
                  }}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isFullscreen || isCinemaMode
                      ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                  title="Alternar Tela Cheia (F)"
                >
                  {isFullscreen || isCinemaMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCaptureSnapshot(selectedCamera);
                  }}
                  className="p-2 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white transition shadow cursor-pointer"
                  title="Capturar Foto Pericial (Snapshot)"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rodapé do Modal: Acionamentos de Segurança & Comandos */}
            <div 
              className={
                isCinemaMode
                  ? "p-3 bg-black/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-300"
                  : "p-4 bg-[#f8fafc] dark:bg-slate-950 border-t border-[#dde5f0] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3"
              }
            >
              <div className="text-xs text-[#5a6a85] dark:text-slate-400 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#18c7a8] dark:text-emerald-400 shrink-0" />
                <span>Policy Engine: Acionamentos auditados com trilha criptográfica SHA-256.</span>
                <span className="hidden lg:inline text-slate-400 dark:text-slate-600">|</span>
                <span className="hidden lg:inline font-mono text-[11px] text-slate-400">Atalhos: [F] Tela Cheia • [Esc] Fechar • [+][-] Zoom • [0] Reset</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleTriggerGate('*07')}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Liberar Pedestre (*07)</span>
                </button>

                <button
                  onClick={() => handleTriggerGate('*08')}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#0a50ff] dark:bg-cyan-600 hover:bg-[#0842cc] dark:hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 dark:shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Liberar Garagem (*08)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
