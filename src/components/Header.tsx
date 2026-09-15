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
  Wifi,
  WifiOff,
  LogOut,
  HelpCircle
} from 'lucide-react';
import type { UserSession, SystemStatus } from '../types.ts';
import { ThemeToggle } from './ThemeToggle.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  session: UserSession;
  systemStatus: SystemStatus | null;
  onOpenMobileMenu: () => void;
  onOpenXpeSimulator: () => void;
  onOpenQrSimulator: () => void;
  onToggleWebPhone: () => void;
  onOpenMaia: () => void;
  onOpenNotifications?: () => void;
  onSelectTab?: (tab: 'inicio' | 'cameras' | 'financeiro' | 'engenharia' | 'portaria' | 'moradores' | 'dispositivos' | 'condominio' | 'reservas' | 'ajuda') => void;
  activeCallCount: number;
  currentTab: 'inicio' | 'cameras' | 'financeiro' | 'engenharia' | 'portaria' | 'moradores' | 'dispositivos' | 'condominio' | 'reservas' | 'ajuda';
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
  onSelectTab,
  activeCallCount,
  currentTab,
}) => {
  const { logout } = useAuth();
  
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
      case 'condominio':
        return 'Configurações & Dados do Condomínio';
      case 'reservas':
        return 'Gestão de Áreas Comuns & Reservas';
      case 'ajuda':
        return 'Central de Ajuda, Manuais & Deploy';
      default:
        return 'Portaria Autônoma';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#dde5f0] dark:border-slate-800 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Lado Esquerdo: Botão Menu Mobile & Breadcrumb do Módulo Atual */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#0a50ff] dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5a6a85] dark:text-slate-400 font-medium">Condomínio Solar das Palmeiras</span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ebf2ff] dark:bg-cyan-950/40 text-[#0a50ff] dark:text-cyan-400 border border-[#dde8ff] dark:border-cyan-800/50">
                  Piloto São Luís - MA
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-[#0d1b35] dark:text-white tracking-tight leading-tight font-['Red_Hat_Display']">
                {getTabTitle()}
              </h1>
            </div>
          </div>

          {/* Status Asterisk & Local-First (Central/Direita) */}
          <div className="hidden xl:flex items-center gap-3 bg-[#f5f8ff] dark:bg-slate-950 px-3.5 py-1.5 rounded-xl border border-[#dde5f0] dark:border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold" title="PBX Asterisk puro em execução local na portaria">
              <span className="w-2 h-2 rounded-full bg-[#18c7a8] dark:bg-emerald-500 animate-pulse"></span>
              <span>Asterisk 20 PJSIP: Online</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-[#0a50ff] dark:text-cyan-400 font-semibold" title="Operação 100% autônoma em rede local sem dependência de nuvem externa">
              <Radio className="w-3.5 h-3.5" />
              <span>Local-First Ativo</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold" title="Sobrevivência de rede local: acionamento e interfonia ativos mesmo com link WAN/Internet offline">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
              <span>LAN 100% Resiliente</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium" title="Totem IP frontal de controle de acesso e interfonia">
              <Server className="w-3.5 h-3.5" />
              <span>XPE: 192.168.1.150</span>
            </div>
          </div>

          {/* Atalhos Rápidos da Barra Superior */}
          <div className="flex items-center gap-2">
            {/* Instalação PWA */}
            <PWAInstallButton />

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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#ff5c7a] dark:bg-rose-600 hover:bg-[#ff4264] dark:hover:bg-rose-500 text-white shadow-md shadow-rose-500/20 dark:shadow-rose-900/40 transition active:scale-95 cursor-pointer"
              title="Acionar Botão de Pânico (SOS)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">S.O.S</span>
            </button>

            {/* Simulador XPE Rápido */}
            <button
              onClick={onOpenXpeSimulator}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#f5f8ff] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-[#dde5f0] dark:border-slate-700 transition shadow-xs cursor-pointer"
              title="Testar Totem Intelbras XPE-3115-IP"
            >
              <Radio className="w-3.5 h-3.5 text-[#ffb21a] dark:text-amber-400" />
              <span>Totem XPE</span>
            </button>

            {/* Simulador QR Intercom Rápido */}
            <button
              onClick={onOpenQrSimulator}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#f5f8ff] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-[#dde5f0] dark:border-slate-700 transition shadow-xs cursor-pointer"
              title="Testar QR Virtual Intercom"
            >
              <QrCode className="w-3.5 h-3.5 text-[#0a50ff] dark:text-cyan-400" />
              <span>QR Intercom</span>
            </button>

            {/* WebPhone PWA */}
            <button
              onClick={onToggleWebPhone}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition shadow-md cursor-pointer ${
                activeCallCount > 0
                  ? 'bg-[#ff5c7a] dark:bg-rose-600 hover:bg-[#ff4264] dark:hover:bg-rose-500 text-white animate-bounce shadow-rose-500/30 dark:shadow-rose-900/40'
                  : 'bg-[#0a50ff] dark:bg-cyan-600 hover:bg-[#0842cc] dark:hover:bg-cyan-500 text-white shadow-blue-500/20 dark:shadow-cyan-500/20'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WebPhone</span>
              {activeCallCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-[#ff5c7a] dark:text-rose-600 rounded-full text-[10px] font-extrabold">
                  {activeCallCount}
                </span>
              )}
            </button>

            {/* Assistente MaIA com Gradiente Digify */}
            <button
              onClick={onOpenMaia}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0a50ff] to-[#55b0ff] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition cursor-pointer"
              title="Abrir Assistente MaIA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MaIA</span>
            </button>

            {/* Alternador de Tema Claro / Escuro */}
            <ThemeToggle />

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-[#f5f8ff] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-[#ff5c7a] dark:hover:text-rose-400 border border-[#dde5f0] dark:border-slate-700 transition shadow-xs cursor-pointer"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Central de Notificações Push */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="p-2 rounded-xl bg-[#f5f8ff] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-[#0a50ff] dark:hover:text-cyan-400 border border-[#dde5f0] dark:border-slate-700 transition shadow-xs cursor-pointer"
                title="Configurar Notificações Push"
                aria-label="Notificações Push"
              >
                <Bell className="w-4 h-4 text-[#0a50ff] dark:text-cyan-400" />
              </button>
            )}

            {/* Central de Ajuda & Manuais */}
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('ajuda')}
                className={`p-2 rounded-xl border transition shadow-xs cursor-pointer ${
                  currentTab === 'ajuda'
                    ? 'bg-[#0a50ff] text-white border-[#0a50ff] shadow-blue-500/30'
                    : 'bg-[#f5f8ff] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-[#0a50ff] dark:hover:text-cyan-400 border-[#dde5f0] dark:border-slate-700'
                }`}
                title="Central de Ajuda, Manuais e Deploy"
                aria-label="Ajuda e Manuais"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
