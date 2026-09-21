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
  const [testResults, setTestResults] = useState<
    Record<string, { latency?: number; codec?: string; status: string; isFailed?: boolean; isMock?: boolean }>
  >({});
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

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
          rtspPort: cam.rtspPort || 554,
          onvifPort: cam.onvifPort || 80,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.classification === 'REAL_HARDWARE') {
        setTestResults((prev) => ({
          ...prev,
          [cam.ip]: {
            latency: data.latencyEstimateMs,
            codec: data.videoCodec || 'H.264',
            status: 'Hardware Físico Online • 200 OK',
            isFailed: false,
            isMock: false,
          },
        }));
      } else if (data.isMock) {
        setTestResults((prev) => ({
          ...prev,
          [cam.ip]: {
            latency: undefined,
            codec: 'H.264 (Simulado)',
            status: 'Simulada • Demo Sandbox',
            isFailed: false,
            isMock: true,
          },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [cam.ip]: {
            latency: undefined,
            codec: undefined,
            status: `Falha: ${data.error || 'Dispositivo inacessível'}`,
            isFailed: true,
            isMock: false,
          },
        }));
      }
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [cam.ip]: {
          latency: undefined,
          codec: undefined,
          status: `Erro de rede: ${e.message || 'Falha de comunicação'}`,
          isFailed: true,
          isMock: false,
        },
      }));
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
    setImportErrorMsg(null);
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCameraForImport) return;

    try {
      setImporting(true);
      setImportErrorMsg(null);
      const res = await fetch('/api/v1/discovery/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discoveredId: selectedCameraForImport.id,
          ip: selectedCameraForImport.ip,
          customName,
          customLocation,
          username: username || 'admin',
          password: password || 'admin',
          selectedProfile,
          useSubStream,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportSuccessMsg(data.message || 'Câmera validada e importada com sucesso no CFTV!');
        // Atualiza a lista de descobertas local
        setDiscoveredCameras((prev) =>
          prev.map((c) => (c.id === selectedCameraForImport.id ? { ...c, isConfigured: true } : c))
        );
        if (onCameraImported) onCameraImported();
        setTimeout(() => {
          setSelectedCameraForImport(null);
          setImportSuccessMsg(null);
        }, 1200);
      } else {
        setImportErrorMsg(data.error || data.details || 'Falha ao validar ou importar o equipamento.');
      }
    } catch (err: any) {
      setImportErrorMsg(err.message || 'Erro de comunicação ao importar câmera.');
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
        return 'bg-[#ebfbf8] dark:bg-emerald-950/40 border-[#18c7a8]/40 dark:border-emerald-800 text-[#18c7a8] dark:text-emerald-400';
      case 'Hikvision':
        return 'bg-[#fef0f0] dark:bg-red-950/40 border-[#fa4b42]/40 dark:border-red-800 text-[#fa4b42] dark:text-red-400';
      case 'Dahua':
        return 'bg-[#ebf2ff] dark:bg-blue-950/40 border-[#0a50ff]/40 dark:border-blue-800 text-[#0a50ff] dark:text-blue-400';
      case 'Axis':
        return 'bg-[#fff8eb] dark:bg-amber-950/40 border-[#ffb21a]/50 dark:border-amber-800 text-[#ffb21a] dark:text-amber-400';
      case 'Uniview':
        return 'bg-[#f0f9ff] dark:bg-sky-950/40 border-[#0284c7]/40 dark:border-sky-800 text-[#0284c7] dark:text-sky-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#5a6a85] dark:text-slate-400';
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
    <div className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header do Módulo de Discovery */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#dde5f0] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#ebf2ff] dark:bg-cyan-950/40 flex items-center justify-center text-[#0a50ff] dark:text-cyan-400">
              <Radar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
                Discovery de Câmeras na Rede Local (LAN)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#ebf2ff] dark:bg-cyan-950/40 text-[#0a50ff] dark:text-cyan-400 border border-[#dde8ff] dark:border-cyan-800/50">
                  ONVIF WS-Discovery / SSDP / ARP
                </span>
              </h3>
              <p className="text-xs text-[#5a6a85] dark:text-slate-400">
                Varredura automática e parametrização segundo fabricante (Intelbras, Hikvision, Dahua, Axis)
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Varredura */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-[#0d1b35] dark:text-white">
            <Globe className="w-3.5 h-3.5 mr-1.5 text-[#5a6a85] dark:text-slate-400" />
            <span className="text-[11px] text-[#5a6a85] dark:text-slate-400 mr-1.5">Sub-rede:</span>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="bg-transparent font-mono text-[#0a50ff] dark:text-cyan-400 font-bold focus:outline-none w-28"
            />
          </div>

          <button
            id="btn-scan-network"
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 bg-[#0a50ff] hover:bg-[#0842cc] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs shadow-blue-500/20 dark:shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Varrendo Rede (UDP 3702)...' : 'Escanear Rede Local'}</span>
          </button>
        </div>
      </div>

      {/* Estatísticas e Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#5a6a85] dark:text-slate-400">
          <span className="font-bold text-[#0d1b35] dark:text-white">{discoveredCameras.length}</span> dispositivos identificados
          na LAN •
          <span className="text-[#ffb21a] dark:text-amber-400 font-bold">{unconfiguredCount}</span> pendentes de ativação
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                filterBrand === f.id
                  ? 'bg-[#0a50ff] dark:bg-cyan-600 text-white shadow-xs'
                  : 'bg-[#f8fafc] dark:bg-slate-950 text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white border border-[#dde5f0] dark:border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Câmeras Descobertas com Parametrização */}
      {loading ? (
        <div className="p-8 text-center text-[#5a6a85] dark:text-slate-400 text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#0a50ff] dark:text-cyan-400" />
          <span>Consultando tabela de descoberta na sub-rede {subnet}...</span>
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="p-8 text-center bg-[#f8fafc] dark:bg-slate-950 rounded-xl border border-[#dde5f0] dark:border-slate-800 text-[#5a6a85] dark:text-slate-400 text-xs">
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
                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  cam.isConfigured
                    ? 'bg-[#f8fafc] dark:bg-slate-950 border-[#dde5f0] dark:border-slate-800 hover:border-[#0a50ff]/30 dark:hover:border-cyan-500/30'
                    : 'bg-white dark:bg-slate-900 border-[#0a50ff]/30 dark:border-cyan-500/30 hover:border-[#0a50ff] dark:hover:border-cyan-500 shadow-xs'
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
                      <span className="text-[10px] font-mono text-[#5a6a85] dark:text-slate-400 bg-[#f0f4f9] dark:bg-slate-800 px-1.5 py-0.5 rounded border border-[#dde5f0] dark:border-slate-700">
                        {cam.discoveryMethod}
                      </span>
                    </div>

                    {cam.isConfigured ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ebfbf8] dark:bg-emerald-950/40 text-[#18c7a8] dark:text-emerald-400 border border-[#18c7a8]/30 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#18c7a8] dark:text-emerald-400" />
                        No CFTV / go2rtc
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff8eb] dark:bg-amber-950/40 text-[#ffb21a] dark:text-amber-400 border border-[#ffb21a]/40 dark:border-amber-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-[#ffb21a] dark:text-amber-400" />
                        Não Ativada
                      </span>
                    )}
                  </div>

                  {/* Nome do Modelo & Informações Físicas */}
                  <h4 className="text-sm font-extrabold text-[#0d1b35] dark:text-white mb-1.5 flex items-center gap-1.5 font-['Red_Hat_Display']">
                    <Camera className="w-4 h-4 text-[#0a50ff] dark:text-cyan-400 shrink-0" />
                    <span>{cam.model}</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5a6a85] dark:text-slate-400 mb-3 bg-[#f8fafc] dark:bg-slate-950 p-2.5 rounded-xl border border-[#dde5f0] dark:border-slate-800">
                    <div>
                      <span className="text-[#5a6a85] dark:text-slate-500">IP LAN: </span>
                      <strong className="text-[#0a50ff] dark:text-cyan-400 font-mono font-bold">{cam.ip}</strong>
                    </div>
                    <div>
                      <span className="text-[#5a6a85] dark:text-slate-500">MAC (OUI): </span>
                      <strong className="text-[#0d1b35] dark:text-slate-300 font-mono text-[10px]">{cam.mac}</strong>
                    </div>
                    <div>
                      <span className="text-[#5a6a85] dark:text-slate-500">Porta ONVIF: </span>
                      <strong className="text-[#0d1b35] dark:text-slate-300 font-mono">{cam.onvifPort}</strong>
                    </div>
                    <div>
                      <span className="text-[#5a6a85] dark:text-slate-500">Porta Vídeo: </span>
                      <strong className="text-[#0d1b35] dark:text-slate-300 font-mono">{cam.rtspPort}</strong>
                    </div>
                  </div>

                  {/* Caixa de Parametrização Automática conforme Fabricante */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5a6a85] dark:text-slate-400 font-medium flex items-center gap-1">
                        <Settings2 className="w-3.5 h-3.5 text-[#0a50ff] dark:text-cyan-400" />
                        Parametrização do Fabricante ({cam.manufacturer}):
                      </span>
                      <span className="text-[10px] text-[#0a50ff] dark:text-cyan-400 font-mono font-bold bg-[#ebf2ff] dark:bg-cyan-950/40 px-1.5 py-0.5 rounded border border-[#dde8ff] dark:border-cyan-800/50">
                        {cam.supportedProfiles[0]}
                      </span>
                    </div>

                    <div className="bg-[#0d1b35] dark:bg-slate-950 border border-slate-800 dark:border-slate-800 rounded-xl p-2.5 font-mono text-[10px] text-slate-300 dark:text-slate-400 space-y-1 shadow-inner">
                      <div className="truncate flex items-center gap-1.5 text-cyan-300 dark:text-cyan-400 font-semibold font-sans">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                        Stream WebRTC Go2RTC (Sub-50ms)
                      </div>
                      <div className="text-slate-400 text-[10px] font-sans">
                        Perfis ONVIF: {cam.supportedProfiles.join(' • ')}
                      </div>
                    </div>

                    <div className="text-[10px] text-[#5a6a85] dark:text-slate-500 italic flex items-center gap-1 px-1">
                      <Lock className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                      <span>Credenciais gerenciadas de forma isolada pelo backend</span>
                    </div>
                  </div>

                  {/* Resultado do Teste de Conexão com Verificação Física Real */}
                  {testResult && (
                    <div
                      className={`mb-3 px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center justify-between font-mono animate-fadeIn ${
                        testResult.isFailed
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                          : testResult.isMock
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                          : 'bg-[#ebfbf8] dark:bg-emerald-950/40 border-[#18c7a8]/30 dark:border-emerald-800 text-[#18c7a8] dark:text-emerald-400'
                      }`}
                    >
                      <span className="truncate mr-2">
                        {testResult.status} {testResult.codec ? `(${testResult.codec})` : ''}
                      </span>
                      {testResult.latency !== undefined && (
                        <span className="font-bold shrink-0">{testResult.latency}ms</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações: Testar Conexão, Ver YAML go2rtc e Importar */}
                <div className="pt-3 border-t border-[#dde5f0] dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTestStream(cam)}
                      disabled={isTesting}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Efetua handshake RTSP na porta 554 para verificar disponibilidade"
                    >
                      <Activity className={`w-3 h-3 ${isTesting ? 'animate-spin text-[#0a50ff] dark:text-cyan-400' : 'text-[#5a6a85] dark:text-slate-400'}`} />
                      <span>{isTesting ? 'Testando...' : 'Testar RTSP'}</span>
                    </button>

                    <button
                      onClick={() => setActiveTabSnippet(activeTabSnippet === cam.id ? null : cam.id)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs font-mono flex items-center gap-1 transition cursor-pointer"
                      title="Ver configuração para o go2rtc.yaml"
                    >
                      <Terminal className="w-3 h-3 text-[#ffb21a] dark:text-amber-400" />
                      <span>go2rtc.yaml</span>
                    </button>
                  </div>

                  {!cam.isConfigured ? (
                    <button
                      onClick={() => openImportModal(cam)}
                      className="px-3.5 py-1.5 bg-[#0a50ff] hover:bg-[#0842cc] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs shadow-blue-500/20 dark:shadow-cyan-500/20 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ativar no CFTV</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openImportModal(cam)}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[#5a6a85] dark:text-slate-400 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Reparametrizar</span>
                    </button>
                  )}
                </div>

                {/* Snippet expandido de go2rtc */}
                {activeTabSnippet === cam.id && (
                  <div className="mt-3 p-3 bg-[#0d1b35] dark:bg-slate-950 rounded-xl border border-slate-800 font-mono text-[10px] relative animate-fadeIn">
                    <div className="flex justify-between items-center text-slate-400 pb-1.5 mb-1.5 border-b border-slate-800">
                      <span className="font-sans font-bold text-slate-300 dark:text-slate-400">Snippet go2rtc.yaml ({cam.manufacturer})</span>
                      <button
                        onClick={() => copyToClipboard(cam.suggestedGo2rtcConfig, cam.id)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
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
                    <pre className="text-cyan-300 dark:text-cyan-400 whitespace-pre overflow-x-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1b35]/70 dark:bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#dde5f0] dark:border-slate-800 flex items-center justify-between bg-[#f8fafc] dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border ${getBrandBadge(
                    selectedCameraForImport.manufacturer
                  )}`}
                >
                  {selectedCameraForImport.manufacturer}
                </span>
                <h3 className="font-extrabold text-[#0d1b35] dark:text-white text-sm font-['Red_Hat_Display']">
                  Ativar & Parametrizar Câmera no CFTV
                </h3>
              </div>
              <button
                onClick={() => setSelectedCameraForImport(null)}
                className="text-slate-400 hover:text-[#0d1b35] dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importSuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#18c7a8] dark:text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-base font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">{importSuccessMsg}</h4>
                <p className="text-xs text-[#5a6a85] dark:text-slate-400">
                  O stream foi inserido no pipeline do go2rtc e já está disponível no painel de câmeras em tempo real.
                </p>
              </div>
            ) : (
              <form onSubmit={handleConfirmImport} className="p-5 space-y-4">
                {importErrorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importErrorMsg}</span>
                  </div>
                )}
                <div className="bg-[#f8fafc] dark:bg-slate-950 p-3 rounded-xl border border-[#dde5f0] dark:border-slate-800 text-xs space-y-1">
                  <div className="text-[#5a6a85] dark:text-slate-400">
                    Dispositivo:{' '}
                    <strong className="text-[#0d1b35] dark:text-white">{selectedCameraForImport.model}</strong>
                  </div>
                  <div className="text-[#5a6a85] dark:text-slate-400 font-mono text-[11px]">
                    IP: <span className="text-[#0a50ff] dark:text-cyan-400 font-bold">{selectedCameraForImport.ip}</span> | MAC:{' '}
                    <span className="text-[#0d1b35] dark:text-white">{selectedCameraForImport.mac}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1">
                    Nome de Exibição no Condomínio
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex: Câmera Portaria Social"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1">
                    Setor / Localização Físico
                  </label>
                  <input
                    type="text"
                    required
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="Ex: Portão Social / Acesso Pedestre"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1">
                      Usuário RTSP ({selectedCameraForImport.manufacturer})
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1">
                      Senha da Câmera
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha definida no equipamento"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1">
                      Perfil ONVIF
                    </label>
                    <select
                      value={selectedProfile}
                      onChange={(e) => setSelectedProfile(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                    >
                      <option value="ONVIF_Profile_T">ONVIF Profile T (H.264/H.265 Smart)</option>
                      <option value="ONVIF_Profile_S">ONVIF Profile S (Baseline)</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2.5 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSubStream}
                        onChange={(e) => setUseSubStream(e.target.checked)}
                        className="rounded border-[#dde5f0] dark:border-slate-700 text-[#0a50ff] dark:text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Usar Sub-Stream (Leve)</span>
                    </label>
                  </div>
                </div>

                {/* Canal de Entrega Seguro WebRTC / Go2RTC */}
                <div className="p-3 bg-[#0d1b35] dark:bg-slate-950 rounded-xl border border-slate-800 dark:border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                    Canal Seguro WebRTC / Go2RTC ({selectedCameraForImport.manufacturer}):
                  </div>
                  <div className="font-sans text-[11px] text-cyan-300 dark:text-cyan-400 leading-relaxed font-medium">
                    O stream será roteado internamente via Go2RTC sem expor URLs RTSP ou credenciais de infraestrutura ao navegador.
                  </div>
                </div>

                <div className="pt-3 border-t border-[#dde5f0] dark:border-slate-800 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCameraForImport(null)}
                    className="px-4 py-2 text-xs font-bold text-[#5a6a85] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-4 py-2 text-xs font-bold bg-[#0a50ff] hover:bg-[#0842cc] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-xl transition shadow-xs shadow-blue-500/20 dark:shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
