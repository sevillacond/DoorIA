import React, { useState } from 'react';
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
} from 'lucide-react';
import type { UserSession, PackageDelivery, VisitorInvite, Vehicle, CallLog } from '../types.ts';

interface PortariaModuleProps {
  session: UserSession;
  packages: PackageDelivery[];
  visitorInvites: VisitorInvite[];
  vehicles: Vehicle[];
}

export const PortariaModule: React.FC<PortariaModuleProps> = ({
  session,
  packages,
  visitorInvites,
  vehicles,
}) => {
  const [activeTab, setActiveTab] = useState<'encomendas' | 'visitantes' | 'veiculos'>('encomendas');
  const [searchQuery, setSearchQuery] = useState('');

  const pendingPackages = packages.filter((p) => p.status === 'aguardando_retirada');
  const deliveredPackages = packages.filter((p) => p.status === 'entregue');

  const activeInvites = visitorInvites.filter((v) => v.status === 'ativo');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" />
            Gestão de Portaria & Acessos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Controle de encomendas, convites QR e frota de veículos (LPR/RFID).
          </p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('encomendas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'encomendas' ? 'bg-cyan-900/50 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Encomendas
          </button>
          <button
            onClick={() => setActiveTab('visitantes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'visitantes' ? 'bg-cyan-900/50 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Convites QR
          </button>
          <button
            onClick={() => setActiveTab('veiculos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'veiculos' ? 'bg-cyan-900/50 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            Veículos
          </button>
        </div>
      </div>

      {/* Conteúdo Aba Encomendas */}
      {activeTab === 'encomendas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-800/30 shadow-md">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Aguardando Retirada</div>
              <div className="text-3xl font-black text-cyan-400 mt-1">{pendingPackages.length}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Entregues Hoje</div>
              <div className="text-3xl font-black text-white mt-1">
                {deliveredPackages.filter(p => new Date(p.pickedUpAt!).toDateString() === new Date().toDateString()).length}
              </div>
            </div>
            <div className="flex items-center justify-center p-4">
              <button 
                onClick={() => alert('Interface para cadastro de nova encomenda acionada.')}
                className="w-full h-full min-h-[80px] rounded-2xl border-2 border-dashed border-cyan-800 hover:border-cyan-500 bg-cyan-950/20 hover:bg-cyan-900/40 transition flex items-center justify-center gap-2 text-cyan-400 font-bold"
              >
                <Plus className="w-5 h-5" />
                Registrar Chegada
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Lista de Encomendas</h3>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por apto ou código..."
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
                    <th className="py-3 px-4 font-semibold">Transportadora / Código</th>
                    <th className="py-3 px-4 font-semibold">Descrição</th>
                    <th className="py-3 px-4 font-semibold">Chegada</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {packages.map(pkg => (
                    <tr key={pkg.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded">
                          {pkg.unitId.replace('u-', '')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{pkg.courier}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{pkg.trackingCode}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{pkg.description}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {new Date(pkg.receivedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-max ${
                          pkg.status === 'aguardando_retirada' ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          {pkg.status === 'aguardando_retirada' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {pkg.status === 'aguardando_retirada' ? 'Aguardando' : 'Entregue'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {pkg.status === 'aguardando_retirada' ? (
                          <button 
                            className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold flex items-center gap-1 ml-auto transition shadow-md"
                            title="Notificar morador novamente"
                          >
                            <Send className="w-3 h-3" /> Notificar
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(pkg.pickedUpAt!).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Visitantes/Convites */}
      {activeTab === 'visitantes' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Convites QR Code Ativos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Apto</th>
                  <th className="py-3 px-4 font-semibold">Nome do Convidado</th>
                  <th className="py-3 px-4 font-semibold">Tipo</th>
                  <th className="py-3 px-4 font-semibold">Validade</th>
                  <th className="py-3 px-4 font-semibold">Entradas</th>
                  <th className="py-3 px-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {activeInvites.map(inv => (
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
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      Até {new Date(inv.validUntil).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400 font-bold">{inv.entryCount}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-1 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-bold uppercase">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {activeInvites.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-mono">
                      Nenhum convite QR ativo no momento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo Aba Veículos */}
      {activeTab === 'veiculos' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Controle de Frota LPR / Tags RFID</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono">
                <tr>
                  <th className="py-3 px-4 font-semibold">Apto</th>
                  <th className="py-3 px-4 font-semibold">Placa (LPR)</th>
                  <th className="py-3 px-4 font-semibold">Veículo</th>
                  <th className="py-3 px-4 font-semibold">Cor</th>
                  <th className="py-3 px-4 font-semibold">Vaga Vinculada</th>
                  <th className="py-3 px-4 font-semibold text-right">Monitoramento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {vehicles.map(veh => (
                  <tr key={veh.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-white bg-slate-800 px-2 py-1 rounded">
                        {veh.unitId.replace('u-', '')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-lg font-bold bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded border-2 border-slate-300 tracking-widest shadow-sm">
                        {veh.plate}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {veh.brand} {veh.model}
                    </td>
                    <td className="py-3 px-4 text-slate-400 capitalize">{veh.color}</td>
                    <td className="py-3 px-4 text-cyan-400 font-mono">{veh.parkingSpot}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1 rounded text-slate-300 font-bold transition flex items-center gap-1 ml-auto">
                        <Camera className="w-3 h-3 text-cyan-400" />
                        Histórico LPR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
