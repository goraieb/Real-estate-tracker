import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { calcularBenchmarks } from '../services/calculations';

interface Props {
  yieldImovel: number;
  selicAnual: number;
  ipca12m: number;
  nomeImovel: string;
}

export function BenchmarkChart({ yieldImovel, selicAnual, ipca12m, nomeImovel }: Props) {
  const benchmarks = calcularBenchmarks(yieldImovel, selicAnual, ipca12m);

  const data = [
    { name: nomeImovel, valor: yieldImovel, fill: '#10b981' },
    ...benchmarks.map(b => ({
      name: b.nome,
      valor: b.taxaLiquida ?? b.taxa,
      fill: '#64748b',
    })),
  ];

  return (
    <div className="benchmark-panel">
      <h4>Benchmark vs Renda Fixa</h4>
      <div className="benchmark-chart-container">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 13 }} />
            <Tooltip formatter={(v: number) => `${v.toFixed(2)}% a.a.`} />
            <ReferenceLine x={yieldImovel} stroke="#10b981" strokeDasharray="3 3" />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <rect key={i} fill={entry.fill} />
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
              <th>Taxa líq.</th>
              <th>Spread</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map(b => (
              <tr key={b.nome}>
                <td>{b.nome}</td>
                <td>{(b.taxaLiquida ?? b.taxa).toFixed(2)}%</td>
                <td className={b.spreadPp >= 0 ? 'positive' : 'negative'}>
                  {b.spreadPp >= 0 ? '+' : ''}{b.spreadPp.toFixed(2)}pp
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
