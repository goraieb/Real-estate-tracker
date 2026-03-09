import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, Wallet, Building2 } from 'lucide-react';
import type { Imovel, Benchmarks } from '../types';
import { calcularEvolucaoPortfolio } from '../services/calculations';
import { useThemeColors } from '../hooks/useThemeColors';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface Props {
  imoveis: Imovel[];
  benchmarks: Benchmarks | null;
}

export function PortfolioEvolution({ imoveis, benchmarks }: Props) {
  const tc = useThemeColors();
  const COLORS = [tc.green, tc.blue, tc.orange, tc.red, tc.purple, tc.pink];
  const evolucao = useMemo(
    () => calcularEvolucaoPortfolio(imoveis, benchmarks),
    [imoveis, benchmarks],
  );

  if (evolucao.meses.length === 0) {
    return (
      <div className="evolution-empty">
        <p>Dados históricos insuficientes para exibir evolução.</p>
      </div>
    );
  }

  const nomes = Object.keys(evolucao.seriesPorImovel);

  // Build chart data for stacked area
  const stackedData = evolucao.meses.map((mes, i) => {
    const row: Record<string, string | number> = { mes };
    for (const nome of nomes) {
      row[nome] = evolucao.seriesPorImovel[nome][i] ?? 0;
    }
    return row;
  });

  // Summary cards
  const lastIdx = evolucao.meses.length - 1;
  const totalEquity = evolucao.equityTotal[lastIdx] ?? 0;
  const totalDivida = evolucao.dividaTotal[lastIdx] ?? 0;
  const totalPatrimonio = totalEquity;
  const firstEquity = evolucao.equityTotal[0] ?? 0;
  const rentabilidade = firstEquity > 0 ? ((totalEquity / firstEquity) - 1) * 100 : 0;

  return (
    <div className="evolution-container">
      {/* Summary cards */}
      <div className="evolution-summary">
        <div className="evo-card">
          <Building2 size={18} />
          <div>
            <span className="evo-label">Patrimônio</span>
            <span className="evo-value">{fmt(totalPatrimonio)}</span>
          </div>
        </div>
        <div className="evo-card">
          <Wallet size={18} />
          <div>
            <span className="evo-label">Dívida Total</span>
            <span className="evo-value negative">{fmt(totalDivida)}</span>
          </div>
        </div>
        <div className="evo-card">
          <TrendingUp size={18} />
          <div>
            <span className="evo-label">Equity Total</span>
            <span className="evo-value positive">{fmt(totalEquity)}</span>
          </div>
        </div>
        <div className="evo-card">
          <TrendingUp size={18} />
          <div>
            <span className="evo-label">Rentabilidade</span>
            <span className="evo-value">{rentabilidade >= 0 ? '+' : ''}{rentabilidade.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Stacked area chart - Equity by property */}
      <div className="evolution-chart-section">
        <h4>Evolução do Patrimônio por Imóvel</h4>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={stackedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11 }}
              interval={Math.max(1, Math.floor(evolucao.meses.length / 8))}
            />
            <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value) => [fmt(Number(value))]}
              labelFormatter={(label) => `Mês: ${label}`}
            />
            <Legend />
            {nomes.map((nome, i) => (
              <Area
                key={nome}
                type="monotone"
                dataKey={nome}
                stackId="1"
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
