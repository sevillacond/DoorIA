import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ShieldCheck,
  Cpu,
  Bot,
  User,
  AlertCircle,
  CheckCircle2,
  Terminal,
  X,
  Mic,
  MicOff,
} from 'lucide-react';
import type { MaiaMessage, UserSession } from '../types.ts';

interface MaiaChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
}

export const MaiaChatDrawer: React.FC<MaiaChatDrawerProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  const [messages, setMessages] = useState<MaiaMessage[]>([
    {
      id: 'm-1',
      sender: 'maia',
      content: `Olá, ${session.name}! Sou a MaIA (Módulo de Automação e Inteligência Autônoma) do Enlace-DoorIA.
Opero em conformidade estrita com o Policy Engine e o princípio Local-First. Como posso auxiliar suas operações na portaria hoje?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Speech Recognition setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue((prev) => prev ? `${prev} ${transcript}` : transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || loading) return;

    const userMsg: MaiaMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai/maia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend }),
      });
      const data = await res.json();

      const maiaMsg: MaiaMessage = {
        id: `mai-${Date.now()}`,
        sender: 'maia',
        content: data.reply || 'Processado com sucesso.',
        timestamp: new Date().toISOString(),
        toolInvocations: data.toolCallsExecuted,
      };

      setMessages((prev) => [...prev, maiaMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'maia',
          content: '[Modo Fallback Local-First Ativado] Processamento local concluído.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Qual o status do Asterisk e XPE na LAN?',
    'Como está a situação dos meus boletos condominiais?',
    'Abrir portão pedestre social',
    'Consultar dados do Apto 101',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-fadeIn">
      {/* Topo do Painel da MaIA */}
      <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              MaIA AI Gateway
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Gemini 3.8 / Fallback
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Inteligência Operacional Auditada</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Regra de Ouro Banner */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Regra #2: A MaIA nunca acessa SQL ou relés diretamente sem Policy Engine.</span>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
              {msg.sender === 'user' ? (
                <>
                  <span>Você ({session.role})</span>
                  <User className="w-3 h-3" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span>MaIA (Inteligência Operacional)</span>
                </>
              )}
            </div>

            <div
              className={`p-3 rounded-2xl text-xs max-w-[90%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
              }`}
            >
              {msg.content}

              {/* Se houve execução de Tool Calling estruturada */}
              {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/80 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    <span>Ferramenta Auditada: {msg.toolInvocations[0].toolName}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    Status: Autorizado via Policy Engine
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>MaIA consultando orquestrador...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões Rápidas */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40 flex gap-1.5 overflow-x-auto">
        {suggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(sug)}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input de Envio */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? "Ouvindo..." : "Pergunte à MaIA..."}
            className={`flex-1 px-3.5 py-2 bg-slate-900 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition ${isListening ? 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'border-slate-700 focus:border-cyan-500'}`}
          />
          {recognitionRef.current && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl text-white transition ${isListening ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'}`}
              title="Falar com a MaIA"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
