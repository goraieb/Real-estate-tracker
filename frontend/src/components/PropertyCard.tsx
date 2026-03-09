import {
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  BedDouble,
  Car,
  Ruler,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Imovel } from '../types';
import { usePropertyMetrics } from '../hooks/usePropertyMetrics';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

interface Props {
  imovel: Imovel;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PropertyCard({ imovel, onClick, onEdit, onDelete }: Props) {
  const val = usePropertyMetrics(imovel);
  const { yieldLiquido, receitaMensal } = val;
  const isPositive = val.valorizacaoPct >= 0;

  return (
    <div className="card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Header */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} />
          <div>
            <h3 className="card-title">{imovel.nome}</h3>
            <div className="card-subtitle">
              <MapPin size={14} />
              {imovel.endereco.bairro}, {imovel.endereco.cidade}/{imovel.endereco.uf}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onEdit && (
            <button className="btn-icon-sm" onClick={e => { e.stopPropagation(); onEdit(); }} title="Editar">
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button className="btn-icon-sm btn-icon-danger" onClick={e => { e.stopPropagation(); onDelete(); }} title="Excluir">
              <Trash2 size={14} />
            </button>
          )}
          <span className={`badge ${imovel.renda.tipo === 'airbnb' ? 'badge-airbnb' : 'badge-longterm'}`}>
            {imovel.renda.tipo === 'airbnb' ? 'Airbnb' : 'Long-term'}
          </span>
        </div>
      </div>

      {/* Property details */}
      <div className="card-details">
        <span><Ruler size={14} /> {imovel.areaUtil}m²</span>
        <span><BedDouble size={14} /> {imovel.quartos}q</span>
        <span><Car size={14} /> {imovel.vagas}v</span>
        <span>{fmt(val.precoM2)}/m²</span>
      </div>

      {/* Values */}
      <div className="card-values">
        <div className="value-row">
          <span className="label">Valor compra</span>
          <span className="value">{fmt(imovel.compra.valorCompra)}</span>
        </div>
        <div className="value-row">
          <span className="label">Valor atual</span>
          <span className="value value-highlight">{fmt(val.valorAtual)}</span>
        </div>
        <div className="value-row">
          <span className="label">Valorização</span>
          <span className={`value ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {fmtPct(val.valorizacaoPct)} ({fmt(val.ganhoNominal)})
          </span>
        </div>
      </div>

      {/* Yield */}
      <div className="card-yield">
        <div className="yield-main">
          <span className="yield-label">Yield líquido</span>
          <span className="yield-value">{yieldLiquido.toFixed(2)}% a.a.</span>
        </div>
        <div className="yield-secondary">
          <span>Receita líq. mensal: {fmt(receitaMensal)}</span>
        </div>
      </div>

      {/* Source */}
      {imovel.fonteAvaliacao && (
        <div className="card-footer">
          Fonte avaliação: {imovel.fonteAvaliacao}
        </div>
      )}
    </div>
  );
}
