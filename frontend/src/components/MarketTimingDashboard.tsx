import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchTimingSignals, type TimingResponse } from '../services/marketApi';
import { useThemeColors } from '../hooks/useThemeColors';

function SignalBadge({ composite, score, maxScore }: { composite: string; score: number; maxScore: number }) {
  const colorClass = composite === 'favorable' ? 'signal-favorable'
    : composite === 'unfavorable' ? 'signal-unfavorable'
    : 'signal-neutral';

  const label = composite === 'favorable' ? 'Favorável'
    : composite === 'unfavorable' ? 'Desfavorável'
    : 'Neutro';

  const icon = composite === 'favorable' ? <TrendingUp size={18} />
    : composite === 'unfavorable' ? <TrendingDown size={18} />
    : <Minus size={18} />;

  return (
    <div className={`timing-badge ${colorClass}`}>
      {icon}
      <span className="timing-badge-label">{label}</span>
      <span className="timing-badge-score">{score}/{maxScore}</span>
    </div>
  );
}

function SignalDetail({ name, status }: { name: string; status: string }) {
  const labels: Record<string, string> = {
    selic: 'Selic',
    credit: 'Crédito',
    vso: 'VSO (Velocidade)',
    transaction_momentum: 'Volume ITBI',
    delinquency: 'Inadimplência',
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    falling: { label: 'Caindo', color: 'var(--color-success)' },
    rising: { label: 'Subindo', color: 'var(--color-danger)' },
    stable: { label: 'Estável', color: 'var(--text-muted)' },
    expanding: { label: 'Expandindo', color: 'var(--color-success)' },
    contracting: { label: 'Contraindo', color: 'var(--color-danger)' },
    low_inventory_clearing: { label: 'Baixo (oportunidade)', color: 'var(--color-success)' },
    high_sellers_market: { label: 'Alto (vendedores)', color: 'var(--color-danger)' },
    balanced: { label: 'Equilibrado', color: 'var(--text-muted)' },
    accelerating: { label: 'Acelerando', color: 'var(--color-success)' },
    decelerating: { label: 'Desacelerando', color: 'var(--color-danger)' },
    stable_or_falling: { label: 'Estável/Caindo', color: 'var(--color-success)' },
  };

  const s = statusLabels[status] || { label: status, color: 'var(--text-muted)' };

  return (
    <div className="signal-detail-row">
      <span className="signal-detail-name">{labels[name] || name}</span>
      <span className="signal-detail-status" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}

export function MarketTimingDashboard() {
  const [data, setData] = useState<TimingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tc = useThemeColors();

  useEffect(() => {
    setIsLoading(true);
    fetchTimingSignals()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="timing-panel">
        <h3>Sinais de Mercado</h3>
        <div className="loading-state">Analisando indicadores...</div>
      </div>
    );
  }

  if (!data || data.timeSeries.length === 0) {
    return (
      <div className="timing-panel">
        <h3>Sinais de Mercado</h3>
        <p className="empty-state">Sem dados de indicadores. Carregue os dados econômicos primeiro.</p>
      </div>
    );
  }

  const { signal } = data;

  // Format time series for chart - pick key indicators
  const chartData = data.timeSeries.map(row => ({
    mes: row.mes as string,
    selic: row.selic as number | null,
    taxa_financiamento: row.taxa_financiamento as number | null,
    vso: row.vso as number | null,
    itbi_volume: row.itbi_volume as number | null,
    affordability_years: row.affordability_years as number | null,
  }));

  return (
    <div className="timing-panel">
      <div className="timing-header">
        <h3>
          <Activity size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Sinais de Timing — Condições de Mercado
        </h3>
        <SignalBadge composite={signal.composite} score={signal.score} maxScore={signal.maxScore} />
      </div>

      {/* Signal details grid */}
      <div className="signal-details-grid">
        {Object.entries(signal.details).map(([key, value]) => (
          <SignalDetail key={key} name={key} status={value} />
        ))}
      </div>

      {/* Selic + Financing Rate Chart */}
      <div className="timing-chart-section">
        <h4>Selic vs Taxa de Financiamento</h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tickFormatter={v => `${v}%`} />
            <Tooltip formatter={((v: number) => [`${v?.toFixed(2) ?? '—'}%`]) as any} />
            <Legend />
            <Line type="monotone" dataKey="selic" stroke={tc.green} strokeWidth={2} dot={false} name="Selic" />
            <Line type="monotone" dataKey="taxa_financiamento" stroke={tc.orange} strokeWidth={2} dot={false} name="Financiamento" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* VSO + ITBI Volume Chart */}
      <div className="timing-chart-section">
        <h4>VSO e Volume de Transações</h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={2} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="vso" stroke={tc.purple} strokeWidth={2} dot={false} name="VSO (%)" />
            <Line yAxisId="right" type="monotone" dataKey="itbi_volume" stroke={tc.blue} strokeWidth={2} dot={false} name="Volume ITBI" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Affordability */}
      {chartData.some(d => d.affordability_years != null) && (
        <div className="timing-chart-section">
          <h4>Índice de Acessibilidade (anos de renda para comprar)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tickFormatter={v => `${v}a`} />
              <Tooltip formatter={((v: number) => [`${v?.toFixed(1)} anos`]) as any} />
              <Line type="monotone" dataKey="affordability_years" stroke={tc.red} strokeWidth={2} dot={false} name="Anos de renda" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="data-source-note">
        Fonte: BCB (Selic), ABECIP (crédito), SECOVI (VSO), Prefeitura SP (ITBI), Ipeadata (renda)
      </p>
    </div>
  );
}
