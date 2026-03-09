import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Imovel, Benchmarks } from '../types';
import { calcularEvolucaoPortfolio } from '../services/calculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface Props {
  imoveis: Imovel[];
  benchmarks: Benchmarks | null;
}

export function EquityDebtChart({ imoveis, benchmarks }: Props) {
  const evolucao = useMemo(
    () => calcularEvolucaoPortfolio(imoveis, benchmarks),
    [imoveis, benchmarks],
  );

  if (evolucao.meses.length === 0) return null;

  // Equity vs Debt chart data
  const equityDebtData = evolucao.meses.map((mes, i) => ({
    mes,
    equity: evolucao.equityTotal[i],
    divida: evolucao.dividaTotal[i],
  }));

  // Base-100 comparison chart data
  const comparisonData = evolucao.meses.map((mes, i) => ({
    mes,
    'Portfólio': evolucao.portfolioBase100[i],
    'SELIC': evolucao.selicAcumulada[i],
    'IPCA+6%': evolucao.ipcaMais6Acumulada[i],
  }));

  const interval = Math.max(1, Math.floor(evolucao.meses.length / 8));

  return (
    <div className="equity-debt-container">
      {/* Equity vs Debt */}
      <div className="evolution-chart-section">
        <h4>Equity vs Dívida</h4>
        <p className="chart-description">Evolução do patrimônio líquido (equity) e saldo devedor total ao longo do tempo</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={equityDebtData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} interval={interval} />
            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [fmt(Number(value)), String(value) === 'equity' ? 'Equity' : 'Dívida']}
              labelFormatter={label => `Mês: ${label}`}
            />
            <Legend formatter={(value) => value === 'equity' ? 'Equity' : 'Dívida'} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="divida"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison with macro indicators (base 100) */}
      <div className="evolution-chart-section">
        <h4>Portfólio vs Indicadores (Base 100)</h4>
        <p className="chart-description">Evolução comparada do patrimônio com SELIC e IPCA+6%, partindo de base 100</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} interval={interval} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [Number(value).toFixed(1)]}
              labelFormatter={label => `Mês: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="Portfólio" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="SELIC" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="IPCA+6%" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
