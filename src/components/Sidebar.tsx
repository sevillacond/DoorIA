import React, { useState } from 'react';
import {
  Users,
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
  BellRing,
} from 'lucide-react';
import type { UserSession, SystemStatus } from '../types.ts';

interface SidebarProps {
  currentTab: 'inicio' | 'portaria' | 'cameras' | 'financeiro' | 'engenharia' | 'dispositivos' | 'moradores';
  onSelectTab: (tab: 'inicio' | 'portaria' | 'cameras' | 'financeiro' | 'engenharia' | 'dispositivos' | 'moradores') => void;
  session: UserSession;
  systemStatus: SystemStatus | null;
  activeCallCount: number;
  onOpenXpeSimulator: () => void;
  onOpenQrSimulator: () => void;
  onToggleWebPhone: () => void;
  onOpenMaia: () => void;
  onOpenNotifications?: () => void;
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
  onOpenNotifications,
  onSwitchRole,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navItems: any[] = [
    {
      id: 'inicio',
      label: session.role === 'morador' ? 'Portal do Morador' : 'Painel Central',
      icon: Home,
      badge: null,
      section: 'principal',
    },
  ];

  if (session.role === 'morador') {
    navItems.push({
      id: 'financeiro',
      label: 'Boletos & Financeiro',
      icon: DollarSign,
      badge: null,
      section: 'gestao',
    });
  } else if (session.role === 'sindico') {
    navItems.push(
      {
        id: 'portaria',
        label: 'Portaria & Acessos',
        icon: DoorOpen,
        badge: null,
        section: 'seguranca',
      },
      {
        id: 'moradores',
        label: 'Gestão de Moradores',
        icon: Users,
        badge: null,
        section: 'gestao',
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
      }
    );
  } else if (session.role === 'super_admin' || session.role === 'admin_sistema') {
    navItems.push(
      {
        id: 'portaria',
        label: 'Portaria & Acessos',
        icon: DoorOpen,
        badge: null,
        section: 'seguranca',
      },
      {
        id: 'moradores',
        label: 'Gestão de Moradores',
        icon: Users,
        badge: null,
        section: 'gestao',
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
        id: 'dispositivos',
        label: 'Configurar Dispositivos',
        icon: Radio,
        badge: 'IoT',
        section: 'gestao',
      },
      {
        id: 'engenharia',
        label: 'Engenharia & Auditoria',
        icon: Server,
        badge: 'LAN OK',
        section: 'gestao',
      }
    );
  }

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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0d1b35] text-slate-200 border-r border-[#1e2f50] transition-all duration-300 ease-in-out shadow-2xl ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-72 sm:w-72'}`}
      >
        {/* Cabeçalho da Sidebar estilo Digify CRM */}
        <div className="p-4 border-b border-[#1e2f50] flex items-center justify-between min-h-[72px] bg-[#0a162c]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0a50ff] to-[#55b0ff] flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0 ring-2 ring-white/10">
              <ShieldCheck className="w-6 h-6" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col truncate leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white font-['Red_Hat_Display']">
                    Enlace<span className="text-[#55b0ff]">DoorIA</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#0a50ff]/20 text-[#55b0ff] border border-[#0a50ff]/40">
                    CRM
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#18c7a8] animate-pulse"></span>
                  Portaria Inteligente • LAN
                </span>
              </div>
            )}
          </div>

          {/* Botão de Fechar no Mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Botão de Recolher no Desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Card do Usuário Logado & Seletor de Sessão RBAC */}
        <div className="p-3 border-b border-[#1e2f50] bg-[#091325]">
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border border-[#223558] hover:border-[#354f7e] bg-[#0d1b35]/80 hover:bg-[#122244] transition text-left ${
                isCollapsed ? 'justify-center px-1' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-[#0a50ff]/20 border border-[#0a50ff]/40 text-[#55b0ff] flex items-center justify-center shrink-0 font-bold text-xs">
                <User className="w-4 h-4" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 truncate">
                  <div className="text-xs font-bold text-white truncate">{session.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="capitalize px-1.5 py-0.2 rounded-full bg-[#0a50ff]/25 text-[#7db5ff] font-semibold text-[10px]">
                      {session.role === 'morador' ? `Apto ${session.unitNumber}` : session.role}
                    </span>
                    <span className="text-[9px] text-slate-400">Alternar ▾</span>
                  </div>
                </div>
              )}
            </button>

            {/* Menu Suspenso de Troca de Papel */}
            {roleDropdownOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-[#091325] border border-[#23385e] rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 backdrop-blur-xl">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1e2f50]">
                  Alternar Papel (RBAC)
                </div>
                <button
                  onClick={() => {
                    onSwitchRole('morador', '101');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition ${
                    session.role === 'morador' && session.unitNumber === '101'
                      ? 'bg-[#0a50ff] text-white font-semibold'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>Morador Apto 101</span>
                  {session.unitNumber === '101' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </button>
                <button
                  onClick={() => {
                    onSwitchRole('morador', '203');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition ${
                    session.role === 'morador' && session.unitNumber === '203'
                      ? 'bg-[#0a50ff] text-white font-semibold'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>Morador Apto 203 (Débito)</span>
                  {session.unitNumber === '203' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </button>
                <button
                  onClick={() => {
                    onSwitchRole('sindico');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition ${
                    session.role === 'sindico'
                      ? 'bg-[#ffb21a] text-[#0d1b35] font-bold'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>Síndico Fernando Rocha</span>
                  {session.role === 'sindico' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0d1b35]" />}
                </button>
                <button
                  onClick={() => {
                    onSwitchRole('super_admin');
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition ${
                    session.role === 'super_admin'
                      ? 'bg-[#18c7a8] text-[#0d1b35] font-bold'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>Super Admin Engenharia</span>
                  {session.role === 'super_admin' && <CheckCircle2 className="w-3.5 h-3.5 text-[#0d1b35]" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">
          {/* SEÇÃO PRINCIPAL */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Módulos CRM
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#0a50ff] text-white shadow-lg shadow-[#0a50ff]/30 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-[#18c7a8]/20 text-[#18c7a8] border border-[#18c7a8]/40'
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
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Comunicação VoIP & PWA
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
                  ? 'bg-[#ff5c7a] hover:bg-[#ff4264] text-white border-[#ff5c7a] animate-bounce shadow-lg shadow-rose-900/40'
                  : 'bg-[#0a50ff]/15 hover:bg-[#0a50ff]/25 text-[#7db5ff] border-[#0a50ff]/30'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="WebPhone PWA (Ramal SIP Local)"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">WebPhone PWA</span>
                  {activeCallCount > 0 ? (
                    <span className="px-2 py-0.5 bg-white text-[#ff5c7a] rounded-full text-[10px] font-extrabold">
                      CHAMANDO
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0a50ff]/30 text-white">
                      PJSIP
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* SEÇÃO SIMULADORES DE HARDWARE */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Hardware & Dispositivos
              </div>
            )}

            {/* Simulador Totem XPE */}
            <button
              onClick={() => {
                onOpenXpeSimulator();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
              title="Totem Intelbras XPE-3115-IP (Calçada)"
            >
              <Radio className="w-4 h-4 text-[#ffb21a] shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left truncate">Totem XPE-3115-IP</span>}
            </button>

            {/* Simulador QR Intercom */}
            <button
              onClick={() => {
                onOpenQrSimulator();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
              title="QR Virtual Intercom (Smartphone Visitante)"
            >
              <QrCode className="w-4 h-4 text-[#55b0ff] shrink-0" />
              {!isCollapsed && <span className="flex-1 text-left truncate">QR Intercom Visitante</span>}
            </button>

            {/* Central de Notificações Push */}
            {onOpenNotifications && (
              <button
                onClick={() => {
                  onOpenNotifications();
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
                title="Configurar Notificações Push"
              >
                <BellRing className="w-4 h-4 text-[#18c7a8] shrink-0" />
                {!isCollapsed && <span className="flex-1 text-left truncate">Notificações Push</span>}
              </button>
            )}
          </div>
        </div>

        {/* Rodapé da Sidebar: Assistente MaIA estilo Digify CRM */}
        <div className="p-3 border-t border-[#1e2f50] bg-[#0a162c] space-y-2">
          {/* Card MaIA com Gradiente Digify */}
          <button
            onClick={onOpenMaia}
            className={`w-full flex items-center gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#0a50ff] to-[#55b0ff] text-white hover:opacity-95 transition shadow-lg shadow-[#0a50ff]/25 ${
              isCollapsed ? 'justify-center px-1' : ''
            }`}
            title="Abrir Assistente Operacional MaIA"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <Sparkles className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="text-left flex-1 truncate">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>MaIA IA Portaria</span>
                </div>
                <div className="text-[10px] text-white/80 font-medium">Gemini & Fallback LAN</div>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18c7a8]"></span>
                Asterisk 20 LTS Pure
              </span>
              <span className="text-[#55b0ff] font-bold">LAN 0ms</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
