import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { calcularBenchmarks, calcularRetornoTotal } from '../services/calculations';
import type { Benchmarks } from '../types';

interface Props {
  yieldBruto: number;
  yieldLiquido: number;
  valorizacao12mPct: number;
  selicAnual: number;
  ipca12m: number;
  nomeImovel: string;
  benchmarksData?: Benchmarks | null;
}

type ViewMode = 'yield' | 'bruto' | 'liquido';

export function BenchmarkChart({ yieldBruto, yieldLiquido, valorizacao12mPct, selicAnual, ipca12m, nomeImovel, benchmarksData }: Props) {
  const [view, setView] = useState<ViewMode>('liquido');

  const yieldBenchmarks = calcularBenchmarks(yieldLiquido, selicAnual, ipca12m);
  const retornoTotal = calcularRetornoTotal(yieldBruto, yieldLiquido, valorizacao12mPct, benchmarksData ?? null);

  let data: { name: string; valor: number; fill: string }[];
  let refValue: number;
  let title: string;

  if (view === 'yield') {
    refValue = yieldLiquido;
    title = 'Yield Líquido vs Renda Fixa';
    data = [
      { name: nomeImovel, valor: yieldLiquido, fill: '#10b981' },
      ...yieldBenchmarks.map(b => ({
        name: b.nome,
        valor: b.taxaLiquida ?? b.taxa,
        fill: '#64748b',
      })),
    ];
  } else if (view === 'bruto') {
    refValue = retornoTotal.retornoBrutoImovelPct;
    title = 'Retorno Total Bruto (Yield + Valorização 12m)';
    data = [
      { name: `${nomeImovel} (total)`, valor: retornoTotal.retornoBrutoImovelPct, fill: '#10b981' },
      { name: 'Selic', valor: retornoTotal.retornoBrutoSelicPct, fill: '#64748b' },
      { name: 'CDI', valor: retornoTotal.retornoBrutoCdiPct, fill: '#64748b' },
      { name: 'IPCA+6%', valor: retornoTotal.retornoBrutoIpcaMais6Pct, fill: '#64748b' },
      { name: 'Poupança', valor: retornoTotal.retornoBrutoPoupancaPct, fill: '#64748b' },
    ];
  } else {
    refValue = retornoTotal.retornoLiquidoImovelPct;
    title = 'Retorno Total Líquido (após IR e custos)';
    data = [
      { name: `${nomeImovel} (total)`, valor: retornoTotal.retornoLiquidoImovelPct, fill: '#10b981' },
      { name: 'Selic líq.', valor: retornoTotal.retornoLiquidoSelicPct, fill: '#64748b' },
      { name: 'CDI líq.', valor: retornoTotal.retornoLiquidoCdiPct, fill: '#64748b' },
      { name: 'IPCA+6% líq.', valor: retornoTotal.retornoLiquidoIpcaMais6Pct, fill: '#64748b' },
      { name: 'Poupança', valor: retornoTotal.retornoLiquidoPoupancaPct, fill: '#64748b' },
    ];
  }

  return (
    <div className="benchmark-panel">
      <h4>Benchmark vs Renda Fixa</h4>

      {/* View toggle */}
      <div className="benchmark-toggle">
        <button className={view === 'liquido' ? 'active' : ''} onClick={() => setView('liquido')}>
          Total Líquido
        </button>
        <button className={view === 'bruto' ? 'active' : ''} onClick={() => setView('bruto')}>
          Total Bruto
        </button>
        <button className={view === 'yield' ? 'active' : ''} onClick={() => setView('yield')}>
          Só Yield
        </button>
      </div>

      <p className="benchmark-subtitle">{title}</p>

      {view !== 'yield' && (
        <div className="benchmark-breakdown" style={{ fontSize: '0.8em', color: '#64748b', marginBottom: 8 }}>
          {view === 'bruto' ? (
            <span>Yield bruto {yieldBruto.toFixed(1)}% + Valorização {valorizacao12mPct >= 0 ? '+' : ''}{valorizacao12mPct.toFixed(1)}% = {retornoTotal.retornoBrutoImovelPct.toFixed(1)}%</span>
          ) : (
            <span>Yield líq. {yieldLiquido.toFixed(1)}% + Valorização líq. {(retornoTotal.retornoLiquidoImovelPct - yieldLiquido).toFixed(1)}% = {retornoTotal.retornoLiquidoImovelPct.toFixed(1)}%</span>
          )}
        </div>
      )}

      <div className="benchmark-chart-container">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${Number(v).toFixed(2)}% a.a.`} />
            <ReferenceLine x={refValue} stroke="#10b981" strokeDasharray="3 3" />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spread table */}
      <div className="benchmark-table">
        <table>
          <thead>
            <tr>
              <th>Investimento</th>
              <th>Taxa</th>
              <th>Spread</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(1).map(d => {
              const spread = refValue - d.valor;
              return (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{d.valor.toFixed(2)}%</td>
                  <td className={spread >= 0 ? 'positive' : 'negative'}>
                    {spread >= 0 ? '+' : ''}{spread.toFixed(2)}pp
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
