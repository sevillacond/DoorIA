import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  RotateCcw,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Briefcase,
  Sliders,
  DollarSign,
  Network,
  Clock,
  KeyRound,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Car,
  Home,
  Database,
  Sparkles,
} from 'lucide-react';
import type { UserSession, CondominiumConfig } from '../types.ts';

interface CondominiumSettingsModuleProps {
  session: UserSession;
  onRefreshCondoData?: () => void;
}

export const CondominiumSettingsModule: React.FC<CondominiumSettingsModuleProps> = ({
  session,
  onRefreshCondoData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cadastral' | 'operacional' | 'financeiro' | 'tecnico'>('cadastral');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState<CondominiumConfig | null>(null);

  // Carregar dados iniciais do condomínio
  const fetchCondominiumData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/v1/condominium');
      if (!res.ok) throw new Error('Falha ao carregar os dados do condomínio');
      const data: CondominiumConfig = await res.json();
      setFormData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao carregar dados do servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondominiumData();
  }, []);

  // Manipulador de alterações genérico
  const handleUpdate = (section: keyof CondominiumConfig | null, field: string, value: any) => {
    if (!formData) return;
    if (section === null) {
      setFormData({ ...formData, [field]: value });
    } else {
      setFormData({
        ...formData,
        [section]: {
          ...(formData[section] as any),
          [field]: value,
        },
      });
    }
  };

  // Salvar alterações
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const res = await fetch('/api/v1/condominium', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao salvar alterações');

      setFormData(result.data);
      setSaveSuccess(true);
      if (onRefreshCondoData) onRefreshCondoData();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro de comunicação com a LAN da portaria');
    } finally {
      setSaving(false);
    }
  };

  // Restaurar padrões do piloto
  const handleReset = async () => {
    if (!confirm('Deseja restaurar as configurações para o padrão original do Piloto Solar das Palmeiras?')) {
      return;
    }

    try {
      setResetting(true);
      setErrorMessage(null);
      const res = await fetch('/api/v1/condominium/reset', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao restaurar padrões');

      setFormData(result.data);
      setSaveSuccess(true);
      if (onRefreshCondoData) onRefreshCondoData();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao restaurar configurações');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white dark:bg-[#0f1c34] rounded-2xl border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs">
        <div className="w-8 h-8 border-3 border-[#0a50ff] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Carregando parâmetros do condomínio...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#0f1c34] rounded-2xl border border-[#dde5f0] dark:border-[#1c2e4e]">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#0d1b35] dark:text-slate-100">Não foi possível carregar os dados</h3>
        <p className="text-xs text-[#5a6a85] dark:text-[#94a3b8] mt-1">{errorMessage || 'Erro inesperado'}</p>
        <button
          onClick={fetchCondominiumData}
          className="mt-4 px-4 py-2 bg-[#0a50ff] text-white rounded-xl text-xs font-bold hover:bg-[#0842cc] transition cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL COM DADOS GERAIS */}
      <div className="p-6 rounded-3xl bg-[#0d1b35] border border-[#1e2f50] shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-[#0a50ff]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0a50ff]/25 text-[#55b0ff] border border-[#0a50ff]/40 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Painel do Administrador & Síndico</span>
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#18c7a8]/20 text-[#18c7a8] border border-[#18c7a8]/40 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dados Oficiais do Condomínio</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight font-['Red_Hat_Display']">
            {formData.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-slate-200 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#55b0ff]" />
              {formData.address.neighborhood}, {formData.address.city} - {formData.address.state}
            </span>
            <span>•</span>
            <span>CNPJ: <strong className="text-slate-100 font-mono">{formData.cnpj}</strong></span>
            <span>•</span>
            <span>{formData.unitsCount} Unidades Ativas</span>
          </p>

          {formData.updatedAt && (
            <div className="text-[11px] text-slate-400 font-mono pt-1">
              Última atualização: {new Date(formData.updatedAt).toLocaleString('pt-BR')} • por {formData.updatedBy || 'Administrador'}
            </div>
          )}
        </div>

        {/* BOTÕES DE AÇÃO DO TOPO */}
        <div className="flex items-center gap-2.5 z-10 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            id="btn-reset-condo-defaults"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition cursor-pointer"
            title="Restaurar valores padrão do piloto"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Restaurando...' : 'Restaurar Padrões'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || resetting}
            id="btn-save-condo-config"
            className="px-5 py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-900/40 border border-blue-400/40 transition cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Gravando na LAN...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK STATUS BANNER */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-[#ebfbf8] dark:bg-[#082a24] border border-[#18c7a8]/40 text-[#18c7a8] text-xs font-bold flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Configurações salvas e propagadas para a URA Asterisk e barramento da portaria local com sucesso!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* NAVEGAÇÃO DE SUB-ABAS DE CONFIGURAÇÃO */}
      <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-[#1c2e4e] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('cadastral')}
          id="tab-condo-cadastral"
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'cadastral'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'bg-white dark:bg-[#0f1c34] text-[#5a6a85] dark:text-[#94a3b8] hover:text-[#0d1b35] dark:hover:text-white border border-[#dde5f0] dark:border-[#1c2e4e]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Dados Gerais & Gestão</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('operacional')}
          id="tab-condo-operacional"
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'operacional'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'bg-white dark:bg-[#0f1c34] text-[#5a6a85] dark:text-[#94a3b8] hover:text-[#0d1b35] dark:hover:text-white border border-[#dde5f0] dark:border-[#1c2e4e]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Regras da Portaria & Acesso</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('financeiro')}
          id="tab-condo-financeiro"
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'financeiro'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'bg-white dark:bg-[#0f1c34] text-[#5a6a85] dark:text-[#94a3b8] hover:text-[#0d1b35] dark:hover:text-white border border-[#dde5f0] dark:border-[#1c2e4e]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Parâmetros Financeiros & PIX</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('tecnico')}
          id="tab-condo-tecnico"
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'tecnico'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'bg-white dark:bg-[#0f1c34] text-[#5a6a85] dark:text-[#94a3b8] hover:text-[#0d1b35] dark:hover:text-white border border-[#dde5f0] dark:border-[#1c2e4e]'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Infraestrutura & Rede LAN</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* ABA 1: DADOS GERAIS, SÍNDICO E ADMINISTRADORA */}
        {activeSubTab === 'cadastral' && (
          <div className="space-y-6">
            {/* Bloco 1: Informações Institucionais do Condomínio */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1c34] border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-[#1c2e4e] pb-3">
                <Building2 className="w-5 h-5 text-[#0a50ff]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-slate-100 font-['Red_Hat_Display']">
                    Dados Cadastrais do Empreendimento
                  </h3>
                  <p className="text-xs text-[#5a6a85] dark:text-[#94a3b8]">Identificação jurídica, localização e estrutura predial</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Razão Social / Nome Oficial do Condomínio</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleUpdate(null, 'name', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#0a50ff]"
                    placeholder="Ex: Condomínio Residencial Solar das Palmeiras"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">CNPJ</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => handleUpdate(null, 'cnpj', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-medium focus:border-[#0a50ff]"
                    placeholder="00.000.000/0001-00"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Nome Fantasia / Exibição</label>
                  <input
                    type="text"
                    value={formData.tradingName || ''}
                    onChange={(e) => handleUpdate(null, 'tradingName', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#0a50ff]"
                    placeholder="Ex: Solar das Palmeiras"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Telefone Principal da Administração</label>
                  <input
                    type="text"
                    value={formData.managementPhone}
                    onChange={(e) => handleUpdate(null, 'managementPhone', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#0a50ff]"
                    placeholder="(98) 3000-0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Telefone de Emergência / Portaria</label>
                  <input
                    type="text"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleUpdate(null, 'emergencyPhone', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#0a50ff]"
                    placeholder="(98) 99999-9999"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">E-mail Oficial</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleUpdate(null, 'email', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#0a50ff]"
                    placeholder="contato@condominio.com.br"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Quantidade de Unidades (Piloto)</label>
                  <input
                    type="number"
                    value={formData.unitsCount}
                    onChange={(e) => handleUpdate(null, 'unitsCount', Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#0a50ff]"
                    min={1}
                    max={200}
                    required
                  />
                </div>
              </div>

              {/* Endereço Completo */}
              <div className="pt-3 border-t border-[#dde5f0] dark:border-[#1c2e4e]">
                <div className="text-xs font-bold text-[#5a6a85] dark:text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0a50ff]" />
                  <span>Localização Geográfica</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Logradouro / Avenida / Rua</label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => handleUpdate('address', 'street', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                      placeholder="Ex: Av. dos Holandeses, Quadra 14"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Número</label>
                    <input
                      type="text"
                      value={formData.address.number}
                      onChange={(e) => handleUpdate('address', 'number', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                      placeholder="Ex: 250"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Complemento</label>
                    <input
                      type="text"
                      value={formData.address.complement || ''}
                      onChange={(e) => handleUpdate('address', 'complement', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                      placeholder="Ex: Torre Única"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Bairro</label>
                    <input
                      type="text"
                      value={formData.address.neighborhood}
                      onChange={(e) => handleUpdate('address', 'neighborhood', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                      placeholder="Ex: Calhau"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Cidade</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleUpdate('address', 'city', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                      placeholder="Ex: São Luís"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">UF / Estado</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleUpdate('address', 'state', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                      placeholder="Ex: MA"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">CEP</label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={(e) => handleUpdate('address', 'zipCode', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono focus:border-[#0a50ff]"
                      placeholder="65071-380"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Gestão do Síndico em Exercício */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1c34] border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-[#1c2e4e] pb-3">
                <UserCheck className="w-5 h-5 text-[#18c7a8]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-slate-100 font-['Red_Hat_Display']">
                    Síndico(a) em Exercício & Mandato Legal
                  </h3>
                  <p className="text-xs text-[#5a6a85] dark:text-[#94a3b8]">Responsável civil e criminal perante o condomínio e a portaria</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Nome Completo do Síndico</label>
                  <input
                    type="text"
                    value={formData.sindico.name}
                    onChange={(e) => handleUpdate('sindico', 'name', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#18c7a8]"
                    placeholder="Ex: Henrique Vasconcelos de Alencar"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Unidade / Apto do Síndico</label>
                  <input
                    type="text"
                    value={formData.sindico.apartment}
                    onChange={(e) => handleUpdate('sindico', 'apartment', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-medium focus:border-[#18c7a8]"
                    placeholder="Ex: 304"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">CPF do Síndico</label>
                  <input
                    type="text"
                    value={formData.sindico.document}
                    onChange={(e) => handleUpdate('sindico', 'document', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono focus:border-[#18c7a8]"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Telefone / WhatsApp Direto</label>
                  <input
                    type="text"
                    value={formData.sindico.phone}
                    onChange={(e) => handleUpdate('sindico', 'phone', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#18c7a8]"
                    placeholder="(98) 98455-2020"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">E-mail do Síndico</label>
                  <input
                    type="email"
                    value={formData.sindico.email}
                    onChange={(e) => handleUpdate('sindico', 'email', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#18c7a8]"
                    placeholder="sindico@solardaspalmeiras.com.br"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Início do Mandato</label>
                  <input
                    type="date"
                    value={formData.sindico.mandateStart}
                    onChange={(e) => handleUpdate('sindico', 'mandateStart', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#18c7a8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Término do Mandato</label>
                  <input
                    type="date"
                    value={formData.sindico.mandateEnd}
                    onChange={(e) => handleUpdate('sindico', 'mandateEnd', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#18c7a8]"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Administradora de Condomínios */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1c34] border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-[#1c2e4e] pb-3">
                <Briefcase className="w-5 h-5 text-[#ffb21a]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-slate-100 font-['Red_Hat_Display']">
                    Administradora Parceira / Suporte de Gestão
                  </h3>
                  <p className="text-xs text-[#5a6a85] dark:text-[#94a3b8]">Dados da administradora responsável pelas prestações de contas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Razão Social da Administradora</label>
                  <input
                    type="text"
                    value={formData.administrator.name}
                    onChange={(e) => handleUpdate('administrator', 'name', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#ffb21a]"
                    placeholder="Ex: Enlace Administradora de Condomínios"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">CNPJ da Administradora</label>
                  <input
                    type="text"
                    value={formData.administrator.cnpj}
                    onChange={(e) => handleUpdate('administrator', 'cnpj', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono focus:border-[#ffb21a]"
                    placeholder="00.000.000/0001-00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Contato / Gerente de Conta</label>
                  <input
                    type="text"
                    value={formData.administrator.contactPerson}
                    onChange={(e) => handleUpdate('administrator', 'contactPerson', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#ffb21a]"
                    placeholder="Ex: Dra. Roberta Fontenele"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Telefone da Administradora</label>
                  <input
                    type="text"
                    value={formData.administrator.phone}
                    onChange={(e) => handleUpdate('administrator', 'phone', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#ffb21a]"
                    placeholder="(98) 3227-4000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">E-mail de Atendimento</label>
                  <input
                    type="email"
                    value={formData.administrator.email}
                    onChange={(e) => handleUpdate('administrator', 'email', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#ffb21a]"
                    placeholder="contato@enlacegestao.com.br"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: REGRAS OPERACIONAIS DA PORTARIA E ACESSO */}
        {activeSubTab === 'operacional' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1c34] border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-[#1c2e4e] pb-3">
                <Sliders className="w-5 h-5 text-[#0a50ff]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-slate-100 font-['Red_Hat_Display']">
                    Parâmetros de Portões, Relés e Interfonia
                  </h3>
                  <p className="text-xs text-[#5a6a85] dark:text-[#94a3b8]">Tempos de abertura, acionamento por DTMF Asterisk e limites de segurança</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200 flex items-center justify-between">
                    <span>Pulso do Portão de Pedestre (s)</span>
                    <span className="text-xs text-[#0a50ff] font-mono font-bold">{formData.operationalSettings.pedestrianGatePulseSeconds}s</span>
                  </label>
                  <input
                    type="number"
                    value={formData.operationalSettings.pedestrianGatePulseSeconds}
                    onChange={(e) => handleUpdate('operationalSettings', 'pedestrianGatePulseSeconds', Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                    min={1}
                    max={30}
                  />
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Tempo de energização da fechadura eletroímã/solenóide</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200 flex items-center justify-between">
                    <span>Abertura Portão Veicular (s)</span>
                    <span className="text-xs text-[#0a50ff] font-mono font-bold">{formData.operationalSettings.vehicleGatePulseSeconds}s</span>
                  </label>
                  <input
                    type="number"
                    value={formData.operationalSettings.vehicleGatePulseSeconds}
                    onChange={(e) => handleUpdate('operationalSettings', 'vehicleGatePulseSeconds', Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                    min={5}
                    max={60}
                  />
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Tempo para clausura veicular e passagem do carro</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200 flex items-center justify-between">
                    <span>Alerta Portão Aberto (s)</span>
                    <span className="text-xs text-rose-500 font-mono font-bold">{formData.operationalSettings.openGateAlertSeconds}s</span>
                  </label>
                  <input
                    type="number"
                    value={formData.operationalSettings.openGateAlertSeconds}
                    onChange={(e) => handleUpdate('operationalSettings', 'openGateAlertSeconds', Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                    min={15}
                    max={300}
                  />
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Disparo de aviso sonoro caso o sensor detecte porta aberta</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Código DTMF Pedestre (Asterisk)</label>
                  <input
                    type="text"
                    value={formData.operationalSettings.dtmfPedestrian}
                    onChange={(e) => handleUpdate('operationalSettings', 'dtmfPedestrian', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold focus:border-[#0a50ff]"
                    placeholder="*07"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Código DTMF Garagem (Asterisk)</label>
                  <input
                    type="text"
                    value={formData.operationalSettings.dtmfVehicle}
                    onChange={(e) => handleUpdate('operationalSettings', 'dtmfVehicle', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold focus:border-[#0a50ff]"
                    placeholder="*08"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Tempo Limite de Chamada SIP (s)</label>
                  <input
                    type="number"
                    value={formData.operationalSettings.callTimeoutSeconds}
                    onChange={(e) => handleUpdate('operationalSettings', 'callTimeoutSeconds', Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 focus:border-[#0a50ff]"
                    min={10}
                    max={120}
                  />
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Tempo tocando no ramal WebRTC antes de encaminhar à URA</span>
                </div>
              </div>

              {/* Horários e Regimento Interno */}
              <div className="pt-4 border-t border-[#dde5f0] dark:border-[#1c2e4e] space-y-3">
                <div className="text-xs font-bold text-[#5a6a85] dark:text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0a50ff]" />
                  <span>Janelas de Horário e Regimento Interno</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Início do Horário de Silêncio</label>
                    <input
                      type="time"
                      value={formData.operationalSettings.silencePeriodStart}
                      onChange={(e) => handleUpdate('operationalSettings', 'silencePeriodStart', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Fim do Horário de Silêncio</label>
                    <input
                      type="time"
                      value={formData.operationalSettings.silencePeriodEnd}
                      onChange={(e) => handleUpdate('operationalSettings', 'silencePeriodEnd', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Início Recebimento Encomendas</label>
                    <input
                      type="time"
                      value={formData.operationalSettings.packageDeliveryWindowStart}
                      onChange={(e) => handleUpdate('operationalSettings', 'packageDeliveryWindowStart', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Fim Recebimento Encomendas</label>
                    <input
                      type="time"
                      value={formData.operationalSettings.packageDeliveryWindowEnd}
                      onChange={(e) => handleUpdate('operationalSettings', 'packageDeliveryWindowEnd', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles de Inteligência e Autonomia */}
              <div className="pt-4 border-t border-[#dde5f0] dark:border-[#1c2e4e] space-y-3">
                <div className="text-xs font-bold text-[#5a6a85] dark:text-[#94a3b8] uppercase tracking-wider">
                  Políticas de Inteligência Artificial & Contingência
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="p-3.5 rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] flex items-start gap-3 cursor-pointer hover:border-[#0a50ff]/40 transition">
                    <input
                      type="checkbox"
                      checked={formData.operationalSettings.autoUraFallback}
                      onChange={(e) => handleUpdate('operationalSettings', 'autoUraFallback', e.target.checked)}
                      className="mt-0.5 rounded text-[#0a50ff] focus:ring-[#0a50ff]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#0d1b35] dark:text-slate-100">Transbordo Automático MaIA</div>
                      <div className="text-[11px] text-[#5a6a85] dark:text-[#94a3b8] mt-0.5">
                        Aciona URA Inteligente quando o morador não atender após o tempo limite
                      </div>
                    </div>
                  </label>

                  <label className="p-3.5 rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] flex items-start gap-3 cursor-pointer hover:border-[#0a50ff]/40 transition">
                    <input
                      type="checkbox"
                      checked={formData.operationalSettings.localFirstOfflineMode}
                      onChange={(e) => handleUpdate('operationalSettings', 'localFirstOfflineMode', e.target.checked)}
                      className="mt-0.5 rounded text-[#0a50ff] focus:ring-[#0a50ff]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#0d1b35] dark:text-slate-100">Operação Local-First Pura</div>
                      <div className="text-[11px] text-[#5a6a85] dark:text-[#94a3b8] mt-0.5">
                        Garante abertura e registro na LAN mesmo sem conexão externa com a internet
                      </div>
                    </div>
                  </label>

                  <label className="p-3.5 rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] flex items-start gap-3 cursor-pointer hover:border-[#0a50ff]/40 transition">
                    <input
                      type="checkbox"
                      checked={formData.operationalSettings.requireVisitorPhoto}
                      onChange={(e) => handleUpdate('operationalSettings', 'requireVisitorPhoto', e.target.checked)}
                      className="mt-0.5 rounded text-[#0a50ff] focus:ring-[#0a50ff]"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#0d1b35] dark:text-slate-100">Captura Facial de Visitantes</div>
                      <div className="text-[11px] text-[#5a6a85] dark:text-[#94a3b8] mt-0.5">
                        Exige foto na câmera da portaria ao liberar acesso via QR Code ou interfone
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: PARÂMETROS FINANCEIROS, BOLETO & PIX */}
        {activeSubTab === 'financeiro' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1c34] border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-[#1c2e4e] pb-3">
                <DollarSign className="w-5 h-5 text-[#18c7a8]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-slate-100 font-['Red_Hat_Display']">
                    Regras de Cobrança Condominial & PIX Oficial
                  </h3>
                  <p className="text-xs text-[#5a6a85] dark:text-[#94a3b8]">Valores base, vencimento padrão, multas e conta bancária para arrecadação</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Dia de Vencimento Padrão</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.financialSettings.dueDay}
                      onChange={(e) => handleUpdate('financialSettings', 'dueDay', Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-bold focus:border-[#18c7a8]"
                      min={1}
                      max={28}
                    />
                    <span className="text-xs text-[#5a6a85] dark:text-[#94a3b8] whitespace-nowrap">de cada mês</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Cota Ordinária Base (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-[#5a6a85] dark:text-[#94a3b8] font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.financialSettings.standardFee}
                      onChange={(e) => handleUpdate('financialSettings', 'standardFee', Number(e.target.value))}
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-bold focus:border-[#18c7a8]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Fundo de Reserva (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.financialSettings.reserveFundPercentage}
                      onChange={(e) => handleUpdate('financialSettings', 'reserveFundPercentage', Number(e.target.value))}
                      className="w-full pr-8 pl-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-bold focus:border-[#18c7a8]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#5a6a85] dark:text-[#94a3b8] font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Multa por Atraso (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.financialSettings.latePenaltyPercentage}
                      onChange={(e) => handleUpdate('financialSettings', 'latePenaltyPercentage', Number(e.target.value))}
                      className="w-full pr-8 pl-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-bold focus:border-[#18c7a8]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#5a6a85] dark:text-[#94a3b8] font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Conforme Art. 1.336 § 1º do Código Civil (máx 2%)</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Juros Moratórios Mensais (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.financialSettings.monthlyInterestPercentage}
                      onChange={(e) => handleUpdate('financialSettings', 'monthlyInterestPercentage', Number(e.target.value))}
                      className="w-full pr-8 pl-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-bold focus:border-[#18c7a8]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-[#5a6a85] dark:text-[#94a3b8] font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Normalmente 1.0% ao mês pro rata die</span>
                </div>
              </div>

              {/* Dados Bancários & PIX */}
              <div className="pt-4 border-t border-[#dde5f0] dark:border-[#1c2e4e] space-y-3">
                <div className="text-xs font-bold text-[#5a6a85] dark:text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#18c7a8]" />
                  <span>Chave PIX e Conta Bancária do Condomínio</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Tipo de Chave PIX</label>
                    <select
                      value={formData.financialSettings.pixKeyType}
                      onChange={(e) => handleUpdate('financialSettings', 'pixKeyType', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-semibold"
                    >
                      <option value="cnpj">CNPJ do Condomínio</option>
                      <option value="email">E-mail Institucional</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Chave PIX Cadastrada</label>
                    <input
                      type="text"
                      value={formData.financialSettings.pixKey}
                      onChange={(e) => handleUpdate('financialSettings', 'pixKey', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold"
                      placeholder="Chave PIX"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Instituição Bancária</label>
                    <input
                      type="text"
                      value={formData.financialSettings.bankName}
                      onChange={(e) => handleUpdate('financialSettings', 'bankName', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100"
                      placeholder="Ex: Banco do Brasil (001)"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Agência</label>
                    <input
                      type="text"
                      value={formData.financialSettings.bankAgency}
                      onChange={(e) => handleUpdate('financialSettings', 'bankAgency', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono"
                      placeholder="1612-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5a6a85] dark:text-[#94a3b8]">Conta Corrente Condominial</label>
                    <input
                      type="text"
                      value={formData.financialSettings.bankAccount}
                      onChange={(e) => handleUpdate('financialSettings', 'bankAccount', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono"
                      placeholder="48.910-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: INFRAESTRUTURA & REDE LOCAL (LAN) */}
        {activeSubTab === 'tecnico' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0f1c34] border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-[#1c2e4e] pb-3">
                <Network className="w-5 h-5 text-[#55b0ff]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-slate-100 font-['Red_Hat_Display']">
                    Endereçamento IP & Topologia de Hardware da Portaria
                  </h3>
                  <p className="text-xs text-[#5a6a85] dark:text-[#94a3b8]">Parâmetros de rede estática local (Sem dependência de nuvem)</p>
                </div>
              </div>

              {/* Banner de Integração & Credenciais Nativas Automáticas */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-[#0d1b35] dark:text-white flex items-center gap-2">
                      <span>Credenciais & Integração Nativas Automáticas</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                        Zero Configuração Manual
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5a6a85] dark:text-slate-300 mt-0.5">
                      O <strong>PostgreSQL 16 LTS</strong> (Porta 5432) e o <strong>Asterisk 20 PJSIP</strong> (Porta 5060/8089) comunicam-se via sockets locais nativos, sem necessidade de chaves, senhas manuais ou URLs de bancos externos.
                    </div>
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800">
                  NATIVO & ATIVO
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">IP do Servidor Local (Asterisk / Core)</label>
                  <input
                    type="text"
                    value={formData.technicalSettings.localServerIp}
                    onChange={(e) => handleUpdate('technicalSettings', 'localServerIp', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold focus:border-[#55b0ff]"
                    placeholder="192.168.1.100"
                  />
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Node.js + Vanilla PJSIP Core</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">IP do Totem XPE-3115-IP</label>
                  <input
                    type="text"
                    value={formData.technicalSettings.xpeIp}
                    onChange={(e) => handleUpdate('technicalSettings', 'xpeIp', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold focus:border-[#55b0ff]"
                    placeholder="192.168.1.150"
                  />
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Interfone físico facial na calçada</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">IP do Gateway Zigbee 3.0</label>
                  <input
                    type="text"
                    value={formData.technicalSettings.iotGatewayIp}
                    onChange={(e) => handleUpdate('technicalSettings', 'iotGatewayIp', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold focus:border-[#55b0ff]"
                    placeholder="192.168.1.160"
                  />
                  <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">NovaDigital HNZ-CB3 Ethernet</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Faixa de Sub-rede Local</label>
                  <input
                    type="text"
                    value={formData.technicalSettings.subnetRange}
                    onChange={(e) => handleUpdate('technicalSettings', 'subnetRange', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold focus:border-[#55b0ff]"
                    placeholder="192.168.1.0/24"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Versão da Stack Telefônica Asterisk</label>
                  <input
                    type="text"
                    value={formData.technicalSettings.asteriskVersion}
                    onChange={(e) => handleUpdate('technicalSettings', 'asteriskVersion', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* WebRTC & PWA Domain Configuration */}
              <div className="mt-6 border-t border-[#dde5f0] dark:border-[#1c2e4e] pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-[#0d1b35] dark:text-slate-100 uppercase tracking-wider">
                    Configurações de Domínio, WebRTC (WebPhone) e PWA
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Domínio Público PWA (FQDN)</label>
                    <input
                      type="text"
                      value={formData.technicalSettings.publicDomain || ''}
                      onChange={(e) => handleUpdate('technicalSettings', 'publicDomain', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono font-bold focus:border-[#18c7a8]"
                      placeholder="https://pwa.condominio-solar.com.br"
                    />
                    <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Necessário para SSL Válido (Let's Encrypt) e Service Workers do PWA</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Servidores ICE (STUN / TURN)</label>
                    <input
                      type="text"
                      value={formData.technicalSettings.stunTurnServer || ''}
                      onChange={(e) => handleUpdate('technicalSettings', 'stunTurnServer', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono focus:border-[#18c7a8]"
                      placeholder="stun:stun.l.google.com:19302"
                    />
                    <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Crucial para NAT Traversal do WebPhone fora da rede local</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Porta WSS Asterisk (WebSockets Secure)</label>
                    <input
                      type="number"
                      value={formData.technicalSettings.asteriskWssPort || 8089}
                      onChange={(e) => handleUpdate('technicalSettings', 'asteriskWssPort', Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono focus:border-[#18c7a8]"
                      placeholder="8089"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={formData.technicalSettings.allowSelfSignedCerts || false}
                          onChange={(e) => handleUpdate('technicalSettings', 'allowSelfSignedCerts', e.target.checked)}
                        />
                        <div className={`block w-10 h-6 rounded-full transition ${formData.technicalSettings.allowSelfSignedCerts ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${formData.technicalSettings.allowSelfSignedCerts ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-500">Permitir SSL Auto-assinado (LAN Only)</div>
                        <div className="text-[11px] text-[#5a6a85] dark:text-[#94a3b8] mt-0.5">
                          Aceitar certificados locais no PJSIP (Pode desabilitar PWA offline e forçar avisos no navegador)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Inteligência Artificial & Cloud Integration */}
              <div className="mt-6 border-t border-[#dde5f0] dark:border-[#1c2e4e] pt-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h4 className="text-xs font-bold text-[#0d1b35] dark:text-slate-100 uppercase tracking-wider">
                    Inteligência Artificial (MaIA) & Integração Nuvem
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Gateway de IA (Opcional)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.cloudIntegration?.aiGatewayUrl || ''}
                        onChange={(e) => handleUpdate('cloudIntegration', 'aiGatewayUrl', e.target.value)}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono focus:border-purple-500"
                        placeholder="Ex: 9router.enlace.slz.br"
                      />
                    </div>
                    <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">URL base de roteamento de IA (Proxy/Gateway).</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0d1b35] dark:text-slate-200">Chave da API (Token)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={formData.cloudIntegration?.geminiApiKey || ''}
                        onChange={(e) => handleUpdate('cloudIntegration', 'geminiApiKey', e.target.value)}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] bg-[#f8fafc] dark:bg-[#091223] text-[#0d1b35] dark:text-slate-100 font-mono focus:border-purple-500"
                        placeholder="xxxxxxxxxxxxx"
                      />
                    </div>
                    <span className="text-[10px] text-[#5a6a85] dark:text-[#94a3b8]">Insira a chave/token da API. Quando preenchida aqui, ela sobrepõe a configuração local.</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#ebf2ff] dark:bg-[#0a2352] border border-[#dde8ff] dark:border-[#193b7a] flex items-center justify-between flex-wrap gap-3 mt-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#18c7a8] animate-pulse"></div>
                  <div className="text-xs font-bold text-[#0a50ff] dark:text-[#60a5fa]">
                    Todos os módulos estão parametrizados para operar prioritariamente na LAN sem exigir conexão externa.
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-white dark:bg-[#0f1c34] text-[#0a50ff] dark:text-[#60a5fa] rounded-lg border border-[#dde8ff] dark:border-[#193b7a]">
                  LOCAL-FIRST OK
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BARRA DE AÇÕES INFERIOR */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0f1c34] border border-[#dde5f0] dark:border-[#1c2e4e] shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-[#5a6a85] dark:text-[#94a3b8]">
            As alterações gravadas são sincronizadas instantaneamente com o motor de regras da portaria.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || saving}
              className="px-4 py-2 rounded-xl border border-[#dde5f0] dark:border-[#1c2e4e] text-xs font-bold text-[#5a6a85] dark:text-[#94a3b8] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar / Reverter
            </button>

            <button
              type="submit"
              disabled={saving || resetting}
              className="px-5 py-2 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Gravando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
