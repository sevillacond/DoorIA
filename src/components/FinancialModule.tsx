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
} from 'lucide-react';
import type { FinancialBill, FinancialSummary, Agreement, UserSession } from '../types.ts';

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
  const [selectedTab, setSelectedTab] = useState<'boletos' | 'inadimplencia' | 'acordos'>('boletos');
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
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            <span>Gestão Financeira & Cobrança Condominial</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isMorador
              ? `Demonstrativo da Unidade ${session.unitNumber} | Cálculo transparente de encargos`
              : 'Painel Geral do Condomínio Solar das Palmeiras (12 Unidades)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('PDF')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={() => handleExport('XLSX')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar XLSX</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* CARDS DE RESUMO FINANCEIRO (PARA SÍNDICO OU MORADOR) */}
      {summary && !isMorador && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Saldo Atual Caixa</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              R$ {summary.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Conta Corrente / Reserva</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Recebíveis do Mês</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              R$ {summary.recebiveisMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">12 Unidades x R$ 650,00</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Inadimplência</div>
            <div className="text-xl font-bold font-mono text-red-400 mt-1">
              R$ {summary.totalInadimplencia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {summary.unidadesInadimplentesCount} unidade(s) com atraso
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Resultado Mensal</div>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
              + R$ {summary.resultadoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Receitas - Despesas (R$ 4.950)</div>
          </div>
        </div>
      )}

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSelectedTab('boletos')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            selectedTab === 'boletos'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Taxas & Boletos
        </button>

        <button
          onClick={() => setSelectedTab('inadimplencia')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            selectedTab === 'inadimplencia'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Cálculo Detalhado de Inadimplência
        </button>

        <button
          onClick={() => setSelectedTab('acordos')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            selectedTab === 'acordos'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Acordos de Parcelamento ({agreements.length})
        </button>
      </div>

      {/* ABA 1: BOLETOS & TAXAS */}
      {selectedTab === 'boletos' && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Unidade</th>
                    <th className="py-3 px-4">Competência</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Valor Original</th>
                    <th className="py-3 px-4">Encargos</th>
                    <th className="py-3 px-4">Total Atualizado</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">Apto {bill.unitNumber}</td>
                      <td className="py-3 px-4 text-slate-300">{bill.competencia}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(bill.vencimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        R$ {bill.valorOriginal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {bill.multa > 0 ? (
                          <span className="text-amber-400 font-semibold">
                            + R$ {(bill.multa + bill.juros + bill.correcao).toFixed(2)}
                          </span>
                        ) : (
                          'R$ 0,00'
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-300">
                        R$ {bill.valorTotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            bill.status === 'pago'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : bill.status === 'atrasado'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {bill.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => alert(`Código de Barras copiado:\n${bill.codigoBarras}`)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans border border-slate-700 transition"
                        >
                          Linha Digitável
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: CÁLCULO DETALHADO DE INADIMPLÊNCIA (SEÇÃO 23 DO MASTER PRD) */}
      {selectedTab === 'inadimplencia' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <Calculator className="w-4 h-4" />
              <span>Regras Legais de Cálculo (Código Civil Art. 1336 / PRD Seção 23)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cada competência em atraso é apurada individualmente a partir do vencimento original:
              <strong className="text-white"> Multa de 2%</strong> sobre o principal +
              <strong className="text-white"> Juros de 1% ao mês</strong> (0,033% ao dia) proporcional aos dias de atraso +
              <strong className="text-white"> Correção Monetária</strong> aplicável.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Unidade</th>
                    <th className="py-3 px-4">Competência</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Principal</th>
                    <th className="py-3 px-4">Atraso</th>
                    <th className="py-3 px-4">Multa (2%)</th>
                    <th className="py-3 px-4">Juros (1% a.m.)</th>
                    <th className="py-3 px-4">Correção</th>
                    <th className="py-3 px-4 font-bold text-right">Total Devido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {bills
                    .filter((b) => b.status === 'atrasado')
                    .map((bill) => (
                      <tr key={bill.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-white">Apto {bill.unitNumber}</td>
                        <td className="py-3 px-4 text-slate-300">{bill.competencia}</td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(bill.vencimento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-slate-300">R$ {bill.valorOriginal.toFixed(2)}</td>
                        <td className="py-3 px-4 text-red-400 font-bold">{bill.diasAtraso} dias</td>
                        <td className="py-3 px-4 text-amber-300">R$ {bill.multa.toFixed(2)}</td>
                        <td className="py-3 px-4 text-amber-300">R$ {bill.juros.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-400">R$ {bill.correcao.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-400">
                          R$ {bill.valorTotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: ACORDOS DE PARCELAMENTO (SEÇÃO 24 DO MASTER PRD) */}
      {selectedTab === 'acordos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agreements.map((agr) => (
              <div
                key={agr.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Acordo Formal - Apto {agr.unitNumber}</h4>
                    <span className="text-[11px] text-slate-400">
                      Firmado em {new Date(agr.dataCriacao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {agr.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-slate-400">Valor Original:</div>
                    <div className="font-bold text-slate-300">R$ {agr.totalOriginal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Total Negociado:</div>
                    <div className="font-bold text-emerald-400">R$ {agr.totalNegociado.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Entrada Paga:</div>
                    <div className="font-bold text-cyan-300">R$ {agr.entrada.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Parcelamento:</div>
                    <div className="font-bold text-white">
                      {agr.parcelasPagas} de {agr.parcelasTotal} pagas (R$ {agr.valorParcela.toFixed(2)}/mês)
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso do Acordo */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Progresso de Liquidação</span>
                    <span>{Math.round((agr.parcelasPagas / agr.parcelasTotal) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
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
