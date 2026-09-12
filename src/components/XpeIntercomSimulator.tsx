import React, { useState } from 'react';
import {
  Radio,
  X,
  Volume2,
  PhoneCall,
  CheckCircle2,
  Camera,
  ShieldCheck,
  Building,
  Truck,
  UserCheck,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import type { CallPurpose, Unit } from '../types.ts';
import { audioSystem } from '../utils/audioSystem.ts';

interface XpeIntercomSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  onStartCall: (unitNumber: string, purpose: CallPurpose) => void;
  isCallInProgress: boolean;
}

export const XpeIntercomSimulator: React.FC<XpeIntercomSimulatorProps> = ({
  isOpen,
  onClose,
  units,
  onStartCall,
  isCallInProgress,
}) => {
  const [step, setStep] = useState<'standby' | 'selecionar_unidade' | 'classificar_finalidade' | 'discando'>('standby');
  const [selectedUnit, setSelectedUnit] = useState<string>('101');
  const [selectedPurpose, setSelectedPurpose] = useState<CallPurpose>('visitante');
  const [keypadInput, setKeypadInput] = useState<string>('');
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    audioSystem.playDtmf(val);
    if (step === 'standby') {
      setStep('selecionar_unidade');
    }
    if (keypadInput.length < 3) {
      setKeypadInput((prev) => prev + val);
    }
  };

  const handlePressMainButton = () => {
    audioSystem.playDtmf('0');
    setStep('selecionar_unidade');
    setKeypadInput('');
    if (!voiceMuted) {
      audioSystem.speakUra(
        'Olá! Bem-vindo à Portaria Inteligente do Condomínio Solar das Palmeiras. Por favor, selecione a sua unidade de destino.'
      );
    }
  };

  const handleConfirmUnit = (unitNum: string) => {
    audioSystem.playDtmf('#');
    setSelectedUnit(unitNum);
    setStep('classificar_finalidade');
    if (!voiceMuted) {
      audioSystem.speakUra(
        `Qual a finalidade da visita ao Apartamento ${unitNum}? Escolha entre entrega, visitante ou prestador.`
      );
    }
  };

  const handleConfirmPurposeAndDial = (purpose: CallPurpose) => {
    audioSystem.playDtmf('*');
    setSelectedPurpose(purpose);
    setStep('discando');
    if (!voiceMuted) {
      audioSystem.speakUra(
        `Aguarde um instante. O sistema está contatando os moradores do Apartamento ${selectedUnit}.`
      );
    }
    onStartCall(selectedUnit, purpose);
  };

  const resetFlow = () => {
    setStep('standby');
    setKeypadInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Topo com identificação do Totem Físico */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Totem Físico Intelbras XPE-3115-IP
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  IP 192.168.1.150
                </span>
              </h3>
              <p className="text-xs text-slate-400">Calçada / Acesso Social Externo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chassi do Interfone XPE */}
        <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center">
          {/* Câmera Frontal do XPE e Microfone */}
          <div className="w-full max-w-xs bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 shadow-xl mb-4 flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center shadow-inner mb-3 overflow-hidden">
              <Camera className="w-8 h-8 text-cyan-400" />
              <div className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between w-full px-2 mb-2">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>URA MaIA Ativa</span>
              </span>
              <button
                onClick={() => setVoiceMuted(!voiceMuted)}
                className={`text-[10px] px-2 py-0.5 rounded border ${
                  voiceMuted
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {voiceMuted ? 'Voz Desativada' : 'Voz Ligada'}
              </button>
            </div>

            {/* Display Digital do Interfone */}
            <div className="w-full bg-black/90 border border-slate-700/80 rounded-xl p-3 text-center min-h-[72px] flex flex-col items-center justify-center">
              {step === 'standby' && (
                <div>
                  <div className="text-cyan-400 font-mono font-bold text-xs tracking-wider">PORTARIA INTELIGENTE</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Pressione o botão para iniciar</div>
                </div>
              )}

              {step === 'selecionar_unidade' && (
                <div>
                  <div className="text-amber-400 font-mono text-xs font-bold animate-pulse">
                    URA: "Informe o número da unidade"
                  </div>
                  <div className="text-xl font-mono font-extrabold text-white mt-0.5">
                    {keypadInput ? `Unidade ${keypadInput}` : 'Digite no teclado ou escolha abaixo'}
                  </div>
                </div>
              )}

              {step === 'classificar_finalidade' && (
                <div>
                  <div className="text-cyan-300 font-mono text-xs font-bold">
                    URA: "Qual a finalidade da visita ao Apto {selectedUnit}?"
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">1-Entrega | 2-Visitante | 3-Prestador | 4-Outro</div>
                </div>
              )}

              {step === 'discando' && (
                <div>
                  <div className="text-emerald-400 font-mono text-xs font-bold animate-pulse">
                    ASTERISK: Roteando Chamada Simultânea...
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Chamando Apto {selectedUnit} ({selectedPurpose.toUpperCase()})
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FLUXO INTERATIVO DA URA MAIA (SEÇÃO 7 DO MASTER PRD) */}
          <div className="w-full max-w-sm space-y-3">
            {step === 'standby' && (
              <div className="space-y-3">
                <button
                  id="btn-xpe-main-bell"
                  onClick={handlePressMainButton}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm tracking-wide shadow-lg shadow-amber-950/40 flex items-center justify-center gap-3 transition active:scale-95"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>ACIONAR BOTÃO PRINCIPAL XPE</span>
                </button>
                <p className="text-[11px] text-center text-slate-400">
                  Ao pressionar, a URA da MaIA no Asterisk assume imediatamente o atendimento do visitante.
                </p>
              </div>
            )}

            {step === 'selecionar_unidade' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300">Escolha a Unidade (Piloto 12 Unidades):</div>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {units.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleConfirmUnit(u.number)}
                      className="py-2 px-1 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-white border border-slate-700 text-xs font-bold font-mono transition text-slate-200"
                    >
                      Apto {u.number}
                    </button>
                  ))}
                </div>

                {keypadInput.length > 0 && (
                  <button
                    onClick={() => handleConfirmUnit(keypadInput)}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs"
                  >
                    Confirmar Unidade {keypadInput}
                  </button>
                )}
              </div>
            )}

            {step === 'classificar_finalidade' && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">Classificação Obrigatória de Finalidade:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleConfirmPurposeAndDial('entrega')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-amber-600 hover:text-white border border-slate-700 text-left transition flex items-center gap-2"
                  >
                    <Truck className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold">1. Entrega / Courier</div>
                      <div className="text-[10px] text-slate-400">Ifood, Mercado Livre, etc.</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleConfirmPurposeAndDial('visitante')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-white border border-slate-700 text-left transition flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold">2. Visitante Pessoal</div>
                      <div className="text-[10px] text-slate-400">Família, Amigos</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleConfirmPurposeAndDial('prestador')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-700 text-left transition flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-xs font-bold">3. Prestador de Serviço</div>
                      <div className="text-[10px] text-slate-400">Manutenção, Reforma</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleConfirmPurposeAndDial('outro')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-purple-600 hover:text-white border border-slate-700 text-left transition flex items-center gap-2"
                  >
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs font-bold">4. Outra Finalidade</div>
                      <div className="text-[10px] text-slate-400">Informações gerais</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 'discando' && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Chamada Encaminhada para o Morador</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  O WebPhone do Apto {selectedUnit} está tocando simultaneamente com o stream de vídeo da câmera do XPE.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={resetFlow}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                  >
                    Nova Chamada
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl"
                  >
                    Ver no WebPhone
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé explicativo da arquitetura */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Protocolo SIP / PJSIP nativo (RFC 3261)</span>
          <span className="text-cyan-400 font-mono">Asterisk 20 LTS Pure</span>
        </div>
      </div>
    </div>
  );
};
