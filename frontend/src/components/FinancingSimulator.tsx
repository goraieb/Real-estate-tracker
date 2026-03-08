import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface SimResult {
  tabela: Array<{
    parcela: number;
    amortizacao: number;
    juros: number;
    prestacao: number;
    saldo_devedor: number;
  }>;
  resumo: {
    primeira_parcela: number;
    ultima_parcela: number;
    total_pago: number;
    total_juros: number;
    sistema: string;
  };
}

function calcSAC(valorFin: number, taxaAnual: number, prazo: number): SimResult {
  if (valorFin <= 0 || prazo <= 0) return { tabela: [], resumo: { primeira_parcela: 0, ultima_parcela: 0, total_pago: 0, total_juros: 0, sistema: 'SAC' } };
  const taxaMensal = (1 + taxaAnual / 100) ** (1 / 12) - 1;
  const amort = valorFin / prazo;
  let saldo = valorFin;
  const tabela = [];
  let totalPago = 0;
  for (let i = 1; i <= prazo; i++) {
    const juros = saldo * taxaMensal;
    const prestacao = amort + juros;
    saldo -= amort;
    totalPago += prestacao;
    tabela.push({ parcela: i, amortizacao: amort, juros, prestacao, saldo_devedor: Math.max(saldo, 0) });
  }
  return {
    tabela,
    resumo: { primeira_parcela: tabela[0].prestacao, ultima_parcela: tabela[tabela.length - 1].prestacao, total_pago: totalPago, total_juros: totalPago - valorFin, sistema: 'SAC' },
  };
}

function calcPRICE(valorFin: number, taxaAnual: number, prazo: number): SimResult {
  if (valorFin <= 0 || prazo <= 0) return { tabela: [], resumo: { primeira_parcela: 0, ultima_parcela: 0, total_pago: 0, total_juros: 0, sistema: 'PRICE' } };
  const taxaMensal = (1 + taxaAnual / 100) ** (1 / 12) - 1;
  const fator = (1 + taxaMensal) ** prazo;
  const pmt = valorFin * (taxaMensal * fator) / (fator - 1);
  let saldo = valorFin;
  const tabela = [];
  let totalPago = 0;
  for (let i = 1; i <= prazo; i++) {
    const juros = saldo * taxaMensal;
    const amort = pmt - juros;
    saldo -= amort;
    totalPago += pmt;
    tabela.push({ parcela: i, amortizacao: amort, juros, prestacao: pmt, saldo_devedor: Math.max(saldo, 0) });
  }
  return {
    tabela,
    resumo: { primeira_parcela: pmt, ultima_parcela: pmt, total_pago: totalPago, total_juros: totalPago - valorFin, sistema: 'PRICE' },
  };
}

interface Props {
  valorImovelInicial?: number;
}

export function FinancingSimulator({ valorImovelInicial }: Props) {
  const [valorImovel, setValorImovel] = useState(valorImovelInicial ?? 500000);
  const [entradaPct, setEntradaPct] = useState(20);
  const [taxaJuros, setTaxaJuros] = useState(10.5);
  const [prazoAnos, setPrazoAnos] = useState(30);
  const [sistema, setSistema] = useState<'SAC' | 'PRICE' | 'AMBOS'>('AMBOS');
  const [showTabela, setShowTabela] = useState(false);

  const entrada = valorImovel * (entradaPct / 100);
  const valorFinanciado = valorImovel - entrada;
  const prazoMeses = prazoAnos * 12;

  const sac = calcSAC(valorFinanciado, taxaJuros, prazoMeses);
  const price = calcPRICE(valorFinanciado, taxaJuros, prazoMeses);

  const active = sistema === 'PRICE' ? price : sac;
  const economiaSac = price.resumo.total_pago - sac.resumo.total_pago;

  // Chart data: sample every 12 months
  const saldoData = active.tabela
    .filter((_, i) => i % 12 === 11 || i === 0)
    .map(row => ({
      ano: Math.ceil(row.parcela / 12),
      saldo: Math.round(row.saldo_devedor),
    }));

  const composicaoData = active.tabela
    .filter((_, i) => i % 12 === 0)
    .map(row => ({
      ano: Math.ceil(row.parcela / 12),
      amortizacao: Math.round(row.amortizacao),
      juros: Math.round(row.juros),
    }));

  return (
    <div className="financing-panel">
      <h3>Simulador de Financiamento</h3>

      <div className="financing-grid">
        {/* Inputs */}
        <div className="financing-inputs">
          <label className="form-field">
            <span className="form-label">Valor do imóvel</span>
            <input type="number" value={valorImovel} onChange={e => setValorImovel(Number(e.target.value))} />
          </label>
          <label className="form-field">
            <span className="form-label">Entrada (%)</span>
            <input type="number" min="0" max="100" step="5" value={entradaPct} onChange={e => setEntradaPct(Number(e.target.value))} />
          </label>
          <label className="form-field">
            <span className="form-label">Taxa juros (% a.a.)</span>
            <input type="number" step="0.1" value={taxaJuros} onChange={e => setTaxaJuros(Number(e.target.value))} />
          </label>
          <label className="form-field">
            <span className="form-label">Prazo (anos)</span>
            <input type="number" min="1" max="35" value={prazoAnos} onChange={e => setPrazoAnos(Number(e.target.value))} />
          </label>
          <div className="form-field">
            <span className="form-label">Sistema</span>
            <div className="radio-group">
              <label className="radio-option">
                <input type="radio" checked={sistema === 'SAC'} onChange={() => setSistema('SAC')} /> SAC
              </label>
              <label className="radio-option">
                <input type="radio" checked={sistema === 'PRICE'} onChange={() => setSistema('PRICE')} /> PRICE
              </label>
              <label className="radio-option">
                <input type="radio" checked={sistema === 'AMBOS'} onChange={() => setSistema('AMBOS')} /> Ambos
              </label>
            </div>
          </div>
          <div className="financing-summary-item">
            <span>Entrada</span>
            <strong>{fmt(entrada)}</strong>
          </div>
          <div className="financing-summary-item">
            <span>Financiado</span>
            <strong>{fmt(valorFinanciado)}</strong>
          </div>
        </div>

        {/* Results */}
        <div className="financing-results">
          {/* Summary cards */}
          {sistema === 'AMBOS' ? (
            <div className="financing-compare">
              <div className="compare-col">
                <h4>SAC</h4>
                <div className="compare-item"><span>1ª parcela</span><strong>{fmt(sac.resumo.primeira_parcela)}</strong></div>
                <div className="compare-item"><span>Última</span><strong>{fmt(sac.resumo.ultima_parcela)}</strong></div>
                <div className="compare-item"><span>Total pago</span><strong>{fmt(sac.resumo.total_pago)}</strong></div>
                <div className="compare-item"><span>Total juros</span><strong className="negative">{fmt(sac.resumo.total_juros)}</strong></div>
              </div>
              <div className="compare-col">
                <h4>PRICE</h4>
                <div className="compare-item"><span>Parcela fixa</span><strong>{fmt(price.resumo.primeira_parcela)}</strong></div>
                <div className="compare-item"><span>—</span><strong>{fmt(price.resumo.ultima_parcela)}</strong></div>
                <div className="compare-item"><span>Total pago</span><strong>{fmt(price.resumo.total_pago)}</strong></div>
                <div className="compare-item"><span>Total juros</span><strong className="negative">{fmt(price.resumo.total_juros)}</strong></div>
              </div>
              <div className="compare-verdict">
                SAC economiza <strong className="positive">{fmt(economiaSac)}</strong> em juros
              </div>
            </div>
          ) : (
            <div className="financing-cards-row">
              <div className="fin-card"><span>1ª Parcela</span><strong>{fmt(active.resumo.primeira_parcela)}</strong></div>
              <div className="fin-card"><span>Última</span><strong>{fmt(active.resumo.ultima_parcela)}</strong></div>
              <div className="fin-card"><span>Total pago</span><strong>{fmt(active.resumo.total_pago)}</strong></div>
              <div className="fin-card"><span>Total juros</span><strong className="negative">{fmt(active.resumo.total_juros)}</strong></div>
            </div>
          )}

          {/* Saldo devedor chart */}
          <div className="financing-chart">
            <h4>Saldo Devedor</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={saldoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" tickFormatter={v => `${v}a`} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="saldo" stroke="#6366f1" fill="#e0e7ff" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Composição da parcela */}
          <div className="financing-chart">
            <h4>Composição da Parcela</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={composicaoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" tickFormatter={v => `${v}a`} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="amortizacao" name="Amortização" stackId="a" fill="#10b981" />
                <Bar dataKey="juros" name="Juros" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela de amortização */}
          <div className="financing-tabela">
            <button className="btn-secondary" onClick={() => setShowTabela(!showTabela)}>
              {showTabela ? 'Ocultar tabela' : 'Ver tabela de amortização'}
            </button>
            {showTabela && (
              <div className="tabela-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Prestação</th>
                      <th>Amortização</th>
                      <th>Juros</th>
                      <th>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.tabela.map(row => (
                      <tr key={row.parcela}>
                        <td>{row.parcela}</td>
                        <td>{fmt(row.prestacao)}</td>
                        <td>{fmt(row.amortizacao)}</td>
                        <td>{fmt(row.juros)}</td>
                        <td>{fmt(row.saldo_devedor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
