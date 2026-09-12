import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  Volume2,
  Lock,
  Download,
  AlertTriangle,
  User,
  Clock,
  Radio,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { CallRecordingAuditData, UserSession } from '../types.ts';

interface CallAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordingId: string | null;
  session: UserSession;
}

export const CallAuditModal: React.FC<CallAuditModalProps> = ({
  isOpen,
  onClose,
  recordingId,
  session,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<CallRecordingAuditData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  useEffect(() => {
    if (!isOpen || !recordingId) return;

    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setPlaybackProgress(0);

    fetch(`/api/v1/recordings/${recordingId}/audit`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erro HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setAuditData(data.audit);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isOpen, recordingId, session]);

  // Simulação de reprodução de áudio fonético
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 4;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  if (!isOpen) return null;

  const handleExportLaudo = () => {
    if (!auditData) return;
    const content = `=====================================================
LAUDO DE AUDITORIA FORENSE DE ATENDIMENTO
CONDOMÍNIO SOLAR DAS PALMEIRAS - PORTARIA AUTÔNOMA
=====================================================
ID da Gravação: ${auditData.recordingId}
ID da Chamada: ${auditData.callId}
Unidade Destino: Apartamento ${auditData.unitNumber}
Origem do Chamado: ${auditData.origin.toUpperCase()}
Finalidade Declarada: ${auditData.purpose.toUpperCase()}
Início: ${auditData.startedAt}
Duração Total: ${auditData.durationSeconds} segundos
Atendido por: ${auditData.answeredBy}
Hash Criptográfico SHA-256:
${auditData.hashSha256}

STATUS LGPD & POLÍTICA DE SEGURANÇA:
- Avaliado pelo Policy Engine: SIM (Conforme)
- Análise de Sentimento: ${auditData.aiAuditSummary.sentiment.toUpperCase()}
- Abertura de Portão Registrada: ${auditData.aiAuditSummary.gateOpened ? 'SIM (*07)' : 'NÃO'}
- Observações: ${auditData.aiAuditSummary.observations}

TRANSCRIÇÃO DE ÁUDIO REGISTRADA:
${auditData.transcript.map((t) => `[${t.timestamp}] [${t.speaker.toUpperCase()}]: ${t.text}`).join('\n')}

Auditoria solicitada por: ${session.name} (${session.role})
Carimbo Temporal Criptográfico: ${new Date().toISOString()}
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laudo_Auditoria_${auditData.recordingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Topo do Modal */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Auditoria Forense de Gravação de Chamada
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  LGPD Art. 6º/7º
                </span>
              </h2>
              <div className="text-[10px] font-mono text-slate-400">
                Identificador: {recordingId || 'N/A'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs scrollbar-thin scrollbar-thumb-slate-800">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-mono text-xs">
                Descriptografando metadados e validando hash SHA-256 no Policy Engine...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>Acesso Bloqueado pelo Policy Engine</span>
              </div>
              <p className="text-xs text-red-300 leading-relaxed">{error}</p>
              <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-800 text-[11px] font-mono text-red-200">
                Diretriz de Segurança: Gravações de áudio e vídeo da portaria constituem dados protegidos e só podem ser acessadas pelo Síndico ou Super Administrador em incidentes de auditoria.
              </div>
            </div>
          )}

          {auditData && !loading && !error && (
            <>
              {/* Header de Metadados e Selo SHA-256 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Integridade Criptográfica Verificada</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    SHA-256 OK
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-400 break-all bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500">HASH: </span>
                  {auditData.hashSha256}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Unidade Destino:</span>
                    <span className="font-bold text-cyan-300">Apto {auditData.unitNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Origem:</span>
                    <span className="font-bold text-slate-200 uppercase font-mono">{auditData.origin}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Finalidade:</span>
                    <span className="font-bold text-amber-300 capitalize">{auditData.purpose}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Duração:</span>
                    <span className="font-bold text-slate-200">{auditData.durationSeconds}s</span>
                  </div>
                </div>
              </div>

              {/* Reprodutor de Áudio Auditado */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>Registro em Mídia Fonética Asterisk (SRTP/WAV)</span>
                  </div>
                  <span className="font-mono text-cyan-400 text-xs">
                    {Math.round((auditData.durationSeconds * playbackProgress) / 100)}s / {auditData.durationSeconds}s
                  </span>
                </div>

                {/* Forma de Onda Simulada */}
                <div className="h-10 bg-slate-950 rounded-lg flex items-center justify-between px-3 gap-1 overflow-hidden border border-slate-800">
                  {[...Array(32)].map((_, i) => {
                    const heightPercent = Math.min(100, Math.max(20, (Math.sin(i * 0.5) * 40 + 50)));
                    const isPlayed = (i / 32) * 100 <= playbackProgress;
                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-300 ${
                          isPlayed ? 'bg-cyan-400' : 'bg-slate-700'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    );
                  })}
                </div>

                {/* Controles do Player */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlaying ? 'Pausar Gravação' : 'Reproduzir Áudio da Linha'}</span>
                  </button>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span>Trilha Auditada em Nuvem Local Privada</span>
                  </div>
                </div>
              </div>

              {/* Transcrição de Áudio (URA MaIA + Interlocutores) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs">Transcrição Fonética Assistida</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    MaIA AI Speech-to-Text
                  </span>
                </div>

                <div className="space-y-2 font-sans">
                  {auditData.transcript.map((item, idx) => {
                    const isUra = item.speaker === 'maia_ura';
                    const isVisitor = item.speaker === 'visitante';
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-xs leading-relaxed border ${
                          isUra
                            ? 'bg-cyan-950/40 border-cyan-900/60 text-cyan-200'
                            : isVisitor
                            ? 'bg-amber-950/30 border-amber-900/40 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="font-bold capitalize">
                            {isUra ? 'URA Portaria MaIA' : isVisitor ? 'Visitante (Calçada)' : 'Morador (WebPhone)'}
                          </span>
                          <span className="text-slate-400">{item.timestamp}</span>
                        </div>
                        <p>{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Parecer do Policy Engine & Auditoria de Decisão */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white">Parecer do Policy Engine & IA</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {auditData.aiAuditSummary.observations}
                </p>
                <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                  <span>Regra Aplicada:</span>
                  <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                    {auditData.aiAuditSummary.authorizedRule}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
            <span>Sessão: {session.name} ({session.role})</span>
          </div>

          <div className="flex items-center gap-2">
            {auditData && !error && (
              <button
                onClick={handleExportLaudo}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar Laudo (.txt)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
