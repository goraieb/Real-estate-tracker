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
  Calendar,
  Landmark,
} from 'lucide-react';
import type { Imovel, Benchmarks } from '../types';
import { usePropertyMetrics } from '../hooks/usePropertyMetrics';
import { calcularValorizacaoDetalhada } from '../services/calculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtPp = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}pp`;

interface Props {
  imovel: Imovel;
  benchmarks?: Benchmarks | null;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PropertyCard({ imovel, benchmarks, onClick, onEdit, onDelete }: Props) {
  const val = usePropertyMetrics(imovel);
  const { yieldLiquido, receitaMensal } = val;
  const isPositive = val.valorizacaoPct >= 0;
  const vd = calcularValorizacaoDetalhada(imovel, benchmarks ?? null);

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

        {/* Detailed appreciation */}
        <div className="value-row">
          <span className="label">
            <Calendar size={12} style={{ verticalAlign: 'text-bottom', marginRight: 2 }} />
            Acumulada ({vd.mesesDesdeCompra}m)
          </span>
          <span className={`value ${vd.acumuladoPct >= 0 ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {fmtPct(vd.acumuladoPct)} ({fmt(vd.acumuladoReais)})
          </span>
        </div>
        <div className="value-row">
          <span className="label">Últimos 12m</span>
          <span className={`value ${vd.ultimos12mPct >= 0 ? 'positive' : 'negative'}`}>
            {fmtPct(vd.ultimos12mPct)} ({fmt(vd.ultimos12mReais)})
          </span>
        </div>

        {/* Comparison with benchmarks */}
        <div className="value-row" style={{ fontSize: '0.8em', opacity: 0.85 }}>
          <span className="label">
            <Landmark size={12} style={{ verticalAlign: 'text-bottom', marginRight: 2 }} />
            vs SELIC
          </span>
          <span className={`value ${vd.alphaVsSelicPct >= 0 ? 'positive' : 'negative'}`}>
            {fmtPp(vd.alphaVsSelicPct)}
          </span>
        </div>
        <div className="value-row" style={{ fontSize: '0.8em', opacity: 0.85 }}>
          <span className="label">vs IPCA+6%</span>
          <span className={`value ${vd.alphaVsIpcaPct >= 0 ? 'positive' : 'negative'}`}>
            {fmtPp(vd.alphaVsIpcaPct)}
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

      {/* Financing info */}
      {imovel.financiamento && (
        <div className="card-financing">
          <span className="financing-label">
            {imovel.financiamento.sistema} — {imovel.financiamento.banco ?? 'Banco'}
          </span>
          <span className="financing-detail">
            Dívida: {fmt(imovel.financiamento.saldoDevedor ?? 0)} | {imovel.financiamento.taxaJurosAnual}% a.a.
          </span>
        </div>
      )}

      {/* Source */}
      {imovel.fonteAvaliacao && (
        <div className="card-footer">
          Fonte avaliação: {imovel.fonteAvaliacao}
        </div>
      )}
    </div>
  );
}
