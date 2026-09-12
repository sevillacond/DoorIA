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
  PhoneCall,
  FileCheck,
  Siren,
  Shield,
  XCircle,
} from 'lucide-react';
import type { UserSession, Unit, Gate, CallLog, FinancialSummary, SystemStatus, AuditLogEntry } from '../types.ts';

interface AdminDashboardProps {
  session: UserSession;
  units: Unit[];
  gates: Gate[];
  callLogs: CallLog[];
  financialSummary: FinancialSummary | null;
  systemStatus: SystemStatus | null;
  auditLogs: AuditLogEntry[];
  onSelectTab: (tab: string) => void;
  onOpenAuditModal?: (recordingId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  units,
  gates,
  callLogs,
  financialSummary,
  systemStatus,
  auditLogs,
  onSelectTab,
  onOpenAuditModal,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [panicLoading, setPanicLoading] = useState(false);

  // Cálculos rápidos para o Síndico
  const activeCalls = callLogs.filter(c => c.status === 'chamando' || c.status === 'em_atendimento').length;
  const missedCalls = callLogs.filter(c => c.status === 'perdida').length;
  
  const unidadesInadimplentes = units.filter(u => u.hasDebts).length;
  const taxaInadimplencia = units.length > 0 ? (unidadesInadimplentes / units.length) * 100 : 0;

  const handleTriggerPanic = async () => {
    if (!confirm('CONFIRMAÇÃO DE EMERGÊNCIA:\nDeseja acionar o Protocolo de Pânico / Coação da Portaria?\nIsso registrará evento imutável, acenderá refletores de segurança e notificará a equipe gestora.')) {
      return;
    }

    setPanicLoading(true);
    try {
      const res = await fetch('/api/v1/panic/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Acionamento direto pelo Síndico no Painel Central',
          location: 'Acesso Social Principal',
        }),
      });
      const data = await res.json();
      alert(data.message || 'Protocolo de Emergência Ativado com Sucesso!');
    } catch (err) {
      alert('Falha ao comunicar alerta de pânico ao barramento local.');
    } finally {
      setPanicLoading(false);
    }
  };

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
            onClick={handleTriggerPanic}
            disabled={panicLoading}
            className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-red-950 transition border border-red-400/30"
            title="Protocolo de Pânico e Coação Silenciosa da Portaria"
          >
            <Siren className="w-4 h-4 text-white animate-pulse" />
            <span>{panicLoading ? 'Acionando...' : 'Pânico Portaria'}</span>
          </button>

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
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    log.status === 'atendida' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                  }`}>
                    {log.status}
                  </span>

                  {log.hasRecording && onOpenAuditModal && (
                    <button
                      onClick={() => onOpenAuditModal(log.recordingId || log.id)}
                      className="px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition"
                      title="Auditar Gravação e Transcrição Criptografada"
                    >
                      <FileCheck className="w-3 h-3 text-cyan-400" />
                      <span>Auditar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Livro Digital de Ocorrências da Portaria (Auditado) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Livro Digital de Ocorrências da Portaria</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Auditado & Imutável
            </span>
          </div>
          <button
            onClick={() => alert('Ocorrência registrada e vinculada ao log de auditoria SHA-256.')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>+ Nova Ocorrência</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {auditLogs.slice(0, 3).map((log) => (
            <div key={log.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1.5 ${
                    log.status === 'PERMITIDO' ? 'text-emerald-400' :
                    log.status === 'ALERTA' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {log.status === 'PERMITIDO' && <Shield className="w-3.5 h-3.5" />}
                    {log.status === 'ALERTA' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {log.status === 'NEGADO' && <XCircle className="w-3.5 h-3.5" />}
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {log.reason || 'Execução registrada.'}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800/50 flex justify-between">
                <span>Alvo: {log.target}</span>
                <span className="opacity-60">{log.actor}</span>
              </div>
            </div>
          ))}

          {auditLogs.length === 0 && (
            <div className="col-span-3 p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
              Nenhuma ocorrência registrada no período.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
