import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Se já está instalado, não exibe o botão
  if (isInstalled) {
    return null;
  }

  // Fluxo Android / Chrome Desktop
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-400 transition cursor-pointer"
        title="Instalar Aplicativo (PWA)"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  // Fluxo iOS Safari
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-400 transition cursor-pointer"
          title="Instalar no iPhone/iPad"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Download className="w-6 h-6" />
              </div>
              
              <h3 className="text-lg font-black text-white font-['Red_Hat_Display'] mb-2">Instalar no iPhone / iPad</h3>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                Para instalar o <strong className="text-white">Enlace-DoorIA</strong>, siga as regras nativas do Safari da Apple:
              </p>
              
              <div className="space-y-4 mb-6 text-sm text-slate-300 font-medium bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">1</div>
                  <p>Toque no botão <strong className="text-white">Compartilhar</strong> (quadrado com seta para cima) na barra inferior do Safari.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">2</div>
                  <p>Role para baixo e toque em <strong className="text-white">Adicionar à Tela de Início</strong>.</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
