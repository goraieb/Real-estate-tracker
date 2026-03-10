import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Star, ArrowUpDown, Filter } from 'lucide-react';
import { fetchNeighborhoodScorecard, type ScorecardEntry, type ScorecardResponse } from '../services/marketApi';

type SortKey = 'bairro' | 'precoM2' | 'bestYieldPct' | 'momentum6mPct' | 'spreadVsSelicPp' | 'liquidityScore' | 'totalReturnVsCdiPp';

function fmt(v: number | null | undefined, decimals = 1): string {
  if (v == null) return '—';
  return v.toFixed(decimals);
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function TrendIcon({ value }: { value: number | null }) {
  if (value == null) return <Minus size={14} className="trend-neutral" />;
  if (value > 1) return <TrendingUp size={14} className="trend-positive" />;
  if (value < -1) return <TrendingDown size={14} className="trend-negative" />;
  return <Minus size={14} className="trend-neutral" />;
}

function SignalDot({ value, thresholds }: { value: number | null; thresholds: [number, number] }) {
  if (value == null) return <span className="signal-dot signal-gray" />;
  if (value >= thresholds[1]) return <span className="signal-dot signal-green" />;
  if (value >= thresholds[0]) return <span className="signal-dot signal-yellow" />;
  return <span className="signal-dot signal-red" />;
}

export function NeighborhoodScorecard() {
  const [data, setData] = useState<ScorecardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('bestYieldPct');
  const [sortAsc, setSortAsc] = useState(false);
  const [showArbitrageOnly, setShowArbitrageOnly] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchNeighborhoodScorecard()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const sorted = useMemo(() => {
    if (!data) return [];
    let items = [...data.scorecard];
    if (showArbitrageOnly) items = items.filter(s => s.isArbitrage);
    items.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === 'string' && typeof bv === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return items;
  }, [data, sortKey, sortAsc, showArbitrageOnly]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  if (isLoading) {
    return (
      <div className="scorecard-panel">
        <h3>Scorecard de Bairros</h3>
        <div className="loading-state">Carregando scorecard...</div>
      </div>
    );
  }

  if (!data || data.scorecard.length === 0) {
    return (
      <div className="scorecard-panel">
        <h3>Scorecard de Bairros</h3>
        <p className="empty-state">Sem dados. Carregue dados ITBI e indicadores econômicos primeiro.</p>
      </div>
    );
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th onClick={() => toggleSort(field)} className="sortable-th">
      {label}
      {sortKey === field && <ArrowUpDown size={12} className={sortAsc ? 'sort-asc' : 'sort-desc'} />}
    </th>
  );

  return (
    <div className="scorecard-panel">
      <div className="scorecard-header">
        <h3>
          <Star size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
          Scorecard de Investimento por Bairro
        </h3>
        <div className="scorecard-meta">
          <span className="meta-pill">{data.totalBairros} bairros</span>
          <span className="meta-pill meta-arbitrage">{data.arbitrageCount} oportunidades</span>
          <span className="meta-pill">Selic: {data.benchmarks.selicAnual}% a.a.</span>
        </div>
      </div>

      <div className="scorecard-controls">
        <button
          className={`btn-filter ${showArbitrageOnly ? 'active' : ''}`}
          onClick={() => setShowArbitrageOnly(!showArbitrageOnly)}
        >
          <Filter size={14} />
          {showArbitrageOnly ? 'Mostrando arbitragem' : 'Filtrar arbitragem'}
        </button>
        <span className="scorecard-legend">
          Mediana: R$ {fmtBRL(data.medians.precoM2)}/m² | Yield: {fmt(data.medians.yieldPct)}%
        </span>
      </div>

      <div className="scorecard-table-wrapper">
        <table className="scorecard-table">
          <thead>
            <tr>
              <SortHeader label="Bairro" field="bairro" />
              <SortHeader label="Preço/m²" field="precoM2" />
              <SortHeader label="Momentum 6m" field="momentum6mPct" />
              <SortHeader label="Yield Airbnb" field="bestYieldPct" />
              <SortHeader label="Yield LT" field="bestYieldPct" />
              <SortHeader label="Melhor Yield" field="bestYieldPct" />
              <SortHeader label="Spread Selic" field="spreadVsSelicPp" />
              <SortHeader label="Retorno vs CDI" field="totalReturnVsCdiPp" />
              <SortHeader label="Liquidez" field="liquidityScore" />
              <th>Sinal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s: ScorecardEntry) => (
              <tr key={s.bairro} className={s.isArbitrage ? 'row-arbitrage' : ''}>
                <td className="td-bairro">
                  {s.isArbitrage && <Star size={12} className="star-arbitrage" />}
                  {s.bairro}
                </td>
                <td className={s.precoM2 < data.medians.precoM2 ? 'td-below-median' : 'td-above-median'}>
                  {fmtBRL(s.precoM2)}
                </td>
                <td>
                  <TrendIcon value={s.momentum6mPct} />
                  <span className={s.momentum6mPct && s.momentum6mPct > 0 ? 'positive' : s.momentum6mPct && s.momentum6mPct < 0 ? 'negative' : ''}>
                    {fmt(s.momentum6mPct)}%
                  </span>
                </td>
                <td>{s.yieldAirbnbPct ? `${fmt(s.yieldAirbnbPct)}%` : '—'}</td>
                <td>{s.yieldLongtermPct ? `${fmt(s.yieldLongtermPct)}%` : '—'}</td>
                <td className="td-best-yield">
                  <SignalDot value={s.bestYieldPct} thresholds={[4, 6]} />
                  {fmt(s.bestYieldPct)}%
                </td>
                <td className={s.spreadVsSelicPp && s.spreadVsSelicPp > 0 ? 'positive' : 'negative'}>
                  {s.spreadVsSelicPp != null ? `${s.spreadVsSelicPp > 0 ? '+' : ''}${fmt(s.spreadVsSelicPp)} pp` : '—'}
                </td>
                <td className={s.totalReturnVsCdiPp && s.totalReturnVsCdiPp > 0 ? 'positive' : 'negative'}>
                  {s.totalReturnVsCdiPp != null ? `${s.totalReturnVsCdiPp > 0 ? '+' : ''}${fmt(s.totalReturnVsCdiPp)} pp` : '—'}
                </td>
                <td>{s.liquidityScore}</td>
                <td>
                  <SignalDot value={s.spreadVsSelicPp} thresholds={[-3, 0]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="data-source-note">
        Fonte: ITBI (Prefeitura SP) + Airbnb (Inside Airbnb) + SECOVI + BCB. Yield anualizado bruto.
      </p>
    </div>
  );
}
