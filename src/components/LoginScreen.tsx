import React from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, loginAsDemoUser } = useAuth();

  return (
    <div className="min-h-screen bg-[#070d18] text-[#f1f5f9] flex flex-col items-center justify-center font-sans selection:bg-[#0a50ff]/30">
      <div className="w-full max-w-md p-8 bg-[#0a162c] border border-[#1e2f50] rounded-3xl shadow-2xl shadow-blue-900/20 flex flex-col items-center text-center">
        
        {/* Logo & Branding */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0a50ff] to-[#55b0ff] flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-6 ring-4 ring-white/5">
          <ShieldCheck className="w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight font-['Red_Hat_Display'] mb-2">
          Enlace<span className="text-[#55b0ff]">DoorIA</span>
        </h1>
        <p className="text-sm text-slate-400 font-medium mb-8">
          Portaria Autônoma Inteligente & CRM
        </p>

        {/* Login Button */}
        <button
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-white/10 cursor-pointer"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          <span>Entrar com Google Workspace</span>
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3 w-full my-4">
          <div className="flex-1 h-px bg-[#1e2f50]"></div>
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Ou acesso rápido de demonstração</span>
          <div className="flex-1 h-px bg-[#1e2f50]"></div>
        </div>

        {/* Perfis de Teste / Demonstração */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => loginAsDemoUser('super_admin')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0a50ff]/20 hover:bg-[#0a50ff]/30 text-[#55b0ff] border border-[#0a50ff]/40 text-xs font-bold transition flex items-center justify-between cursor-pointer"
          >
            <span>Engenharia / Super Admin</span>
            <span className="text-[10px] bg-[#0a50ff]/40 px-2 py-0.5 rounded text-white font-mono">Acesso Total</span>
          </button>

          <button
            onClick={() => loginAsDemoUser('sindico')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center justify-between cursor-pointer"
          >
            <span>Síndico Gestor</span>
            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">Portaria / Gestão</span>
          </button>

          <button
            onClick={() => loginAsDemoUser('morador')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center justify-between cursor-pointer"
          >
            <span>Morador (Unidade 101)</span>
            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">QR / Convites</span>
          </button>
        </div>

        {/* System Info */}
        <div className="mt-8 pt-6 border-t border-[#1e2f50] w-full flex items-center justify-center gap-4 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#18c7a8] animate-pulse"></span>
            Asterisk 20 LTS
          </span>
          <span>•</span>
          <span className="text-[#55b0ff] font-bold">Autenticação Segura</span>
        </div>
      </div>
    </div>
  );
};
