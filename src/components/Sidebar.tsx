import React, { useState } from 'react';
import {
  Home,
  PhoneCall,
  Camera,
  DollarSign,
  Server,
  Sparkles,
  ShieldCheck,
  Radio,
  QrCode,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Building2,
  Lock,
  Unlock,
  Activity,
  CheckCircle2,
  FileText,
  DoorOpen,
} from 'lucide-react';
import type { UserSession, SystemStatus } from '../types.ts';

interface SidebarProps {
  currentTab: 'inicio' | 'cameras' | 'financeiro' | 'engenharia';
  onSelectTab: (tab: 'inicio' | 'cameras' | 'financeiro' | 'engenharia') => void;
  session: UserSession;
  systemStatus: SystemStatus | null;
  activeCallCount: number;
  onOpenXpeSimulator: () => void;
  onOpenQrSimulator: () => void;
  onToggleWebPhone: () => void;
  onOpenMaia: () => void;
  onSwitchRole: (role: 'morador' | 'sindico' | 'super_admin', unitNumber?: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  session,
  systemStatus,
  activeCallCount,
  onOpenXpeSimulator,
  onOpenQrSimulator,
  onToggleWebPhone,
  onOpenMaia,
  onSwitchRole,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navItems = [
    {
      id: 'inicio',
      label: session.role === 'morador' ? 'Portal do Morador' : 'Painel Central',
      icon: Home,
      badge: null,
      section: 'principal',
    },
    {
      id: 'cameras',
      label: 'Câmeras IP ONVIF',
      icon: Camera,
      badge: '4 ao vivo',
      section: 'seguranca',
    },
    {
      id: 'financeiro',
      label: 'Boletos & Financeiro',
      icon: DollarSign,
      badge: null,
      section: 'gestao',
    },
    {
      id: 'engenharia',
      label: 'Engenharia & Auditoria',
      icon: Server,
      badge: 'LAN OK',
      section: 'gestao',
    },
  ];

  return (
    <>
      {/* Backdrop para Mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-72 sm:w-72'}`}
      >
        {/* Cabeçalho da Sidebar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between min-h-[70px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col truncate leading-tight">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Enlace<span className="text-cyan-400">-DoorIA</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-300 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  São Luís • Piloto 12 Unid.
                </span>
              </div>
            )}
          </div>

          {/* Botão de Fechar no Mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Botão de Recolher no Desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Card do Usuário Logado & Seletor de Sessão RBAC */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/90 transition text-left ${
                isCollapsed ? 'justify-center px-1' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 truncate">
                  <div className="text-xs font-bold text-white truncate">{session.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                    <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-semibold">
                      {session.role === 'morador' ? `Apto ${session.unitNumber}` : session.role}
                    </span>
                    <span className="text-[9px] text-slate-500">Trocar ▾</span>
                  </div>
                </div>
              )}
            </button>

            {/* Menu Suspenso de Troca de Papel */}
            {roleDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                  Alternar Papel (RBAC)
                </div>
                <button
                  onClick={() => {
                    onSwitchRole('morador', '101');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    session.role === 'morador' && session.unitNumber === '101'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Morador Apto 101</span>
                  {session.unitNumber === '101' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={() => {
                    onSwitchRole('morador', '203');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    session.role === 'morador' && session.unitNumber === '203'
                      ? 'bg-cyan-950 text-cyan-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Morador Apto 203 (Débito)</span>
                  {session.unitNumber === '203' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={() => {
                    onSwitchRole('sindico');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    session.role === 'sindico'
                      ? 'bg-amber-950 text-amber-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Síndico Fernando Rocha</span>
                  {session.role === 'sindico' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <button
                  onClick={() => {
                    onSwitchRole('super_admin');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                    session.role === 'super_admin'
                      ? 'bg-purple-950 text-purple-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Super Admin Engenharia</span>
                  {session.role === 'super_admin' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {/* SEÇÃO PRINCIPAL */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Navegação
              </div>
            )}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id as any);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-800 text-cyan-400 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* SEÇÃO TELEFONIA & COMUNICAÇÃO */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Telefonia & Portaria
              </div>
            )}

            {/* Ação WebPhone PWA */}
            <button
              onClick={() => {
                onToggleWebPhone();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition border ${
                activeCallCount > 0
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-500 animate-bounce'
                  : 'bg-slate-800/70 hover:bg-slate-800 text-cyan-300 border-cyan-800/40 hover:border-cyan-700'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="WebPhone PWA (Ramal SIP Local)"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">WebPhone PWA</span>
                  {activeCallCount > 0 ? (
                    <span className="px-1.5 py-0.2 bg-white text-red-600 rounded-full text-[10px] font-extrabold">
                      CHAMANDO
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">PJSIP</span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* SEÇÃO SIMULADORES DE HARDWARE */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Simuladores Físicos
              </div>
            )}

            {/* Simulador Totem XPE */}
            <button
              onClick={() => {
                onOpenXpeSimulator();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
              title="Totem Intelbras XPE-3115-IP (Calçada)"
            >
              <Radio className="w-4 h-4 text-amber-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left truncate">Totem XPE-3115-IP</span>}
            </button>

            {/* Simulador QR Intercom */}
            <button
              onClick={() => {
                onOpenQrSimulator();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
              title="QR Virtual Intercom (Smartphone Visitante)"
            >
              <QrCode className="w-4 h-4 text-cyan-400 shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left truncate">QR Intercom Smartphone</span>}
            </button>
          </div>
        </div>

        {/* Rodapé da Sidebar: Assistente MaIA & Status Local-First */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
          {/* Card MaIA */}
          <button
            onClick={onOpenMaia}
            className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-800/60 hover:border-cyan-600 transition shadow-md ${
              isCollapsed ? 'justify-center px-1' : ''
            }`}
            title="Abrir Assistente Operacional MaIA"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            {!isCollapsed && (
              <div className="text-left flex-1 truncate">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>MaIA AI Gateway</span>
                </div>
                <div className="text-[10px] text-cyan-300 font-mono">Gemini / Fallback LAN</div>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <div className="px-2 pt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Asterisk 20 LTS Pure
              </span>
              <span>v1.0 Local</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
