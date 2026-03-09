import { Layers, Filter, BarChart3, MapPin, TrendingUp, DollarSign } from 'lucide-react';
import type { MarketFilters as FilterType, MarketLayer } from '../types';

interface Props {
  filters: FilterType;
  onChange: (filters: FilterType) => void;
  stats?: {
    totalTransacoes: number;
    precoM2Medio: number | null;
  };
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const LAYER_OPTIONS: { key: MarketLayer; label: string; icon: typeof Layers }[] = [
  { key: 'clusters', label: 'Transações', icon: MapPin },
  { key: 'choropleth', label: 'Preço/m²', icon: BarChart3 },
  { key: 'heatmap', label: 'Calor', icon: Layers },
  { key: 'portfolio', label: 'Meu Portfólio', icon: TrendingUp },
  { key: 'yield', label: 'Yield', icon: DollarSign },
];

const TIPOS_IMOVEL = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'terreno', label: 'Terreno' },
];

export function MarketFilters({ filters, onChange, stats }: Props) {
  const toggleLayer = (layer: MarketLayer) => {
    const current = filters.activeLayers;
    const next = current.includes(layer)
      ? current.filter(l => l !== layer)
      : [...current, layer];
    onChange({ ...filters, activeLayers: next });
  };

  const toggleTipo = (tipo: string) => {
    const current = filters.tipoImovel;
    const next = current.includes(tipo)
      ? current.filter(t => t !== tipo)
      : [...current, tipo];
    onChange({ ...filters, tipoImovel: next });
  };

  return (
    <div className="market-filters">
      {/* Stats summary */}
      {stats && (
        <div className="market-filters-stats">
          <div className="mf-stat">
            <span className="mf-stat-label">Transações</span>
            <span className="mf-stat-value">{stats.totalTransacoes.toLocaleString('pt-BR')}</span>
          </div>
          {stats.precoM2Medio && (
            <div className="mf-stat">
              <span className="mf-stat-label">Mediana R$/m²</span>
              <span className="mf-stat-value">{fmt(stats.precoM2Medio)}</span>
            </div>
          )}
        </div>
      )}

      {/* Layer toggles */}
      <div className="mf-section">
        <div className="mf-section-title">
          <Layers size={14} /> Camadas
        </div>
        <div className="mf-layer-toggles">
          {LAYER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`mf-layer-btn ${filters.activeLayers.includes(opt.key) ? 'active' : ''}`}
              onClick={() => toggleLayer(opt.key)}
            >
              <opt.icon size={14} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="mf-section">
        <div className="mf-section-title">
          <Filter size={14} /> Período
        </div>
        <div className="mf-date-row">
          <input
            type="month"
            value={filters.dataInicio}
            onChange={e => onChange({ ...filters, dataInicio: e.target.value })}
            className="mf-input"
          />
          <span className="mf-date-sep">a</span>
          <input
            type="month"
            value={filters.dataFim}
            onChange={e => onChange({ ...filters, dataFim: e.target.value })}
            className="mf-input"
          />
        </div>
      </div>

      {/* Property type */}
      <div className="mf-section">
        <div className="mf-section-title">Tipo</div>
        <div className="mf-tipo-chips">
          {TIPOS_IMOVEL.map(t => (
            <button
              key={t.value}
              className={`mf-chip ${filters.tipoImovel.includes(t.value) ? 'active' : ''}`}
              onClick={() => toggleTipo(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="mf-section">
        <div className="mf-section-title">R$/m²</div>
        <div className="mf-range-row">
          <input
            type="number"
            placeholder="Mín"
            value={filters.precoM2Min || ''}
            onChange={e => onChange({ ...filters, precoM2Min: Number(e.target.value) || 0 })}
            className="mf-input mf-input-sm"
          />
          <span className="mf-date-sep">–</span>
          <input
            type="number"
            placeholder="Máx"
            value={filters.precoM2Max || ''}
            onChange={e => onChange({ ...filters, precoM2Max: Number(e.target.value) || 50000 })}
            className="mf-input mf-input-sm"
          />
        </div>
      </div>
    </div>
  );
}
