import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

interface ThemeToggleProps {
  variant?: 'header' | 'sidebar' | 'pill';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'header', className = '' }) => {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();

  if (variant === 'sidebar') {
    return (
      <div className={`px-3 py-2 ${className}`}>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Tema da Interface</span>
          <span className="text-[10px] text-[#55b0ff] font-mono font-semibold">
            {isDark ? 'Escuro' : 'Claro'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-[#060e1c] p-1 rounded-xl border border-[#1e2f50]">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              !isDark
                ? 'bg-[#0a50ff] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Ativar Modo Claro"
          >
            <Sun className="w-3.5 h-3.5 text-amber-300" />
            <span>Claro</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              isDark
                ? 'bg-[#0a50ff] text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Ativar Modo Escuro"
          >
            <Moon className="w-3.5 h-3.5 text-blue-300" />
            <span>Escuro</span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
          isDark
            ? 'bg-[#14223d] text-amber-300 border-[#1c2e4e] hover:bg-[#192b4d]'
            : 'bg-[#f5f8ff] text-slate-700 border-[#dde5f0] hover:bg-slate-100 hover:text-[#0a50ff]'
        } ${className}`}
        title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        aria-label="Alternar Tema Claro e Escuro"
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>Modo Claro</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-[#0a50ff]" />
            <span>Modo Escuro</span>
          </>
        )}
      </button>
    );
  }

  // Header compact toggle button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="btn-theme-toggle"
      className={`p-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer border ${
        isDark
          ? 'bg-[#14223d] hover:bg-[#1a2d52] text-amber-300 border-[#1c2e4e]'
          : 'bg-[#f5f8ff] hover:bg-slate-100 text-[#5a6a85] hover:text-[#0a50ff] border-[#dde5f0]'
      } ${className}`}
      title={isDark ? 'Tema Escuro Ativo (Clique para Claro)' : 'Tema Claro Ativo (Clique para Escuro)'}
      aria-label="Alternar entre Tema Claro e Escuro"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline text-xs font-semibold text-slate-200">Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#0a50ff]" />
          <span className="hidden sm:inline text-xs font-semibold text-[#0d1b35]">Escuro</span>
        </>
      )}
    </button>
  );
};
