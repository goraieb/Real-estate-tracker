import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
  Bar,
} from 'recharts';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  IPCA_MONTHLY,
  IGPM_MONTHLY,
  getSelicMonthlySeries,
} from '../services/realData';

type Indicator = 'all' | 'selic' | 'ipca' | 'igpm' | 'ipca_vs_igpm';

const selicSeries = getSelicMonthlySeries();

// Build unified dataset (one row per month)
function buildChartData() {
  const map = new Map<string, { date: string; selic?: number; ipca?: number; igpm?: number; ipcaAcum12?: number; igpmAcum12?: number }>();

  for (const s of selicSeries) {
    if (!map.has(s.date)) map.set(s.date, { date: s.date });
    map.get(s.date)!.selic = s.value;
  }
  for (const s of IPCA_MONTHLY) {
    if (!map.has(s.date)) map.set(s.date, { date: s.date });
    map.get(s.date)!.ipca = s.value;
  }
  for (const s of IGPM_MONTHLY) {
    if (!map.has(s.date)) map.set(s.date, { date: s.date });
    map.get(s.date)!.igpm = s.value;
  }

  const sorted = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Compute rolling 12-month accumulated
  for (let i = 0; i < sorted.length; i++) {
    // IPCA 12m
    const ipcaSlice = sorted.slice(Math.max(0, i - 11), i + 1).filter(d => d.ipca != null);
    if (ipcaSlice.length >= 12) {
      sorted[i].ipcaAcum12 = Math.round(
        (ipcaSlice.reduce((acc, d) => acc * (1 + (d.ipca ?? 0) / 100), 1) - 1) * 10000
      ) / 100;
    }
    // IGP-M 12m
    const igpmSlice = sorted.slice(Math.max(0, i - 11), i + 1).filter(d => d.igpm != null);
    if (igpmSlice.length >= 12) {
      sorted[i].igpmAcum12 = Math.round(
        (igpmSlice.reduce((acc, d) => acc * (1 + (d.igpm ?? 0) / 100), 1) - 1) * 10000
      ) / 100;
    }
  }

  return sorted;
}

const chartData = buildChartData();

function formatMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export function EconomicIndicators() {
  const [view, setView] = useState<Indicator>('all');
  const tc = useThemeColors();

  const renderChart = () => {
    switch (view) {
      case 'selic':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name === 'selic' ? 'Selic (meta)' : name]}
              />
              <Area type="stepAfter" dataKey="selic" fill={tc.purple} fillOpacity={0.15} stroke={tc.purple} strokeWidth={2} name="Selic (meta)" />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'ipca':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={v => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="ipca" fill={tc.cyan} fillOpacity={0.7} name="IPCA mensal" />
              <Line yAxisId="right" type="monotone" dataKey="ipcaAcum12" stroke={tc.orange} strokeWidth={2} dot={false} name="IPCA 12m acum." />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'igpm':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickFormatter={v => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="igpm" fill={tc.pink} fillOpacity={0.7} name="IGP-M mensal" />
              <Line yAxisId="right" type="monotone" dataKey="igpmAcum12" stroke={tc.orange} strokeWidth={2} dot={false} name="IGP-M 12m acum." />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'ipca_vs_igpm':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData.filter(d => d.ipcaAcum12 != null)} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
              />
              <Legend />
              <Line type="monotone" dataKey="ipcaAcum12" stroke={tc.cyan} strokeWidth={2} dot={false} name="IPCA 12m" />
              <Line type="monotone" dataKey="igpmAcum12" stroke={tc.pink} strokeWidth={2} dot={false} name="IGP-M 12m" />
              <Line type="monotone" dataKey="selic" stroke={tc.purple} strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Selic" />
            </LineChart>
          </ResponsiveContainer>
        );

      default: // 'all'
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tickFormatter={formatMonth} interval={5} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip
                labelFormatter={formatMonth}
                formatter={(v: number, name: string) => [`${v.toFixed(2)}%`, name]}
              />
              <Legend />
              <Line type="stepAfter" dataKey="selic" stroke={tc.purple} strokeWidth={2} dot={false} name="Selic" />
              <Line type="monotone" dataKey="ipcaAcum12" stroke={tc.cyan} strokeWidth={2} dot={false} name="IPCA 12m" />
              <Line type="monotone" dataKey="igpmAcum12" stroke={tc.pink} strokeWidth={2} dot={false} name="IGP-M 12m" />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const latest = chartData[chartData.length - 1];

  return (
    <div className="economic-indicators-panel">
      <h4>Indicadores Econômicos (dados reais 2019–2026)</h4>

      <div className="indicator-summary">
        <div className="indicator-pill">
          <span className="indicator-label">Selic</span>
          <span className="indicator-value">{latest?.selic?.toFixed(2) ?? '—'}%</span>
        </div>
        <div className="indicator-pill">
          <span className="indicator-label">IPCA 12m</span>
          <span className="indicator-value">{latest?.ipcaAcum12?.toFixed(2) ?? '—'}%</span>
        </div>
        <div className="indicator-pill">
          <span className="indicator-label">IGP-M 12m</span>
          <span className="indicator-value">{latest?.igpmAcum12?.toFixed(2) ?? '—'}%</span>
        </div>
      </div>

      <div className="benchmark-toggle">
        <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>
          Visão Geral
        </button>
        <button className={view === 'selic' ? 'active' : ''} onClick={() => setView('selic')}>
          Selic
        </button>
        <button className={view === 'ipca' ? 'active' : ''} onClick={() => setView('ipca')}>
          IPCA
        </button>
        <button className={view === 'igpm' ? 'active' : ''} onClick={() => setView('igpm')}>
          IGP-M
        </button>
        <button className={view === 'ipca_vs_igpm' ? 'active' : ''} onClick={() => setView('ipca_vs_igpm')}>
          IPCA vs IGP-M
        </button>
      </div>

      <div className="benchmark-chart-container">
        {renderChart()}
      </div>

      <p className="data-source-note">
        Fonte: BCB (Selic), IBGE (IPCA), FGV IBRE (IGP-M) — dados reais de jan/2019 a fev/2026
      </p>
    </div>
  );
}
