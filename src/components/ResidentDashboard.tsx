import React, { useState } from 'react';
import {
  Home,
  Package,
  QrCode,
  Car,
  History,
  PhoneCall,
  Lock,
  Unlock,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Share2,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import type {
  UserSession,
  Gate,
  PackageDelivery,
  VisitorInvite,
  Vehicle,
  CallLog,
} from '../types.ts';

interface ResidentDashboardProps {
  session: UserSession;
  gates: Gate[];
  packages: PackageDelivery[];
  visitorInvites: VisitorInvite[];
  vehicles: Vehicle[];
  callLogs: CallLog[];
  onOpenWebPhone: () => void;
  onCreateVisitorInvite: (name: string, type: 'visitante' | 'entrega' | 'prestador') => void;
  onSelectTab: (tab: string) => void;
}

export const ResidentDashboard: React.FC<ResidentDashboardProps> = ({
  session,
  gates,
  packages,
  visitorInvites,
  vehicles,
  callLogs,
  onOpenWebPhone,
  onCreateVisitorInvite,
  onSelectTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'encomendas' | 'visitantes' | 'veiculos' | 'historico'>('geral');
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorType, setNewVisitorType] = useState<'visitante' | 'entrega' | 'prestador'>('visitante');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const pendingPackages = packages.filter((p) => p.status === 'aguardando_retirada');

  const handleCreateInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitorName.trim()) return;
    onCreateVisitorInvite(newVisitorName, newVisitorType);
    setNewVisitorName('');
    setInviteModalOpen(false);
  };

  const copyQrToken = (token: string) => {
    navigator.clipboard.writeText(`https://door.solar.lan/invite/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas & Status da Unidade */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              UNIDADE {session.unitNumber || '101'}
            </span>
            <span className="text-xs text-slate-400 font-medium">Bloco A • 1º Andar</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
            Olá, {session.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Portaria autônoma operando 100% local no Solar das Palmeiras.
          </p>
        </div>

        {/* Atalho WebPhone em destaque */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenWebPhone}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/30 transition active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Abrir WebPhone Ramal {session.unitNumber}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navegação do Morador */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'geral', label: 'Visão Geral', count: null },
          { id: 'encomendas', label: 'Encomendas', count: pendingPackages.length },
          { id: 'visitantes', label: 'Convites QR', count: visitorInvites.length },
          { id: 'veiculos', label: 'Veículos', count: vehicles.length },
          { id: 'historico', label: 'Histórico de Atendimentos', count: callLogs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeSubTab === tab.id
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeSubTab === tab.id ? 'bg-white text-cyan-900' : 'bg-slate-800 text-cyan-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DA SUB-ABA */}
      {activeSubTab === 'geral' && (
        <div className="space-y-6">
          {/* Status dos Portões e Sensores */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Status dos Portões de Acesso (Sensores de Posição)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gates.map((gate) => (
                <div
                  key={gate.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        gate.status === 'aberto'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {gate.status === 'aberto' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{gate.name}</h4>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="font-mono text-cyan-400">{gate.dtmfCode}</span>
                        <span>• Relé {gate.relayPin}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        gate.status === 'aberto'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {gate.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Encomendas Aguardando Retirada */}
          {pendingPackages.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-cyan-800/50 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Package className="w-4 h-4" />
                  <span>Você tem {pendingPackages.length} encomenda(s) aguardando retirada!</span>
                </div>
                <button
                  onClick={() => setActiveSubTab('encomendas')}
                  className="text-xs text-cyan-300 hover:underline"
                >
                  Ver Detalhes
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{pkg.courier}</div>
                      <div className="text-[11px] text-slate-400">{pkg.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">PIN de Retirada</div>
                      <div className="text-base font-mono font-bold text-cyan-400 tracking-wider">
                        {pkg.pickupCode}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Atalhos Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setInviteModalOpen(true)}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28"
            >
              <QrCode className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white">Criar Convite QR</div>
                <div className="text-[10px] text-slate-400">Para visitantes e entregas</div>
              </div>
            </button>

            <button
              onClick={() => onSelectTab('cameras')}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Câmeras da Portaria</div>
                <div className="text-[10px] text-slate-400">Visualizar 4 câmeras IP</div>
              </div>
            </button>

            <button
              onClick={() => onSelectTab('financeiro')}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28"
            >
              <Building2 className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-white">Boletos & Taxas</div>
                <div className="text-[10px] text-slate-400">Conferir cobranças e 2ª via</div>
              </div>
            </button>

            <button
              onClick={onOpenWebPhone}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition flex flex-col justify-between h-28"
            >
              <PhoneCall className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs font-bold text-white">WebPhone PWA</div>
                <div className="text-[10px] text-slate-400">Atender chamadas na LAN</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SUB-ABA: ENCOMENDAS */}
      {activeSubTab === 'encomendas' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Controle de Encomendas da Unidade {session.unitNumber}
              </h3>
              <span className="text-xs text-slate-400">Armário Inteligente / Portaria</span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {packages.map((pkg) => (
                <div key={pkg.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{pkg.courier}</span>
                      <span className="text-xs text-slate-400 font-mono">({pkg.trackingCode})</span>
                    </div>
                    <p className="text-xs text-slate-300">{pkg.description}</p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Recebido em {new Date(pkg.receivedAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-center font-mono">
                      <div className="text-[10px] text-slate-400">Código de Retirada</div>
                      <div className="text-base font-bold text-cyan-400 tracking-wider">{pkg.pickupCode}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        pkg.status === 'aguardando_retirada'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {pkg.status === 'aguardando_retirada' ? 'Aguardando Retirada' : 'Entregue'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA: VISITANTES & CONVITES QR (SEÇÃO 10 E 11 DO MASTER PRD) */}
      {activeSubTab === 'visitantes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Convites com QR Code Virtual Intercom</h3>
              <p className="text-xs text-slate-400">
                Tokens opacos com assinatura e expiração de 24 horas (Seção 11 do PRD)
              </p>
            </div>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Gerar Novo Convite QR</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visitorInvites.map((inv) => (
              <div
                key={inv.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{inv.visitorName}</h4>
                    <span className="text-[11px] text-cyan-400 font-mono capitalize">{inv.type}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {inv.status}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="font-mono text-xs text-slate-300 truncate max-w-[200px]">
                    {inv.qrToken}
                  </div>
                  <button
                    onClick={() => copyQrToken(inv.qrToken)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedToken === inv.qrToken ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Validade: 24 horas</span>
                  <span>Acessos registrados: {inv.entryCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA: VEÍCULOS */}
      {activeSubTab === 'veiculos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold text-sm text-white">
                      {v.brand} {v.model}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Cor: {v.color}</div>
                  <div className="text-xs text-cyan-300 font-semibold">{v.parkingSpot}</div>
                </div>

                <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-center">
                  <div className="text-[9px] text-slate-400 uppercase tracking-widest">BRASIL</div>
                  <div className="text-sm font-extrabold text-white">{v.plate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA: HISTÓRICO DE ATENDIMENTOS (SEÇÃO 12.3 E REGRA DE OURO #10) */}
      {activeSubTab === 'historico' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Regra de Ouro #10 & LGPD:</strong> Moradores visualizam o histórico de chamadas da sua unidade. A reprodução e download de gravações são restritos à auditoria do síndico.
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Data/Hora</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Finalidade</th>
                    <th className="py-3 px-4">Duração</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Portão Aberto</th>
                    <th className="py-3 px-4 text-right">Gravação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {callLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(log.startedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-cyan-400">
                        {log.origin === 'xpe_3115_ip' ? 'Totem XPE-3115-IP' : 'QR Virtual Intercom'}
                      </td>
                      <td className="py-3 px-4 capitalize text-white">{log.purpose}</td>
                      <td className="py-3 px-4 text-slate-400">{log.durationSeconds}s</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.status === 'atendida'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-amber-300">{log.gateOpened || 'Nenhum'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {log.hasRecording ? 'Hash SHA-256 Seguro' : 'Sem gravação'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CRIAR NOVO CONVITE QR */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Gerar Convite QR - Apto {session.unitNumber}</span>
            </h3>

            <form onSubmit={handleCreateInviteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome do Convidado / Prestador</label>
                <input
                  type="text"
                  required
                  value={newVisitorName}
                  onChange={(e) => setNewVisitorName(e.target.value)}
                  placeholder="Ex: João da Silva (Reforma)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tipo de Acesso</label>
                <select
                  value={newVisitorType}
                  onChange={(e) => setNewVisitorType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="visitante">Visitante Pessoal</option>
                  <option value="entrega">Entrega Agendada</option>
                  <option value="prestador">Prestador de Serviço</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
                >
                  Gerar Convite Seguro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
