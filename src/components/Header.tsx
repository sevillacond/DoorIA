import React from 'react';
import {
  ShieldCheck,
  PhoneCall,
  Server,
  Radio,
  User,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Building2,
  Lock,
} from 'lucide-react';
import type { UserSession, SystemStatus } from '../types.ts';

interface HeaderProps {
  session: UserSession;
  systemStatus: SystemStatus | null;
  onSwitchRole: (role: 'morador' | 'sindico' | 'super_admin', unitNumber?: string) => void;
  onOpenXpeSimulator: () => void;
  onOpenQrSimulator: () => void;
  onToggleWebPhone: () => void;
  activeCallCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  systemStatus,
  onSwitchRole,
  onOpenXpeSimulator,
  onOpenQrSimulator,
  onToggleWebPhone,
  activeCallCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Marca e Localização */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20 text-white font-bold tracking-wider">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Enlace<span className="text-cyan-400">-DoorIA</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Piloto São Luís - MA
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Condomínio Solar das Palmeiras (12 Unidades)</span>
              </div>
            </div>
          </div>

          {/* Status Asterisk & Local-First */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium font-mono">Asterisk 20 PJSIP: Online</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Radio className="w-3.5 h-3.5" />
              <span>Local-First Ativo</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-amber-300">
              <Server className="w-3.5 h-3.5" />
              <span>XPE-3115-IP: LAN</span>
            </div>
          </div>

          {/* Ações de Simulação & WebPhone */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Simulador Totem XPE */}
            <button
              id="btn-open-xpe-sim"
              onClick={onOpenXpeSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
              title="Simular botão físico do Interfone Intelbras XPE-3115-IP na calçada"
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Totem</span> XPE
            </button>

            {/* Simulador QR Intercom */}
            <button
              id="btn-open-qr-sim"
              onClick={onOpenQrSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
              title="Simular leitura de QR Code Virtual Intercom por visitante"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">QR</span> Intercom
            </button>

            {/* Botão WebPhone com indicador de chamada */}
            <button
              id="btn-toggle-webphone"
              onClick={onToggleWebPhone}
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition shadow-md ${
                activeCallCount > 0
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-bounce'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>WebPhone</span>
              {activeCallCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white text-red-600 rounded-full text-[10px] font-bold">
                  {activeCallCount}
                </span>
              )}
            </button>

            {/* Seletor de Sessão RBAC */}
            <div className="flex items-center pl-2 border-l border-slate-800">
              <div className="relative group">
                <button
                  id="btn-user-role-selector"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <div className="text-left hidden sm:block leading-tight">
                    <div className="font-semibold truncate max-w-[110px]">{session.name.split(' ')[0]}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                      {session.role === 'morador' ? `Apto ${session.unitNumber}` : session.role}
                    </div>
                  </div>
                </button>

                {/* Dropdown de Alternância de Papel para Testes */}
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 hidden group-hover:block z-50">
                  <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                    Alternar Perfil (RBAC Test)
                  </div>
                  <button
                    onClick={() => onSwitchRole('morador', '101')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      session.role === 'morador' && session.unitNumber === '101'
                        ? 'bg-cyan-950 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Morador Apto 101 (Em dia)</span>
                    {session.unitNumber === '101' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onSwitchRole('morador', '203')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      session.role === 'morador' && session.unitNumber === '203'
                        ? 'bg-cyan-950 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Morador Apto 203 (Inadimplente)</span>
                    {session.unitNumber === '203' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onSwitchRole('sindico')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      session.role === 'sindico' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Fernando Rocha (Síndico)</span>
                    {session.role === 'sindico' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onSwitchRole('super_admin')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      session.role === 'super_admin' ? 'bg-cyan-950 text-cyan-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>Engenheiro / Super Admin</span>
                    {session.role === 'super_admin' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
