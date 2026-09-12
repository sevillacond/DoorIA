import React, { useState, useEffect } from 'react';
import {
  Package,
  QrCode,
  Car,
  CheckCircle,
  Clock,
  Search,
  Plus,
  Send,
  Camera,
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  Trash2,
  Copy,
  Check,
  ScanLine,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { UserSession, PackageDelivery, VisitorInvite, Vehicle, Unit, LprLogEntry, Gate } from '../types.ts';

interface PortariaModuleProps {
  session: UserSession;
  units: Unit[];
  packages: PackageDelivery[];
  visitorInvites: VisitorInvite[];
  vehicles: Vehicle[];
  gates: Gate[];
  onRefreshData: () => void;
}

export const PortariaModule: React.FC<PortariaModuleProps> = ({
  session,
  units,
  packages,
  visitorInvites,
  vehicles,
  gates,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'encomendas' | 'visitantes' | 'veiculos'>('encomendas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais de Encomendas
  const [isRegisterPackageOpen, setIsRegisterPackageOpen] = useState(false);
  const [isPickupPackageOpen, setIsPickupPackageOpen] = useState(false);
  const [selectedPackageForPickup, setSelectedPackageForPickup] = useState<PackageDelivery | null>(null);
  const [pickupPinInput, setPickupPinInput] = useState('');
  const [pickupError, setPickupError] = useState<string | null>(null);

  // Form de Nova Encomenda
  const [pkgUnitNumber, setPkgUnitNumber] = useState('101');
  const [pkgCourier, setPkgCourier] = useState('Mercado Livre');
  const [pkgTracking, setPkgTracking] = useState('');
  const [pkgDescription, setPkgDescription] = useState('Pacote pequeno');
  const [isSubmittingPackage, setIsSubmittingPackage] = useState(false);
  const [packageSuccessMsg, setPackageSuccessMsg] = useState<string | null>(null);

  // Modais de Convite QR
  const [isNewInviteOpen, setIsNewInviteOpen] = useState(false);
  const [inviteVisitorName, setInviteVisitorName] = useState('');
  const [inviteUnitNumber, setInviteUnitNumber] = useState('101');
  const [inviteType, setInviteType] = useState<'visitante' | 'prestador' | 'entrega'>('visitante');
  const [createdInvite, setCreatedInvite] = useState<VisitorInvite | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // LPR & Veículos
  const [lprLogs, setLprLogs] = useState<LprLogEntry[]>([]);
  const [simulatedPlate, setSimulatedPlate] = useState('PTA-4A12');
  const [isSimulatingLpr, setIsSimulatingLpr] = useState(false);
  const [lastLprResult, setLastLprResult] = useState<LprLogEntry | null>(null);

  // Buscar logs LPR ao montar ou mudar de aba
  const fetchLprLogs = async () => {
    try {
      const res = await fetch('/api/v1/vehicles/lpr-logs');
      if (res.ok) {
        const data = await res.json();
        setLprLogs(data);
      }
    } catch (e) {
      console.error('Erro ao buscar logs LPR:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'veiculos') {
      fetchLprLogs();
    }
  }, [activeTab]);

  // Filtragem de Encomendas
  const filteredPackages = packages.filter((p) => {
    const q = searchQuery.toLowerCase();
    const unitMatch = p.unitId.toLowerCase().includes(q) || p.unitId.replace('u-', '').includes(q);
    const courierMatch = p.courier.toLowerCase().includes(q);
    const trackingMatch = p.trackingCode.toLowerCase().includes(q);
    const descMatch = p.description.toLowerCase().includes(q);
    return unitMatch || courierMatch || trackingMatch || descMatch;
  });

  const pendingPackages = packages.filter((p) => p.status === 'aguardando_retirada');
  const deliveredPackages = packages.filter((p) => p.status === 'entregue');

  // Filtragem de Convites
  const activeInvites = visitorInvites.filter((v) => v.status === 'ativo');

  // Ações de Encomendas
  const handleRegisterPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPackage(true);
    setPackageSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitNumber: pkgUnitNumber,
          courier: pkgCourier,
          trackingCode: pkgTracking,
          description: pkgDescription,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPackageSuccessMsg(`Encomenda registrada! PIN do morador gerado: ${data.package.pickupCode}`);
        onRefreshData();
        setTimeout(() => {
          setIsRegisterPackageOpen(false);
          setPackageSuccessMsg(null);
          setPkgTracking('');
        }, 2500);
      }
    } catch (err) {
      console.error('Erro ao registrar encomenda:', err);
    } finally {
      setIsSubmittingPackage(false);
    }
  };

  const handleOpenPickupModal = (pkg: PackageDelivery) => {
    setSelectedPackageForPickup(pkg);
    setPickupPinInput('');
    setPickupError(null);
    setIsPickupPackageOpen(true);
  };

  const handleConfirmPickup = async () => {
    if (!selectedPackageForPickup) return;
    setPickupError(null);
    try {
      const res = await fetch(`/api/v1/packages/${selectedPackageForPickup.id}/pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickupCode: pickupPinInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsPickupPackageOpen(false);
        setSelectedPackageForPickup(null);
        onRefreshData();
      } else {
        setPickupError(data.error || 'Código incorreto.');
      }
    } catch (err) {
      setPickupError('Erro ao comunicar com o servidor de portaria.');
    }
  };

  const handleNotifyResident = async (pkgId: string) => {
    try {
      const res = await fetch(`/api/v1/packages/${pkgId}/notify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        onRefreshData();
      }
    } catch (err) {
      console.error('Erro ao notificar morador:', err);
    }
  };

  // Ações de Convite QR
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/visitors/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorName: inviteVisitorName,
          type: inviteType,
          targetUnitNumber: inviteUnitNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedInvite(data.invite);
        onRefreshData();
      }
    } catch (err) {
      console.error('Erro ao criar convite:', err);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Deseja realmente revogar este convite QR? O visitante não conseguirá mais entrar.')) return;
    try {
      const res = await fetch(`/api/v1/visitors/invites/${inviteId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Erro ao revogar convite:', err);
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/?qr_token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Ações LPR
  const handleSimulateLpr = async (plateToTest?: string) => {
    const targetPlate = plateToTest || simulatedPlate;
    setIsSimulatingLpr(true);
    setLastLprResult(null);
    try {
      const res = await fetch('/api/v1/vehicles/lpr-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plate: targetPlate }),
      });
      const data = await res.json();
      setLastLprResult(data.lprEntry);
      fetchLprLogs();
      onRefreshData();
    } catch (err) {
      console.error('Erro ao simular LPR:', err);
    } finally {
      setIsSimulatingLpr(false);
    }
  };

  const garageGate = gates.find((g) => g.type === 'garagem');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header com Navegação de Abas */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" />
            Gestão de Portaria & Acessos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Controle autônomo de encomendas com PIN, convites criptografados QR e frota veicular via LPR OCR.
          </p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            id="tab-encomendas"
            onClick={() => setActiveTab('encomendas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'encomendas' ? 'bg-cyan-900/50 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Encomendas ({pendingPackages.length})
          </button>
          <button
            id="tab-visitantes"
            onClick={() => setActiveTab('visitantes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'visitantes' ? 'bg-cyan-900/50 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Convites QR ({activeInvites.length})
          </button>
          <button
            id="tab-veiculos"
            onClick={() => setActiveTab('veiculos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'veiculos' ? 'bg-cyan-900/50 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            Veículos & LPR
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: ENCOMENDAS & RECEBÍVEIS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'encomendas' && (
        <div className="space-y-6">
          {/* Métricas e Botão de Ação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-800/40 shadow-md flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Aguardando Retirada</div>
                <div className="text-3xl font-black text-cyan-400 mt-1">{pendingPackages.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Com PIN ativo emitido</div>
              </div>
              <div className="p-3 bg-cyan-950/60 rounded-xl border border-cyan-800/50 text-cyan-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Entregues / Retiradas</div>
                <div className="text-3xl font-black text-emerald-400 mt-1">{deliveredPackages.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Histórico auditado</div>
              </div>
              <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-800/50 text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            <button
              id="btn-registrar-chegada"
              onClick={() => {
                setIsRegisterPackageOpen(true);
                setPackageSuccessMsg(null);
              }}
              className="p-4 rounded-2xl border-2 border-dashed border-cyan-600/60 hover:border-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/40 transition flex items-center justify-center gap-3 text-cyan-300 font-bold shadow-md group"
            >
              <div className="p-2 bg-cyan-500 text-slate-950 rounded-xl group-hover:scale-110 transition">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">Registrar Chegada</div>
                <div className="text-[11px] text-cyan-400/80">Gerar PIN e notificar morador</div>
              </div>
            </button>
          </div>

          {/* Tabela de Encomendas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                Listagem de Encomendas Registradas
              </h3>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por apto, código ou courier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Apto</th>
                    <th className="py-3 px-4 font-semibold">Transportadora / Rastreio</th>
                    <th className="py-3 px-4 font-semibold">Descrição do Volume</th>
                    <th className="py-3 px-4 font-semibold">PIN de Retirada</th>
                    <th className="py-3 px-4 font-semibold">Data de Recebimento</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded text-xs border border-slate-700">
                          {pkg.unitId.replace('u-', '')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{pkg.courier}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{pkg.trackingCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate">{pkg.description}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-bold tracking-widest text-xs">
                          {pkg.pickupCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {new Date(pkg.receivedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 w-max ${
                            pkg.status === 'aguardando_retirada'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          }`}
                        >
                          {pkg.status === 'aguardando_retirada' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {pkg.status === 'aguardando_retirada' ? 'Aguardando' : 'Entregue'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {pkg.status === 'aguardando_retirada' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleNotifyResident(pkg.id)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition"
                              title="Reenviar Notificação para o morador"
                            >
                              <Send className="w-3 h-3 text-cyan-400" />
                              Notificar
                            </button>
                            <button
                              onClick={() => handleOpenPickupModal(pkg)}
                              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold flex items-center gap-1 transition shadow-md"
                            >
                              <KeyRound className="w-3 h-3" />
                              Liberar / Retirar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Entregue: {pkg.pickedUpAt ? new Date(pkg.pickedUpAt).toLocaleDateString('pt-BR') : 'Sim'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPackages.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                        Nenhuma encomenda encontrada com o filtro informado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CONVITES QR & VISITANTES                                           */}
      {/* ========================================================================= */}
      {activeTab === 'visitantes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Convites Criptografados QR Code
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Emitidos pelos moradores e síndicos com validação de câmera e microfone conforme Regra 10.1 do Master PRD.
              </p>
            </div>
            <button
              id="btn-novo-convite-qr"
              onClick={() => {
                setIsNewInviteOpen(true);
                setCreatedInvite(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              Gerar Novo Convite QR
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Apto</th>
                    <th className="py-3 px-4 font-semibold">Nome do Convidado</th>
                    <th className="py-3 px-4 font-semibold">Tipo</th>
                    <th className="py-3 px-4 font-semibold">Token Criptografado</th>
                    <th className="py-3 px-4 font-semibold">Validade</th>
                    <th className="py-3 px-4 font-semibold">Acessos</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {visitorInvites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded">
                          {inv.unitId.replace('u-', '')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">{inv.visitorName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded border border-slate-700 bg-slate-950 text-slate-300 capitalize text-[10px]">
                          {inv.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-cyan-400">
                        {inv.qrToken.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        Até {new Date(inv.validUntil).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400 font-bold">{inv.entryCount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === 'ativo'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.status === 'ativo' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyLink(inv.qrToken)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition"
                              title="Copiar Link do Convite"
                            >
                              <Copy className="w-3 h-3 text-cyan-400" />
                              Link
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="px-2 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-800/40 text-red-300 text-[10px] font-bold flex items-center gap-1 transition"
                              title="Revogar Acesso Imediatamente"
                            >
                              <Trash2 className="w-3 h-3" />
                              Revogar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {visitorInvites.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                        Nenhum convite cadastrado no condomínio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CONTROLE DE VEÍCULOS & LPR (OCR CÂMERA GARAGEM)                    */}
      {/* ========================================================================= */}
      {activeTab === 'veiculos' && (
        <div className="space-y-6">
          {/* Painel do Simulador LPR em Tempo Real */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-cyan-800/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-cyan-400 animate-pulse" />
                  Simulador de Reconhecimento de Placas LPR (Câmera Portão Garagem)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Validação automática via Policy Engine e acionamento do relé de garagem (*08) sem intervenção humana.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">Status Portão Garagem:</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    garageGate?.status === 'aberto'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {garageGate?.status || 'fechado'}
                </span>
              </div>
            </div>

            {/* Seletor rápido de placas cadastradas */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Placas Rápidas para Teste de Entrada:
              </div>
              <div className="flex flex-wrap gap-2">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSimulatedPlate(v.plate);
                      handleSimulateLpr(v.plate);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-2 ${
                      simulatedPlate === v.plate
                        ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span>{v.plate}</span>
                    <span className="text-[10px] text-slate-500">({v.unitId.replace('u-', 'Apto ')})</span>
                  </button>
                ))}
                {/* Placa desconhecida para testar recusa */}
                <button
                  onClick={() => {
                    setSimulatedPlate('XYZ-9999');
                    handleSimulateLpr('XYZ-9999');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-red-900/50 bg-red-950/30 hover:bg-red-950 text-red-300 text-xs font-mono font-bold transition flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>XYZ-9999 (Desconhecido)</span>
                </button>
              </div>
            </div>

            {/* Input customizado de placa e botão de disparo */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={simulatedPlate}
                  onChange={(e) => setSimulatedPlate(e.target.value.toUpperCase())}
                  placeholder="Ex: PTA-4A12"
                  className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono uppercase text-white tracking-widest focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                id="btn-disparar-lpr"
                onClick={() => handleSimulateLpr()}
                disabled={isSimulatingLpr}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-md"
              >
                {isSimulatingLpr ? (
                  <>
                    <ScanLine className="w-4 h-4 animate-spin text-white" />
                    Processando OCR...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Simular Aproximação de Veículo (OCR)
                  </>
                )}
              </button>
            </div>

            {/* Card com o Último Resultado da Leitura */}
            {lastLprResult && (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  lastLprResult.action === 'ABERTURA_AUTOMATICA'
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-red-950/20 border-red-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl ${
                        lastLprResult.action === 'ABERTURA_AUTOMATICA'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                          : 'bg-red-950 text-red-400 border border-red-700'
                      }`}
                    >
                      {lastLprResult.action === 'ABERTURA_AUTOMATICA' ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : (
                        <ShieldAlert className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-white">
                          {lastLprResult.plate}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          Precisão OCR: {lastLprResult.confidence}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{lastLprResult.reason}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      lastLprResult.action === 'ABERTURA_AUTOMATICA'
                        ? 'bg-emerald-900/80 text-emerald-300'
                        : 'bg-red-900/80 text-red-300'
                    }`}
                  >
                    {lastLprResult.action === 'ABERTURA_AUTOMATICA' ? 'Liberado (DTMF *08)' : 'Acesso Retido'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Frota Cadastrada do Condomínio */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-cyan-400" />
                Veículos Cadastrados no Solar das Palmeiras
              </h3>
              <span className="text-xs text-slate-400 font-mono">{vehicles.length} Veículos vinculados</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Apto</th>
                    <th className="py-3 px-4 font-semibold">Placa (LPR)</th>
                    <th className="py-3 px-4 font-semibold">Marca & Modelo</th>
                    <th className="py-3 px-4 font-semibold">Cor</th>
                    <th className="py-3 px-4 font-semibold">Vaga Vinculada</th>
                    <th className="py-3 px-4 font-semibold text-right">Simulação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {vehicles.map((veh) => (
                    <tr key={veh.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded">
                          {veh.unitId.replace('u-', '')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-bold bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded border-2 border-slate-300 tracking-widest shadow-sm">
                          {veh.plate}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {veh.brand} {veh.model}
                      </td>
                      <td className="py-3 px-4 text-slate-400 capitalize">{veh.color}</td>
                      <td className="py-3 px-4 text-cyan-400 font-mono font-bold">{veh.parkingSpot}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSimulatedPlate(veh.plate);
                            handleSimulateLpr(veh.plate);
                          }}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2.5 py-1 rounded text-slate-200 font-bold transition flex items-center gap-1.5 ml-auto"
                        >
                          <ScanLine className="w-3 h-3 text-cyan-400" />
                          Testar Entrada
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Histórico Recente de Leituras LPR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Histórico Forense de Passagens LPR
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Horário</th>
                    <th className="py-3 px-4 font-semibold">Placa Detectada</th>
                    <th className="py-3 px-4 font-semibold">Precisão OCR</th>
                    <th className="py-3 px-4 font-semibold">Apto / Vaga</th>
                    <th className="py-3 px-4 font-semibold">Motivo / Decisão Policy Engine</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {lprLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">{log.plate}</td>
                      <td className="py-3 px-4 font-mono text-cyan-400">{log.confidence}%</td>
                      <td className="py-3 px-4">
                        {log.matchedUnitNumber ? (
                          <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                            Apto {log.matchedUnitNumber}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">Não vinculado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 max-w-sm">{log.reason}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.action === 'ABERTURA_AUTOMATICA'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : 'bg-red-950 text-red-400 border border-red-800/50'
                          }`}
                        >
                          {log.action === 'ABERTURA_AUTOMATICA' ? 'Permitido' : 'Negado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {lprLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                        Nenhum registro LPR recente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR CHEGADA DE ENCOMENDA                                      */}
      {/* ========================================================================= */}
      {isRegisterPackageOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                Registrar Chegada de Encomenda
              </h2>
              <button
                onClick={() => setIsRegisterPackageOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {packageSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{packageSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleRegisterPackage} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Apartamento de Destino</label>
                  <select
                    value={pkgUnitNumber}
                    onChange={(e) => setPkgUnitNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.number}>
                        Unidade {u.number} - {u.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Transportadora / Entregador</label>
                  <input
                    type="text"
                    required
                    value={pkgCourier}
                    onChange={(e) => setPkgCourier(e.target.value)}
                    placeholder="Ex: Mercado Livre, Correios, Amazon"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Código de Rastreio / Nota</label>
                  <input
                    type="text"
                    value={pkgTracking}
                    onChange={(e) => setPkgTracking(e.target.value)}
                    placeholder="Ex: BR-MELI-992019"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Descrição do Volume</label>
                  <input
                    type="text"
                    required
                    value={pkgDescription}
                    onChange={(e) => setPkgDescription(e.target.value)}
                    placeholder="Ex: Caixa média papelão, envelope de documentos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-[11px] text-cyan-300">
                  <span className="font-bold">Automático:</span> O sistema gera um código PIN de 4 dígitos e notifica a
                  unidade selecionada pelo WebPhone.
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRegisterPackageOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPackage}
                    className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md"
                  >
                    {isSubmittingPackage ? 'Registrando...' : 'Confirmar Chegada'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LIBERAR RETIRADA COM PIN                                           */}
      {/* ========================================================================= */}
      {isPickupPackageOpen && selectedPackageForPickup && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                Validar Retirada de Encomenda
              </h2>
              <button
                onClick={() => setIsPickupPackageOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Unidade:</span>
                <span className="font-bold text-white">Apto {selectedPackageForPickup.unitId.replace('u-', '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transportadora:</span>
                <span className="text-slate-200">{selectedPackageForPickup.courier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Descrição:</span>
                <span className="text-slate-300 truncate max-w-[180px]">{selectedPackageForPickup.description}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                PIN de 4 Dígitos (Fornecido pelo Morador)
              </label>
              <input
                type="text"
                maxLength={4}
                value={pickupPinInput}
                onChange={(e) => setPickupPinInput(e.target.value)}
                placeholder="Ex: 8912"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-center text-lg font-mono tracking-widest text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
              />
              <div className="text-[10px] text-slate-500 text-center mt-1">
                PIN registrado no sistema: <span className="font-mono text-slate-400">{selectedPackageForPickup.pickupCode}</span>
              </div>
            </div>

            {pickupError && (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs text-center">
                {pickupError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPickupPackageOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPickup}
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md"
              >
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GERAR NOVO CONVITE QR CODE                                         */}
      {/* ========================================================================= */}
      {isNewInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Gerar Convite QR Code Virtual
              </h2>
              <button
                onClick={() => setIsNewInviteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdInvite ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-center space-y-3">
                  <div className="inline-block p-3 bg-white rounded-2xl shadow-inner border-2 border-cyan-400">
                    {/* Visual de QR Code Simulado estilizado */}
                    <div className="w-36 h-36 bg-slate-950 flex flex-col items-center justify-center p-2 rounded-xl">
                      <QrCode className="w-24 h-24 text-cyan-400" />
                      <span className="text-[9px] font-mono text-slate-300 font-bold mt-1">ENLACE SECURE QR</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{createdInvite.visitorName}</div>
                    <div className="text-xs text-cyan-400 font-mono">Token: {createdInvite.qrToken}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Válido por 24 horas para entrada pedestre social
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyLink(createdInvite.qrToken)}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-md"
                  >
                    {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedToken ? 'Link Copiado!' : 'Copiar Link para Convidado'}
                  </button>
                  <button
                    onClick={() => setIsNewInviteOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Nome Completo do Convidado</label>
                  <input
                    type="text"
                    required
                    value={inviteVisitorName}
                    onChange={(e) => setInviteVisitorName(e.target.value)}
                    placeholder="Ex: Marcos Vinícius (Técnico de Internet)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Apartamento Anfitrião</label>
                  <select
                    value={inviteUnitNumber}
                    onChange={(e) => setInviteUnitNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.number}>
                        Unidade {u.number} ({u.ownerName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Categoria de Convidado</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['visitante', 'prestador', 'entrega'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setInviteType(t)}
                        className={`py-2 rounded-xl text-xs font-bold capitalize border transition ${
                          inviteType === t
                            ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Regra 10.1 do Master PRD
                  </div>
                  <p>
                    Ao escanear o QR no portão, o visitante terá que conceder acesso à câmera frontal e ao microfone
                    para que o morador possa visualizá-lo e liberar o portão via DTMF *07.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewInviteOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md"
                  >
                    Gerar Convite
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
