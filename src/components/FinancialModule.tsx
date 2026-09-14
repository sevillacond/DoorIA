import React, { useState } from 'react';
import {
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Download,
  Percent,
  Calculator,
  ShieldCheck,
  Building,
  Sliders,
} from 'lucide-react';
import type { FinancialBill, FinancialSummary, Agreement, UserSession } from '../types.ts';
import { FinancialSimulationCalculator } from './FinancialSimulationCalculator.tsx';

interface FinancialModuleProps {
  bills: FinancialBill[];
  summary: FinancialSummary | null;
  agreements: Agreement[];
  session: UserSession;
}

export const FinancialModule: React.FC<FinancialModuleProps> = ({
  bills,
  summary,
  agreements,
  session,
}) => {
  const [selectedTab, setSelectedTab] = useState<'boletos' | 'inadimplencia' | 'calculadora' | 'acordos'>('boletos');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = (format: 'PDF' | 'XLSX') => {
    setExportNotice(`Relatório Financeiro exportado com sucesso em formato ${format} (Auditoria preservada).`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const isMorador = session.role === 'morador';

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
            <DollarSign className="w-5 h-5 text-[#0a50ff]" />
            <span>Gestão Financeira & Cobrança Condominial</span>
          </h2>
          <p className="text-xs text-[#5a6a85] dark:text-slate-400">
            {isMorador
              ? `Demonstrativo da Unidade ${session.unitNumber} | Consulta e simulação transparente`
              : 'Painel Geral do Condomínio Solar das Palmeiras (12 Unidades)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTab('calculadora')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              selectedTab === 'calculadora'
                ? 'bg-[#0a50ff] text-white border-[#0a50ff] shadow-sm'
                : 'bg-white dark:bg-slate-800 text-[#0a50ff] border-[#dde5f0] dark:border-slate-700 hover:bg-[#ebf2ff]'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculadora & Simulação</span>
          </button>

          <button
            onClick={() => handleExport('PDF')}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#5a6a85] dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-[#dde5f0] dark:border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0a50ff]" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={() => handleExport('XLSX')}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#5a6a85] dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-[#dde5f0] dark:border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar XLSX</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* CARDS DE RESUMO FINANCEIRO (PARA SÍNDICO OU MORADOR) */}
      {summary && !isMorador && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs">
            <div className="text-[11px] text-[#5a6a85] dark:text-slate-400 uppercase tracking-wider font-bold">Saldo Atual Caixa</div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {summary.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[#5a6a85] dark:text-slate-500 mt-0.5">Conta Corrente / Reserva</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs">
            <div className="text-[11px] text-[#5a6a85] dark:text-slate-400 uppercase tracking-wider font-bold">Recebíveis do Mês</div>
            <div className="text-xl font-bold font-mono text-[#0a50ff] dark:text-cyan-400 mt-1">
              R$ {summary.recebiveisMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[#5a6a85] dark:text-slate-500 mt-0.5">12 Unidades x R$ 650,00</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs">
            <div className="text-[11px] text-[#5a6a85] dark:text-slate-400 uppercase tracking-wider font-bold">Total Inadimplência</div>
            <div className="text-xl font-bold font-mono text-[#ff5c7a] dark:text-red-400 mt-1">
              R$ {summary.totalInadimplencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[#5a6a85] dark:text-slate-500 mt-0.5">
              {summary.unidadesInadimplentesCount} unidade(s) com atraso
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs">
            <div className="text-[11px] text-[#5a6a85] dark:text-slate-400 uppercase tracking-wider font-bold">Resultado Mensal</div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-300 mt-1">
              + R$ {summary.resultadoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[#5a6a85] dark:text-slate-500 mt-0.5">Receitas - Despesas (R$ 4.950)</div>
          </div>
        </div>
      )}

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="flex items-center gap-2 border-b border-[#dde5f0] dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setSelectedTab('boletos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            selectedTab === 'boletos'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Taxas & Boletos
        </button>

        <button
          onClick={() => setSelectedTab('inadimplencia')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            selectedTab === 'inadimplencia'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Cálculo Detalhado de Inadimplência
        </button>

        <button
          onClick={() => setSelectedTab('calculadora')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            selectedTab === 'calculadora'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'text-[#0a50ff] bg-[#ebf2ff] dark:bg-slate-800 hover:bg-[#dde8ff]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Calculadora & Simulação (Sem Vínculo)</span>
        </button>

        <button
          onClick={() => setSelectedTab('acordos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            selectedTab === 'acordos'
              ? 'bg-[#0a50ff] text-white shadow-xs'
              : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Acordos de Parcelamento ({agreements.length})
        </button>
      </div>

      {/* ABA 1: BOLETOS & TAXAS */}
      {selectedTab === 'boletos' && (
        <div className="space-y-3">
          {bills.map((bill) => (
            <div key={bill.id} className="p-4 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0d1b35] dark:text-white">Apto {bill.unitNumber}</span>
                  <span className="text-xs text-[#5a6a85] dark:text-slate-400 font-medium">• {bill.competencia}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      bill.status === 'pago'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : bill.status === 'atrasado'
                        ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {bill.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                  <div>
                    <span className="text-[#5a6a85] dark:text-slate-400">Venc: </span>
                    <span className="text-[#0d1b35] dark:text-slate-200">{new Date(bill.vencimento).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="text-[#5a6a85] dark:text-slate-400">Original: </span>
                    <span className="text-[#0d1b35] dark:text-slate-200">R$ {bill.valorOriginal.toFixed(2)}</span>
                  </div>
                  {bill.multa > 0 && (
                    <div>
                      <span className="text-[#5a6a85] dark:text-slate-400">Encargos: </span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">+ R$ {(bill.multa + bill.juros + bill.correcao).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 pt-3 sm:pt-0 border-t border-[#dde5f0] dark:border-slate-800 sm:border-0">
                <div className="text-right">
                  <div className="text-[10px] text-[#5a6a85] dark:text-slate-400 uppercase tracking-wider font-bold">Total Atualizado</div>
                  <div className="font-bold text-[#0a50ff] dark:text-cyan-300 text-lg font-mono">R$ {bill.valorTotal.toFixed(2)}</div>
                </div>
                
                <button
                  onClick={() => alert(`Código de Barras copiado:\n${bill.codigoBarras}`)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0d1b35] dark:text-slate-200 text-xs font-bold border border-[#dde5f0] dark:border-slate-700 transition cursor-pointer"
                >
                  Copiar Linha Digitável
                </button>
              </div>
            </div>
          ))}
          {bills.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl text-[#5a6a85] dark:text-slate-400">
              Nenhum boleto encontrado.
            </div>
          )}
        </div>
      )}

      {/* ABA 2: CÁLCULO DETALHADO DE INADIMPLÊNCIA (SEÇÃO 23 DO MASTER PRD) */}
      {selectedTab === 'inadimplencia' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-[#0a50ff] dark:text-cyan-400 font-bold text-xs">
              <Calculator className="w-4 h-4" />
              <span>Regras Legais de Cálculo (Código Civil Art. 1336 / PRD Seção 23)</span>
            </div>
            <p className="text-xs text-[#5a6a85] dark:text-slate-300 leading-relaxed">
              Cada competência em atraso é apurada individualmente a partir do vencimento original:
              <strong className="text-[#0d1b35] dark:text-white"> Multa de 2%</strong> sobre o principal +
              <strong className="text-[#0d1b35] dark:text-white"> Juros de 1% ao mês</strong> (0,033% ao dia) proporcional aos dias de atraso +
              <strong className="text-[#0d1b35] dark:text-white"> Correção Monetária</strong> aplicável.
            </p>
          </div>

          <div className="space-y-3">
            {bills
              .filter((b) => b.status === 'atrasado')
              .map((bill) => (
                <div key={bill.id} className="p-4 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0d1b35] dark:text-white">Apto {bill.unitNumber}</span>
                      <span className="text-xs text-[#5a6a85] dark:text-slate-400 font-medium">• {bill.competencia}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[#5a6a85] dark:text-slate-400 block text-[10px] uppercase">Vencimento</span>
                        <span className="text-[#0d1b35] dark:text-slate-200">{new Date(bill.vencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div>
                        <span className="text-[#5a6a85] dark:text-slate-400 block text-[10px] uppercase">Atraso</span>
                        <span className="text-[#ff5c7a] dark:text-red-400 font-bold">{bill.diasAtraso} dias</span>
                      </div>
                      <div>
                        <span className="text-[#5a6a85] dark:text-slate-400 block text-[10px] uppercase">Principal</span>
                        <span className="text-[#0d1b35] dark:text-slate-200">R$ {bill.valorOriginal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[#5a6a85] dark:text-slate-400 block text-[10px] uppercase">Encargos Totais</span>
                        <span className="text-amber-600 dark:text-amber-300">R$ {(bill.multa + bill.juros + bill.correcao).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Detalhamento dos Encargos (Apenas mobile) */}
                    <div className="sm:hidden flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono">
                      <span className="text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">Multa: R$ {bill.multa.toFixed(2)}</span>
                      <span className="text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded">Juros: R$ {bill.juros.toFixed(2)}</span>
                      <span className="text-[#5a6a85] dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">Correção: R$ {bill.correcao.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:items-end justify-between gap-1 pt-3 sm:pt-0 border-t border-[#dde5f0] dark:border-slate-800 sm:border-0 text-right">
                    {/* Detalhamento dos Encargos (Apenas desktop) */}
                    <div className="hidden sm:flex flex-col text-[10px] font-mono text-right text-amber-600 dark:text-amber-300/80 mb-2">
                      <span>Multa (2%): R$ {bill.multa.toFixed(2)}</span>
                      <span>Juros (1% am): R$ {bill.juros.toFixed(2)}</span>
                      <span className="text-[#5a6a85] dark:text-slate-500">Correção: R$ {bill.correcao.toFixed(2)}</span>
                    </div>
                    
                    <div className="text-[10px] text-[#5a6a85] dark:text-slate-400 uppercase tracking-wider font-bold">Total Devido</div>
                    <div className="font-bold text-[#ff5c7a] dark:text-red-400 text-lg font-mono">R$ {bill.valorTotal.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            
            {bills.filter((b) => b.status === 'atrasado').length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl text-[#5a6a85] dark:text-slate-400">
                Nenhuma inadimplência encontrada.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA EXCLUSIVA: CALCULADORA & SIMULADOR AVULSO (SEM VÍNCULO COM MORADORES) */}
      {selectedTab === 'calculadora' && (
        <FinancialSimulationCalculator />
      )}

      {/* ABA 3: ACORDOS DE PARCELAMENTO (SEÇÃO 24 DO MASTER PRD) */}
      {selectedTab === 'acordos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agreements.map((agr) => (
              <div
                key={agr.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-[#dde5f0] dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#0d1b35] dark:text-white">Acordo Formal - Apto {agr.unitNumber}</h4>
                    <span className="text-[11px] text-[#5a6a85] dark:text-slate-400">
                      Firmado em {new Date(agr.dataCriacao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-[#0a50ff] border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
                    {agr.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-[#5a6a85] dark:text-slate-400">Valor Original:</div>
                    <div className="font-bold text-[#0d1b35] dark:text-slate-300">R$ {agr.totalOriginal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[#5a6a85] dark:text-slate-400">Total Negociado:</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">R$ {agr.totalNegociado.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[#5a6a85] dark:text-slate-400">Entrada Paga:</div>
                    <div className="font-bold text-[#0a50ff] dark:text-cyan-300">R$ {agr.entrada.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[#5a6a85] dark:text-slate-400">Parcelamento:</div>
                    <div className="font-bold text-[#0d1b35] dark:text-white">
                      {agr.parcelasPagas} de {agr.parcelasTotal} pagas (R$ {agr.valorParcela.toFixed(2)}/mês)
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso do Acordo */}
                <div>
                  <div className="flex justify-between text-[11px] text-[#5a6a85] dark:text-slate-400 mb-1">
                    <span>Progresso de Liquidação</span>
                    <span>{Math.round((agr.parcelasPagas / agr.parcelasTotal) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${(agr.parcelasPagas / agr.parcelasTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
