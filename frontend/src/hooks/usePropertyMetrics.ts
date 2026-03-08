import { useMemo } from 'react';
import type { Imovel } from '../types';
import { calcularValorizacao, calcularYieldLongterm, calcularYieldAirbnb } from '../services/calculations';
import { TAXA_ADMINISTRACAO_PCT } from '../config';

export function usePropertyMetrics(imovel: Imovel) {
  return useMemo(() => {
    const val = calcularValorizacao(imovel);
    let yieldLiquido = 0;
    let receitaMensal = 0;

    if (imovel.renda.tipo === 'airbnb' && imovel.renda.diariaMedia && imovel.renda.taxaOcupacaoPct) {
      const custoFixo = imovel.custos.condominioMensal + imovel.custos.iptuAnual / 12;
      const res = calcularYieldAirbnb(val.valorAtual, imovel.renda.diariaMedia, imovel.renda.taxaOcupacaoPct, custoFixo);
      yieldLiquido = res.yieldLiquido;
      receitaMensal = res.receitaLiquidaMensal;
    } else if (imovel.renda.aluguelMensal) {
      const res = calcularYieldLongterm(
        val.valorAtual, imovel.renda.aluguelMensal, imovel.custos.iptuAnual,
        imovel.custos.condominioMensal, imovel.custos.seguroAnual, imovel.custos.manutencaoMensal,
        TAXA_ADMINISTRACAO_PCT, imovel.renda.taxaVacanciaPct,
      );
      yieldLiquido = res.yieldLiquido;
      receitaMensal = res.receitaLiquidaAnual / 12;
    }

    return { ...val, yieldLiquido, receitaMensal };
  }, [imovel]);
}
