import React, { useState } from 'react';
import { Bell, BellRing, Check, CheckCircle2, ShieldAlert, PhoneCall, Package, Unlock, X, AlertTriangle, Smartphone } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications.ts';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const { isSupported, permission, isSubscribed, loading, requestPermission, sendTestNotification } = usePushNotifications();
  const [testingType, setTestingType] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);

  // Canais de Notificação
  const [channels, setChannels] = useState({
    intercomCalls: true,
    packages: true,
    gateAccess: true,
    sosAlerts: true,
  });

  if (!isOpen) return null;

  const handleTest = async (type: 'intercom' | 'package' | 'gate') => {
    setTestingType(type);
    setTestSuccess(false);
    await sendTestNotification(type);
    setTestSuccess(true);
    setTimeout(() => {
      setTestingType(null);
      setTestSuccess(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
        {/* Topo do Modal */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Notificações Push da Portaria</h3>
              <p className="text-[11px] text-slate-400">Alertas de interfone, encomendas e segurança em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Status da Permissão no Navegador */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-white font-semibold text-xs">Permissão no Dispositivo:</div>
                <div className="text-[11px] font-mono capitalize">
                  {permission === 'granted' ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Habilitada / Concedida
                    </span>
                  ) : permission === 'denied' ? (
                    <span className="text-red-400 flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3 h-3" /> Bloqueada nas configurações do navegador
                    </span>
                  ) : (
                    <span className="text-amber-400">Pendente de Autorização</span>
                  )}
                </div>
              </div>
            </div>

            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                disabled={loading}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs transition shadow"
              >
                {loading ? 'Ativando...' : 'Ativar Push'}
              </button>
            )}
          </div>

          {/* Seleção de Eventos */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Alertas Habilitados para sua Unidade:
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-white font-semibold">Chamada de Interfone XPE 3115-IP</div>
                  <div className="text-[10px] text-slate-400">Toque prioritário quando o visitante discar seu apartamento</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.intercomCalls}
                onChange={(e) => setChannels({ ...channels, intercomCalls: e.target.checked })}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-white font-semibold">Aviso de Encomendas & Entregas</div>
                  <div className="text-[10px] text-slate-400">Notificação imediata ao dar entrada de pacote na portaria</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.packages}
                onChange={(e) => setChannels({ ...channels, packages: e.target.checked })}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
              <div className="flex items-center gap-2.5">
                <Unlock className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-white font-semibold">Abertura de Portão Social & Garagem</div>
                  <div className="text-[10px] text-slate-400">Registro de acionamentos autorizados via DTMF / QR</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={channels.gateAccess}
                onChange={(e) => setChannels({ ...channels, gateAccess: e.target.checked })}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0 w-4 h-4"
              />
            </label>
          </div>

          {/* Teste Imediato de Notificação */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Testar Disparo no Celular/Computador:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTest('intercom')}
                disabled={testingType !== null}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-medium transition flex items-center justify-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
                <span>Testar Interfone</span>
              </button>
              <button
                onClick={() => handleTest('package')}
                disabled={testingType !== null}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-medium transition flex items-center justify-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Testar Encomenda</span>
              </button>
            </div>

            {testSuccess && (
              <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[11px] text-center font-medium animate-fadeIn">
                ✓ Notificação enviada! Verifique a bandeja do seu sistema.
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
