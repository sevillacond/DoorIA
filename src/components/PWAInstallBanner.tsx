import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle2, Shield } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Se já estiver rodando em modo standalone (PWA instalado) ou se o usuário fechou
  if (isInstalled || dismissed) {
    return null;
  }

  // Se for instalável no Android / Chromium / Desktop
  if (isInstallable) {
    return (
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-b border-cyan-800/80 px-4 py-2.5 text-xs text-slate-200 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-white font-semibold">Instale o App Enlace-DoorIA</strong>
              <span className="hidden md:inline text-slate-400 ml-1.5">
                • Acesso instantâneo à portaria, atendimento de interfone em tela cheia e notificações push.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={install}
              className="px-3.5 py-1.5 min-h-[38px] sm:min-h-[34px] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5 text-xs w-full sm:w-auto active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar Aplicativo</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
              title="Fechar banner"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se for iOS Safari (não dispara beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 text-xs text-slate-300 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate">Instale o App da Portaria na Tela Inicial do iPhone</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowIOSGuide(true)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
              >
                <Download className="w-3 h-3" />
                <span>Como Instalar</span>
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal com Guia Passo a Passo iOS */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Instalar no iOS (iPhone / iPad)</span>
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    No Safari, toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    Toque em <strong>Adicionar</strong> no canto superior direito. Pronto! O app funcionará em tela cheia com áudio WebRTC nativo.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow"
              >
                Entendi, fechar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
