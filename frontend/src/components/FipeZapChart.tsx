import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
  Area,
} from 'recharts';
import { useThemeColors } from '../hooks/useThemeColors';
import { FIPEZAP_VENDA_MENSAL, FIPEZAP_LOCACAO_MENSAL } from '../services/mockMarketData';

import { fetchCityYields, type CityYieldsResponse } from '../services/marketApi';

type View = 'index' | 'venda' | 'locacao' | 'venda_vs_locacao' | 'city_yields';

function formatMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

function buildIndexSeries(data: { date: string; varMensal: number }[]): { date: string; varMensal: number; acum12m: number; indexBase100: number }[] {
  const result: { date: string; varMensal: number; acum12m: number; indexBase100: number }[] = [];
  let idx = 100;

  for (let i = 0; i < data.length; i++) {
    idx *= (1 + data[i].varMensal / 100);
    // 12-month accumulated
    const slice = data.slice(Math.max(0, i - 11), i + 1);
    const acum12m = slice.length >= 12
      ? Math.round((slice.reduce((acc, d) => acc * (1 + d.varMensal / 100), 1) - 1) * 10000) / 100
      : 0;

    result.push({
      date: data[i].date,
      varMensal: data[i].varMensal,
      acum12m,
      indexBase100: Math.round(idx * 100) / 100,
    });
  }
  return result;
}

const YIELD_CITY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#84cc16'];

export function FipeZapChart() {
  const [view, setView] = useState<View>('index');
  const [cityYields, setCityYields] = useState<CityYieldsResponse | null>(null);
  const [yieldLoading, setYieldLoading] = useState(false);
  const tc = useThemeColors();

  useEffect(() => {
    if (view === 'city_yields' && !cityYields) {
      setYieldLoading(true);
      fetchCityYields()
        .then(setCityYields)
        .finally(() => setYieldLoading(false));
    }
  }, [view, cityYields]);

  const vendaSeries = useMemo(() => buildIndexSeries(FIPEZAP_VENDA_MENSAL), []);
  const locacaoSeries = useMemo(() => buildIndexSeries(FIPEZAP_LOCACAO_MENSAL), []);

  // Merge venda + locação into one dataset
  const merged = useMemo(() => {
    const map = new Map<string, {
      date: string;
      vendaIdx?: number; locacaoIdx?: number;
      vendaAcum12m?: number; locacaoAcum12m?: number;
      vendaVar?: number; locacaoVar?: number;
    }>();

    for (const v of vendaSeries) {
      map.set(v.date, {
        date: v.date,
        vendaIdx: v.indexBase100,
        vendaAcum12m: v.acum12m,
        vendaVar: v.varMensal,
      });
    }
    for (const l of locacaoSeries) {
      const existing = map.get(l.date) ?? { date: l.date };
      existing.locacaoIdx = l.indexBase100;
      existing.locacaoAcum12m = l.acum12m;
      existing.locacaoVar = l.varMensal;
      map.set(l.date, existing);
    }

    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [vendaSeries, locacaoSeries]);

  const latestVenda = vendaSeries[vendaSeries.length - 1];
  const latestLocacao = locacaoSeries[locacaoSeries.length - 1];

  const renderChart = () => {
    switch (view) {
      case 'venda':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={vendaSeries} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={v => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="varMensal" fill={tc.cyan} fillOpacity={0.7} name="Var. mensal" />
              <Line yAxisId="right" type="monotone" dataKey="acum12m" stroke={tc.orange} strokeWidth={2} dot={false} name="Acum. 12m" />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'locacao':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={locacaoSeries} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={v => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="varMensal" fill={tc.pink} fillOpacity={0.7} name="Var. mensal" />
              <Line yAxisId="right" type="monotone" dataKey="acum12m" stroke={tc.orange} strokeWidth={2} dot={false} name="Acum. 12m" />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'venda_vs_locacao':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={merged.filter(d => d.vendaAcum12m)} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
              />
              <Legend />
              <Line type="monotone" dataKey="vendaAcum12m" stroke={tc.cyan} strokeWidth={2} dot={false} name="Venda 12m" />
              <Line type="monotone" dataKey="locacaoAcum12m" stroke={tc.pink} strokeWidth={2} dot={false} name="Locação 12m" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'city_yields': {
        if (yieldLoading) return <div className="loading-state">Carregando yields...</div>;
        if (!cityYields || cityYields.ranking.length === 0) return <div className="empty-state">Sem dados de yield por cidade.</div>;

        // Build time series with all cities
        const allDates = new Set<string>();
        for (const series of Object.values(cityYields.cities)) {
          for (const pt of series) allDates.add(pt.data);
        }
        const sortedDates = [...allDates].sort();
        const yieldChartData = sortedDates.map(d => {
          const row: Record<string, unknown> = { date: d };
          for (const [city, series] of Object.entries(cityYields.cities)) {
            const pt = series.find(s => s.data === d);
            row[city] = pt?.yieldBrutoPct ?? null;
          }
          return row;
        });

        const cityNames = Object.keys(cityYields.cities);

        return (
          <>
            {/* Ranking badges */}
            <div className="yield-ranking">
              {cityYields.ranking.map((r, i) => (
                <span key={r.cidade} className="meta-pill" style={{ borderColor: YIELD_CITY_COLORS[i % YIELD_CITY_COLORS.length] }}>
                  {r.cidade}: {r.yieldBrutoPct?.toFixed(1)}%
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={yieldChartData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
                <Tooltip labelFormatter={formatMonth} formatter={(v: number) => [`${v?.toFixed(2) ?? '—'}%`]} />
                <Legend />
                {cityNames.map((city, i) => (
                  <Line key={city} type="monotone" dataKey={city} stroke={YIELD_CITY_COLORS[i % YIELD_CITY_COLORS.length]} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        );
      }

      default: // 'index'
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={merged} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [v.toFixed(1), name]}
              />
              <Legend />
              <Line type="monotone" dataKey="vendaIdx" stroke={tc.cyan} strokeWidth={2} dot={false} name="Venda (base 100)" />
              <Line type="monotone" dataKey="locacaoIdx" stroke={tc.pink} strokeWidth={2} dot={false} name="Locação (base 100)" />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="economic-indicators-panel">
      <h4>Índice FipeZAP (dados reais 2019–2025)</h4>

      <div className="indicator-summary">
        <div className="indicator-pill">
          <span className="indicator-label">Venda 12m</span>
          <span className="indicator-value">{latestVenda?.acum12m?.toFixed(2) ?? '—'}%</span>
        </div>
        <div className="indicator-pill">
          <span className="indicator-label">Locação 12m</span>
          <span className="indicator-value">{latestLocacao?.acum12m?.toFixed(2) ?? '—'}%</span>
        </div>
        <div className="indicator-pill">
          <span className="indicator-label">Índice Venda</span>
          <span className="indicator-value">{latestVenda?.indexBase100?.toFixed(1) ?? '—'}</span>
        </div>
      </div>

      <div className="benchmark-toggle">
        <button className={view === 'index' ? 'active' : ''} onClick={() => setView('index')}>
          Índice (base 100)
        </button>
        <button className={view === 'venda' ? 'active' : ''} onClick={() => setView('venda')}>
          Venda
        </button>
        <button className={view === 'locacao' ? 'active' : ''} onClick={() => setView('locacao')}>
          Locação
        </button>
        <button className={view === 'venda_vs_locacao' ? 'active' : ''} onClick={() => setView('venda_vs_locacao')}>
          Venda vs Locação
        </button>
        <button className={view === 'city_yields' ? 'active' : ''} onClick={() => setView('city_yields')}>
          Yield por Cidade
        </button>
      </div>

      <div className="benchmark-chart-container">
        {renderChart()}
      </div>

      <p className="data-source-note">
        Fonte: Índice FipeZAP Residencial — dados reais de jan/2019 a dez/2025
      </p>
    </div>
  );
}
