import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  Building2,
  Sliders,
  ChevronRight,
  MapPin,
  BadgeCheck,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { UserSession, Unit, Gate, CallLog, FinancialSummary, SystemStatus, AuditLogEntry, Reservation } from '../types.ts';

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

  // Reservas pendentes e próximas para o Síndico
  const [allReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem('enlace_reservations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const pendingReservations = allReservations.filter(r => r.status === 'pendente');
  const upcomingReservations = allReservations.filter(r => r.status === 'aprovada' && r.date >= new Date().toISOString().split('T')[0]);

  // Cálculos rápidos para o Síndico
  const activeCalls = callLogs.filter(c => (c.status as string) === 'chamando' || (c.status as string) === 'em_atendimento').length;
  const missedCalls = callLogs.filter(c => c.status === 'nao_atendida' || c.status === 'recusada').length;
  
  const unidadesInadimplentes = units.filter(u => u.financialStatus === 'inadimplente').length;
  const taxaInadimplencia = units.length > 0 ? (unidadesInadimplentes / units.length) * 100 : 0;

  const accessData = [
    { name: 'Seg', pedestres: 45, veiculos: 22 },
    { name: 'Ter', pedestres: 52, veiculos: 28 },
    { name: 'Qua', pedestres: 48, veiculos: 25 },
    { name: 'Qui', pedestres: 61, veiculos: 32 },
    { name: 'Sex', pedestres: 75, veiculos: 40 },
    { name: 'Sáb', pedestres: 85, veiculos: 48 },
    { name: 'Dom', pedestres: 68, veiculos: 35 },
  ];

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
      <div className="p-6 rounded-3xl bg-[#0d1b35] dark:bg-slate-900 border border-[#1e2f50] dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#0a50ff]/20 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0a50ff]/20 dark:bg-cyan-950/40 text-[#55b0ff] dark:text-cyan-400 border border-[#0a50ff]/40 dark:border-cyan-800/50 uppercase tracking-wide">
              {session.role} • Condomínio Solar das Palmeiras
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#18c7a8]/20 dark:bg-emerald-950/40 text-[#18c7a8] dark:text-emerald-400 border border-[#18c7a8]/40 dark:border-emerald-800/50">
              Operação Normal
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight font-['Red_Hat_Display']">
            Painel Administrativo Central
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-400 max-w-xl">
            Gestão integrada de 12 Unidades, 4 Câmeras em tempo real, Totem XPE-3115-IP e auditoria criptográfica.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10 flex-wrap">
          <button
            onClick={() => onSelectTab('condominio')}
            className="px-4 py-2.5 rounded-xl bg-[#0a50ff] dark:bg-cyan-600 hover:bg-[#0842cc] dark:hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 border border-[#55b0ff]/30 dark:border-cyan-500/30 shadow-md shadow-blue-900/30 dark:shadow-cyan-900/30 transition cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-white" />
            <span>Dados do Condomínio</span>
          </button>

          <button
            onClick={handleTriggerPanic}
            disabled={panicLoading}
            className="px-4 py-2.5 rounded-xl bg-[#ff5c7a] dark:bg-rose-600 hover:bg-[#ff4264] dark:hover:bg-rose-500 active:scale-95 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-rose-900/30 dark:shadow-rose-900/30 transition border border-rose-400/40 dark:border-rose-500/40 cursor-pointer"
            title="Protocolo de Pânico e Coação Silenciosa da Portaria"
          >
            <Siren className="w-4 h-4 text-white animate-pulse" />
            <span>{panicLoading ? 'Acionando...' : 'Pânico Portaria'}</span>
          </button>

          <button
            onClick={() => onSelectTab('engenharia')}
            className="px-4 py-2.5 rounded-xl bg-white/10 dark:bg-slate-800 hover:bg-white/15 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-white/20 dark:border-slate-700 transition cursor-pointer"
          >
            <Activity className="w-4 h-4 text-[#55b0ff] dark:text-cyan-400" />
            <span>Topologia LAN</span>
          </button>
        </div>
      </div>

      {/* Alerta de Reservas Pendentes para o Síndico */}
      {pendingReservations.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <span>{pendingReservations.length} solicitação(ões) de reserva de área comum aguardando aprovação!</span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200">
                  Ação Necessária
                </span>
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Unidade(s): {pendingReservations.map(r => `Apto ${r.unitNumber}`).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('reservas')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
          >
            Analisar Reservas
          </button>
        </div>
      )}

      {/* KPIs Operacionais Digify CRM */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ebfbf8] dark:bg-emerald-950/40 text-[#18c7a8] dark:text-emerald-400 flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
            <span>Acessos Hoje</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] dark:text-white mt-3 font-['Red_Hat_Display']">142</div>
          <div className="text-xs text-[#18c7a8] dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <span>↑ +12%</span>
            <span className="text-[#5a6a85] dark:text-slate-400 font-normal">vs. ontem</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ebf2ff] dark:bg-cyan-950/40 text-[#0a50ff] dark:text-cyan-400 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <span>Atendimentos URA</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] dark:text-white mt-3 font-['Red_Hat_Display']">45</div>
          <div className="text-xs text-[#5a6a85] dark:text-slate-400 font-medium mt-1">
            <span className="text-rose-500 dark:text-rose-400 font-bold">{missedCalls}</span> perdidas no período
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#fff8eb] dark:bg-amber-950/40 text-[#ffb21a] dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span>Inadimplência</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] dark:text-white mt-3 font-['Red_Hat_Display']">{taxaInadimplencia.toFixed(1)}%</div>
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
            {unidadesInadimplentes} unidades em atraso
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition">
          <div className="text-xs text-[#5a6a85] dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#ebfbf8] dark:bg-emerald-950/40 text-[#18c7a8] dark:text-emerald-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>Auditoria LGPD</span>
          </div>
          <div className="text-3xl font-extrabold text-[#0d1b35] dark:text-white mt-3 font-['Red_Hat_Display']">100%</div>
          <div className="text-xs text-[#18c7a8] dark:text-emerald-400 font-bold mt-1">0 violações na LAN</div>
        </div>
      </div>

      {/* Fluxo de Acesso Semanal - Gráfico Recharts */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
            <Activity className="w-4 h-4 text-[#0a50ff] dark:text-cyan-400" />
            <span>Fluxo de Acessos (Últimos 7 Dias)</span>
          </h3>
          <span className="text-xs text-[#5a6a85] dark:text-slate-400 font-bold bg-[#f5f8ff] dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-[#dde5f0] dark:border-slate-800">
            Visão Geral
          </span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={accessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPedestres" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0a50ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0a50ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVeiculos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18c7a8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#18c7a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde5f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5a6a85' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5a6a85' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #dde5f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                labelStyle={{ fontWeight: 'bold', color: '#0d1b35', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="pedestres" name="Pedestres" stroke="#0a50ff" strokeWidth={2} fillOpacity={1} fill="url(#colorPedestres)" />
              <Area type="monotone" dataKey="veiculos" name="Veículos" stroke="#18c7a8" strokeWidth={2} fillOpacity={1} fill="url(#colorVeiculos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status das Unidades (Piloto 12) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
              <Users className="w-4 h-4 text-[#0a50ff] dark:text-cyan-400" />
              <span>Status das Unidades (Piloto 12)</span>
            </h3>
            <span className="text-xs text-[#0a50ff] dark:text-cyan-400 font-bold bg-[#ebf2ff] dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-[#dde8ff] dark:border-cyan-800/50">
              12 cadastradas
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {units.map(unit => {
              const isPendente = unit.financialStatus === 'inadimplente';
              return (
                <div 
                  key={unit.id} 
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition ${
                    isPendente 
                      ? 'bg-[#fffaf0] dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 hover:bg-amber-50/80 dark:hover:bg-amber-900/60 shadow-xs' 
                      : 'bg-[#f8fafc] dark:bg-slate-950 border-[#dde5f0] dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 hover:border-[#0a50ff]/40 dark:hover:border-cyan-500/40 shadow-xs'
                  }`}
                >
                  <div className="text-sm font-bold text-[#0d1b35] dark:text-white">Apto {unit.number}</div>
                  <div className={`text-[10px] font-bold mt-1.5 px-2 py-0.5 rounded-full ${
                    isPendente ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {isPendente ? 'PENDENTE' : 'REGULAR'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimas Atividades na Portaria */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
              <BarChart3 className="w-4 h-4 text-[#0a50ff] dark:text-cyan-400" />
              <span>Monitoramento de Chamadas</span>
            </h3>
            <div className="flex gap-1 bg-[#f5f8ff] dark:bg-slate-950 p-1 rounded-xl border border-[#dde5f0] dark:border-slate-800">
               {['hoje', 'semana'].map(p => (
                 <button
                   key={p}
                   onClick={() => setFilterPeriod(p as any)}
                   className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                     filterPeriod === p ? 'bg-[#0a50ff] dark:bg-cyan-600 text-white shadow-xs' : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white'
                   }`}
                 >
                   {p}
                 </button>
               ))}
            </div>
          </div>

          <div className="divide-y divide-[#dde5f0] dark:divide-slate-800">
            {callLogs.slice(0, 4).map(log => (
              <div key={log.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0d1b35] dark:text-white capitalize">{log.purpose} • Apto {log.unitNumber}</div>
                  <div className="text-[11px] text-[#5a6a85] dark:text-slate-400">
                    {log.origin === 'xpe_3115_ip' ? 'Totem Físico' : 'QR Virtual'} • {new Date(log.startedAt).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    log.status === 'atendida' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {log.status}
                  </span>

                  {log.hasRecording && onOpenAuditModal && (
                    <button
                      onClick={() => onOpenAuditModal(log.recordingId || log.id)}
                      className="px-2.5 py-1 rounded-xl bg-[#ebf2ff] dark:bg-cyan-950/40 hover:bg-[#dde8ff] dark:hover:bg-cyan-900/40 border border-[#dde8ff] dark:border-cyan-800/50 text-[#0a50ff] dark:text-cyan-400 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Auditar Gravação e Transcrição Criptografada"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-[#0a50ff] dark:text-cyan-400" />
                      <span>Auditar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo Cadastral & Governança do Condomínio */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ebf2ff] dark:bg-cyan-950/40 text-[#0a50ff] dark:text-cyan-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display'] flex items-center gap-2">
                Condomínio Residencial Solar das Palmeiras
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
                  Ativo & Regularizado
                </span>
              </h3>
              <p className="text-xs text-[#5a6a85] dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-[#5a6a85] dark:text-slate-500" />
                Av. dos Holandeses, 1500 - Calhau, São Luís - MA • CNPJ: 34.891.022/0001-85
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectTab('condominio')}
            className="px-3.5 py-1.5 rounded-xl bg-[#ebf2ff] dark:bg-cyan-950/40 hover:bg-[#dde8ff] dark:hover:bg-cyan-900/40 text-[#0a50ff] dark:text-cyan-400 text-xs font-bold transition flex items-center gap-1.5 border border-[#dde8ff] dark:border-cyan-800/50 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editar Configurações</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#5a6a85] dark:text-slate-400 tracking-wider">Síndico Responsável</span>
            <p className="text-xs font-bold text-[#0d1b35] dark:text-white">Henrique V. Alencar</p>
            <p className="text-[11px] text-[#5a6a85] dark:text-slate-500">Apto 304 • Mandato até 15/12/2027</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#5a6a85] dark:text-slate-400 tracking-wider">Administradora</span>
            <p className="text-xs font-bold text-[#0d1b35] dark:text-white">Enlace Gestão Condominial</p>
            <p className="text-[11px] text-[#5a6a85] dark:text-slate-500">contato@enlacegestao.com.br</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#5a6a85] dark:text-slate-400 tracking-wider">Cota & Vencimento</span>
            <p className="text-xs font-bold text-[#0d1b35] dark:text-white">R$ 480,00 / mês</p>
            <p className="text-[11px] text-[#5a6a85] dark:text-slate-500">Vencimento dia 10 • Banco Inter</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#5a6a85] dark:text-slate-400 tracking-wider">Telefonia & Portaria</span>
            <p className="text-xs font-bold text-[#0d1b35] dark:text-white">Asterisk 20.8 (Local-First)</p>
            <p className="text-[11px] text-[#5a6a85] dark:text-slate-500">Pedestre DTMF *07 • Veicular *08</p>
          </div>
        </div>
      </div>

      {/* Livro Digital de Ocorrências da Portaria (Auditado) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs hover:shadow-md transition space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0a50ff] dark:text-cyan-400" />
            <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">Livro Digital de Ocorrências da Portaria</h3>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ebf2ff] dark:bg-cyan-950/40 text-[#0a50ff] dark:text-cyan-400 border border-[#dde8ff] dark:border-cyan-800/50">
              Auditado & Imutável
            </span>
          </div>
          <button
            onClick={() => alert('Ocorrência registrada e vinculada ao log de auditoria SHA-256.')}
            className="px-3.5 py-1.5 rounded-xl bg-[#0a50ff] dark:bg-cyan-600 hover:bg-[#0842cc] dark:hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 dark:shadow-cyan-500/20 cursor-pointer"
          >
            <span>+ Nova Ocorrência</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {auditLogs.slice(0, 3).map((log) => (
            <div key={log.id} className="p-4 rounded-xl bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 space-y-2 flex flex-col justify-between hover:border-[#0a50ff]/30 dark:hover:border-cyan-500/30 transition">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1.5 ${
                    log.status === 'PERMITIDO' ? 'text-emerald-700 dark:text-emerald-400' :
                    log.status === 'ALERTA' ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {log.status === 'PERMITIDO' && <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />}
                    {log.status === 'ALERTA' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />}
                    {log.status === 'NEGADO' && <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-500" />}
                    {log.action}
                  </span>
                  <span className="text-[10px] text-[#5a6a85] dark:text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[#0d1b35] dark:text-slate-300 text-xs leading-relaxed">
                  {log.reason || 'Execução registrada.'}
                </p>
              </div>
              <div className="text-[10px] text-[#5a6a85] dark:text-slate-400 pt-2 border-t border-[#dde5f0] dark:border-slate-800 flex justify-between">
                <span>Alvo: <strong className="text-[#0d1b35] dark:text-white">{log.target}</strong></span>
                <span className="font-semibold">{log.actor}</span>
              </div>
            </div>
          ))}

          {auditLogs.length === 0 && (
            <div className="col-span-3 p-6 text-center text-[#5a6a85] dark:text-slate-400 font-medium text-xs border border-dashed border-[#dde5f0] dark:border-slate-800 rounded-xl">
              Nenhuma ocorrência registrada no período.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
