import type { Imovel, YieldResult, AirbnbYieldResult, BenchmarkComparacao } from '../types';

// Tabela progressiva IR sobre aluguel PF
const IR_FAIXAS: [number, number, number][] = [
  [2_259.20, 0, 0],
  [2_826.65, 7.5, 169.44],
  [3_751.05, 15.0, 381.44],
  [4_664.68, 22.5, 662.77],
  [Infinity, 27.5, 896.00],
];

function calcularIrAluguel(aluguelLiquido: number): number {
  for (const [limite, aliquota, deducao] of IR_FAIXAS) {
    if (aluguelLiquido <= limite) {
      return Math.max(0, aluguelLiquido * (aliquota / 100) - deducao);
    }
  }
  return 0;
}

export function calcularYieldLongterm(
  valorImovel: number,
  aluguelMensal: number,
  iptuAnual: number = 0,
  condominioMensal: number = 0,
  seguroAnual: number = 0,
  manutencaoMensal: number = 0,
  taxaAdminPct: number = 0,
  vacanciaPct: number = 0,
): YieldResult {
  const mesesOcupados = 12 * (1 - vacanciaPct / 100);
  const receitaBruta = aluguelMensal * mesesOcupados;

  const custoAdmin = receitaBruta * (taxaAdminPct / 100);
  const custosFixos = iptuAnual + seguroAnual;
  const custosVariaveis = (condominioMensal + manutencaoMensal) * 12;
  const totalCustos = custoAdmin + custosFixos + custosVariaveis;

  const receitaPreIr = receitaBruta - totalCustos;

  let irAnual = 0;
  if (receitaPreIr > 0) {
    const aluguelLiquidoMensal = receitaPreIr / mesesOcupados;
    irAnual = calcularIrAluguel(aluguelLiquidoMensal) * mesesOcupados;
  }

  const receitaLiquida = receitaPreIr - irAnual;

  return {
    yieldBruto: valorImovel > 0 ? (receitaBruta / valorImovel) * 100 : 0,
    yieldLiquido: valorImovel > 0 ? (receitaLiquida / valorImovel) * 100 : 0,
    receitaBrutaAnual: receitaBruta,
    receitaLiquidaAnual: receitaLiquida,
    custosTotaisAnual: totalCustos,
    irAnual,
    breakdown: {
      administracao: custoAdmin,
      iptu: iptuAnual,
      seguro: seguroAnual,
      condominioAnual: condominioMensal * 12,
      manutencaoAnual: manutencaoMensal * 12,
    },
  };
}

export function calcularYieldAirbnb(
  valorImovel: number,
  diariaMedia: number,
  taxaOcupacaoPct: number,
  custosFixosMensal: number = 0,
  taxaPlataformaPct: number = 3,
  custosLimpezaPorEstadia: number = 0,
  mediaNoitesPorEstadia: number = 3,
): AirbnbYieldResult {
  const noitesAno = 365 * (taxaOcupacaoPct / 100);
  const receitaBruta = diariaMedia * noitesAno;

  const taxaPlataforma = receitaBruta * (taxaPlataformaPct / 100);
  const numEstadias = mediaNoitesPorEstadia > 0 ? noitesAno / mediaNoitesPorEstadia : 0;
  const custoLimpeza = custosLimpezaPorEstadia * numEstadias;
  const custosFixosAnuais = custosFixosMensal * 12;

  const totalCustos = taxaPlataforma + custoLimpeza + custosFixosAnuais;
  const receitaLiquida = receitaBruta - totalCustos;

  return {
    yieldBruto: valorImovel > 0 ? (receitaBruta / valorImovel) * 100 : 0,
    yieldLiquido: valorImovel > 0 ? (receitaLiquida / valorImovel) * 100 : 0,
    receitaBrutaAnual: receitaBruta,
    receitaLiquidaAnual: receitaLiquida,
    receitaLiquidaMensal: receitaLiquida / 12,
    noitesOcupadasAno: Math.round(noitesAno),
    breakdown: {
      taxaPlataforma,
      limpezaTotal: custoLimpeza,
      custosFixos: custosFixosAnuais,
    },
  };
}

export function calcularValorizacao(imovel: Imovel): {
  valorAtual: number;
  ganhoNominal: number;
  valorizacaoPct: number;
  precoM2: number;
} {
  const valorAtual = imovel.valorAtualEstimado ?? imovel.compra.valorCompra;
  const ganhoNominal = valorAtual - imovel.compra.valorCompra;
  const valorizacaoPct = ((valorAtual / imovel.compra.valorCompra) - 1) * 100;
  const precoM2 = valorAtual / imovel.areaUtil;

  return { valorAtual, ganhoNominal, valorizacaoPct, precoM2 };
}

export function calcularBenchmarks(
  yieldImovel: number,
  selicAnual: number,
  ipca12m: number,
): BenchmarkComparacao[] {
  const cdiLiquido = selicAnual * 0.85;
  const tesouroSelicLiq = selicAnual * 0.85;
  const tesouroIpcaBruto = ipca12m + 6.0;
  const tesouroIpcaLiq = tesouroIpcaBruto * 0.85;
  const poupanca = selicAnual <= 8.5 ? selicAnual * 0.7 : 6.17;

  return [
    { nome: 'Selic', taxa: selicAnual, spreadPp: yieldImovel - selicAnual },
    { nome: 'CDB 100% CDI', taxa: selicAnual, taxaLiquida: cdiLiquido, spreadPp: yieldImovel - cdiLiquido },
    { nome: 'Tesouro Selic', taxa: selicAnual, taxaLiquida: tesouroSelicLiq, spreadPp: yieldImovel - tesouroSelicLiq },
    { nome: 'Tesouro IPCA+', taxa: tesouroIpcaBruto, taxaLiquida: tesouroIpcaLiq, spreadPp: yieldImovel - tesouroIpcaLiq },
    { nome: 'Poupança', taxa: poupanca, spreadPp: yieldImovel - poupanca },
  ];
}
