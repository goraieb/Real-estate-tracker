import { Wallet, TrendingUp, Percent, Building2 } from 'lucide-react';
import type { Imovel } from '../types';
import { calcularValorizacao, calcularYieldLongterm, calcularYieldAirbnb } from '../services/calculations';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getYield(imovel: Imovel): number {
  const val = calcularValorizacao(imovel);
  if (imovel.renda.tipo === 'airbnb' && imovel.renda.diariaMedia && imovel.renda.taxaOcupacaoPct) {
    const custoFixo = imovel.custos.condominioMensal + imovel.custos.iptuAnual / 12;
    return calcularYieldAirbnb(val.valorAtual, imovel.renda.diariaMedia, imovel.renda.taxaOcupacaoPct, custoFixo).yieldLiquido;
  }
  if (imovel.renda.aluguelMensal) {
    return calcularYieldLongterm(
      val.valorAtual, imovel.renda.aluguelMensal, imovel.custos.iptuAnual,
      imovel.custos.condominioMensal, imovel.custos.seguroAnual, imovel.custos.manutencaoMensal,
      8, imovel.renda.taxaVacanciaPct,
    ).yieldLiquido;
  }
  return 0;
}

interface Props {
  imoveis: Imovel[];
}

export function PortfolioSummary({ imoveis }: Props) {
  const totalCompra = imoveis.reduce((s, i) => s + i.compra.valorCompra, 0);
  const totalAtual = imoveis.reduce((s, i) => s + (i.valorAtualEstimado ?? i.compra.valorCompra), 0);
  const ganhoTotal = totalAtual - totalCompra;
  const valorizacaoMedia = totalCompra > 0 ? ((totalAtual / totalCompra) - 1) * 100 : 0;
  const yieldMedio = imoveis.length > 0
    ? imoveis.reduce((s, i) => s + getYield(i), 0) / imoveis.length
    : 0;

  const cards = [
    {
      icon: Building2,
      label: 'Imóveis',
      value: String(imoveis.length),
      sub: `Patrimônio: ${fmt(totalAtual)}`,
    },
    {
      icon: Wallet,
      label: 'Investido',
      value: fmt(totalCompra),
      sub: `Atual: ${fmt(totalAtual)}`,
    },
    {
      icon: TrendingUp,
      label: 'Valorização',
      value: `${valorizacaoMedia >= 0 ? '+' : ''}${valorizacaoMedia.toFixed(1)}%`,
      sub: fmt(ganhoTotal),
      positive: ganhoTotal >= 0,
    },
    {
      icon: Percent,
      label: 'Yield médio',
      value: `${yieldMedio.toFixed(2)}% a.a.`,
      sub: 'Líquido (após custos e IR)',
    },
  ];

  return (
    <div className="portfolio-summary">
      {cards.map(c => (
        <div key={c.label} className="summary-card">
          <div className="summary-icon">
            <c.icon size={22} />
          </div>
          <div className="summary-content">
            <span className="summary-label">{c.label}</span>
            <span className={`summary-value ${c.positive !== undefined ? (c.positive ? 'positive' : 'negative') : ''}`}>
              {c.value}
            </span>
            <span className="summary-sub">{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
