import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Video,
  Mic,
  MicOff,
  Volume2,
  Key,
  ShieldCheck,
  Lock,
  Unlock,
  AlertCircle,
  Radio,
  X,
  Timer,
  MessageSquare,
  Check,
} from 'lucide-react';
import type { ActiveCall, UserSession } from '../types.ts';
import { audioSystem } from '../utils/audioSystem.ts';

interface WebPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCall: ActiveCall | null;
  session: UserSession;
  onAnswerCall: () => void;
  onHangupCall: () => void;
  onSendDtmf: (dtmf: '*07' | '*08') => void;
  feedbackMessage: string | null;
}

export const WebPhoneModal: React.FC<WebPhoneModalProps> = ({
  isOpen,
  onClose,
  activeCall,
  session,
  onAnswerCall,
  onHangupCall,
  onSendDtmf,
  feedbackMessage,
}) => {
  const [dialedNumber, setDialedNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Cronômetro regressivo de segurança do portão aberto (Policy Engine)
  const [gateCountdown, setGateCountdown] = useState<{ gate: string; seconds: number } | null>(null);

  // Respostas rápidas pré-gravadas / TTS sintetizado para o visitante no XPE
  const [quickMessageSent, setQuickMessageSent] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeCall && activeCall.state === 'em_atendimento') {
      audioSystem.stopRingTone();
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (activeCall && activeCall.state === 'chamando') {
      audioSystem.startRingTone();
      setCallDuration(0);
    } else {
      audioSystem.stopRingTone();
      setCallDuration(0);
    }
    return () => {
      audioSystem.stopRingTone();
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  if (!isOpen) {
    audioSystem.stopRingTone();
    return null;
  }

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDigit = (digit: string) => {
    audioSystem.playDtmf(digit);
    if (activeCall && activeCall.state === 'em_atendimento') {
      if (digit === '7') {
        audioSystem.playRelayClick();
        onSendDtmf('*07');
      }
      if (digit === '8') {
        audioSystem.playRelayClick();
        onSendDtmf('*08');
      }
    } else {
      setDialedNumber((prev) => (prev.length < 4 ? prev + digit : prev));
    }
  };

  const handleAnswerWrapper = () => {
    audioSystem.stopRingTone();
    onAnswerCall();
  };

  const handleHangupWrapper = () => {
    audioSystem.stopRingTone();
    audioSystem.playHangupTone();
    onHangupCall();
  };

  // Efeito do Cronômetro Regressivo do Portão
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gateCountdown && gateCountdown.seconds > 0) {
      interval = setInterval(() => {
        setGateCountdown((prev) => {
          if (!prev || prev.seconds <= 1) return null;
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gateCountdown?.gate]); // Only trigger when a new gate sequence starts

  const handleDtmfWrapper = (dtmf: '*07' | '*08') => {
    audioSystem.playDtmf('*');
    setTimeout(() => audioSystem.playDtmf('0'), 60);
    setTimeout(() => {
      audioSystem.playDtmf(dtmf === '*07' ? '7' : '8');
      audioSystem.playRelayClick();
      onSendDtmf(dtmf);
      // Iniciar contagem regressiva de segurança (7 segundos)
      setGateCountdown({
        gate: dtmf === '*07' ? 'Portão de Pedestre' : 'Portão da Garagem',
        seconds: 7,
      });
    }, 120);
  };

  const handleSendQuickAudio = (phrase: string) => {
    audioSystem.playRelayClick();
    setQuickMessageSent(phrase);
    setTimeout(() => setQuickMessageSent(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho do WebPhone */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                WebPhone PWA (PJSIP / WebRTC)
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Ramal {session.unitNumber || '201'} | Asterisk 20 LTS Pure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK DE POLICY ENGINE / ABERTURA */}
        {feedbackMessage && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-cyan-950/80 border border-cyan-700/60 text-cyan-200 text-xs flex items-center gap-2 animate-fadeIn">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* ÁREA PRINCIPAL DA CHAMADA OU DO DISCADOR */}
        <div className="p-5 flex-1 flex flex-col">
          {activeCall ? (
            <div className="space-y-4">
              {/* STATUS DO ATENDIMENTO */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  activeCall.state === 'chamando'
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-200 animate-pulse'
                    : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    {activeCall.origin === 'xpe_3115_ip' ? 'Totem Intelbras XPE-3115-IP' : 'QR Virtual Intercom'}
                  </div>
                  <div className="font-bold text-sm text-white">
                    {activeCall.state === 'chamando' ? 'Recebendo Chamada na Entrada...' : 'Em Atendimento Ativo'}
                  </div>
                  <div className="text-xs text-slate-300">
                    Finalidade:{' '}
                    <span className="font-semibold text-cyan-400 capitalize">
                      {activeCall.purpose || 'Visitante'}
                    </span>
                  </div>
                </div>

                {activeCall.state === 'em_atendimento' && (
                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-400">Duração</div>
                    <div className="text-lg font-bold text-emerald-400">{formatSeconds(callDuration)}</div>
                  </div>
                )}
              </div>

              {/* VÍDEO ASSIMÉTRICO (SEÇÃO 8 DO MASTER PRD: Visitante -> Morador, Morador NÃO envia vídeo) */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
                {/* Simulação realista de vídeo ao vivo da câmera frontal do XPE / Visitante */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10 pointer-events-none"></div>

                {/* Feed de vídeo simulado ou placeholder profissional */}
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 relative">
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-emerald-400 border border-emerald-900/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    REC ACTIVE | SHA-256 HASH
                  </div>

                  <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-cyan-300 border border-cyan-900/50">
                    VÍDEO ASSIMÉTRICO (RTSP/WebRTC)
                  </div>

                  {/* Representação visual do visitante na portaria */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-lg">
                      <Video className="w-10 h-10" />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold text-white">Visitante na Entrada Social</div>
                      <div className="text-[11px] text-slate-400">Transmissão segura H.264 Baseline</div>
                    </div>
                  </div>

                  {/* Informação sobre privacidade do morador */}
                  <div className="absolute bottom-2 left-2 right-2 z-20 text-[10px] text-center text-slate-400 bg-black/70 py-1 px-2 rounded">
                    Sua câmera está desligada. O visitante ouve apenas seu áudio bidirecional.
                  </div>
                </div>
              </div>

              {/* CONTROLES DE DTMF & ABERTURA DE PORTÃO */}
              {activeCall.state === 'em_atendimento' ? (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Comandos DTMF Rápidos (Policy Engine)</span>
                    <span className="text-cyan-400 font-mono">*07 / *08</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="btn-dtmf-pedestre"
                      onClick={() => handleDtmfWrapper('*07')}
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg active:scale-95 border border-cyan-400/30"
                    >
                      <Unlock className="w-5 h-5 mb-1 text-cyan-100" />
                      <span>Liberar Pedestre (*07)</span>
                      <span className="text-[10px] font-normal text-cyan-100/80">Portão Social Térreo</span>
                    </button>

                    <button
                      id="btn-dtmf-garagem"
                      onClick={() => handleDtmfWrapper('*08')}
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg active:scale-95 border border-blue-400/30"
                    >
                      <Unlock className="w-5 h-5 mb-1 text-blue-100" />
                      <span>Liberar Garagem (*08)</span>
                      <span className="text-[10px] font-normal text-blue-100/80">Acesso Veicular</span>
                    </button>
                  </div>

                  {/* CRONÔMETRO REGRESSIVO DE SEGURANÇA DO PORTÃO */}
                  {gateCountdown && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-200 flex items-center justify-between animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-emerald-400 animate-spin" />
                        <div>
                          <div className="text-xs font-bold text-white">
                            {gateCountdown.gate} Aberto
                          </div>
                          <div className="text-[10px] text-emerald-300">
                            Trava eletromagnética temporizada (Policy Engine)
                          </div>
                        </div>
                      </div>
                      <div className="text-center px-3 py-1 rounded-lg bg-emerald-900/90 border border-emerald-700">
                        <span className="text-xs text-emerald-300 block font-mono">Fecha em</span>
                        <span className="text-base font-extrabold text-white font-mono">
                          {gateCountdown.seconds}s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* RESPOSTAS RÁPIDAS DE ÁUDIO / TTS PARA O INTERFONE */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Respostas Rápidas de Voz (TTS)</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Enviar ao XPE</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        'Já estou descendo, aguarde um instante.',
                        'Por favor, pode deixar com o vizinho.',
                        'Pode deixar na caixa de encomendas.',
                        'Não estou disponível no momento.',
                      ].map((frase) => (
                        <button
                          key={frase}
                          onClick={() => handleSendQuickAudio(frase)}
                          className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-left text-[11px] font-medium border border-slate-700/60 transition active:scale-95 leading-tight"
                        >
                          "{frase}"
                        </button>
                      ))}
                    </div>

                    {quickMessageSent && (
                      <div className="mt-1 p-2 rounded-lg bg-cyan-950/70 border border-cyan-700/60 text-cyan-200 text-[11px] flex items-center gap-1.5 animate-fadeIn">
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Áudio enviado ao visitante: "{quickMessageSent}"</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold ${
                        isMuted
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isMuted ? 'Mutado' : 'Microfone'}</span>
                    </button>

                    <button
                      id="btn-hangup-call"
                      onClick={handleHangupWrapper}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Encerrar Atendimento</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* SE ESTIVER CHAMANDO: BOTÕES ATENDER OU REJEITAR */
                <div className="flex items-center gap-3 pt-2">
                  <button
                    id="btn-reject-call"
                    onClick={handleHangupWrapper}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
                  >
                    <PhoneOff className="w-4 h-4 text-red-400" />
                    <span>Recusar</span>
                  </button>

                  <button
                    id="btn-answer-call"
                    onClick={handleAnswerWrapper}
                    className="flex-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition animate-pulse"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Atender no WebPhone</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* MODO DISCADOR WEBRTC EM ESPERA */
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="text-center py-4 bg-slate-950 rounded-xl border border-slate-800 mb-4">
                  <div className="text-xs text-slate-400 mb-1">Discar Ramal SIP Interno</div>
                  <div className="text-2xl font-mono font-bold text-white tracking-widest min-h-[32px]">
                    {dialedNumber || '---'}
                  </div>
                </div>

                {/* Teclado Numérico */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleDigit(key)}
                      className="py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-base font-mono border border-slate-700/60 active:scale-95 transition"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center gap-2">
                <button
                  onClick={() => setDialedNumber('')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 border border-slate-700"
                >
                  Limpar
                </button>
                <button
                  disabled={!dialedNumber}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>Chamar Ramal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
