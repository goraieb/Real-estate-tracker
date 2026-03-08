import {
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  BedDouble,
  Car,
  Ruler,
} from 'lucide-react';
import type { Imovel } from '../types';
import { calcularValorizacao, calcularYieldLongterm, calcularYieldAirbnb } from '../services/calculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

interface Props {
  imovel: Imovel;
  onClick?: () => void;
}

export function PropertyCard({ imovel, onClick }: Props) {
  const val = calcularValorizacao(imovel);

  // Calculate yield based on renda type
  let yieldLiquido = 0;
  let receitaMensal = 0;

  if (imovel.renda.tipo === 'airbnb' && imovel.renda.diariaMedia && imovel.renda.taxaOcupacaoPct) {
    const custoFixo = imovel.custos.condominioMensal + imovel.custos.iptuAnual / 12;
    const res = calcularYieldAirbnb(
      val.valorAtual,
      imovel.renda.diariaMedia,
      imovel.renda.taxaOcupacaoPct,
      custoFixo,
    );
    yieldLiquido = res.yieldLiquido;
    receitaMensal = res.receitaLiquidaMensal;
  } else if (imovel.renda.aluguelMensal) {
    const res = calcularYieldLongterm(
      val.valorAtual,
      imovel.renda.aluguelMensal,
      imovel.custos.iptuAnual,
      imovel.custos.condominioMensal,
      imovel.custos.seguroAnual,
      imovel.custos.manutencaoMensal,
      8, // admin
      imovel.renda.taxaVacanciaPct,
    );
    yieldLiquido = res.yieldLiquido;
    receitaMensal = res.receitaLiquidaAnual / 12;
  }

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
        <span className={`badge ${imovel.renda.tipo === 'airbnb' ? 'badge-airbnb' : 'badge-longterm'}`}>
          {imovel.renda.tipo === 'airbnb' ? 'Airbnb' : 'Long-term'}
        </span>
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
