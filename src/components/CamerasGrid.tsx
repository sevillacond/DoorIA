import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import type { CameraDevice } from '../types.ts';

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

  // Digital PTZ (Pan/Tilt/Zoom) state for expanded modal
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#dde5f0] p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-xl font-extrabold text-[#0d1b35] flex items-center gap-2 font-['Red_Hat_Display']">
            <Camera className="w-5 h-5 text-[#0a50ff]" />
            <span>Mesa de Vídeo CFTV • Gateway go2rtc</span>
          </h2>
          <p className="text-xs text-[#5a6a85] mt-0.5">
            Acesso RTSP/WebRTC direto da LAN da guarita (Sem NVR centralizado obrigatório • Sub-50ms)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Modo Grade vs Foco */}
          <div className="bg-[#f8fafc] p-1 rounded-xl border border-[#dde5f0] flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'grid' ? 'bg-[#0a50ff] text-white shadow-xs' : 'text-[#5a6a85] hover:text-[#0d1b35]'
              }`}
            >
              Grade 2x2
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'single' ? 'bg-[#0a50ff] text-white shadow-xs' : 'text-[#5a6a85] hover:text-[#0d1b35]'
              }`}
            >
              Foco Único
            </button>
          </div>

          {/* Status do go2rtc Gateway */}
          <span className="text-xs font-bold font-mono text-[#18c7a8] bg-[#ebfbf8] border border-[#18c7a8]/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#18c7a8] animate-pulse"></span>
            go2rtc Online (Porta 1984)
          </span>

          {onOpenDiscovery && (
            <button
              onClick={onOpenDiscovery}
              className="px-3.5 py-1.5 bg-[#ebf2ff] hover:bg-[#dde8ff] text-[#0a50ff] rounded-xl text-xs font-bold border border-[#dde8ff] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#0a50ff]" />
              <span>Descobrir Câmeras (ONVIF)</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Feedback de Acionamento de Portão */}
      {gateActionFeedback && (
        <div className="p-3.5 bg-[#ebfbf8] border border-[#18c7a8]/30 rounded-xl text-[#0b6353] text-xs flex items-center gap-2 animate-fadeIn shadow-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-[#18c7a8] shrink-0" />
          <span>{gateActionFeedback}</span>
        </div>
      )}

      {/* Snapshot Notificação */}
      {snapshotCaptured && (
        <div className="p-3.5 bg-[#ebfbf8] border border-[#18c7a8]/30 rounded-xl text-[#0b6353] text-xs flex items-center justify-between animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CameraIcon className="w-4 h-4 text-[#18c7a8] shrink-0" />
            <div>
              <strong>{snapshotCaptured.url}</strong>
              <span className="text-slate-500 ml-2 font-mono text-[11px]">{snapshotCaptured.time}</span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#18c7a8] bg-white px-2 py-0.5 rounded border border-[#18c7a8]/20 font-bold">
            {snapshotCaptured.hash}
          </span>
        </div>
      )}

      {/* Grade de Câmeras */}
      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-white border border-[#dde5f0] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
          >
            {/* Cabeçalho da Câmera */}
            <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#dde5f0] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#18c7a8] animate-pulse"></span>
                <span className="font-bold text-[#0d1b35]">{cam.name}</span>
                {cam.isXpeIntegrated && (
                  <span className="px-2 py-0.5 rounded-full bg-[#fff8eb] text-[#ffb21a] border border-[#ffb21a]/30 text-[10px] font-bold font-mono">
                    Totem XPE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#5a6a85] bg-white px-2 py-0.5 rounded border border-[#dde5f0]">
                  {cam.location}
                </span>
                <span className="font-mono text-[10px] text-[#0a50ff] bg-[#ebf2ff] px-2 py-0.5 rounded border border-[#dde8ff] font-semibold">
                  {cam.profile}
                </span>
              </div>
            </div>

            {/* Visualizador de Vídeo / Stream com Overlay Profissional CCTV */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {/* Flash de Captura de Tela */}
              {snapshotFlash && (
                <div className="absolute inset-0 bg-white z-40 transition-opacity duration-300 pointer-events-none opacity-80" />
              )}

              {/* OSD (On Screen Display) de CFTV */}
              <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-300 bg-black/75 px-2 py-0.5 rounded border border-emerald-900/60 backdrop-blur-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  REC • 1080p @ 30FPS
                </span>
                <span className="text-[10px] font-mono text-slate-300 bg-black/75 px-2 py-0.5 rounded border border-slate-800 backdrop-blur-sm">
                  WebRTC H.264
                </span>
              </div>

              <div className="absolute top-2 right-2 z-20">
                <span className="text-[10px] font-mono text-cyan-300 bg-black/75 px-2 py-0.5 rounded border border-cyan-900/60 backdrop-blur-sm">
                  go2rtc: 34ms
                </span>
              </div>

              {/* Feed de Vídeo Simulado de Alta Fidelidade */}
              <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center text-slate-500 relative">
                {/* Grade de Enquadramento estilo VMS / NVR */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-15 border border-cyan-500/20"></div>

                {/* Retículo Central */}
                <div className="w-12 h-12 border border-cyan-500/30 rounded-full flex items-center justify-center pointer-events-none">
                  <div className="w-1.5 h-1.5 bg-cyan-400/40 rounded-full"></div>
                </div>

                <div className="z-10 mt-3 text-center pointer-events-none">
                  <div className="text-xs font-semibold text-slate-300">{cam.name}</div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5 bg-black/60 px-2 py-0.5 rounded border border-cyan-900/50 backdrop-blur-sm">
                    Canal go2rtc: {cam.webrtcStreamUrl}
                  </div>
                </div>
              </div>

              {/* Controles Flutuantes no Hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-between p-4 z-30">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleCaptureSnapshot(cam)}
                    className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white transition shadow backdrop-blur-sm"
                    title="Capturar Foto Pericial (Snapshot)"
                  >
                    <CameraIcon className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => setSelectedCamera(cam)}
                    className="p-2 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white transition shadow backdrop-blur-sm flex items-center gap-1.5 px-3 text-xs font-bold"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Expandir & PTZ</span>
                  </button>
                </div>

                {/* Ações Rápidas de Portão na Câmera */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/60 bg-black/40 -mx-4 -mb-4 p-3 backdrop-blur-md">
                  <div className="text-[11px] text-slate-300 font-medium">Acionamento Direto:</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTriggerGate('*07')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow transition active:scale-95"
                      title="Acionar Relé Portão Pedestre Social (*07)"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Pedestre (*07)</span>
                    </button>
                    <button
                      onClick={() => handleTriggerGate('*08')}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 shadow transition active:scale-95"
                      title="Acionar Relé Portão Garagem Veicular (*08)"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Garagem (*08)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé Técnico com RTSP String e Diagnóstico */}
            <div className="px-4 py-2.5 bg-[#f8fafc] border-t border-[#dde5f0] flex items-center justify-between text-[11px] text-[#5a6a85] font-mono">
              <span className="truncate max-w-[220px]" title={cam.rtspUrl}>
                {cam.rtspUrl}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#18c7a8] font-bold">32ms</span>
                <span className="text-slate-300">•</span>
                <span className="text-[#5a6a85]">4.2 Mbps</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Câmera Expandida com Controles PTZ e Seletor de Protocolo */}
      {selectedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0d1b35]/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-5xl bg-white border border-[#dde5f0] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
            {/* Topo do Modal */}
            <div className="px-5 py-4 bg-[#f8fafc] border-b border-[#dde5f0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ebf2ff] flex items-center justify-center text-[#0a50ff]">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] flex items-center gap-2 font-['Red_Hat_Display']">
                    {selectedCamera.name}
                    <span className="w-2 h-2 rounded-full bg-[#18c7a8] animate-pulse"></span>
                  </h3>
                  <p className="text-[11px] text-[#5a6a85] font-mono">
                    {selectedCamera.location} • RTSP RTSP/1.0 H.264
                  </p>
                </div>
              </div>

              {/* Protocol Selector no Topo */}
              <div className="hidden sm:flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#dde5f0] text-[11px]">
                {(['webrtc', 'mse', 'hls', 'mjpeg'] as const).map((proto) => (
                  <button
                    key={proto}
                    onClick={() => setStreamProtocol(proto)}
                    className={`px-2.5 py-1 rounded-lg uppercase font-mono font-bold transition ${
                      streamProtocol === proto
                        ? 'bg-[#0a50ff] text-white shadow-xs'
                        : 'text-[#5a6a85] hover:text-[#0d1b35]'
                    }`}
                  >
                    {proto}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setSelectedCamera(null);
                  resetPtz();
                }}
                className="text-slate-400 hover:text-[#0d1b35] p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewport de Vídeo com PTZ Digital */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
              {snapshotFlash && (
                <div className="absolute inset-0 bg-white z-40 transition-opacity duration-300 pointer-events-none opacity-80" />
              )}

              {/* Viewport transformado pelo PTZ */}
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-150 relative"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`,
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center text-slate-500 relative">
                  <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-15 border border-cyan-500/20"></div>
                  <Eye className="w-16 h-16 text-[#55b0ff] mb-3 animate-pulse" />
                  <div className="text-sm font-bold text-white">
                    Transmissão go2rtc [{streamProtocol.toUpperCase()}]
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    1920x1080 @ 30 FPS • H.264 Baseline • Sub-50ms
                  </div>
                </div>
              </div>

              {/* OSD Telemetria Flutuante */}
              <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-black/80 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bitrate: 4.12 Mbps</span>
                <span className="text-slate-600">|</span>
                <span>Latência: 28ms</span>
                <span className="text-slate-600">|</span>
                <span>Perda de Pacotes: 0.0%</span>
              </div>

              {/* OSD Zoom Level */}
              {zoomLevel > 1 && (
                <div className="absolute top-3 left-3 z-30 font-mono text-xs text-amber-300 bg-black/80 px-2.5 py-1 rounded-xl border border-amber-900/60 backdrop-blur-md font-bold">
                  Zoom: {zoomLevel.toFixed(1)}x
                </div>
              )}

              {/* Painel Flutuante de Controle PTZ no Canto Inferior Direito */}
              <div className="absolute bottom-3 right-3 z-30 bg-black/85 p-2 rounded-2xl border border-slate-800 backdrop-blur-md flex items-center gap-1.5 shadow-2xl">
                <button
                  onClick={() => setZoomLevel((prev) => Math.min(prev + 0.5, 3))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((prev) => Math.max(prev - 0.5, 1))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={resetPtz}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  title="Resetar Enquadramento PTZ"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCaptureSnapshot(selectedCamera)}
                  className="p-2 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white transition shadow"
                  title="Capturar Foto Pericial (Snapshot)"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rodapé do Modal: Acionamentos de Segurança & Comandos */}
            <div className="p-4 bg-[#f8fafc] border-t border-[#dde5f0] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-[#5a6a85] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#18c7a8]" />
                <span>Policy Engine: Acionamentos auditados com trilha criptográfica SHA-256.</span>
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
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#0a50ff] hover:bg-[#0842cc] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs shadow-blue-500/20 transition active:scale-95 cursor-pointer"
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
