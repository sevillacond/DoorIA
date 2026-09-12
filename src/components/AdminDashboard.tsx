import React, { useState } from 'react';
import {
  Users,
  Activity,
  AlertTriangle,
  FileText,
  ShieldAlert,
  Car,
  Bell,
  BarChart3,
  CalendarDays,
  DoorOpen,
  PhoneCall
} from 'lucide-react';
import type { UserSession, Unit, Gate, CallLog, FinancialSummary, SystemStatus } from '../types.ts';

interface AdminDashboardProps {
  session: UserSession;
  units: Unit[];
  gates: Gate[];
  callLogs: CallLog[];
  financialSummary: FinancialSummary | null;
  systemStatus: SystemStatus | null;
  onSelectTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  units,
  gates,
  callLogs,
  financialSummary,
  systemStatus,
  onSelectTab,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje');

  // Cálculos rápidos para o Síndico
  const activeCalls = callLogs.filter(c => c.status === 'chamando' || c.status === 'em_atendimento').length;
  const missedCalls = callLogs.filter(c => c.status === 'perdida').length;
  
  const unidadesInadimplentes = units.filter(u => u.hasDebts).length;
  const taxaInadimplencia = units.length > 0 ? (unidadesInadimplentes / units.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Banner Síndico */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-900/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 font-bold uppercase">
              {session.role} • Condomínio Solar das Palmeiras
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
            Painel Administrativo Central
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitoramento de 12 Unidades, 4 Câmeras e Portões em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('engenharia')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Topologia LAN</span>
          </button>
        </div>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <DoorOpen className="w-4 h-4 text-emerald-400" />
            Acessos Hoje
          </div>
          <div className="text-2xl font-bold text-white mt-1">142</div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">+12% vs. ontem</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 text-cyan-400" />
            Atendimentos URA
          </div>
          <div className="text-2xl font-bold text-white mt-1">45</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{missedCalls} perdidas no período</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Inadimplência
          </div>
          <div className="text-2xl font-bold text-white mt-1">{taxaInadimplencia.toFixed(1)}%</div>
          <div className="text-[10px] text-amber-400 font-mono mt-0.5">{unidadesInadimplentes} unidades em atraso</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Ocorrências LGPD
          </div>
          <div className="text-2xl font-bold text-white mt-1">0</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Nenhuma violação na LAN</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status das Unidades (Piloto 12) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Status das Unidades (Piloto 12)</span>
            </h3>
            <button className="text-xs text-cyan-400 hover:underline">Ver Todas</button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {units.map(unit => (
              <div 
                key={unit.id} 
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                  unit.hasDebts 
                    ? 'bg-amber-950/20 border-amber-900/50 hover:bg-amber-950/40' 
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div className="text-sm font-bold text-white">Apto {unit.number}</div>
                <div className={`text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded ${
                  unit.hasDebts ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                }`}>
                  {unit.hasDebts ? 'PENDENTE' : 'REGULAR'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas Atividades na Portaria */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Monitoramento de Portaria</span>
            </h3>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg">
               {['hoje', 'semana'].map(p => (
                 <button
                   key={p}
                   onClick={() => setFilterPeriod(p as any)}
                   className={`px-2 py-1 rounded text-[10px] font-bold capitalize ${
                     filterPeriod === p ? 'bg-slate-800 text-white' : 'text-slate-500'
                   }`}
                 >
                   {p}
                 </button>
               ))}
            </div>
          </div>

          <div className="divide-y divide-slate-800/60">
            {callLogs.slice(0, 4).map(log => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white capitalize">{log.purpose} • Apto {log.unitNumber}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {log.origin === 'xpe_3115_ip' ? 'Totem Físico' : 'QR Virtual'} • {new Date(log.startedAt).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    log.status === 'atendida' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
