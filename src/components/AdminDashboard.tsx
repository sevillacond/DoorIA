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
      {/* Banner Síndico Digify CRM */}
      <div className="p-6 rounded-3xl bg-[#0d1b35] border border-[#1e2f50] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#0a50ff]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0a50ff]/20 text-[#55b0ff] border border-[#0a50ff]/40 uppercase tracking-wide">
              {session.role} • Condomínio Solar das Palmeiras
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#18c7a8]/20 text-[#18c7a8] border border-[#18c7a8]/40">
              Operação Normal
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight font-['Red_Hat_Display']">
            Painel Administrativo Central
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Gestão integrada de 12 Unidades, 4 Câmeras em tempo real, Totem XPE-3115-IP e auditoria criptográfica.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10 flex-wrap">
          <button
            onClick={handleTriggerPanic}
            disabled={panicLoading}
            className="px-4 py-2.5 rounded-xl bg-[#ff5c7a] hover:bg-[#ff4264] active:scale-95 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-rose-900/30 transition border border-rose-400/40 cursor-pointer"
            title="Protocolo de Pânico e Coação Silenciosa da Portaria"
          >
            <Siren className="w-4 h-4 text-white animate-pulse" />
            <span>{panicLoading ? 'Acionando...' : 'Pânico Portaria'}</span>
          </button>

          <button
            onClick={() => onSelectTab('engenharia')}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition cursor-pointer"
          >
            <Activity className="w-4 h-4 text-[#55b0ff]" />
            <span>Topologia LAN</span>
          </button>
        </div>
      </div>

      {/* KPIs Operacionais Digify CRM */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ebfbf8] text-[#18c7a8] flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
            <span>Acessos Hoje</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] mt-3 font-['Red_Hat_Display']">142</div>
          <div className="text-xs text-[#18c7a8] font-bold mt-1 flex items-center gap-1">
            <span>↑ +12%</span>
            <span className="text-[#5a6a85] font-normal">vs. ontem</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ebf2ff] text-[#0a50ff] flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <span>Atendimentos URA</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] mt-3 font-['Red_Hat_Display']">45</div>
          <div className="text-xs text-[#5a6a85] font-medium mt-1">
            <span className="text-rose-500 font-bold">{missedCalls}</span> perdidas no período
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#fff8eb] text-[#ffb21a] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span>Inadimplência</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] mt-3 font-['Red_Hat_Display']">{taxaInadimplencia.toFixed(1)}%</div>
          <div className="text-xs text-amber-700 font-medium mt-1">
            {unidadesInadimplentes} unidades em atraso
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ebfbf8] text-[#18c7a8] flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>Auditoria LGPD</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] mt-3 font-['Red_Hat_Display']">100%</div>
          <div className="text-xs text-[#18c7a8] font-bold mt-1">0 violações na LAN</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status das Unidades (Piloto 12) */}
        <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0d1b35] flex items-center gap-2 font-['Red_Hat_Display']">
              <Users className="w-4 h-4 text-[#0a50ff]" />
              <span>Status das Unidades (Piloto 12)</span>
            </h3>
            <span className="text-xs text-[#0a50ff] font-bold bg-[#ebf2ff] px-2 py-0.5 rounded-full border border-[#dde8ff]">
              12 cadastradas
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {units.map(unit => (
              <div 
                key={unit.id} 
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                  unit.hasDebts 
                    ? 'bg-[#fffaf0] border-amber-200 hover:bg-amber-50/80 shadow-xs' 
                    : 'bg-[#f8fafc] border-[#dde5f0] hover:bg-white hover:border-[#0a50ff]/40 shadow-xs'
                }`}
              >
                <div className="text-sm font-bold text-[#0d1b35]">Apto {unit.number}</div>
                <div className={`text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full ${
                  unit.hasDebts ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {unit.hasDebts ? 'PENDENTE' : 'REGULAR'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas Atividades na Portaria */}
        <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0d1b35] flex items-center gap-2 font-['Red_Hat_Display']">
              <BarChart3 className="w-4 h-4 text-[#0a50ff]" />
              <span>Monitoramento de Chamadas</span>
            </h3>
            <div className="flex gap-1 bg-[#f5f8ff] p-1 rounded-xl border border-[#dde5f0]">
               {['hoje', 'semana'].map(p => (
                 <button
                   key={p}
                   onClick={() => setFilterPeriod(p as any)}
                   className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition ${
                     filterPeriod === p ? 'bg-[#0a50ff] text-white shadow-xs' : 'text-[#5a6a85] hover:text-[#0d1b35]'
                   }`}
                 >
                   {p}
                 </button>
               ))}
            </div>
          </div>

          <div className="divide-y divide-[#dde5f0]">
            {callLogs.slice(0, 4).map(log => (
              <div key={log.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0d1b35] capitalize">{log.purpose} • Apto {log.unitNumber}</div>
                  <div className="text-[11px] text-[#5a6a85]">
                    {log.origin === 'xpe_3115_ip' ? 'Totem Físico' : 'QR Virtual'} • {new Date(log.startedAt).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    log.status === 'atendida' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {log.status}
                  </span>

                  {log.hasRecording && onOpenAuditModal && (
                    <button
                      onClick={() => onOpenAuditModal(log.recordingId || log.id)}
                      className="px-2.5 py-1 rounded-xl bg-[#ebf2ff] hover:bg-[#dde8ff] border border-[#dde8ff] text-[#0a50ff] text-xs font-bold flex items-center gap-1 transition"
                      title="Auditar Gravação e Transcrição Criptografada"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-[#0a50ff]" />
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
      <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0a50ff]" />
            <h3 className="text-sm font-extrabold text-[#0d1b35] font-['Red_Hat_Display']">Livro Digital de Ocorrências da Portaria</h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ebf2ff] text-[#0a50ff] border border-[#dde8ff]">
              Auditado & Imutável
            </span>
          </div>
          <button
            onClick={() => alert('Ocorrência registrada e vinculada ao log de auditoria SHA-256.')}
            className="px-3.5 py-1.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <span>+ Nova Ocorrência</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {auditLogs.slice(0, 3).map((log) => (
            <div key={log.id} className="p-4 rounded-xl bg-[#f8fafc] border border-[#dde5f0] space-y-2 flex flex-col justify-between hover:border-[#0a50ff]/30 transition">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1.5 ${
                    log.status === 'PERMITIDO' ? 'text-emerald-700' :
                    log.status === 'ALERTA' ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {log.status === 'PERMITIDO' && <Shield className="w-3.5 h-3.5 text-emerald-600" />}
                    {log.status === 'ALERTA' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                    {log.status === 'NEGADO' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                    {log.action}
                  </span>
                  <span className="text-[10px] text-[#5a6a85] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[#0d1b35] text-xs leading-relaxed">
                  {log.reason || 'Execução registrada.'}
                </p>
              </div>
              <div className="text-[10px] text-[#5a6a85] pt-2 border-t border-[#dde5f0] flex justify-between">
                <span>Alvo: <strong className="text-[#0d1b35]">{log.target}</strong></span>
                <span className="font-semibold">{log.actor}</span>
              </div>
            </div>
          ))}

          {auditLogs.length === 0 && (
            <div className="col-span-3 p-6 text-center text-[#5a6a85] font-medium text-xs border border-dashed border-[#dde5f0] rounded-xl">
              Nenhuma ocorrência registrada no período.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
