import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070d18] text-[#f1f5f9] flex items-center justify-center p-4 font-sans">
          <div className="max-w-lg w-full bg-[#0d1b35] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-['Red_Hat_Display'] text-white mb-2">
              Recuperação do Sistema Enlace-DoorIA
            </h1>

            <p className="text-sm text-slate-400 mb-6">
              Ocorreu uma instabilidade pontual no renderizador. O sistema foi contido com segurança pelo protocolo de proteção.
            </p>

            {this.state.error && (
              <div className="bg-black/50 border border-slate-800 rounded-xl p-3 mb-6 text-left overflow-auto max-h-40 text-xs font-mono text-red-300">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Tentar Novamente</span>
              </button>
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#003ecc] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Aplicação</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
