import React, { useState } from 'react';
import { Camera, Radio, RefreshCw, Eye, Shield, Maximize2, AlertCircle } from 'lucide-react';
import type { CameraDevice } from '../types.ts';

interface CamerasGridProps {
  cameras: CameraDevice[];
}

export const CamerasGrid: React.FC<CamerasGridProps> = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState<CameraDevice | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <span>Câmeras IP da Portaria e Áreas Comuns</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acesso direto sem NVR | ONVIF Profile T/S | WebRTC Video Gateway Local
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
          4 Câmeras Online
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition flex flex-col"
          >
            {/* Cabeçalho da Câmera */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-white">{cam.name}</span>
              </div>
              <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                {cam.profile}
              </span>
            </div>

            {/* Visualizador de Vídeo / Stream */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
              {/* Overlay de Câmera IP */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-300 bg-black/70 px-2 py-0.5 rounded border border-emerald-900/60">
                  AO VIVO • {cam.resolution}
                </span>
              </div>

              <div className="absolute top-2 right-2 z-10">
                <span className="text-[10px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded border border-slate-800">
                  {cam.location}
                </span>
              </div>

              {/* Feed Simulado com visual de alta precisão */}
              <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-500 relative">
                <div className="w-16 h-16 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-cyan-400/80 mb-2">
                  <Eye className="w-8 h-8" />
                </div>
                <div className="text-xs font-semibold text-slate-300">{cam.name}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Stream Seguro H.264 WebRTC</div>

                {/* Grade de mira estilo CCTV */}
                <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 grid grid-cols-3 grid-rows-3"></div>
              </div>

              {/* Controles no Hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedCamera(cam)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Expandir Vídeo</span>
                </button>
              </div>
            </div>

            {/* Rodapé da Câmera */}
            <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono truncate max-w-[200px]">{cam.rtspUrl}</span>
              <span className="text-emerald-400 font-medium">Latência 85ms</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Câmera Expandida */}
      {selectedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">{selectedCamera.name}</h3>
                <span className="text-xs text-slate-400 font-mono">({selectedCamera.location})</span>
              </div>
              <button
                onClick={() => setSelectedCamera(null)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Eye className="w-16 h-16 text-cyan-400 mb-3 animate-pulse" />
                <div className="text-sm font-bold text-white">Transmissão em Tempo Real - WebRTC Video Gateway</div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  1080p @ 30 FPS | Codec H.264 Baseline | LAN Segura
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
