import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  Radio,
  Server,
  Camera,
  Smartphone,
  ShieldCheck,
  Cpu,
  Download,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  Search,
  FileCode,
  Terminal,
  Zap,
  Lock,
  Wifi,
  PhoneCall,
  QrCode,
  Info
} from 'lucide-react';
import type { UserSession } from '../types.ts';

interface HelpModuleProps {
  session: UserSession;
  onOpenXpeSimulator?: () => void;
  onOpenQrSimulator?: () => void;
  onToggleWebPhone?: () => void;
  onOpenMaia?: () => void;
  onSelectTab?: (tab: any) => void;
}

export const HelpModule: React.FC<HelpModuleProps> = ({
  session,
  onOpenXpeSimulator,
  onOpenQrSimulator,
  onToggleWebPhone,
  onOpenMaia,
  onSelectTab,
}) => {
  const [activeSection, setActiveSection] = useState<'inicio' | 'xpe' | 'asterisk' | 'cameras' | 'pwa' | 'deploy' | 'faq'>('inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const sections = [
    { id: 'inicio', label: 'Visão Geral & Início', icon: BookOpen },
    { id: 'xpe', label: 'Totem XPE 3115-IP', icon: Radio },
    { id: 'asterisk', label: 'PBX Asterisk 20 LTS', icon: Server },
    { id: 'cameras', label: 'CFTV & go2rtc WebRTC', icon: Camera },
    { id: 'pwa', label: 'PWA Mobile & APK', icon: Smartphone },
    { id: 'deploy', label: 'Deploy & Produção', icon: Terminal },
    { id: 'faq', label: 'FAQ & Diagnóstico', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Cabeçalho do Módulo de Ajuda */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#dde5f0] dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-[#0a50ff]/5 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0a50ff]/10 text-[#0a50ff] dark:bg-cyan-950/50 dark:text-cyan-400 border border-[#0a50ff]/20 dark:border-cyan-800/50">
                Documentação & Manuais Operacionais
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">v1.0 LTS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0d1b35] dark:text-white font-['Red_Hat_Display'] tracking-tight">
              Central de Ajuda, Manuais & Deploy
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Guias técnicos completos, parametrizações do Intelbras XPE 3115-IP, arquitetura Asterisk 20 PJSIP, streaming WebRTC sub-50ms e procedimentos de implantação em produção.
            </p>
          </div>

          {/* Ações Rápidas de Teste */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenXpeSimulator && (
              <button
                onClick={onOpenXpeSimulator}
                className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-bold transition hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Radio className="w-3.5 h-3.5 text-amber-600" />
                <span>Simular Totem XPE</span>
              </button>
            )}
            {onToggleWebPhone && (
              <button
                onClick={onToggleWebPhone}
                className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-bold transition hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#0a50ff]" />
                <span>Abrir WebPhone PWA</span>
              </button>
            )}
            {onOpenMaia && (
              <button
                onClick={onOpenMaia}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0a50ff] to-[#55b0ff] text-white text-xs font-bold transition hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Perguntar à MaIA</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Navegação Horizontal das Seções de Ajuda */}
        <div className="flex items-center gap-2 mt-8 overflow-x-auto pb-2 scrollbar-none border-t border-slate-100 dark:border-slate-800/80 pt-4">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0a50ff] text-white shadow-lg shadow-[#0a50ff]/25 scale-[1.02]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO DAS SEÇÕES */}

      {/* 1. VISÃO GERAL & INÍCIO */}
      {activeSection === 'inicio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Princípios Arquiteturais */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                    Arquitetura Local-First para Portaria
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Resiliência absoluta sem dependência obrigatória de conexão externa</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0a50ff] dark:text-cyan-400">
                    <Wifi className="w-4 h-4" />
                    <span>Sobrevivência de LAN</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Se o link de internet do provedor cair, o interfone SIP, o acionamento de fechaduras, o CFTV local e a portaria continuam operando 100% normalmente na rede local.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <Lock className="w-4 h-4" />
                    <span>Segurança Física Anti-Invasão</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Nenhum cabo de abertura de fechadura vai para a calçada. O comando DTMF (*07 e *08) é decodificado dentro do PBX Asterisk na guarita blindada, acionando relé interno seguro.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Camera className="w-4 h-4" />
                    <span>Vídeo Assimétrico Seguro</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    O morador enxerga a câmera em alta resolução da portaria ao vivo, mas a câmera pessoal do morador nunca é aberta para o visitante, garantindo privacidade doméstica.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Cpu className="w-4 h-4" />
                    <span>Governança por Policy Engine</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Nenhuma ação de abertura ou liberação ocorre sem autenticação de sessão e registro de auditoria criptográfica imutável com carimbo de tempo.
                  </p>
                </div>
              </div>

              {/* Fluxo de Chamada */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Fluxo Operacional de Chamada de Interfone
                </h3>
                <div className="relative pl-6 space-y-4 border-l-2 border-[#0a50ff]/20 dark:border-cyan-500/20">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#0a50ff] text-white flex items-center justify-center text-[10px] font-bold">1</div>
                    <div className="text-xs font-bold text-[#0d1b35] dark:text-white">Visitante disca no Totem XPE 3115-IP (ex: Apto 101)</div>
                    <div className="text-xs text-slate-500">O totem envia INVITE SIP UDP para o PBX Asterisk na porta 5060.</div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#0a50ff] text-white flex items-center justify-center text-[10px] font-bold">2</div>
                    <div className="text-xs font-bold text-[#0d1b35] dark:text-white">Asterisk aciona Ring Group Simultâneo</div>
                    <div className="text-xs text-slate-500">O ramal físico da portaria e o WebPhone PWA (WebRTC/WSS) tocam juntos com push notification no celular do morador.</div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#0a50ff] text-white flex items-center justify-center text-[10px] font-bold">3</div>
                    <div className="text-xs font-bold text-[#0d1b35] dark:text-white">Atendimento e Transmissão de Vídeo go2rtc</div>
                    <div className="text-xs text-slate-500">Ao atender, o vídeo da câmera do portão é exibido em sub-50ms via WebRTC sem transcodificação de CPU.</div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">4</div>
                    <div className="text-xs font-bold text-[#0d1b35] dark:text-white">Liberação por DTMF (*07 Pedestre / *08 Garagem)</div>
                    <div className="text-xs text-slate-500">O morador clica em "Abrir Portão Social". O sistema envia *07 via DTMF in-band e o relé seguro é acionado.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Guias por Papel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-4">
              <h2 className="text-base font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                Guias Rápidos por Perfil
              </h2>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-[#0a50ff] dark:text-cyan-400">Morador</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Atendimento de interfone no smartphone via WebPhone PWA, geração de convites com QR Code para amigos/prestadores, visualização de boletos e reserva de churrasqueira/salão de festas.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">Síndico & Gestor</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Gestão cadastral de unidades e moradores, controle de inadimplência, auditoria de gravações telefônicas e aprovação de reservas de áreas sociais.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Engenharia / Instalador</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Descoberta automática de câmeras ONVIF na LAN, parametrização do Intelbras XPE 3115-IP, monitoramento de saúde do Asterisk 20 e testes de acionamento de relés.
                  </p>
                </div>
              </div>
            </div>

            {/* Caixa de Diagnóstico Rápido */}
            <div className="bg-gradient-to-br from-[#0a162c] to-[#0d1b35] rounded-3xl p-6 text-white border border-[#1e2f50] shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#55b0ff]">
                <Info className="w-4 h-4" />
                <span>Estado de Saúde Atual</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                A aplicação conta com o <strong>ErrorBoundary Global</strong> ativo e proteção contra loops em players WebRTC.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800">
                <span>Asterisk PBX: Local 5060</span>
                <span className="text-emerald-400 font-bold">100% Operacional</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOTEM INTELBRAS XPE 3115-IP */}
      {activeSection === 'xpe' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600">
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                    Parametrização do Totem Intelbras XPE 3115-IP
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configuração recomendada da interface web para integração SIP e vídeo RTSP</p>
                </div>
              </div>

              {onOpenXpeSimulator && (
                <button
                  onClick={onOpenXpeSimulator}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition flex items-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Abrir Simulador Interativo do Totem</span>
                </button>
              )}
            </div>

            {/* Tabela de Configurações XPE 3115-IP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#0a50ff]" />
                  <span>1. Configuração de Rede & SIP</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">IP Estático do Totem:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">192.168.1.150</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Máscara / Gateway:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">255.255.255.0 / 192.168.1.1</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Servidor SIP (Asterisk IP):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">192.168.1.100:5060</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Ramal SIP do Totem:</span>
                    <span className="font-mono font-bold text-[#0a50ff] dark:text-cyan-400">100 (xpe-portaria)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Transporte SIP:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">UDP (recomendado para LAN)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Codecs de Áudio:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">G.711u (PCMU), G.711a (PCMA)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>2. Configuração de Câmera & Streaming RTSP</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Porta RTSP:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">554 (TCP/UDP)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Codec de Vídeo:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">H.264 Baseline/Main (Sem H.265)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Resolução Recomendada:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">1280x720 (720p) @ 25fps</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Bitrate Recomendado:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">1500 kbps (CBR)</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">URL RTSP go2rtc:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title="rtsp://admin:admin@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0">
                      /cam/realmonitor?channel=1...
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Abertura e Comandos DTMF */}
            <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Comandos de Abertura via Teclado DTMF</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Portão Social (Pedestre)</div>
                    <div className="text-[11px] text-slate-500">Relé 1 (Fechadura Eletroímã / Eletromecânica)</div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm border border-emerald-500/20">
                    *07
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">Portão Garagem (Veículos)</div>
                    <div className="text-[11px] text-slate-500">Relé 2 (Motor Basculante / Pivotante)</div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-[#0a50ff]/10 text-[#0a50ff] dark:text-cyan-400 font-mono font-bold text-sm border border-[#0a50ff]/20">
                    *08
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PBX ASTERISK 20 LTS */}
      {activeSection === 'asterisk' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-[#0a50ff] dark:text-cyan-400">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                  Servidor Asterisk 20 LTS Pure (PJSIP)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Arquitetura de telefonia local-first independente, dialplan e integração AMI</p>
              </div>
            </div>

            {/* Informações de Portas e Serviços */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] text-slate-500 font-medium">SIP Sinalização</div>
                <div className="text-sm font-mono font-bold text-[#0a50ff] dark:text-cyan-400 mt-0.5">5060 UDP</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] text-slate-500 font-medium">WebRTC WSS</div>
                <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">8089 TCP</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] text-slate-500 font-medium">Mídia RTP</div>
                <div className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">10000-20000</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] text-slate-500 font-medium">Socket AMI</div>
                <div className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">5038 TCP</div>
              </div>
            </div>

            {/* Bloco de Código de Exemplo: pjsip.conf */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#0a50ff]" />
                  /etc/asterisk/pjsip.conf (Snippet Endpoint XPE & WebRTC)
                </span>
                <button
                  onClick={() => copyToClipboard(`[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

; Totem Intelbras XPE 3115-IP
[100]
type=endpoint
context=interfonia-condominial
disallow=all
allow=ulaw,alaw
auth=100-auth
aors=100
direct_media=no

[100-auth]
type=auth
auth_type=userpass
username=100
password=SegredoPortaria2026!

[100]
type=aor
max_contacts=2`, 'pjsip')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedSnippet === 'pjsip' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#070d18] text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

; Totem Intelbras XPE 3115-IP
[100]
type=endpoint
context=interfonia-condominial
disallow=all
allow=ulaw,alaw
auth=100-auth
aors=100
direct_media=no

[100-auth]
type=auth
auth_type=userpass
username=100
password=SegredoPortaria2026!

[100]
type=aor
max_contacts=2`}
              </pre>
            </div>

            {/* Bloco de Código de Exemplo: extensions.conf */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  /etc/asterisk/extensions.conf (Dialplan & Ring Group)
                </span>
                <button
                  onClick={() => copyToClipboard(`[interfonia-condominial]
; Chamada para Apto 101: Toca WebPhone do Morador e Guarita simultaneamente
exten => 101,1,NoOp(Chamada Interfone para Apto 101)
 same => n,Set(CHANNEL(hangup_handler_push)=gravar-auditoria,s,1)
 same => n,Dial(PJSIP/101-webrtc&PJSIP/200-guarita,30,tT)
 same => n,Hangup()

; Comandos de Abertura DTMF do XPE
exten => *07,1,NoOp(Comando Abertura Pedestre)
 same => n,AGI(acionar_rele.py,rele1,pedestre)
 same => n,Playback(beep)
 same => n,Hangup()

exten => *08,1,NoOp(Comando Abertura Garagem)
 same => n,AGI(acionar_rele.py,rele2,garagem)
 same => n,Playback(beep)
 same => n,Hangup()`, 'extensions')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedSnippet === 'extensions' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#070d18] text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`[interfonia-condominial]
; Chamada para Apto 101: Toca WebPhone do Morador e Guarita simultaneamente
exten => 101,1,NoOp(Chamada Interfone para Apto 101)
 same => n,Set(CHANNEL(hangup_handler_push)=gravar-auditoria,s,1)
 same => n,Dial(PJSIP/101-webrtc&PJSIP/200-guarita,30,tT)
 same => n,Hangup()

; Comandos de Abertura DTMF do XPE
exten => *07,1,NoOp(Comando Abertura Pedestre)
 same => n,AGI(acionar_rele.py,rele1,pedestre)
 same => n,Playback(beep)
 same => n,Hangup()

exten => *08,1,NoOp(Comando Abertura Garagem)
 same => n,AGI(acionar_rele.py,rele2,garagem)
 same => n,Playback(beep)
 same => n,Hangup()`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 4. CFTV & GO2RTC WEBRTC */}
      {activeSection === 'cameras' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                  go2rtc: Streaming WebRTC Sub-50ms
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Re-streaming ultra-eficiente de RTSP para navegadores sem sobrecarga de CPU</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Zero Transcodificação</div>
                <p className="text-xs text-slate-500 mt-1">O stream H.264 da câmera IP é empacotado diretamente em pacotes WebRTC RTP sem re-codificar o vídeo.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Detecção de Resolução</div>
                <p className="text-xs text-slate-500 mt-1">O player detecta automaticamente 4K UHD, 1080p Full HD, 720p HD e SD com medição de bitrate em tempo real.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Porta de Serviço</div>
                <p className="text-xs text-slate-500 mt-1">Interface Web e WebSocket na porta 1984 (`http://192.168.1.100:1984/api/ws`).</p>
              </div>
            </div>

            {/* go2rtc.yaml */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  go2rtc.yaml (Configuração das 4 Câmeras do Condomínio)
                </span>
                <button
                  onClick={() => copyToClipboard(`streams:
  # Câmera 01: Totem Intelbras XPE 3115-IP (Calçada Entrada)
  cam-01: rtsp://admin:admin@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0

  # Câmera 02: Eclusa de Pedestres
  cam-02: rtsp://admin:Intelbras2026@192.168.1.151:554/cam/realmonitor?channel=1&subtype=0

  # Câmera 03: Portão Garagem Veicular (LPR / Placas)
  cam-03: rtsp://admin:Hikvision2026@192.168.1.152:554/Streaming/Channels/101

  # Câmera 04: Hall dos Elevadores
  cam-04: rtsp://admin:Intelbras2026@192.168.1.153:554/cam/realmonitor?channel=1&subtype=0

api:
  listen: ":1984"

webrtc:
  listen: ":8555"`, 'go2rtc')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedSnippet === 'go2rtc' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#070d18] text-slate-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
{`streams:
  # Câmera 01: Totem Intelbras XPE 3115-IP (Calçada Entrada)
  cam-01: rtsp://admin:admin@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0

  # Câmera 02: Eclusa de Pedestres
  cam-02: rtsp://admin:Intelbras2026@192.168.1.151:554/cam/realmonitor?channel=1&subtype=0

  # Câmera 03: Portão Garagem Veicular (LPR / Placas)
  cam-03: rtsp://admin:Hikvision2026@192.168.1.152:554/Streaming/Channels/101

  # Câmera 04: Hall dos Elevadores
  cam-04: rtsp://admin:Intelbras2026@192.168.1.153:554/cam/realmonitor?channel=1&subtype=0

api:
  listen: ":1984"

webrtc:
  listen: ":8555"`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 5. PWA MOBILE & APK */}
      {activeSection === 'pwa' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                  Progressive Web App (PWA) & Compilação APK
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Instalação direta no smartphone ou geração de instalador Android nativo com Capacitor</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#0a50ff]" />
                  <span>Método 1: Instalação PWA Direta (Sem Loja)</span>
                </h3>
                <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li>Acesse o link do condomínio no Chrome (Android) ou Safari (iOS).</li>
                  <li>No Android: clique no botão "Instalar Aplicativo" exibido no rodapé ou no menu de 3 pontos &gt; "Adicionar à tela inicial".</li>
                  <li>No iOS (iPhone): toque no botão Compartilhar (quadrado com seta) &gt; "Adicionar à Tela de Início".</li>
                  <li>O aplicativo passará a abrir em tela cheia com ícone dedicado e suporte a notificações push de interfone.</li>
                </ol>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span>Método 2: Compilação em APK com Capacitor</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  O projeto já conta com o diretório <code>/android</code> pré-configurado com Gradle 8.4 e Capacitor 6+.
                </p>
                <div className="space-y-1.5 font-mono text-[11px] bg-[#070d18] text-slate-300 p-3 rounded-xl border border-slate-800">
                  <div>npm run build</div>
                  <div>npx cap sync android</div>
                  <div>cd android &amp;&amp; ./gradlew assembleDebug</div>
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Arquivo gerado em: <code>android/app/build/outputs/apk/debug/app-debug.apk</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. DEPLOY & PRODUÇÃO */}
      {activeSection === 'deploy' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                  Implantação em Produção (Deploy Fácil)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Instruções para Mini PC Local (Ubuntu/Debian) com Docker Compose e PostgreSQL Local</p>
              </div>
            </div>

            {/* Passos de Deploy */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0a50ff] text-white flex items-center justify-center text-[11px]">1</span>
                  <span>O jeito mais rápido: Script Automático (Recomendado)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Criamos um script intuitivo que orquestra todo o ecossistema (PostgreSQL, Asterisk, go2rtc e Motor Node.js) em um comando só.
                </p>
                <div className="p-2.5 rounded-xl bg-[#070d18] text-slate-300 font-mono text-xs border border-slate-800">
                  chmod +x deploy.sh<br />
                  ./deploy.sh
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0a50ff] text-white flex items-center justify-center text-[11px]">2</span>
                  <span>Banco de Dados Drizzle ORM + PostgreSQL 16 LTS</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  O banco relacional opera 100% no servidor físico da guarita (Mini PC), mantendo integridade com Drizzle ORM. Zero dependência de Firestore ou nuvens externas.
                </p>
                <div className="p-2.5 rounded-xl bg-[#070d18] text-slate-300 font-mono text-xs border border-slate-800 flex flex-col">
                  <span className="text-slate-500"># Para gerar migrações:</span>
                  <span>npm run db:generate</span>
                  <span className="text-slate-500 mt-2"># Para aplicar no PostgreSQL local:</span>
                  <span>npm run db:push</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0a50ff] text-white flex items-center justify-center text-[11px]">3</span>
                  <span>Orquestração Docker Compose Manual</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Caso prefira iniciar a estrutura sem o shell script, suba todos os 4 containers (Banco, Telefonia, Câmeras e App) de uma só vez:
                </p>
                <div className="p-2.5 rounded-xl bg-[#070d18] text-slate-300 font-mono text-xs border border-slate-800">
                  docker-compose up -d --build
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0a50ff] text-white flex items-center justify-center text-[11px]">4</span>
                  <span>Integração Inteligência Artificial & Gateway (9router)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  A comunicação com a MaIA (IA) pode ser redirecionada dinamicamente informando seu proxy reverso local (Ex: 9router.enlace.slz.br) na aba de configurações do Condomínio. O backend ajusta automaticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. FAQ & DIAGNÓSTICO */}
      {activeSection === 'faq' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#dde5f0] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                  Perguntas Frequentes & Diagnóstico Rápido
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Soluções imediatas para os cenários operacionais mais comuns</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Por que ocorreu tela em branco e como foi solucionado?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ocorria um loop recursivo de notificação de resolução de vídeo das 4 câmeras para o componente pai sem memoização de callbacks. Corrigimos estabilizando as referências com <code>useCallback</code> e <code>lastReportedResolutionRef</code>, além de envolver a raiz da aplicação com o componente <code>ErrorBoundary</code>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Como testar o sistema se o popup do Google for bloqueado?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  A tela de login agora inclui botões de demonstração rápida (<strong>Super Admin</strong>, <strong>Síndico Gestor</strong> e <strong>Morador</strong>) com persistência em armazenamento local seguro, permitindo operar todas as telas mesmo em ambientes restritos de iframe.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>O que acontece se a internet do condomínio for interrompida?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Nada para. O Asterisk 20, o XPE 3115-IP e as câmeras operam em rede local pura (LAN). As chamadas tocam e os portões abrem normalmente. Apenas serviços que usam a nuvem externa (como a IA Gemini avançada) comutam suavemente para o mecanismo semântico local.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Como os visitantes usam o QR Virtual Intercom?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  O visitante aponta a câmera do celular para a placa com QR Code na portaria. Uma página web leve é aberta diretamente no navegador dele, permitindo discar para a unidade e falar por áudio/vídeo WebRTC sem precisar baixar nenhum aplicativo da loja.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
