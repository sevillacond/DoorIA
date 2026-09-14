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
  Eye,
  Trash2,
  X,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import type {
  UserSession,
  Gate,
  PackageDelivery,
  VisitorInvite,
  Vehicle,
  CallLog,
  Reservation,
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
  onOpenAuditModal?: (recordingId: string) => void;
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
  onOpenAuditModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'encomendas' | 'visitantes' | 'veiculos' | 'historico'>('geral');
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorType, setNewVisitorType] = useState<'visitante' | 'entrega' | 'prestador'>('visitante');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [viewingQrInvite, setViewingQrInvite] = useState<VisitorInvite | null>(null);

  const pendingPackages = packages.filter((p) => p.status === 'aguardando_retirada');

  const [userReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem('enlace_reservations');
      if (saved) {
        const parsed: Reservation[] = JSON.parse(saved);
        return parsed.filter(r => r.unitNumber === session.unitNumber && (r.status === 'aprovada' || r.status === 'pendente'));
      }
    } catch {}
    return [];
  });

  const handleCreateInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitorName.trim()) return;
    onCreateVisitorInvite(newVisitorName, newVisitorType);
    setNewVisitorName('');
    setInviteModalOpen(false);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Deseja realmente revogar este convite? O visitante não conseguirá mais usá-lo.')) return;
    try {
      await fetch(`/api/v1/visitors/invites/${inviteId}`, { method: 'DELETE' });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const copyQrToken = (token: string) => {
    const url = `${window.location.origin}/?qr_token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas & Status da Unidade estilo Digify CRM */}
      <div className="p-6 rounded-3xl bg-[#0d1b35] border border-[#1e2f50] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#0a50ff]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0a50ff]/20 text-[#55b0ff] border border-[#0a50ff]/40 uppercase tracking-wide whitespace-nowrap">
              UNIDADE {session.unitNumber || '101'}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium truncate">Bloco A • 1º Andar • Solar das Palmeiras</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight font-['Red_Hat_Display']">
            Olá, {session.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Portaria autônoma conectada na LAN do condomínio com Asterisk PJSIP.
          </p>
        </div>

        {/* Atalho WebPhone em destaque Digify */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 z-10 w-full md:w-auto mt-2 md:mt-0">
          <button
            onClick={onOpenWebPhone}
            className="w-full md:w-auto px-4 py-3 md:py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-sm md:text-xs font-bold flex justify-center items-center gap-2 shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer"
          >
            <PhoneCall className="w-5 h-5 md:w-4 md:h-4" />
            <span>Abrir WebPhone Ramal {session.unitNumber}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navegação do Morador estilo Digify Tabs */}
      <div className="flex items-center gap-2 border-b border-[#dde5f0] pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              activeSubTab === tab.id
                ? 'bg-[#0a50ff] text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-[#5a6a85] border border-[#dde5f0] hover:text-[#0d1b35] hover:border-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeSubTab === tab.id ? 'bg-white text-[#0a50ff]' : 'bg-[#ebf2ff] text-[#0a50ff]'
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5a6a85] mb-3 font-['Red_Hat_Display']">
              Status dos Portões de Acesso (Sensores de Posição)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gates.map((gate) => (
                <div
                  key={gate.id}
                  className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                        gate.status === 'aberto'
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      {gate.status === 'aberto' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0d1b35]">{gate.name}</h4>
                      <div className="text-xs text-[#5a6a85] flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-semibold text-[#0a50ff]">{gate.dtmfCode}</span>
                        <span>• Relé {gate.relayPin}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span
                      className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] ${
                        gate.status === 'aberto'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
            <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0a50ff] font-bold text-sm">
                  <Package className="w-4 h-4" />
                  <span>Você tem {pendingPackages.length} encomenda(s) aguardando retirada!</span>
                </div>
                <button
                  onClick={() => setActiveSubTab('encomendas')}
                  className="text-xs text-[#0a50ff] font-bold hover:underline"
                >
                  Ver Detalhes
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-4 rounded-xl bg-[#f8fafc] border border-[#dde5f0] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#0d1b35]">{pkg.courier}</div>
                      <div className="text-xs text-[#5a6a85] mt-0.5">{pkg.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#5a6a85]">PIN de Retirada</div>
                      <div className="text-base font-mono font-extrabold text-[#0a50ff] tracking-wider">
                        {pkg.pickupCode}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reservas Agendadas da Unidade */}
          {userReservations.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0a50ff] font-bold text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Você tem {userReservations.length} reserva(s) de espaço comum!</span>
                </div>
                <button
                  onClick={() => onSelectTab('reservas')}
                  className="text-xs text-[#0a50ff] font-bold hover:underline cursor-pointer"
                >
                  Gerenciar Espaços
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userReservations.map((res) => (
                  <div
                    key={res.id}
                    className="p-4 rounded-xl bg-[#f8fafc] border border-[#dde5f0] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#0d1b35] flex items-center gap-1.5">
                        <span>{res.amenityId === 'am-1' ? 'Salão de Festas' : res.amenityId === 'am-2' ? 'Churrasqueira VIP' : 'Área Comum'}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                          res.status === 'aprovada' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#5a6a85] mt-0.5 font-mono">
                        {new Date(res.date + 'T00:00:00').toLocaleDateString('pt-BR')} • {res.startTime} às {res.endTime}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#5a6a85]">Convidados</div>
                      <div className="text-sm font-bold text-[#0d1b35]">
                        {res.guestCount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Atalhos Rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <button
              onClick={() => setInviteModalOpen(true)}
              className="p-5 rounded-2xl bg-white hover:bg-slate-50/80 border border-[#dde5f0] hover:border-[#0a50ff]/40 text-left transition flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#ebf2ff] text-[#0a50ff] flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0d1b35]">Criar Convite QR</div>
                <div className="text-[11px] text-[#5a6a85] mt-0.5">Visitantes e entregas</div>
              </div>
            </button>

            <button
              onClick={() => onSelectTab('reservas')}
              className="p-5 rounded-2xl bg-white hover:bg-slate-50/80 border border-[#dde5f0] hover:border-[#0a50ff]/40 text-left transition flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#ebf2ff] text-[#0a50ff] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0d1b35]">Áreas Comuns</div>
                <div className="text-[11px] text-[#5a6a85] mt-0.5">Reservar lazer e salão</div>
              </div>
            </button>

            <button
              onClick={() => onSelectTab('cameras')}
              className="p-5 rounded-2xl bg-white hover:bg-slate-50/80 border border-[#dde5f0] hover:border-[#18c7a8]/40 text-left transition flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#ebfbf8] text-[#18c7a8] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0d1b35]">Câmeras Portaria</div>
                <div className="text-[11px] text-[#5a6a85] mt-0.5">Visualizar 4 câmeras IP</div>
              </div>
            </button>

            <button
              onClick={() => onSelectTab('financeiro')}
              className="p-5 rounded-2xl bg-white hover:bg-slate-50/80 border border-[#dde5f0] hover:border-[#ffb21a]/40 text-left transition flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#fff8eb] text-[#ffb21a] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0d1b35]">Boletos & Taxas</div>
                <div className="text-[11px] text-[#5a6a85] mt-0.5">Cobranças e 2ª via</div>
              </div>
            </button>

            <button
              onClick={onOpenWebPhone}
              className="p-5 rounded-2xl bg-white hover:bg-slate-50/80 border border-[#dde5f0] hover:border-[#0a50ff]/40 text-left transition flex flex-col justify-between h-32 shadow-xs hover:shadow-md cursor-pointer col-span-2 sm:col-span-1"
            >
              <div className="w-9 h-9 rounded-xl bg-[#ebf2ff] text-[#0a50ff] flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#0d1b35]">WebPhone PWA</div>
                <div className="text-[11px] text-[#5a6a85] mt-0.5">Atender na LAN local</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SUB-ABA: ENCOMENDAS */}
      {activeSubTab === 'encomendas' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#dde5f0] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-[#f8fafc] border-b border-[#dde5f0] flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#0d1b35] uppercase tracking-wider font-['Red_Hat_Display']">
                Controle de Encomendas da Unidade {session.unitNumber}
              </h3>
              <span className="text-xs text-[#5a6a85]">Armário Inteligente / Portaria</span>
            </div>

            <div className="divide-y divide-[#dde5f0]">
              {packages.map((pkg) => (
                <div key={pkg.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f8fafc] transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0d1b35]">{pkg.courier}</span>
                      <span className="text-xs text-[#5a6a85] font-mono">({pkg.trackingCode})</span>
                    </div>
                    <p className="text-xs text-[#5a6a85]">{pkg.description}</p>
                    <div className="text-[11px] text-[#5a6a85] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#0a50ff]" />
                      <span>Recebido em {new Date(pkg.receivedAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {pkg.status === 'aguardando_retirada' ? (
                      <div className="bg-[#ebf2ff] px-3.5 py-1.5 rounded-xl border border-[#dde8ff] text-center font-mono">
                        <div className="text-[10px] text-[#5a6a85]">Código de Retirada</div>
                        <div className="text-base font-bold text-[#0a50ff] tracking-wider">{pkg.pickupCode}</div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#5a6a85] font-mono pr-2">
                        Retirado em {new Date(pkg.pickedUpAt || Date.now()).toLocaleString('pt-BR')}
                      </div>
                    )}
                    
                    {pkg.status === 'aguardando_retirada' ? (
                       <button
                         onClick={() => {
                           if (window.confirm('Confirmar retirada desta encomenda? Isso notificará a portaria e removerá o pacote dos pendentes.')) {
                             fetch(`/api/v1/packages/${pkg.id}/pickup`, {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ pickupCode: pkg.pickupCode })
                             }).then(res => res.json())
                               .then(data => {
                                 if (data.error) alert(data.error);
                                 else alert('Encomenda marcada como retirada com sucesso!');
                               });
                           }
                         }}
                         className="px-3 py-1.5 rounded-xl bg-[#18c7a8] hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-500/20 transition"
                       >
                         Marcar Retirada
                       </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Entregue
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA: VISITANTES & CONVITES QR */}
      {activeSubTab === 'visitantes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-[#0d1b35] font-['Red_Hat_Display']">Convites com QR Code Virtual Intercom</h3>
              <p className="text-xs text-[#5a6a85]">
                Tokens com assinatura e expiração de 24 horas para acesso seguro
              </p>
            </div>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Gerar Novo Convite QR</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visitorInvites.map((inv) => (
              <div
                key={inv.id}
                className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#0d1b35]">{inv.visitorName}</h4>
                    <span className="text-[11px] text-[#0a50ff] font-semibold capitalize">{inv.type}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      inv.status === 'ativo'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {inv.status}
                  </span>
                </div>

                <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#dde5f0] flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-[#0d1b35] truncate max-w-[180px]">
                    {inv.qrToken}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setViewingQrInvite(inv)}
                      className="p-1.5 rounded-lg bg-[#ebf2ff] hover:bg-[#dde8ff] text-[#0a50ff] text-xs font-bold flex items-center gap-1 transition"
                      title="Visualizar QR Code"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>QR</span>
                    </button>
                    <button
                      onClick={() => copyQrToken(inv.qrToken)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                      title="Copiar Link para WhatsApp"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedToken === inv.qrToken ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-[#5a6a85] flex items-center justify-between pt-1">
                  <span>Validade: 24h ({new Date(inv.validUntil).toLocaleDateString('pt-BR')})</span>
                  <div className="flex items-center gap-3">
                    <span>Acessos: {inv.entryCount}</span>
                    {inv.status === 'ativo' && (
                      <button
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="text-rose-600 hover:text-rose-700 text-[11px] flex items-center gap-0.5 font-bold"
                        title="Revogar convite imediatamente"
                      >
                        <Trash2 className="w-3 h-3" />
                        Revogar
                      </button>
                    )}
                  </div>
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
                className="p-5 rounded-2xl bg-white border border-[#dde5f0] shadow-xs hover:shadow-md transition flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-[#0a50ff]" />
                    <span className="font-bold text-sm text-[#0d1b35]">
                      {v.brand} {v.model}
                    </span>
                  </div>
                  <div className="text-xs text-[#5a6a85]">Cor: {v.color}</div>
                  <div className="text-xs text-[#0a50ff] font-semibold">{v.parkingSpot}</div>
                </div>

                <div className="bg-[#f8fafc] px-3.5 py-2 rounded-xl border border-[#dde5f0] font-mono text-center">
                  <div className="text-[9px] text-[#5a6a85] uppercase tracking-widest font-bold">BRASIL</div>
                  <div className="text-sm font-extrabold text-[#0d1b35]">{v.plate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA: HISTÓRICO DE ATENDIMENTOS */}
      {activeSubTab === 'historico' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-[#dde5f0] text-xs text-[#5a6a85] flex items-center gap-2 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#18c7a8] shrink-0" />
            <span>
              <strong className="text-[#0d1b35]">Regra de Ouro #10 & LGPD:</strong> Moradores visualizam o histórico de chamadas da sua unidade. Gravações criptografadas sob auditoria SHA-256.
            </span>
          </div>

          <div className="space-y-3">
            {callLogs.map((log) => (
              <div key={log.id} className="p-4 bg-white border border-[#dde5f0] rounded-2xl shadow-xs hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#0a50ff] font-bold text-sm">
                      {log.origin === 'xpe_3115_ip' ? 'Totem XPE-3115-IP' : 'QR Virtual Intercom'}
                    </span>
                    <span className="text-[#5a6a85] text-xs font-mono">• {new Date(log.startedAt).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-[#f8fafc] px-2 py-1 rounded-lg border border-[#dde5f0] font-medium text-[#0d1b35] capitalize">
                      {log.purpose}
                    </span>
                    <span className="text-[#5a6a85] font-mono">Duração: {log.durationSeconds}s</span>
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" />
                      {log.gateOpened || 'Nenhum portão aberto'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t border-[#dde5f0] sm:border-0">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      log.status === 'atendida'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {log.status}
                  </span>
                  
                  <div>
                    {log.hasRecording && onOpenAuditModal ? (
                      <button
                        onClick={() => onOpenAuditModal(log.recordingId || log.id)}
                        className="text-[11px] text-[#0a50ff] bg-[#ebf2ff] hover:bg-[#dde8ff] px-3 py-1.5 rounded-xl border border-[#dde8ff] font-semibold transition inline-flex items-center gap-1.5 shadow-xs"
                        title="Consultar integridade criptográfica da gravação"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Gravação SHA-256</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        Sem gravação
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {callLogs.length === 0 && (
              <div className="p-8 text-center bg-white border border-[#dde5f0] rounded-2xl text-[#5a6a85]">
                Nenhum registro de atendimento encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PARA CRIAR NOVO CONVITE QR */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#dde5f0] rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-[#0d1b35] flex items-center gap-2 font-['Red_Hat_Display']">
              <QrCode className="w-5 h-5 text-[#0a50ff]" />
              <span>Gerar Convite QR - Apto {session.unitNumber}</span>
            </h3>

            <form onSubmit={handleCreateInviteSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0d1b35] mb-1">Nome do Convidado / Prestador</label>
                <input
                  type="text"
                  required
                  value={newVisitorName}
                  onChange={(e) => setNewVisitorName(e.target.value)}
                  placeholder="Ex: João da Silva (Reforma)"
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#dde5f0] rounded-xl text-xs text-[#0d1b35] placeholder-slate-400 focus:outline-none focus:border-[#0a50ff] focus:ring-1 focus:ring-[#0a50ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0d1b35] mb-1">Tipo de Acesso</label>
                <select
                  value={newVisitorType}
                  onChange={(e) => setNewVisitorType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#dde5f0] rounded-xl text-xs text-[#0d1b35] focus:outline-none focus:border-[#0a50ff]"
                >
                  <option value="visitante">Visitante Pessoal</option>
                  <option value="entrega">Entrega Agendada</option>
                  <option value="prestador">Prestador de Serviço</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition"
                >
                  Gerar Convite Seguro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA VISUALIZAR QR CODE DO CONVITE */}
      {viewingQrInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-[#dde5f0] rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0a50ff] uppercase tracking-wider">
                Passaporte Virtual de Acesso
              </span>
              <button
                onClick={() => setViewingQrInvite(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#0d1b35] hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#0d1b35] font-['Red_Hat_Display']">{viewingQrInvite.visitorName}</h3>
              <p className="text-xs text-[#5a6a85]">
                Unidade {session.unitNumber || '101'} • Solar das Palmeiras
              </p>
            </div>

            {/* Simulação Visual do QR Code Autônomo */}
            <div className="p-4 bg-[#f8fafc] border border-[#dde5f0] rounded-2xl inline-block shadow-inner mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `${window.location.origin}/?qr_token=${viewingQrInvite.qrToken}`
                )}`}
                alt="QR Code Convite"
                className="w-44 h-44 mx-auto rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-[#ebf2ff] border border-[#dde8ff] text-xs font-mono text-[#0a50ff] font-bold truncate">
              {viewingQrInvite.qrToken}
            </div>

            <div className="text-xs text-[#5a6a85]">
              Aponte este QR Code para o totem da portaria ou envie o link seguro para o visitante.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => copyQrToken(viewingQrInvite.qrToken)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Copy className="w-4 h-4 text-[#0a50ff]" />
                <span>{copiedToken === viewingQrInvite.qrToken ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>
              <button
                onClick={() => setViewingQrInvite(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
