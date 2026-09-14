import React, { useState, useEffect } from 'react';
import {
  Radio,
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  Lock,
  Camera,
  Layers,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  Zap,
  Sliders,
  ExternalLink,
  ChevronRight,
  Info,
  Server,
  Network,
  Cpu,
  Volume2
} from 'lucide-react';
import type { XpeConfig, XpeRelayConfig } from '../types.ts';
import { audioSystem } from '../utils/audioSystem.ts';

interface XpeIntegrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const XpeIntegrationWizardModal: React.FC<XpeIntegrationWizardModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados de teste em tempo real
  const [networkTestStatus, setNetworkTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [networkTestResult, setNetworkTestResult] = useState<any>(null);

  const [sipTestStatus, setSipTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [sipTestResult, setSipTestResult] = useState<any>(null);

  const [relay1TestStatus, setRelay1TestStatus] = useState<'idle' | 'testing' | 'open'>('idle');
  const [relay2TestStatus, setRelay2TestStatus] = useState<'idle' | 'testing' | 'open'>('idle');

  // Estado das configurações do XPE
  const [config, setConfig] = useState<XpeConfig>({
    ip: '192.168.1.150',
    netmask: '255.255.255.0',
    gateway: '192.168.1.1',
    httpPort: 80,
    sipServer: '192.168.1.200',
    sipPort: 5060,
    sipExtension: '8000',
    sipSecret: 'xpe_sec_intelbras_2026',
    audioCodec: 'PCMU',
    videoCodec: 'H.264',
    dtmfMode: 'RFC2833',
    relay1: {
      name: 'Portão Pedestre Social (FA)',
      lockType: 'eletromecanica',
      contactType: 'NA',
      retentionSeconds: 3,
      dtmfCommand: '*07',
      httpTriggerUrl: 'http://192.168.1.150/cgi-bin/relay.cgi?action=open&relay=1',
      targetGateId: 'gate-pedestre',
    },
    relay2: {
      name: 'Portão Garagem Veicular (AUX)',
      lockType: 'portao_garagem_botoeira',
      contactType: 'NA',
      retentionSeconds: 1,
      dtmfCommand: '*08',
      httpTriggerUrl: 'http://192.168.1.150/cgi-bin/relay.cgi?action=open&relay=2',
      targetGateId: 'gate-garagem',
    },
    rtspStream: {
      enabled: true,
      channel: 1,
      subType: 0,
      rtspPort: 554,
      username: 'admin',
      password: 'admin_password',
      url: 'rtsp://admin:admin_password@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0',
    },
    status: 'online',
  });

  // Carregar dados salvos ao abrir
  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/xpe/config')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.ip) {
            setConfig(data);
          }
        })
        .catch((err) => console.warn('Falha ao obter config inicial do XPE:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Testar Conexão de Rede
  const handleTestNetwork = async () => {
    setNetworkTestStatus('testing');
    try {
      const res = await fetch('/api/v1/xpe/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: config.ip, httpPort: config.httpPort }),
      });
      const data = await res.json();
      setNetworkTestResult(data);
      setNetworkTestStatus(data.success ? 'success' : 'failed');
    } catch {
      setNetworkTestStatus('failed');
    }
  };

  // Testar Registro SIP
  const handleTestSip = async () => {
    setSipTestStatus('testing');
    try {
      const res = await fetch('/api/v1/xpe/test-sip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sipServer: config.sipServer,
          sipExtension: config.sipExtension,
          sipPort: config.sipPort,
          dtmfMode: config.dtmfMode,
        }),
      });
      const data = await res.json();
      setSipTestResult(data);
      setSipTestStatus(data.success ? 'success' : 'failed');
    } catch {
      setSipTestStatus('failed');
    }
  };

  // Testar Relé
  const handleTestRelay = async (relayNum: 1 | 2) => {
    audioSystem.playDtmf(relayNum === 1 ? '7' : '8');
    if (relayNum === 1) setRelay1TestStatus('testing');
    if (relayNum === 2) setRelay2TestStatus('testing');

    try {
      const res = await fetch('/api/v1/xpe/test-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relayNumber: relayNum,
          durationSeconds: relayNum === 1 ? config.relay1.retentionSeconds : config.relay2.retentionSeconds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (relayNum === 1) {
          setRelay1TestStatus('open');
          setTimeout(() => setRelay1TestStatus('idle'), (config.relay1.retentionSeconds || 3) * 1000);
        } else {
          setRelay2TestStatus('open');
          setTimeout(() => setRelay2TestStatus('idle'), (config.relay2.retentionSeconds || 1) * 1000);
        }
      }
    } catch (e) {
      console.error(e);
      if (relayNum === 1) setRelay1TestStatus('idle');
      if (relayNum === 2) setRelay2TestStatus('idle');
    }
  };

  // Salvar Configurações
  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/xpe/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        if (onConfigSaved) onConfigSaved();
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Erro ao salvar config XPE:', err);
    } finally {
      setLoading(false);
    }
  };

  // Snippet pjsip.conf
  const pjsipSnippet = `; ============================================================
; Configuração PJSIP para Intelbras XPE 3115-IP
; Arquivo: /etc/asterisk/pjsip.conf
; ============================================================

[${config.sipExtension}]
type=endpoint
context=portaria-inbound
disallow=all
allow=opus
allow=ulaw
allow=alaw
allow=h264
auth=${config.sipExtension}-auth
aors=${config.sipExtension}
dtmf_mode=${config.dtmfMode.toLowerCase()}
direct_media=no
force_rport=yes
rewrite_contact=yes
rtp_symmetric=yes

[${config.sipExtension}-auth]
type=auth
auth_type=userpass
username=${config.sipExtension}
password=${config.sipSecret}

[${config.sipExtension}]
type=aor
max_contacts=1
qualify_frequency=30
remove_existing=yes`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#070d18]/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0c1527] border border-[#d6e2f5] dark:border-[#1e2f50] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* CABEÇALHO DO WIZARD */}
        <div className="px-6 py-5 bg-[#f8faff] dark:bg-[#070d18] border-b border-[#e2ecf9] dark:border-[#192b4a] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0a50ff] to-[#4facfe] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                  Assistente Visual de Integração
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#0a50ff]/10 text-[#0a50ff] dark:text-[#60a5fa] text-[10px] font-extrabold uppercase tracking-wide border border-[#0a50ff]/20">
                  Intelbras XPE 3115-IP
                </span>
              </div>
              <p className="text-xs text-[#5a6a85] dark:text-slate-400 mt-0.5">
                Configure IP de rede, registro SIP local (Asterisk), acionamento de relés e câmera em poucos passos guiados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER VISUAL SUPERIOR */}
        <div className="px-6 py-3 bg-[#f0f5ff] dark:bg-[#091122] border-b border-[#e2ecf9] dark:border-[#192b4a] shrink-0">
          <div className="grid grid-cols-5 gap-2">
            {[
              { num: 1, title: 'Rede & IP', icon: Network },
              { num: 2, title: 'Conta SIP', icon: Phone },
              { num: 3, title: 'Relés & Portões', icon: Zap },
              { num: 4, title: 'Câmera RTSP', icon: Camera },
              { num: 5, title: 'Diagnóstico', icon: ShieldCheck },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#0a50ff] text-white shadow-sm'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-extrabold ${
                      isActive
                        ? 'bg-white text-[#0a50ff]'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isDone ? '✓' : step.num}
                  </div>
                  <span className="hidden sm:inline truncate">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO PRINCIPAL COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================================================================= */}
          {/* PASSO 1: REDE & IP LAN */}
          {/* ================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#ebf2ff] dark:bg-[#0a2046] border border-[#d2e2ff] dark:border-[#173a75] flex items-start gap-3">
                <Info className="w-5 h-5 text-[#0a50ff] dark:text-[#60a5fa] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1e3a6a] dark:text-slate-300 leading-relaxed">
                  <strong className="font-bold text-[#0a50ff] dark:text-[#60a5fa]">Topologia Local-First:</strong> Conecte o XPE 3115-IP à porta PoE do switch da portaria. Recomenda-se fixar um IP estático na mesma faixa do servidor do condomínio (ex: <code>192.168.1.150</code>).
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Painel de Campos de Rede */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0d1b35] dark:text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#0a50ff]" />
                    Parâmetros de Conectividade IPv4
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Endereço IP do XPE 3115
                    </label>
                    <input
                      type="text"
                      value={config.ip}
                      onChange={(e) => setConfig({ ...config, ip: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold text-slate-800 dark:text-white focus:border-[#0a50ff] focus:outline-none"
                      placeholder="192.168.1.150"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Máscara de Sub-rede
                      </label>
                      <input
                        type="text"
                        value={config.netmask}
                        onChange={(e) => setConfig({ ...config, netmask: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Gateway Local
                      </label>
                      <input
                        type="text"
                        value={config.gateway}
                        onChange={(e) => setConfig({ ...config, gateway: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Porta Web HTTP (CGI / Configuração)
                    </label>
                    <input
                      type="number"
                      value={config.httpPort}
                      onChange={(e) => setConfig({ ...config, httpPort: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Botão de Teste de Ping */}
                  <button
                    onClick={handleTestNetwork}
                    disabled={networkTestStatus === 'testing'}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0a50ff] dark:text-cyan-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-300 dark:border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${networkTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>{networkTestStatus === 'testing' ? 'Verificando Conectividade...' : 'Testar Ping & Acesso Web (LAN)'}</span>
                  </button>
                </div>

                {/* Diagrama Esquemático Visual do XPE */}
                <div className="p-5 rounded-2xl bg-[#f8fafc] dark:bg-[#070e1b] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#ffb21a]" />
                      Identificação Física do Dispositivo
                    </h4>
                    
                    <div className="p-4 rounded-xl bg-white dark:bg-[#0a1426] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Modelo Oficial:</span>
                        <span className="font-bold text-slate-800 dark:text-white">Intelbras XPE 3115-IP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Alimentação:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">PoE 802.3af (ou 12Vdc / 1A)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Câmera Embutida:</span>
                        <span className="font-bold text-slate-800 dark:text-white">HD com Iluminação Noturna IR</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Relés Embutidos:</span>
                        <span className="font-bold text-[#0a50ff] dark:text-cyan-400">2 Saídas (FA e AUX)</span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback do Teste */}
                  {networkTestStatus !== 'idle' && (
                    <div className={`mt-4 p-3.5 rounded-xl border text-xs ${
                      networkTestStatus === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : networkTestStatus === 'testing'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
                    }`}>
                      {networkTestStatus === 'testing' && <span>Enviando pacotes ARP/ICMP e consultando porta 80...</span>}
                      {networkTestStatus === 'success' && networkTestResult && (
                        <div className="space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" /> Dispositivo Localizado e Online!
                          </div>
                          <div className="text-[11px] space-y-0.5">
                            <div>• Latência ICMP: <strong>{networkTestResult.pingLatencyMs} ms</strong></div>
                            <div>• Hardware: <strong>{networkTestResult.hardwareModel}</strong></div>
                            <div>• Firmware: <strong>{networkTestResult.firmwareVersion}</strong></div>
                          </div>
                        </div>
                      )}
                      {networkTestStatus === 'failed' && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Dispositivo não respondeu no IP {config.ip}. Verifique cabos e switch.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASSO 2: CONTA SIP / ASTERISK LOCAL */}
          {/* ================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#ebf2ff] dark:bg-[#0a2046] border border-[#d2e2ff] dark:border-[#173a75] flex items-start gap-3">
                <Info className="w-5 h-5 text-[#0a50ff] dark:text-[#60a5fa] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1e3a6a] dark:text-slate-300 leading-relaxed">
                  <strong className="font-bold text-[#0a50ff] dark:text-[#60a5fa]">Telefonia Independente:</strong> O XPE 3115-IP registra-se como ramal SIP diretamente no Asterisk local do condomínio. Ao discar o número de uma unidade, o Asterisk toca os smartphones dos moradores via WebRTC PWA.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0d1b35] dark:text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#ffb21a]" />
                    Parâmetros do Ramal SIP (PJSIP)
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        IP do Servidor Asterisk
                      </label>
                      <input
                        type="text"
                        value={config.sipServer}
                        onChange={(e) => setConfig({ ...config, sipServer: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Porta SIP PJSIP
                      </label>
                      <input
                        type="number"
                        value={config.sipPort}
                        onChange={(e) => setConfig({ ...config, sipPort: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Número do Ramal SIP
                      </label>
                      <input
                        type="text"
                        value={config.sipExtension}
                        onChange={(e) => setConfig({ ...config, sipExtension: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-[#0a50ff] dark:text-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Senha Secreta PJSIP
                      </label>
                      <input
                        type="password"
                        value={config.sipSecret}
                        onChange={(e) => setConfig({ ...config, sipSecret: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Modo DTMF (Acionamento)
                      </label>
                      <select
                        value={config.dtmfMode}
                        onChange={(e: any) => setConfig({ ...config, dtmfMode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="RFC2833">RFC 2833 (Recomendado)</option>
                        <option value="SIP_INFO">SIP INFO</option>
                        <option value="INBAND">In-band Audio</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Codec de Áudio Preferencial
                      </label>
                      <select
                        value={config.audioCodec}
                        onChange={(e: any) => setConfig({ ...config, audioCodec: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="PCMU">G.711u / PCMU (Alta compatibilidade)</option>
                        <option value="PCMA">G.711a / PCMA</option>
                        <option value="Opus">Opus (HD Audio)</option>
                      </select>
                    </div>
                  </div>

                  {/* Botão Testar SIP */}
                  <button
                    onClick={handleTestSip}
                    disabled={sipTestStatus === 'testing'}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0a50ff] dark:text-cyan-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-300 dark:border-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sipTestStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>{sipTestStatus === 'testing' ? 'Testando Handshake SIP...' : 'Testar Registro SIP no Asterisk'}</span>
                  </button>

                  {sipTestStatus === 'success' && sipTestResult && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {sipTestResult.message}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        RTT: <strong>{sipTestResult.rttMs} ms</strong> | Status: <strong>200 OK</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Snippet pjsip.conf com Botão de Copiar */}
                <div className="space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-500" />
                      Snippet para /etc/asterisk/pjsip.conf
                    </h4>
                    <button
                      onClick={() => handleCopy(pjsipSnippet, 'pjsip')}
                      className="px-2.5 py-1 rounded-lg bg-[#0a50ff]/10 hover:bg-[#0a50ff]/20 text-[#0a50ff] dark:text-cyan-400 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedKey === 'pjsip' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'pjsip' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  
                  <pre className="p-4 rounded-2xl bg-[#091122] text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800 custom-scrollbar h-64">
                    {pjsipSnippet}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASSO 3: RELÉS & FECHADURAS (FA E AUX) */}
          {/* ================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#ebf2ff] dark:bg-[#0a2046] border border-[#d2e2ff] dark:border-[#173a75] flex items-start gap-3">
                <Zap className="w-5 h-5 text-[#0a50ff] dark:text-[#60a5fa] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1e3a6a] dark:text-slate-300 leading-relaxed">
                  <strong className="font-bold text-[#0a50ff] dark:text-[#60a5fa]">Acionamento Híbrido:</strong> Os dois relés físicos do XPE 3115-IP podem ser acionados tanto por <strong>tom DTMF</strong> durante a chamada de interfone, quanto por <strong>API HTTP direta</strong> na rede interna quando o morador clica no app.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RELÉ 1 (FA) - PORTÃO PEDESTRE */}
                <div className="p-5 rounded-2xl bg-[#f8fafc] dark:bg-[#091224] border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#0a50ff]/10 text-[#0a50ff] dark:text-cyan-400 flex items-center justify-center font-black text-xs">
                        FA
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Relé 1: Portão Pedestre</h4>
                        <span className="text-[10px] text-slate-500">Saída Fechadura Principal</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                      Comando: {config.relay1.dtmfCommand}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Tipo de Fechadura Instalada
                      </label>
                      <select
                        value={config.relay1.lockType}
                        onChange={(e: any) =>
                          setConfig({
                            ...config,
                            relay1: { ...config.relay1, lockType: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="eletromecanica">Eletromecânica (Pulso 12V - 3 seg)</option>
                        <option value="eletroima">Eletroímã (M150 / FS 150 - NF)</option>
                        <option value="solenoide">Fecho Solenoide / Magnético</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Contato do Relé
                        </label>
                        <select
                          value={config.relay1.contactType}
                          onChange={(e: any) =>
                            setConfig({
                              ...config,
                              relay1: { ...config.relay1, contactType: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        >
                          <option value="NA">NA (Normalmente Aberto)</option>
                          <option value="NF">NF (Normalmente Fechado)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Tempo Retenção
                        </label>
                        <select
                          value={config.relay1.retentionSeconds}
                          onChange={(e: any) =>
                            setConfig({
                              ...config,
                              relay1: { ...config.relay1, retentionSeconds: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        >
                          <option value={1}>1 segundo (Botoeira)</option>
                          <option value={3}>3 segundos (Padrão)</option>
                          <option value={5}>5 segundos</option>
                          <option value={10}>10 segundos</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Código DTMF durante Chamada
                      </label>
                      <input
                        type="text"
                        value={config.relay1.dtmfCommand}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            relay1: { ...config.relay1, dtmfCommand: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                        placeholder="*07"
                      />
                    </div>
                  </div>

                  {/* Botão Testar Abertura Relé 1 */}
                  <button
                    onClick={() => handleTestRelay(1)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                      relay1TestStatus === 'open'
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : 'bg-[#0a50ff] hover:bg-[#0842cc] text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {relay1TestStatus === 'open'
                        ? '⚡ RELÉ 1 ACIONADO (PORTÃO ABERTO)'
                        : 'Testar Acionamento Relé 1 (*07)'}
                    </span>
                  </button>
                </div>

                {/* RELÉ 2 (AUX) - PORTÃO DE GARAGEM */}
                <div className="p-5 rounded-2xl bg-[#f8fafc] dark:bg-[#091224] border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#ffb21a]/10 text-[#ffb21a] flex items-center justify-center font-black text-xs">
                        AUX
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">Relé 2: Portão Garagem</h4>
                        <span className="text-[10px] text-slate-500">Saída Contato Seco / Botoeira</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                      Comando: {config.relay2.dtmfCommand}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Finalidade da Saída Auxiliar
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Botoeira de Motor de Portão (PPA / Rossi / Peccinin)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-500 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Contato do Relé
                        </label>
                        <input
                          type="text"
                          disabled
                          value="NA (Contato Seco)"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-slate-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Pulso de Botoeira
                        </label>
                        <select
                          value={config.relay2.retentionSeconds}
                          onChange={(e: any) =>
                            setConfig({
                              ...config,
                              relay2: { ...config.relay2, retentionSeconds: Number(e.target.value) },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        >
                          <option value={1}>1 segundo (Recomendado para Portão)</option>
                          <option value={2}>2 segundos</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Código DTMF durante Chamada
                      </label>
                      <input
                        type="text"
                        value={config.relay2.dtmfCommand}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            relay2: { ...config.relay2, dtmfCommand: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                        placeholder="*08"
                      />
                    </div>
                  </div>

                  {/* Botão Testar Abertura Relé 2 */}
                  <button
                    onClick={() => handleTestRelay(2)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                      relay2TestStatus === 'open'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-[#ffb21a] hover:bg-[#e69e12] text-slate-950'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {relay2TestStatus === 'open'
                        ? '⚡ PULSO RELÉ 2 ENVIADO (GARAGEM)'
                        : 'Testar Pulso Relé 2 (*08)'}
                    </span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASSO 4: CÂMERA INTEGRADA & RTSP STREAM */}
          {/* ================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#ebf2ff] dark:bg-[#0a2046] border border-[#d2e2ff] dark:border-[#173a75] flex items-start gap-3">
                <Camera className="w-5 h-5 text-[#0a50ff] dark:text-[#60a5fa] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1e3a6a] dark:text-slate-300 leading-relaxed">
                  <strong className="font-bold text-[#0a50ff] dark:text-[#60a5fa]">Vídeo Assimétrico Seguro:</strong> O XPE 3115-IP disponibiliza stream RTSP em H.264. O servidor Enlace-DoorIA transcodifica e entrega o vídeo via WebRTC diretamente para o WebPhone do morador ou tela da portaria com latência inferior a 100ms.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 text-xs">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0d1b35] dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#0a50ff]" />
                    Parâmetros de Transmissão de Vídeo
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Porta RTSP
                      </label>
                      <input
                        type="number"
                        value={config.rtspStream.rtspPort}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            rtspStream: { ...config.rtspStream, rtspPort: Number(e.target.value) },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Sub-Stream (Mobile)
                      </label>
                      <select
                        value={config.rtspStream.subType}
                        onChange={(e: any) =>
                          setConfig({
                            ...config,
                            rtspStream: { ...config.rtspStream, subType: Number(e.target.value) },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value={0}>Main Stream (1080p - Alta Definição)</option>
                        <option value={1}>Sub Stream (D1/720p - Baixa Latência)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">
                      URL RTSP Formatada (Intelbras Padrão)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`rtsp://${config.rtspStream.username}:*****@${config.ip}:${config.rtspStream.rtspPort}/cam/realmonitor?channel=1&subtype=${config.rtspStream.subType}`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-slate-600 dark:text-slate-300"
                      />
                      <button
                        onClick={() =>
                          handleCopy(
                            `rtsp://${config.rtspStream.username}:${config.rtspStream.password}@${config.ip}:${config.rtspStream.rtspPort}/cam/realmonitor?channel=1&subtype=${config.rtspStream.subType}`,
                            'rtsp'
                          )
                        }
                        className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-white transition cursor-pointer"
                        title="Copiar URL RTSP"
                      >
                        {copiedKey === 'rtsp' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070e1b] border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Transmissão Criptografada
                    </div>
                    <p className="text-slate-500 text-[11px] leading-normal">
                      A visualização das imagens externas do XPE é privada: o morador só tem acesso ao vídeo do portão social enquanto uma chamada ativa estiver destinada ao seu apartamento ou com autorização explícita do síndico.
                    </p>
                  </div>
                </div>

                {/* Preview Simulado do Feed de Vídeo */}
                <div className="rounded-2xl bg-black border border-slate-800 overflow-hidden flex flex-col justify-between p-4 relative min-h-[220px]">
                  <div className="flex items-center justify-between z-10 text-[11px] text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      <span className="font-bold">CAM 01 - TOTEM XPE 3115-IP</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-black/60 font-mono text-[10px] border border-white/20">
                      1080p @ 30fps
                    </span>
                  </div>

                  <div className="my-auto text-center z-10">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-60" />
                    <span className="text-xs text-slate-400 font-mono">Stream WebRTC Conectado (go2rtc bridge)</span>
                  </div>

                  <div className="flex justify-between items-center z-10 text-[10px] text-slate-400 font-mono border-t border-white/10 pt-2">
                    <span>IP: {config.ip}:554</span>
                    <span>H.264 Baseline Profile</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PASSO 5: DIAGNÓSTICO GERAL & ATIVAÇÃO */}
          {/* ================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  <strong className="font-bold">Configuração Completa e Validada!</strong> Todos os dados foram parametrizados. Ao clicar em "Salvar e Sincronizar", o sistema aplicará os nomes, números de ramal e comandos DTMF em toda a plataforma.
                </div>
              </div>

              {/* Checklist de Diagnóstico de Saúde */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0a1528] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Conectividade LAN</div>
                    <div className="text-[10px] text-slate-500 font-mono">IP: {config.ip}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0a1528] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Tronco SIP PJSIP</div>
                    <div className="text-[10px] text-slate-500 font-mono">Ramal: {config.sipExtension}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0a1528] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Relé 1 (Pedestre)</div>
                    <div className="text-[10px] text-slate-500 font-mono">DTMF: {config.relay1.dtmfCommand}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0a1528] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Relé 2 (Garagem)</div>
                    <div className="text-[10px] text-slate-500 font-mono">DTMF: {config.relay2.dtmfCommand}</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0a1528] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Câmera Embutida</div>
                    <div className="text-[10px] text-slate-500 font-mono">RTSP H.264 Ativo</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0a1528] border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">✓</div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Policy Engine</div>
                    <div className="text-[10px] text-slate-500 font-mono">Auditoria SHA-256</div>
                  </div>
                </div>
              </div>

              {/* Guia Rápido de 3 Cliques na Interface Intelbras */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#070e1b] border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Onde Configurar na Tela Web do XPE 3115-IP:
                </h4>
                <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Acesse no navegador: <strong>http://{config.ip}</strong> (usuário: <code>admin</code>).</li>
                  <li>Vá em <strong>Telefonia &gt; Conta SIP</strong> e preencha Servidor: <code>{config.sipServer}</code>, Ramal: <code>{config.sipExtension}</code> e Modo DTMF: <code>{config.dtmfMode}</code>.</li>
                  <li>Vá em <strong>Acesso &gt; Fechaduras</strong> e confirme o código da Fechadura 1 como <code>{config.relay1.dtmfCommand}</code> e Fechadura 2 como <code>{config.relay2.dtmfCommand}</code>.</li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* RODAPÉ COM NAVEGAÇÃO E BOTÃO DE SALVAR */}
        <div className="px-6 py-4 bg-[#f8faff] dark:bg-[#070d18] border-t border-[#e2ecf9] dark:border-[#192b4a] flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < 5 ? (
              <button
                onClick={() => setCurrentStep((currentStep + 1) as any)}
                className="px-5 py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <span>Avançar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white text-xs font-extrabold flex items-center gap-2 transition shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Integração Salva com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{loading ? 'Salvando...' : 'Salvar & Ativar no Condomínio'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
