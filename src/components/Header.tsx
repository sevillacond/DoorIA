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
  Bell,
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
  onOpenNotifications?: () => void;
  activeCallCount: number;
  currentTab: 'inicio' | 'cameras' | 'financeiro' | 'engenharia' | 'portaria' | 'moradores' | 'dispositivos';
}

export const Header: React.FC<HeaderProps> = ({
  session,
  systemStatus,
  onOpenMobileMenu,
  onOpenXpeSimulator,
  onOpenQrSimulator,
  onToggleWebPhone,
  onOpenMaia,
  onOpenNotifications,
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
      case 'portaria':
        return 'Operação da Portaria & Acessos';
      case 'moradores':
        return 'Gestão de Unidades & Moradores';
      case 'dispositivos':
        return 'Gestão de Câmeras, Totens & Relés';
      default:
        return 'Portaria Autônoma';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#dde5f0] shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Lado Esquerdo: Botão Menu Mobile & Breadcrumb do Módulo Atual */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-[#0a50ff] hover:bg-slate-200 transition"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5a6a85] font-medium">Condomínio Solar das Palmeiras</span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ebf2ff] text-[#0a50ff] border border-[#dde8ff]">
                  Piloto São Luís - MA
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-[#0d1b35] tracking-tight leading-tight font-['Red_Hat_Display']">
                {getTabTitle()}
              </h1>
            </div>
          </div>

          {/* Status Asterisk & Local-First (Central/Direita) */}
          <div className="hidden xl:flex items-center gap-3 bg-[#f5f8ff] px-3.5 py-1.5 rounded-xl border border-[#dde5f0] text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#18c7a8] animate-pulse"></span>
              <span>Asterisk 20 PJSIP: Online</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-[#0a50ff] font-semibold">
              <Radio className="w-3.5 h-3.5" />
              <span>Local-First Ativo</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-amber-700 font-medium">
              <Server className="w-3.5 h-3.5" />
              <span>XPE: 192.168.1.150</span>
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#ff5c7a] hover:bg-[#ff4264] text-white shadow-md shadow-rose-500/20 transition active:scale-95"
              title="Acionar Botão de Pânico (SOS)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">S.O.S</span>
            </button>

            {/* Simulador XPE Rápido */}
            <button
              onClick={onOpenXpeSimulator}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#f5f8ff] hover:bg-slate-100 text-slate-700 border border-[#dde5f0] transition shadow-xs"
              title="Testar Totem Intelbras XPE-3115-IP"
            >
              <Radio className="w-3.5 h-3.5 text-[#ffb21a]" />
              <span>Totem XPE</span>
            </button>

            {/* Simulador QR Intercom Rápido */}
            <button
              onClick={onOpenQrSimulator}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#f5f8ff] hover:bg-slate-100 text-slate-700 border border-[#dde5f0] transition shadow-xs"
              title="Testar QR Virtual Intercom"
            >
              <QrCode className="w-3.5 h-3.5 text-[#0a50ff]" />
              <span>QR Intercom</span>
            </button>

            {/* WebPhone PWA */}
            <button
              onClick={onToggleWebPhone}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition shadow-md ${
                activeCallCount > 0
                  ? 'bg-[#ff5c7a] hover:bg-[#ff4264] text-white animate-bounce shadow-rose-500/30'
                  : 'bg-[#0a50ff] hover:bg-[#0842cc] text-white shadow-blue-500/20'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WebPhone</span>
              {activeCallCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-[#ff5c7a] rounded-full text-[10px] font-extrabold">
                  {activeCallCount}
                </span>
              )}
            </button>

            {/* Assistente MaIA com Gradiente Digify */}
            <button
              onClick={onOpenMaia}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0a50ff] to-[#55b0ff] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition"
              title="Abrir Assistente MaIA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MaIA</span>
            </button>

            {/* Central de Notificações Push */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="p-2 rounded-xl bg-[#f5f8ff] hover:bg-slate-100 text-slate-600 hover:text-[#0a50ff] border border-[#dde5f0] transition shadow-xs"
                title="Configurar Notificações Push"
                aria-label="Notificações Push"
              >
                <Bell className="w-4 h-4 text-[#0a50ff]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
