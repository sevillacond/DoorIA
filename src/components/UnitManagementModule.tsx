import React, { useState, useEffect } from 'react';
import { Users, Plus, Home, Phone, Mail, UserPlus, X, Edit, Trash2 } from 'lucide-react';
import type { Unit, Resident } from '../types.ts';

export const UnitManagementModule: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddResidentModalOpen, setIsAddResidentModalOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [newResident, setNewResident] = useState({ name: '', document: '', phone: '', email: '' });

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/units');
      const data = await res.json();
      setUnits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleOpenAddResident = (unitId: string) => {
    setSelectedUnitId(unitId);
    setNewResident({ name: '', document: '', phone: '', email: '' });
    setIsAddResidentModalOpen(true);
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;

    try {
      const res = await fetch(`/api/v1/units/${selectedUnitId}/residents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResident)
      });
      if (res.ok) {
        setIsAddResidentModalOpen(false);
        fetchUnits();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteResident = async (unitId: string, residentId: string) => {
    if (!confirm('Deseja realmente remover este morador?')) return;
    try {
      await fetch(`/api/v1/units/${unitId}/residents/${residentId}`, {
        method: 'DELETE'
      });
      fetchUnits();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Gestão de Unidades e Moradores
          </h2>
          <p className="text-sm text-slate-400">
            Gerencie os apartamentos e cadastre novos moradores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10 text-slate-500">Carregando unidades...</div>
        ) : (
          units.map(unit => (
            <div key={unit.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
              {/* Cabeçalho da Unidade */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-lg border border-cyan-800">
                    {unit.number}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{unit.block}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">SIP: {unit.sipExtension}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenAddResident(unit.id)}
                  className="p-2 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded-lg transition"
                  title="Adicionar Morador"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>

              {/* Lista de Moradores */}
              <div className="p-4 flex-1 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Moradores ({unit.residents.length})</h4>
                {unit.residents.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">Nenhum morador cadastrado.</div>
                ) : (
                  unit.residents.map(res => (
                    <div key={res.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl group relative">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                        <button 
                          onClick={() => handleDeleteResident(unit.id, res.id)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="font-bold text-sm text-slate-200 mb-1 pr-6">{res.name} {res.isMainContact && <span className="text-[9px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded ml-1 uppercase">Titular</span>}</div>
                      <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {res.phone}</div>
                        <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {res.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Adicionar Morador */}
      {isAddResidentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                Cadastrar Novo Morador
              </h3>
              <button 
                onClick={() => setIsAddResidentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddResident} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  value={newResident.name}
                  onChange={e => setNewResident({...newResident, name: e.target.value})}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">CPF / Documento</label>
                <input 
                  type="text" 
                  required
                  value={newResident.document}
                  onChange={e => setNewResident({...newResident, document: e.target.value})}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Telefone / Celular</label>
                  <input 
                    type="text" 
                    required
                    value={newResident.phone}
                    onChange={e => setNewResident({...newResident, phone: e.target.value})}
                    placeholder="(98) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">E-mail</label>
                  <input 
                    type="email" 
                    required
                    value={newResident.email}
                    onChange={e => setNewResident({...newResident, email: e.target.value})}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsAddResidentModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition"
                >
                  Salvar Morador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
