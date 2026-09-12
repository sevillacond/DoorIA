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
  const [activeTab, setActiveTab] = useState<'topologia' | 'auditoria' | 'eventos' | 'iot'>('topologia');

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
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Conformidade com as 15 Regras de Ouro do Master PRD</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <strong className="text-white">1. Alta Disponibilidade Local:</strong> A portaria e chamadas não param caso a IA ou a Internet fiquem indisponíveis.
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <strong className="text-white">2. Segurança da MaIA:</strong> A IA nunca acessa SQL ou relés diretamente sem a mediação do Policy Engine.
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <strong className="text-white">3. Isolamento Total:</strong> Morador nunca tem acesso aos dados, câmeras privadas ou boletos de outras unidades.
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <strong className="text-white">4. DTMF Seguro:</strong> DTMF *07 ou *08 só aciona relé se houver validação de chamada ativa no Policy Engine.
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
    </div>
  );
};
