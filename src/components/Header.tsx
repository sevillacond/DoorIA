import React from 'react';
import {
  ShieldCheck,
  PhoneCall,
  Server,
  Radio,
  User,
  QrCode,
  Building2,
  Menu,
  Sparkles,
} from 'lucide-react';
import type { UserSession, SystemStatus } from '../types.ts';

interface HeaderProps {
  session: UserSession;
  systemStatus: SystemStatus | null;
  onOpenMobileMenu: () => void;
  onOpenXpeSimulator: () => void;
  onOpenQrSimulator: () => void;
  onToggleWebPhone: () => void;
  onOpenMaia: () => void;
  activeCallCount: number;
  currentTab: 'inicio' | 'cameras' | 'financeiro' | 'engenharia';
}

export const Header: React.FC<HeaderProps> = ({
  session,
  systemStatus,
  onOpenMobileMenu,
  onOpenXpeSimulator,
  onOpenQrSimulator,
  onToggleWebPhone,
  onOpenMaia,
  activeCallCount,
  currentTab,
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'inicio':
        return session.role === 'morador' ? 'Portal do Morador' : 'Painel Central do Síndico';
      case 'cameras':
        return 'Monitoramento de Câmeras IP (ONVIF)';
      case 'financeiro':
        return 'Gestão Financeira & Boletos Condominiais';
      case 'engenharia':
        return 'Engenharia, Topologia LAN & Auditoria';
      default:
        return 'Portaria Autônoma';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Lado Esquerdo: Botão Menu Mobile & Breadcrumb do Módulo Atual */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Condomínio Solar das Palmeiras</span>
                <span className="text-slate-600">/</span>
                <span className="text-xs font-mono px-2 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Piloto São Luís - MA
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                {getTabTitle()}
              </h1>
            </div>
          </div>

          {/* Status Asterisk & Local-First (Central/Direita) */}
          <div className="hidden xl:flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Asterisk 20 PJSIP: Online</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Radio className="w-3.5 h-3.5" />
              <span>Local-First Ativo</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-amber-300">
              <Server className="w-3.5 h-3.5" />
              <span>XPE-3115-IP: 192.168.1.150</span>
            </div>
          </div>

          {/* Atalhos Rápidos da Barra Superior */}
          <div className="flex items-center gap-2">
            {/* Botão de Pânico (SOS) */}
            <button
              onClick={() => {
                if (window.confirm('EMERGÊNCIA: Acionar Botão de Pânico (Coação)? Isso acionará refletores e registrará evento pericial imutável.')) {
                  fetch('/api/v1/panic/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Acionamento manual via painel', location: session.role === 'morador' ? `Apto ${session.unitNumber}` : 'Portaria Central' }) })
                    .then(res => res.json())
                    .then(data => alert(data.message))
                    .catch(e => console.error(e));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/30 transition"
              title="Acionar Botão de Pânico (SOS)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">S.O.S</span>
            </button>

            {/* Simulador XPE Rápido */}
            <button
              onClick={onOpenXpeSimulator}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Testar Totem Intelbras XPE-3115-IP"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Totem XPE</span>
            </button>

            {/* Simulador QR Intercom Rápido */}
            <button
              onClick={onOpenQrSimulator}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Testar QR Virtual Intercom"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>QR Intercom</span>
            </button>

            {/* WebPhone PWA */}
            <button
              onClick={onToggleWebPhone}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition shadow-md ${
                activeCallCount > 0
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-bounce'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WebPhone</span>
              {activeCallCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-red-600 rounded-full text-[10px] font-extrabold">
                  {activeCallCount}
                </span>
              )}
            </button>

            {/* Assistente MaIA */}
            <button
              onClick={onOpenMaia}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-900/30 hover:opacity-90 transition"
              title="Abrir Assistente MaIA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MaIA</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
