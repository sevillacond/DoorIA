import React, { useState, useMemo } from 'react';
import {
  Calculator,
  RotateCcw,
  Info,
  Calendar,
  DollarSign,
  Percent,
  Sliders,
  AlertTriangle,
  HelpCircle,
  Copy,
  CheckCircle2,
  Sparkles,
  Printer,
  FileText,
} from 'lucide-react';

interface SimulationResult {
  valorOriginal: number;
  dataVencimento: string;
  dataCalculo: string;
  diasAtraso: number;
  multaPercent: number;
  multaValor: number;
  jurosPercentMes: number;
  jurosPercentDia: number;
  jurosValor: number;
  correcaoIndicePercent: number;
  correcaoValor: number;
  descontoConcedido: number;
  totalFinal: number;
}

export const FinancialSimulationCalculator: React.FC = () => {
  // Parâmetros de Entrada da Simulação (Totalmente avulso, sem vínculo com cadastro ou moradores)
  const [valorOriginal, setValorOriginal] = useState<number>(650.0);
  const [dataVencimento, setDataVencimento] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dataCalculo, setDataCalculo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Índices & Encargos (customizáveis para simulação)
  const [multaPercent, setMultaPercent] = useState<number>(2.0); // Padrão Lei 10.406 / Art 1336
  const [jurosPercentMes, setJurosPercentMes] = useState<number>(1.0); // 1% ao mês
  const [correcaoIndicePercent, setCorrecaoIndicePercent] = useState<number>(0.38); // IPCA/INPC estimado
  const [descontoPontualidade, setDescontoPontualidade] = useState<number>(0.0);

  // Parcelamento Simulado
  const [numParcelas, setNumParcelas] = useState<number>(3);
  const [entradaSimulada, setEntradaSimulada] = useState<number>(200.0);

  // Comparação de Cenários (Simulação A vs Simulação B)
  const [showComparison, setShowComparison] = useState(false);
  const [descontoCenarioB, setDescontoCenarioB] = useState<number>(5.0); // % para quitação à vista
  const [numParcelasB, setNumParcelasB] = useState<number>(6);

  // Estado de cópia e impressão
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDocType, setPrintDocType] = useState<'simulation' | 'agreement'>('simulation');
  const [debtorName, setDebtorName] = useState<string>('João da Silva');
  const [debtorUnit, setDebtorUnit] = useState<string>('Apto 101');
  const [debtorDoc, setDebtorDoc] = useState<string>('000.000.000-00');

  // Cálculo reativo memoizado
  const resultado: SimulationResult = useMemo(() => {
    const venc = new Date(dataVencimento + 'T00:00:00');
    const calc = new Date(dataCalculo + 'T00:00:00');
    const diffTime = calc.getTime() - venc.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    const principal = Math.max(0, valorOriginal);

    if (diffDays <= 0) {
      // Sem atraso
      return {
        valorOriginal: principal,
        dataVencimento,
        dataCalculo,
        diasAtraso: 0,
        multaPercent: 0,
        multaValor: 0,
        jurosPercentMes: 0,
        jurosPercentDia: 0,
        jurosValor: 0,
        correcaoIndicePercent: 0,
        correcaoValor: 0,
        descontoConcedido: descontoPontualidade,
        totalFinal: Math.max(0, principal - descontoPontualidade),
      };
    }

    // Com atraso: Multa 2% sobre principal
    const multaValor = principal * (multaPercent / 100);

    // Juros 1% ao mês pro-rata die (0.0333% ao dia)
    const jurosPercentDia = jurosPercentMes / 30;
    const jurosValor = principal * (jurosPercentDia / 100) * diffDays;

    // Correção monetária pro-rata ou índice acumulado
    const correcaoValor = principal * (correcaoIndicePercent / 100);

    const subtotal = principal + multaValor + jurosValor + correcaoValor;
    const totalFinal = Math.max(0, subtotal - descontoPontualidade);

    return {
      valorOriginal: principal,
      dataVencimento,
      dataCalculo,
      diasAtraso: diffDays,
      multaPercent,
      multaValor,
      jurosPercentMes,
      jurosPercentDia,
      jurosValor,
      correcaoIndicePercent,
      correcaoValor,
      descontoConcedido: descontoPontualidade,
      totalFinal,
    };
  }, [valorOriginal, dataVencimento, dataCalculo, multaPercent, jurosPercentMes, correcaoIndicePercent, descontoPontualidade]);

  // Parcelamento calculado
  const parcelamento = useMemo(() => {
    const saldoAposEntrada = Math.max(0, resultado.totalFinal - Math.min(resultado.totalFinal, entradaSimulada));
    const n = Math.max(1, numParcelas);
    const valorParcela = saldoAposEntrada / n;

    return {
      entradaEfetiva: Math.min(resultado.totalFinal, entradaSimulada),
      saldoRestante: saldoAposEntrada,
      qtdParcelas: n,
      valorParcela,
    };
  }, [resultado.totalFinal, entradaSimulada, numParcelas]);

  // Cenário B Comparativo (Quitação à vista com bonificação ou Parcelamento Estendido)
  const cenarioB = useMemo(() => {
    // Opção B1: À Vista com Desconto Extra
    const valorAVistaComDesconto = Math.max(0, resultado.totalFinal * (1 - (descontoCenarioB / 100)));
    const economiaAVista = Math.max(0, resultado.totalFinal - valorAVistaComDesconto);

    // Opção B2: Parcelamento Estendido
    const saldoEstendido = Math.max(0, resultado.totalFinal - Math.min(resultado.totalFinal, entradaSimulada));
    const nB = Math.max(1, numParcelasB);
    const valorParcelaB = saldoEstendido / nB;

    return {
      valorAVistaComDesconto,
      economiaAVista,
      qtdParcelasB: nB,
      valorParcelaB,
      saldoEstendido,
    };
  }, [resultado.totalFinal, descontoCenarioB, entradaSimulada, numParcelasB]);

  // Redefinir para valores padrões de consulta
  const handleReset = () => {
    setValorOriginal(650.0);
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setDataVencimento(d.toISOString().split('T')[0]);
    setDataCalculo(new Date().toISOString().split('T')[0]);
    setMultaPercent(2.0);
    setJurosPercentMes(1.0);
    setCorrecaoIndicePercent(0.38);
    setDescontoPontualidade(0.0);
    setNumParcelas(3);
    setEntradaSimulada(200.0);
  };

  const copySimulatedQuote = () => {
    const texto = `[SIMULAÇÃO FINANCEIRA DE CONSULTA]\n` +
      `• Valor Principal: R$ ${resultado.valorOriginal.toFixed(2)}\n` +
      `• Vencimento Simulado: ${new Date(resultado.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}\n` +
      `• Data Base de Cálculo: ${new Date(resultado.dataCalculo + 'T00:00:00').toLocaleDateString('pt-BR')} (${resultado.diasAtraso} dias de atraso)\n` +
      `• Multa Moratória (${resultado.multaPercent}%): R$ ${resultado.multaValor.toFixed(2)}\n` +
      `• Juros Moratórios (${resultado.jurosPercentMes}% a.m.): R$ ${resultado.jurosValor.toFixed(2)}\n` +
      `• Correção Monetária (${resultado.correcaoIndicePercent}%): R$ ${resultado.correcaoValor.toFixed(2)}\n` +
      (resultado.descontoConcedido > 0 ? `• Desconto: - R$ ${resultado.descontoConcedido.toFixed(2)}\n` : '') +
      `• TOTAL ATUALIZADO: R$ ${resultado.totalFinal.toFixed(2)}\n` +
      `• Proposta de Parcelamento: Entrada de R$ ${parcelamento.entradaEfetiva.toFixed(2)} + ${parcelamento.qtdParcelas}x de R$ ${parcelamento.valorParcela.toFixed(2)}\n` +
      `*Aviso: Cálculo puramente consultivo/simulado sem vinculação cadastral.`;

    navigator.clipboard.writeText(texto);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Banner Explicativo de Escopo: Uso Exclusivo para Consulta/Simulação sem Vínculo com Moradores */}
      <div className="p-4 rounded-2xl bg-[#ebf2ff] dark:bg-[#0d1b35] border border-[#dde8ff] dark:border-[#1e2f50] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0a50ff] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                Calculadora & Simulador Financeiro Avulso
              </h3>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 uppercase tracking-wide">
                Consulta & Simulação Livre
              </span>
            </div>
            <p className="text-xs text-[#5a6a85] dark:text-slate-300 mt-0.5">
              Utilize esta ferramenta para simular encargos moratórios, taxas de juros, multas e propostas de parcelamento 
              <strong> sem alterar o cadastro de moradores, sem gerar débitos e sem vínculo com unidades</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              showComparison
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                : 'bg-white dark:bg-slate-800 text-[#5a6a85] dark:text-slate-300 border-[#dde5f0] dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="Comparar Cenário À Vista vs Parcelado Estendido"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{showComparison ? 'Ocultar Comparação' : 'Comparar Cenários'}</span>
          </button>

          <button
            onClick={() => { setPrintDocType('simulation'); setShowPrintModal(true); }}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#5a6a85] dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-[#dde5f0] dark:border-slate-700 transition cursor-pointer"
            title="Gerar Memória de Cálculo para Impressão ou PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#0a50ff]" />
            <span>Simulação A4</span>
          </button>
          
          <button
            onClick={() => { setPrintDocType('agreement'); setShowPrintModal(true); }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 border border-transparent transition cursor-pointer shadow-sm shadow-emerald-600/20"
            title="Gerar Termo Extrajudicial de Confissão de Dívida"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Gerar Acordo (PDF)</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#5a6a85] dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-[#dde5f0] dark:border-slate-700 transition cursor-pointer"
            title="Restaurar parâmetros padrão de simulação"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetar</span>
          </button>

          <button
            onClick={copySimulatedQuote}
            className="px-3.5 py-1.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Simulação</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Painel Esquerdo: Parâmetros da Simulação (Inputs) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#dde5f0] dark:border-slate-800 pb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0d1b35] dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#0a50ff]" />
                <span>1. Dados da Cobrança a Simular</span>
              </h4>
              <span className="text-[11px] text-[#5a6a85] dark:text-slate-400">Totalmente Desvinculado</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">
                  Valor Principal (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-[#5a6a85] font-bold">R$</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={valorOriginal}
                    onChange={(e) => setValorOriginal(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">
                  Data Base de Cálculo
                </label>
                <input
                  type="date"
                  value={dataCalculo}
                  onChange={(e) => setDataCalculo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                />
              </div>
            </div>

            {/* Configuração dos Índices de Encargos */}
            <div className="pt-2 border-t border-[#dde5f0] dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0d1b35] dark:text-white flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#0a50ff]" />
                  <span>2. Índices & Encargos Legais (Customizáveis para Simulação)</span>
                </span>
                <span className="text-[10px] text-[#5a6a85] dark:text-slate-400">CC Art. 1336 § 1º</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5a6a85] dark:text-slate-300 mb-1">
                    Multa Moratória (%)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={multaPercent}
                      onChange={(e) => setMultaPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                    />
                    <span className="text-xs font-bold text-[#5a6a85]">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5a6a85] dark:text-slate-300 mb-1">
                    Juros de Mora (% a.m.)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={jurosPercentMes}
                      onChange={(e) => setJurosPercentMes(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                    />
                    <span className="text-xs font-bold text-[#5a6a85]">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5a6a85] dark:text-slate-300 mb-1">
                    Correção / IPCA (%)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={correcaoIndicePercent}
                      onChange={(e) => setCorrecaoIndicePercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                    />
                    <span className="text-xs font-bold text-[#5a6a85]">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5a6a85] dark:text-slate-300 mb-1">
                  Desconto / Abatimento Simulado (R$)
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={descontoPontualidade}
                  onChange={(e) => setDescontoPontualidade(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full sm:w-1/2 px-3 py-1.5 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                />
              </div>
            </div>

            {/* Simulação de Acordo / Parcelamento */}
            <div className="pt-2 border-t border-[#dde5f0] dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0d1b35] dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>3. Simulação de Parcelamento / Acordo Futuro</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Projeção Consultiva</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5a6a85] dark:text-slate-300 mb-1">
                    Valor de Entrada (R$)
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={entradaSimulada}
                    onChange={(e) => setEntradaSimulada(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[#f8fafc] dark:bg-slate-800 border border-[#dde5f0] dark:border-slate-700 text-[#0d1b35] dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#0a50ff] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5a6a85] dark:text-slate-300 mb-1">
                    Número de Parcelas
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 6, 10, 12].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNumParcelas(n)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          numParcelas === n
                            ? 'bg-[#0a50ff] text-white'
                            : 'bg-[#f8fafc] dark:bg-slate-800 text-[#5a6a85] hover:text-[#0d1b35] border border-[#dde5f0] dark:border-slate-700'
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Painel Direito: Demonstrativo Detalhado do Cálculo Simulado */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-[#0d1b35] text-white border border-[#1e2f50] shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2f50] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#55b0ff] tracking-wider">
                  Demonstrativo Analítico
                </span>
                <h4 className="text-sm font-extrabold text-white font-['Red_Hat_Display']">
                  Resultado da Simulação
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Tempo de Atraso</span>
                <p className="text-xs font-mono font-bold text-amber-300">
                  {resultado.diasAtraso} dias
                </p>
              </div>
            </div>

            {/* Linhas de Composição */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Valor Original Principal</span>
                <span className="font-bold text-slate-100">
                  R$ {resultado.valorOriginal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300 flex items-center gap-1">
                  <span>Multa Moratória ({resultado.multaPercent}%)</span>
                </span>
                <span className="text-amber-300 font-bold">
                  + R$ {resultado.multaValor.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">
                  Juros ({resultado.jurosPercentMes}% a.m. • {resultado.diasAtraso}d)
                </span>
                <span className="text-amber-300 font-bold">
                  + R$ {resultado.jurosValor.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Correção Monetária ({resultado.correcaoIndicePercent}%)</span>
                <span className="text-slate-300">
                  + R$ {resultado.correcaoValor.toFixed(2)}
                </span>
              </div>

              {resultado.descontoConcedido > 0 && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800/80 text-emerald-400">
                  <span>Desconto Aplicado</span>
                  <span className="font-bold">- R$ {resultado.descontoConcedido.toFixed(2)}</span>
                </div>
              )}

              {/* Total Geral Destacado */}
              <div className="pt-2 flex items-center justify-between text-sm">
                <span className="font-sans font-extrabold text-white">Total Atualizado</span>
                <span className="font-mono text-xl font-extrabold text-cyan-400">
                  R$ {resultado.totalFinal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Projeção de Parcelamento Simulado */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-[#55b0ff] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulação do Acordo em {parcelamento.qtdParcelas}x</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Entrada Sugerida</span>
                  <span className="font-bold text-white">
                    R$ {parcelamento.entradaEfetiva.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Valor por Parcela</span>
                  <span className="font-bold text-emerald-400">
                    {parcelamento.qtdParcelas}x R$ {parcelamento.valorParcela.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                Saldo restante financiado: R$ {parcelamento.saldoRestante.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#55b0ff] shrink-0 mt-0.5" />
              <span>
                Este resultado é <strong>estritamente consultivo</strong>. Nenhum dado foi salvo em banco de dados ou atribuído a unidades/moradores.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO DE COMPARAÇÃO DE CENÁRIOS (Cenário A Proposto vs Cenário B Alternativo) */}
      {showComparison && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-900 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Análise Comparativa de Cenários de Negociação
              </span>
              <h4 className="text-sm font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display']">
                Comparativo: Cenário Padrão (A) vs. Cenários Alternativos (B)
              </h4>
            </div>
            <span className="text-xs text-[#5a6a85] dark:text-slate-400">
              Permite simular bonificações por pontualidade ou prazos estendidos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cenário A: Parcelamento Base */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Cenário A: Base</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                  {parcelamento.qtdParcelas}x Parcelas
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#5a6a85] dark:text-slate-400">
                  <span>Total Atualizado:</span>
                  <span className="font-mono font-bold text-[#0d1b35] dark:text-white">R$ {resultado.totalFinal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#5a6a85] dark:text-slate-400">
                  <span>Entrada:</span>
                  <span className="font-mono font-bold text-[#0d1b35] dark:text-white">R$ {parcelamento.entradaEfetiva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#5a6a85] dark:text-slate-400">
                  <span>Parcelas:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {parcelamento.qtdParcelas}x R$ {parcelamento.valorParcela.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cenário B1: Quitação à Vista com Bonificação */}
            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Cenário B1: À Vista</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Desc:</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    value={descontoCenarioB}
                    onChange={(e) => setDescontoCenarioB(parseFloat(e.target.value) || 0)}
                    className="w-12 px-1 py-0.5 text-[10px] font-mono font-bold rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-center"
                  />
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">%</span>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                  <span>Valor com Bonificação:</span>
                  <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100">
                    R$ {cenarioB.valorAVistaComDesconto.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Economia Proposta:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-300">
                    - R$ {cenarioB.economiaAVista.toFixed(2)}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 dark:text-emerald-400 pt-1">
                  Liquidação imediata em parcela única com desconto condicional.
                </div>
              </div>
            </div>

            {/* Cenário B2: Parcelamento Alongado */}
            <div className="p-4 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200">Cenário B2: Alongado</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-cyan-700 dark:text-cyan-300 font-semibold">Qtd:</span>
                  <select
                    value={numParcelasB}
                    onChange={(e) => setNumParcelasB(parseInt(e.target.value) || 6)}
                    className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700"
                  >
                    {[4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-cyan-800 dark:text-cyan-300">
                  <span>Entrada Mantida:</span>
                  <span className="font-mono font-bold">R$ {parcelamento.entradaEfetiva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-cyan-800 dark:text-cyan-300">
                  <span>Parcela Alongada:</span>
                  <span className="font-mono font-bold text-cyan-700 dark:text-cyan-200">
                    {cenarioB.qtdParcelasB}x R$ {cenarioB.valorParcelaB.toFixed(2)}
                  </span>
                </div>
                <div className="text-[11px] text-cyan-800 dark:text-cyan-400 pt-1">
                  Parcelas mais brandas para facilitar adesão e regularização.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPRESSÃO / RELATÓRIO A4 DE SIMULAÇÃO FINANCEIRA */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn print:bg-transparent print:p-0 print:absolute print:inset-0">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-container, .print-container * {
                visibility: visible;
              }
              .print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}</style>
          <div className="print-container w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
            {/* Topo do Modal */}
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className={`w-5 h-5 ${printDocType === 'agreement' ? 'text-emerald-600' : 'text-[#0a50ff]'}`} />
                <h3 className="font-bold text-slate-900 text-sm">
                  {printDocType === 'agreement' ? 'Emissão de Termo de Confissão de Dívida' : 'Memória de Cálculo de Simulação'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${printDocType === 'agreement' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0a50ff] hover:bg-[#0842cc]'}`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Folha</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Inputs Opcionais (Apenas para Acordo, não saem na impressão) */}
            {printDocType === 'agreement' && (
              <div className="px-6 py-4 bg-white border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Devedor (Nome/Razão Social)</label>
                  <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unidade Relacionada</label>
                  <input type="text" value={debtorUnit} onChange={e => setDebtorUnit(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CPF / CNPJ</label>
                  <input type="text" value={debtorDoc} onChange={e => setDebtorDoc(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none" />
                </div>
              </div>
            )}

            {/* Conteúdo Imprimível */}
            <div className="p-6 sm:p-8 overflow-y-auto print:overflow-visible space-y-5 text-slate-900 font-sans">
              <div className="border-b-2 border-slate-800 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                      Condomínio Residencial Solar das Palmeiras
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      CNPJ: 34.891.022/0001-85 • Av. dos Holandeses, Quadra 14 - Calhau, São Luís - MA
                    </p>
                  </div>
                  {printDocType === 'simulation' && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-800 border border-slate-300 uppercase">
                      Documento Consultivo
                    </span>
                  )}
                </div>
                <div className={`mt-3 text-xs font-bold uppercase tracking-wider ${printDocType === 'agreement' ? 'text-slate-900 text-center text-lg mt-6' : 'text-[#0a50ff]'}`}>
                  {printDocType === 'agreement' ? 'TERMO DE ACORDO EXTRAJUDICIAL E CONFISSÃO DE DÍVIDA' : 'Memória de Cálculo & Simulação de Encargos Moratórios'}
                </div>
              </div>

              {printDocType === 'agreement' ? (
                <div className="space-y-6 text-sm text-slate-800 leading-relaxed text-justify">
                  <p>
                    Pelo presente instrumento, de um lado o credor <strong>CONDOMÍNIO RESIDENCIAL SOLAR DAS PALMEIRAS</strong>, já qualificado no cabeçalho, e de outro lado o(a) devedor(a) <strong>{debtorName || '_________________________________'}</strong>, inscrito(a) no CPF/CNPJ sob o nº <strong>{debtorDoc || '___________________'}</strong>, titular/responsável pela unidade <strong>{debtorUnit || '________'}</strong>, firmam o presente termo.
                  </p>
                  <p>
                    CLÁUSULA 1 - DA CONFISSÃO DE DÍVIDA: O(A) DEVEDOR(A) reconhece e confessa ser devedor(a) da quantia líquida, certa e exigível de <strong>R$ {resultado.totalFinal.toFixed(2)}</strong>, correspondente às cotas condominiais e encargos legais (multa de {resultado.multaPercent}%, juros de {resultado.jurosPercentMes}% a.m. e correção), já abatido eventual desconto concedido de R$ {resultado.descontoConcedido.toFixed(2)}.
                  </p>
                  <p>
                    CLÁUSULA 2 - DA FORMA DE PAGAMENTO: O credor concorda em receber o débito confessado de forma parcelada, da seguinte maneira: uma entrada/sinal no valor de <strong>R$ {parcelamento.entradaEfetiva.toFixed(2)}</strong>, seguida de <strong>{parcelamento.qtdParcelas} parcela(s) mensais e sucessivas no valor de R$ {parcelamento.valorParcela.toFixed(2)}</strong>.
                  </p>
                  <p>
                    CLÁUSULA 3 - DA INADIMPLÊNCIA: O não pagamento de qualquer parcela no vencimento acarretará o vencimento antecipado do saldo remanescente, acrescido de multa de 10% e honorários advocatícios (20%), além de imediato protesto e/ou execução judicial deste título.
                  </p>
                  <p>
                    Por estarem justos e contratados, assinam o presente em duas vias de igual teor.
                  </p>
                  
                  <div className="pt-16 grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                      <div className="border-t border-slate-900 mx-8 mb-2"></div>
                      <strong>CONDOMÍNIO RESIDENCIAL SOLAR DAS PALMEIRAS</strong><br/>
                      (Credor / Síndico)
                    </div>
                    <div>
                      <div className="border-t border-slate-900 mx-8 mb-2"></div>
                      <strong>{debtorName || 'Devedor'}</strong><br/>
                      (Devedor)
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabela de Composição */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Detalhamento dos Encargos Financeiros Simulados
                </div>
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item / Descrição</th>
                      <th className="p-2.5 text-center">Referência</th>
                      <th className="p-2.5 text-right">Valor Calculado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Valor Principal Original</td>
                      <td className="p-2.5 text-center text-slate-600">Venc. {new Date(resultado.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">R$ {resultado.valorOriginal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Multa Moratória Convencionada</td>
                      <td className="p-2.5 text-center text-slate-600">{resultado.multaPercent}%</td>
                      <td className="p-2.5 text-right text-slate-800">+ R$ {resultado.multaValor.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Juros de Mora (Pro-rata die)</td>
                      <td className="p-2.5 text-center text-slate-600">{resultado.jurosPercentMes}% a.m. ({resultado.diasAtraso} dias)</td>
                      <td className="p-2.5 text-right text-slate-800">+ R$ {resultado.jurosValor.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-medium text-slate-800">Atualização / Correção Monetária</td>
                      <td className="p-2.5 text-center text-slate-600">{resultado.correcaoIndicePercent}%</td>
                      <td className="p-2.5 text-right text-slate-800">+ R$ {resultado.correcaoValor.toFixed(2)}</td>
                    </tr>
                    {resultado.descontoConcedido > 0 && (
                      <tr className="text-emerald-700 font-bold">
                        <td className="p-2.5 font-sans">Desconto de Pontualidade / Acordo</td>
                        <td className="p-2.5 text-center">Bonificação</td>
                        <td className="p-2.5 text-right">- R$ {resultado.descontoConcedido.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold text-sm">
                      <td className="p-2.5 font-sans text-slate-900">TOTAL SIMULADO ATUALIZADO</td>
                      <td className="p-2.5 text-center font-sans text-xs text-slate-600">Base em {new Date(resultado.dataCalculo + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="p-2.5 text-right text-[#0a50ff]">R$ {resultado.totalFinal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Proposta de Parcelamento Sugerida */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-800 uppercase tracking-wide">
                  2. Sugestão de Composição de Acordo / Parcelamento
                </div>
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Entrada Simulada</span>
                    <span className="font-bold text-slate-900">R$ {parcelamento.entradaEfetiva.toFixed(2)}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Plano de Parcelamento</span>
                    <span className="font-bold text-emerald-700">{parcelamento.qtdParcelas}x de R$ {parcelamento.valorParcela.toFixed(2)}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-sans">Saldo a Parcelar</span>
                    <span className="font-bold text-slate-900">R$ {parcelamento.saldoRestante.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Nota de Isenção e Não Vinculação */}
              <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 leading-relaxed space-y-1">
                <p>
                  <strong>AVISO LEGAL IMPORTANTE:</strong> Este documento constitui estritamente uma memória de cálculo simulatória para fins de consulta e orientação. Os valores aqui apurados não representam cobrança formal, confissão de dívida ou renúncia a direitos creditórios pelo condomínio, não possuindo vinculação cadastral direta com nenhuma fração ideal.
                </p>
                <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400">
                  <span>Emitido via Sistema Enlace-DoorIA (Módulo Financeiro Avulso)</span>
                  <span>Data/Hora: {new Date().toLocaleString('pt-BR')}</span>
                </div>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
