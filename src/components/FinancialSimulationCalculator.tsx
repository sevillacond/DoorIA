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

  // Estado de cópia
  const [copiedSummary, setCopiedSummary] = useState(false);

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

        <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
};
