import React, { useState } from 'react';
import {
  Server,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Activity,
  Layers,
  Lock,
  Unlock,
  Terminal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  FileText,
  Network,
  Video,
  Smartphone,
  Download,
  BellRing,
} from 'lucide-react';
import type { SystemStatus, AuditLogEntry, EventBusMessage, IoTDevice, AutomationRule } from '../types.ts';

interface AdminTopologyViewProps {
  systemStatus: SystemStatus | null;
  auditLogs: AuditLogEntry[];
  events: EventBusMessage[];
  iotDevices: IoTDevice[];
  automations: AutomationRule[];
  onToggleIoTDevice: (deviceId: string) => void;
}

export const AdminTopologyView: React.FC<AdminTopologyViewProps> = ({
  systemStatus,
  auditLogs,
  events,
  iotDevices,
  automations,
  onToggleIoTDevice,
}) => {
  const [activeTab, setActiveTab] = useState<'topologia' | 'auditoria' | 'eventos' | 'iot' | 'documentacao'>('topologia');

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <span>Topologia Local-First & Engenharia da Portaria</span>
          </h2>
          <p className="text-xs text-slate-400">
            Painel Operacional Síndico / Engenharia | Asterisk Vanilla PJSIP | Zero Nuvem Obrigatória
          </p>
        </div>

        {/* Status Geral */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LAN 192.168.1.0/24 OK
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800">
            Policy Engine: 2.4ms Latência
          </span>
        </div>
      </div>

      {/* ABAS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('topologia')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'topologia'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Diagrama de Infraestrutura
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'auditoria'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Logs de Auditoria Imutáveis ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('eventos')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'eventos'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Event Bus Streaming ({events.length})
        </button>

        <button
          onClick={() => setActiveTab('iot')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'iot'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Automação & IoT Zigbee ({iotDevices.length})
        </button>

        <button
          onClick={() => setActiveTab('documentacao')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === 'documentacao'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Manual & Docs do Sistema</span>
        </button>
      </div>

      {/* ABA 1: DIAGRAMA DE INFRAESTRUTURA LOCAL-FIRST */}
      {activeTab === 'topologia' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bloco 1: Comunicação & Asterisk */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Asterisk 20 LTS Pure</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  ONLINE
                </span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                <li>• Driver PJSIP / DTLS-SRTP WSS</li>
                <li>• Sem FreePBX / Sem Issabel</li>
                <li>• DTMF *07 (Pedestre) / *08 (Garagem)</li>
                <li>• Gravação Ativa sob Demanda (SHA-256)</li>
                <li>• 14 Ramais Registrados (12 Unidades + Portaria + Backup)</li>
              </ul>
            </div>

            {/* Bloco 2: Totem XPE & Câmeras */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Intelbras XPE-3115-IP</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  LAN 192.168.1.150
                </span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                <li>• Firmware: v3.2.0-secure</li>
                <li>• Câmera: H.264 Baseline ONVIF Profile T</li>
                <li>• Áudio: G.711u / Opus Bidirecional</li>
                <li>• Vídeo Assimétrico (Visitante -&gt; Morador)</li>
                <li>• URA MaIA obrigatória (Seção 7 do PRD)</li>
              </ul>
            </div>

            {/* Bloco 3: Gateway IoT Zigbee */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>NovaDigital HNZ-CB3</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  Zigbee 3.0 Ethernet
                </span>
              </div>
              <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                <li>• Conexão Ethernet nativa (Sem USB no server)</li>
                <li>• Zero dependência de Tuya Cloud</li>
                <li>• Relés de acionamento dos portões</li>
                <li>• Sensores de presença veicular e iluminação</li>
                <li>• Event Bus local WHEN/IF/THEN</li>
              </ul>
            </div>
          </div>

          {/* Resumo Arquitetural das 15 Regras de Ouro */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Matriz de Conformidade: As 15 Regras de Ouro do Master PRD</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                15 / 15 VALIDADAS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #01</span>
                <div className="font-bold text-white text-xs">Alta Disponibilidade Local</div>
                <p className="text-[11px] text-slate-400">Interfonia opera 100% na LAN sem parar caso a Internet ou IA falhem.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #02</span>
                <div className="font-bold text-white text-xs">Isolamento de Segurança MaIA</div>
                <p className="text-[11px] text-slate-400">A IA nunca toca no banco SQL nem dispara relés sem mediação estrita do Policy Engine.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #03</span>
                <div className="font-bold text-white text-xs">Isolamento Entre Unidades</div>
                <p className="text-[11px] text-slate-400">Nenhum morador acessa histórico, dados ou câmeras privativas de outros apartamentos.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #04</span>
                <div className="font-bold text-white text-xs">Validação de DTMF *07 / *08</div>
                <p className="text-[11px] text-slate-400">Abertura só é liberada se houver chamada autenticada e unidade conferida.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #05</span>
                <div className="font-bold text-white text-xs">Vídeo Assimétrico Obrigatório</div>
                <p className="text-[11px] text-slate-400">Morador vê o visitante da portaria, mas a câmera do morador nunca é exposta no totem.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #06</span>
                <div className="font-bold text-white text-xs">Auditoria Imutável em Append-Only</div>
                <p className="text-[11px] text-slate-400">Todas as aberturas e eventos são assinados com hash SHA-256 e protegidos contra deleção.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #07</span>
                <div className="font-bold text-white text-xs">Fallback Telefônico SIP/GSM</div>
                <p className="text-[11px] text-slate-400">Se o PWA do morador não responder em 15s, a chamada transborda automaticamente para celular.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #08</span>
                <div className="font-bold text-white text-xs">Controle Financeiro Desacoplado</div>
                <p className="text-[11px] text-slate-400">Inadimplência não bloqueia abertura do portão nem o interfone de emergência do morador.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #09</span>
                <div className="font-bold text-white text-xs">Tokens QR Descartáveis & Efêmeros</div>
                <p className="text-[11px] text-slate-400">Convites virtuais têm validade máxima de 24h e contagem rigorosa de acessos por sessão.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #10</span>
                <div className="font-bold text-white text-xs">LGPD & Privacidade de Gravações</div>
                <p className="text-[11px] text-slate-400">Acesso a mídias gravadas é restrito à auditoria pericial sob tutela legal do síndico.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #11</span>
                <div className="font-bold text-white text-xs">Asterisk Vanilla Sem Bloatware</div>
                <p className="text-[11px] text-slate-400">PJSIP nativo sem FreePBX/Issabel para máxima performance, segurança e mínima superfície de ataque.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #12</span>
                <div className="font-bold text-white text-xs">Gateway Zigbee 3.0 Ethernet</div>
                <p className="text-[11px] text-slate-400">Uso do NovaDigital HNZ-CB3 com comunicação local via socket/LAN sem dongle USB no servidor.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #13</span>
                <div className="font-bold text-white text-xs">Retirada Segura de Pacotes por PIN</div>
                <p className="text-[11px] text-slate-400">Portaria só entrega encomendas mediante conferência do código randômico emitido no app.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #14</span>
                <div className="font-bold text-white text-xs">Auditoria de Reconhecimento LPR</div>
                <p className="text-[11px] text-slate-400">Câmera de garagem confronta placas registradas e loga score de confiança OCR no audit trail.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">REGRA #15</span>
                <div className="font-bold text-white text-xs">Botão de Pânico & Alerta de Coação</div>
                <p className="text-[11px] text-slate-400">Ativação imediata de refletores Zigbee, notificação prioritária e log pericial irremovível.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: LOGS DE AUDITORIA IMUTÁVEIS */}
      {activeTab === 'auditoria' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4">Ator</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Recurso</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">DTMF / Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{log.actor}</td>
                    <td className="py-3 px-4 text-cyan-300">{log.action}</td>
                    <td className="py-3 px-4 text-slate-300">{log.target}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'PERMITIDO'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {log.dtmfCommand && (
                        <span className="text-amber-400 font-bold mr-2">[{log.dtmfCommand}]</span>
                      )}
                      {log.reason || JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 3: EVENT BUS STREAMING */}
      {activeTab === 'eventos' && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="space-y-2">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="text-slate-400">{new Date(evt.timestamp).toLocaleTimeString('pt-BR')}</span>
                    <span className="font-bold text-cyan-300">{evt.type}</span>
                    <span className="text-slate-500">[{evt.source}]</span>
                  </div>
                  <div className="text-slate-400 truncate max-w-sm">
                    {JSON.stringify(evt.payload)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: IOT ZIGBEE & AUTOMAÇÕES */}
      {activeTab === 'iot' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Dispositivos Zigbee 3.0 & Relés Ethernet</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {iotDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{dev.name}</h4>
                    <p className="text-[11px] text-slate-400">{dev.location}</p>
                    <div className="text-[10px] font-mono text-cyan-400 mt-1">
                      {dev.protocol} | Gateway HNZ-CB3
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleIoTDevice(dev.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      dev.state === 'ligado'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {dev.state === 'ligado' ? 'Ligado' : 'Desligado'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Regras de Automação WHEN / IF / THEN</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {automations.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{rule.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ATIVA
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{rule.description}</p>
                  <div className="p-2 rounded-lg bg-slate-950 text-[11px] font-mono text-cyan-300 space-y-0.5">
                    <div>WHEN: {rule.triggerEvent}</div>
                    <div>IF: {rule.condition}</div>
                    <div>THEN: {rule.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: REGRAS DE NEGÓCIO E VALIDAÇÃO BACKEND/FRONTEND */}
      {activeTab === 'documentacao' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Manual Operacional & Arquitetura Enlace-DoorIA</h3>
                <p className="text-xs text-slate-400">
                  Referência técnica consolidada para Síndicos, Administradores, Integradores de CFTV e Portaria.
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Seções do Manual */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* Seção 1: Arquitetura em Três Motores */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>1. Tríade Arquitetural Local-First</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                O sistema roda na guarita em um nó x86-64 sem dependência obrigatória de conectividade de nuvem para a operação diária de interfonia e controle de acesso.
              </p>
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Motor A: Asterisk 20+ Pure (PJSIP)</span>
                    <span className="text-[10px] font-mono text-emerald-400">SIP: 5060 | RTP: 10000-20000</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Gerencia sinalização SIP, registro de ramais condominiais, codecs G.711u/alaw e injeção de comandos DTMF no canal seguro via Asterisk Manager Interface (AMI).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Motor B: go2rtc Video Gateway</span>
                    <span className="text-[10px] font-mono text-cyan-400">WebRTC WS: 1984 | RTSP: 554</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Conversor ultra-rápido de streams RTSP para WebRTC H.264. Entrega latência inferior a 50ms nos navegadores e apps sem onerar a CPU do servidor.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Motor C: Enlace-DoorIA Core + Policy Engine</span>
                    <span className="text-[10px] font-mono text-purple-400">Node.js + React | REST / WS: 3000</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Orquestrador com barramento de eventos pub/sub, RBAC granular (Síndico, Operador, Morador) e inteligência artificial MaIA com guardrails estritos.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 2: Regras de Segurança Física e Anti-Invasão */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>2. Protocolos de Segurança Física</span>
              </div>
              <ul className="space-y-2.5 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Zero Contato Seco na Rua:</strong> Nenhum fio de fechadura magnética ou motor de portão sai diretamente do interfone externo (XPE 3115-IP). Os relés residem exclusivamente dentro de quadros elétricos blindados no interior do condomínio.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Vídeo Assimétrico Estrito:</strong> Ao atender o interfone pelo navegador ou smartphone, o morador visualiza o visitante em alta definição, mas o vídeo do morador nunca é transmitido para o totem externo.
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Auditoria Criptográfica de Gravações:</strong> Toda chamada e abertura de portão gera uma trilha com hash SHA-256 no Security Audit Log para fins periciais.
                  </div>
                </li>
              </ul>

              {/* Tabela de DTMF */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mapeamento de Comandos DTMF Homologados:
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-amber-400 font-bold">*07:</span>{' '}
                    <span className="text-slate-300">Portão Social Pedestre (Relé 1)</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-cyan-400 font-bold">*08:</span>{' '}
                    <span className="text-slate-300">Portão Garagem Veicular (Relé 2)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 3: Descoberta e Parametrização de Câmeras */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
                <Video className="w-4 h-4 text-cyan-400" />
                <span>3. Discovery de Rede e Fabricantes de Câmera</span>
              </div>
              <p className="text-slate-300">
                O módulo escaneia a LAN usando <strong>WS-Discovery (UDP 3702)</strong> e analisa os primeiros 24 bits do endereço MAC para configurar automaticamente a URL RTSP correta:
              </p>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-emerald-400 font-bold mb-0.5 font-sans">Intelbras (XPE / VIP / VHD):</div>
                  <div className="text-slate-400 truncate">rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-red-400 font-bold mb-0.5 font-sans">Hikvision (AcuSense / LPR):</div>
                  <div className="text-slate-400 truncate">rtsp://user:pass@ip:554/Streaming/Channels/101</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-blue-400 font-bold mb-0.5 font-sans">Dahua (Starlight / WizSense):</div>
                  <div className="text-slate-400 truncate">rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0</div>
                </div>
              </div>
            </div>

            {/* Seção 4: Operação da Inteligência MaIA */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>4. Inteligência Operacional MaIA</span>
              </div>
              <p className="text-slate-300">
                A MaIA opera com arquitetura híbrida de dupla camada para nunca interromper a portaria:
              </p>
              <div className="space-y-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-white font-bold mb-1 flex items-center justify-between">
                    <span>Camada Nuvem: Gemini 3.8 Flash</span>
                    <span className="text-[10px] text-emerald-400">Ativa com Internet</span>
                  </div>
                  <p className="text-slate-400">
                    Compreensão de linguagem natural avançada, triagem de visitantes com fotos, resumos de relatórios para o síndico e auditoria conversacional.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-white font-bold mb-1 flex items-center justify-between">
                    <span>Camada Local: Deterministic Rule Engine</span>
                    <span className="text-[10px] text-cyan-400">Fallback Local Imediato</span>
                  </div>
                  <p className="text-slate-400">
                    Respostas em 0ms mesmo com cabo de internet desconectado: consulta de ramais de moradores, acionamento autorizado de portões e checagem de status dos totens.
                  </p>
                </div>
              </div>
            </div>

            {/* Seção 5: PWA Mobile, Notificações Push & Compilação em APK Android */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>5. PWA Mobile, Notificações Push & Compilação em APK Android</span>
              </div>
              <p className="text-slate-300">
                O DoorIA foi desenvolvido como uma <strong>Progressive Web App (PWA) instalável</strong> com cache offline Workbox, suporte a WebRTC e Notificações Push nativas. Caso o condomínio necessite distribuir um aplicativo nativo Android (.APK) via sideload ou Google Play, utilize o <strong>Capacitor 6+</strong>:
              </p>

              {/* Guia Rápido de Compilação do APK */}
              <div className="space-y-3 text-[11px]">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                  <div className="text-emerald-400 font-bold font-sans flex items-center justify-between">
                    <span>Comandos para Gerar o APK (CLI):</span>
                    <span className="text-[10px] text-slate-400">DOCS_APK_BUILD.md</span>
                  </div>
                  <div className="text-slate-300"># 1. Instalar Capacitor e adicionar plataforma Android</div>
                  <div className="text-cyan-300">npm install @capacitor/core && npm install -D @capacitor/cli @capacitor/android</div>
                  <div className="text-cyan-300">npx cap init "Enlace-DoorIA" "br.com.enlace.dooria" --web-dir dist</div>
                  <div className="text-cyan-300">npx cap add android</div>
                  <div className="text-slate-300 mt-2"># 2. Compilar aplicação e sincronizar com o projeto Android</div>
                  <div className="text-cyan-300">npm run build && npx cap sync android</div>
                  <div className="text-slate-300 mt-2"># 3. Gerar o arquivo APK instalável</div>
                  <div className="text-cyan-300">cd android && ./gradlew assembleDebug</div>
                  <div className="text-emerald-400"># APK gerado: android/app/build/outputs/apk/debug/app-debug.apk</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Notificações Push no Celular</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Suporta tanto Web Push (VAPID/Service Worker) para PWA quanto Firebase Cloud Messaging (FCM) para APK nativo. Notifica chamadas do XPE 3115-IP e encomendas recebidas.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Distribuição Sideload LAN</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      O arquivo APK pode ser hospedado no próprio mini-PC da portaria e baixado pelos moradores via Wi-Fi interno através de QR Code fixado no mural do condomínio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
