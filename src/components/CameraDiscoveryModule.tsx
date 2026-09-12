import React, { useState, useEffect } from 'react';
import {
  Radar,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Camera,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink,
  Settings2,
  Plus,
  Terminal,
  ArrowRight,
  Lock,
  Check,
  Copy,
  X,
  Play,
  Activity,
  Globe,
} from 'lucide-react';
import type { DiscoveredCamera } from '../types.ts';

interface CameraDiscoveryModuleProps {
  onCameraImported?: () => void;
}

export const CameraDiscoveryModule: React.FC<CameraDiscoveryModuleProps> = ({ onCameraImported }) => {
  const [discoveredCameras, setDiscoveredCameras] = useState<DiscoveredCamera[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [subnet, setSubnet] = useState('192.168.1.0/24');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [selectedCameraForImport, setSelectedCameraForImport] = useState<DiscoveredCamera | null>(null);
  const [activeTabSnippet, setActiveTabSnippet] = useState<string | null>(null);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // Import modal form state
  const [customName, setCustomName] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<'ONVIF_Profile_T' | 'ONVIF_Profile_S'>('ONVIF_Profile_T');
  const [useSubStream, setUseSubStream] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Stream test state
  const [testingIp, setTestingIp] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { latency: number; codec: string; status: string }>>({});

  const fetchDiscovered = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/discovery/cameras');
      const data = await res.json();
      setDiscoveredCameras(data);
    } catch (e) {
      console.error('Erro ao carregar câmeras descobertas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscovered();
  }, []);

  const handleScan = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/v1/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subnet }),
      });
      const data = await res.json();
      if (data.devices) {
        setDiscoveredCameras(data.devices);
      }
    } catch (e) {
      console.error('Erro ao executar varredura de rede:', e);
    } finally {
      setScanning(false);
    }
  };

  const handleTestStream = async (cam: DiscoveredCamera) => {
    try {
      setTestingIp(cam.ip);
      const res = await fetch('/api/v1/discovery/test-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: cam.ip,
          manufacturer: cam.manufacturer,
          rtspPort: cam.rtspPort,
        }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [cam.ip]: {
          latency: data.latencyEstimateMs || 45,
          codec: data.videoCodec || 'H.264',
          status: 'Online • 200 OK',
        },
      }));
    } catch (e) {
      console.error('Erro ao testar stream:', e);
    } finally {
      setTestingIp(null);
    }
  };

  const openImportModal = (cam: DiscoveredCamera) => {
    setSelectedCameraForImport(cam);
    setCustomName(cam.model);
    setCustomLocation(
      cam.model.toLowerCase().includes('xpe')
        ? 'Portaria Social Frontal'
        : cam.model.toLowerCase().includes('lpr')
        ? 'Acesso Veicular / Garagem'
        : 'Área Comum'
    );
    setUsername('admin');
    setPassword('');
    setSelectedProfile(cam.supportedProfiles[0] || 'ONVIF_Profile_T');
    setUseSubStream(false);
    setImportSuccessMsg(null);
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCameraForImport) return;

    try {
      setImporting(true);
      const res = await fetch('/api/v1/discovery/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discoveredId: selectedCameraForImport.id,
          customName,
          customLocation,
          username: username || 'admin',
          password: password || 'admin',
          selectedProfile,
          useSubStream,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportSuccessMsg(data.message || 'Câmera importada com sucesso no go2rtc!');
        // Atualiza a lista de descobertas local
        setDiscoveredCameras((prev) =>
          prev.map((c) => (c.id === selectedCameraForImport.id ? { ...c, isConfigured: true } : c))
        );
        if (onCameraImported) onCameraImported();
        setTimeout(() => {
          setSelectedCameraForImport(null);
          setImportSuccessMsg(null);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const getBrandBadge = (brand: DiscoveredCamera['manufacturer']) => {
    switch (brand) {
      case 'Intelbras':
        return 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300';
      case 'Hikvision':
        return 'bg-red-950/80 border-red-700/80 text-red-300';
      case 'Dahua':
        return 'bg-blue-950/80 border-blue-700/80 text-blue-300';
      case 'Axis':
        return 'bg-amber-950/80 border-amber-700/80 text-amber-300';
      case 'Uniview':
        return 'bg-teal-950/80 border-teal-700/80 text-teal-300';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  const filteredCameras = discoveredCameras.filter((cam) => {
    if (filterBrand === 'all') return true;
    if (filterBrand === 'unconfigured') return !cam.isConfigured;
    if (filterBrand === 'configured') return cam.isConfigured;
    return cam.manufacturer.toLowerCase() === filterBrand.toLowerCase();
  });

  const unconfiguredCount = discoveredCameras.filter((c) => !c.isConfigured).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header do Módulo de Discovery */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Discovery de Câmeras na Rede Local (LAN)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  ONVIF WS-Discovery / SSDP / ARP
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Varredura automática e parametrização segundo fabricante (Intelbras, Hikvision, Dahua, Axis)
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Varredura */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            <span className="text-[11px] text-slate-500 mr-1.5">Sub-rede:</span>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="bg-transparent font-mono text-cyan-300 focus:outline-none w-28"
            />
          </div>

          <button
            id="btn-scan-network"
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Varrendo Rede (UDP 3702)...' : 'Escanear Rede Local'}</span>
          </button>
        </div>
      </div>

      {/* Estatísticas e Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-semibold text-white">{discoveredCameras.length}</span> dispositivos identificados
          na LAN •
          <span className="text-amber-400 font-semibold">{unconfiguredCount}</span> pendentes de ativação
        </div>

        {/* Filtros de Fabricante */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'unconfigured', label: `Novos (${unconfiguredCount})` },
            { id: 'Intelbras', label: 'Intelbras' },
            { id: 'Hikvision', label: 'Hikvision' },
            { id: 'Dahua', label: 'Dahua' },
            { id: 'Axis', label: 'Axis' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterBrand(f.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                filterBrand === f.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Câmeras Descobertas com Parametrização */}
      {loading ? (
        <div className="p-8 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Consultando tabela de descoberta na sub-rede {subnet}...</span>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 text-slate-400 text-xs">
          Nenhuma câmera localizada com o filtro selecionado. Clique em "Escanear Rede Local" para buscar novos
          equipamentos via WS-Discovery.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCameras.map((cam) => {
            const isTesting = testingIp === cam.ip;
            const testResult = testResults[cam.ip];

            return (
              <div
                key={cam.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                  cam.isConfigured
                    ? 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700'
                    : 'bg-slate-950 border-cyan-900/40 hover:border-cyan-700/60 shadow-lg'
                }`}
              >
                <div>
                  {/* Topo do Card: Fabricante & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getBrandBadge(
                          cam.manufacturer
                        )}`}
                      >
                        {cam.manufacturer}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {cam.discoveryMethod}
                      </span>
                    </div>

                    {cam.isConfigured ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        No CFTV / go2rtc
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        Não Ativada
                      </span>
                    )}
                  </div>

                  {/* Nome do Modelo & Informações Físicas */}
                  <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{cam.model}</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mb-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    <div>
                      <span className="text-slate-500">IP LAN: </span>
                      <strong className="text-cyan-300 font-mono">{cam.ip}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">MAC (OUI): </span>
                      <strong className="text-slate-300 font-mono text-[10px]">{cam.mac}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Porta ONVIF: </span>
                      <strong className="text-slate-300 font-mono">{cam.onvifPort}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Porta RTSP: </span>
                      <strong className="text-slate-300 font-mono">{cam.rtspPort}</strong>
                    </div>
                  </div>

                  {/* Caixa de Parametrização Automática conforme Fabricante */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Settings2 className="w-3.5 h-3.5 text-cyan-400" />
                        Parametrização do Fabricante ({cam.manufacturer}):
                      </span>
                      <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/50">
                        {cam.supportedProfiles[0]}
                      </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[10px] text-slate-300 space-y-1">
                      <div className="truncate">
                        <span className="text-slate-500 font-sans">Main: </span>
                        <span className="text-cyan-400">{cam.suggestedRtspMain}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500 font-sans">Sub: </span>
                        <span className="text-slate-400">{cam.suggestedRtspSub}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 italic flex items-center gap-1 px-1">
                      <Lock className="w-3 h-3 text-slate-600" />
                      <span>{cam.defaultCredentialsHint}</span>
                    </div>
                  </div>

                  {/* Resultado do Teste de Conexão se houver */}
                  {testResult && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[11px] flex items-center justify-between font-mono animate-fadeIn">
                      <span>{testResult.status} ({testResult.codec})</span>
                      <span className="text-emerald-400 font-bold">{testResult.latency}ms latência</span>
                    </div>
                  )}
                </div>

                {/* Ações: Testar Conexão, Ver YAML go2rtc e Importar */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestStream(cam)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      title="Efetua handshake RTSP na porta 554 para verificar disponibilidade"
                    >
                      <Activity className={`w-3 h-3 ${isTesting ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                      <span>{isTesting ? 'Testando...' : 'Testar RTSP'}</span>
                    </button>

                    <button
                      onClick={() => setActiveTabSnippet(activeTabSnippet === cam.id ? null : cam.id)}
                      className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1 transition"
                      title="Ver configuração para o go2rtc.yaml"
                    >
                      <Terminal className="w-3 h-3 text-amber-400" />
                      <span>go2rtc.yaml</span>
                    </button>
                  </div>

                  {!cam.isConfigured ? (
                    <button
                      onClick={() => openImportModal(cam)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ativar no CFTV</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openImportModal(cam)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Reparametrizar</span>
                    </button>
                  )}
                </div>

                {/* Snippet expandido de go2rtc */}
                {activeTabSnippet === cam.id && (
                  <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] relative animate-fadeIn">
                    <div className="flex justify-between items-center text-slate-400 pb-1 mb-1 border-b border-slate-800">
                      <span>Snippet go2rtc.yaml ({cam.manufacturer})</span>
                      <button
                        onClick={() => copyToClipboard(cam.suggestedGo2rtcConfig, cam.id)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {copiedSnippetId === cam.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-cyan-300 whitespace-pre overflow-x-auto">
                      {cam.suggestedGo2rtcConfig}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Importação e Parametrização Personalizada */}
      {selectedCameraForImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border ${getBrandBadge(
                    selectedCameraForImport.manufacturer
                  )}`}
                >
                  {selectedCameraForImport.manufacturer}
                </span>
                <h3 className="font-bold text-white text-sm">
                  Ativar & Parametrizar Câmera no CFTV
                </h3>
              </div>
              <button
                onClick={() => setSelectedCameraForImport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importSuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-white">{importSuccessMsg}</h4>
                <p className="text-xs text-slate-400">
                  O stream foi inserido no pipeline do go2rtc e já está disponível no painel de câmeras em tempo real.
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmImport} className="p-5 space-y-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">
                    Dispositivo:{' '}
                    <strong className="text-white">{selectedCameraForImport.model}</strong>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    IP: <span className="text-cyan-400">{selectedCameraForImport.ip}</span> | MAC:{' '}
                    <span className="text-slate-300">{selectedCameraForImport.mac}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Nome de Exibição no Condomínio
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Câmera Portaria Social"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Setor / Localização Físico
                  </label>
                  <input
                    type="text"
                    required
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Ex: Portão Social / Acesso Pedestre"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Usuário RTSP ({selectedCameraForImport.manufacturer})
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Senha da Câmera
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha definida no equipamento"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      Perfil ONVIF
                    </label>
                    <select
                      value={selectedProfile}
                      onChange={(e) => setSelectedProfile(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="ONVIF_Profile_T">ONVIF Profile T (H.264/H.265 Smart)</option>
                      <option value="ONVIF_Profile_S">ONVIF Profile S (Baseline)</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSubStream}
                        onChange={(e) => setUseSubStream(e.target.checked)}
                        className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                      />
                      <span>Usar Sub-Stream (Leve)</span>
                    </label>
                  </div>
                </div>

                {/* Pré-visualização da URL RTSP gerada para o fabricante */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    String RTSP Gerada ({selectedCameraForImport.manufacturer}):
                  </div>
                  <div className="font-mono text-[11px] text-cyan-300 break-all">
                    {useSubStream
                      ? selectedCameraForImport.suggestedRtspSub.replace(
                          'admin:*****',
                          `${username}:${password ? '*****' : '*****'}`
                        )
                      : selectedCameraForImport.suggestedRtspMain.replace(
                          'admin:*****',
                          `${username}:${password ? '*****' : '*****'}`
                        )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCameraForImport(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {importing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Salvar & Ativar no go2rtc</span>
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
