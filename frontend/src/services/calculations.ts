import type { Imovel, YieldResult, AirbnbYieldResult, BenchmarkComparacao, ValorizacaoDetalhada, Benchmarks, SnapshotMensal } from '../types';

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
  const precoM2 = imovel.areaUtil > 0 ? valorAtual / imovel.areaUtil : 0;

  return { valorAtual, ganhoNominal, valorizacaoPct, precoM2 };
}

// Compound accumulation helper
function acumularComposto(taxaAnual: number, meses: number): number {
  const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
  return (Math.pow(1 + taxaMensal, meses) - 1) * 100;
}

export function calcularValorizacaoDetalhada(
  imovel: Imovel,
  benchmarks: Benchmarks | null,
): ValorizacaoDetalhada {
  const valorAtual = imovel.valorAtualEstimado ?? imovel.compra.valorCompra;
  const valorCompra = imovel.compra.valorCompra;
  const dataCompra = new Date(imovel.compra.dataCompra);
  const agora = new Date();

  const mesesDesdeCompra = (agora.getFullYear() - dataCompra.getFullYear()) * 12 + (agora.getMonth() - dataCompra.getMonth());

  // Accumulated appreciation
  const acumuladoReais = valorAtual - valorCompra;
  const acumuladoPct = valorCompra > 0 ? ((valorAtual / valorCompra) - 1) * 100 : 0;

  // Last 12 months appreciation (from historical data or estimate)
  let valor12mAtras = valorCompra;
  if (imovel.historicoValores && imovel.historicoValores.length > 0) {
    const target = new Date(agora.getFullYear(), agora.getMonth() - 12, 1);
    const targetStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
    const entry = imovel.historicoValores.find(h => h.data <= targetStr);
    if (entry) {
      valor12mAtras = entry.valor;
    } else {
      // If purchase is less than 12 months ago, use purchase value
      valor12mAtras = valorCompra;
    }
    // Find closest entry to 12 months ago
    const sorted = [...imovel.historicoValores].sort((a, b) => {
      const da = Math.abs(a.data.localeCompare(targetStr));
      const db = Math.abs(b.data.localeCompare(targetStr));
      return da - db;
    });
    if (sorted.length > 0) {
      // Find entry closest to target date
      let bestDiff = Infinity;
      for (const h of imovel.historicoValores) {
        const hDate = new Date(h.data + '-01');
        const diff = Math.abs(hDate.getTime() - target.getTime());
        if (diff < bestDiff) {
          bestDiff = diff;
          valor12mAtras = h.valor;
        }
      }
    }
  } else if (mesesDesdeCompra > 12) {
    // Estimate: proportional
    const ratio = 12 / mesesDesdeCompra;
    valor12mAtras = valorCompra + (valorAtual - valorCompra) * (1 - ratio);
  }

  const ultimos12mReais = valorAtual - valor12mAtras;
  const ultimos12mPct = valor12mAtras > 0 ? ((valorAtual / valor12mAtras) - 1) * 100 : 0;

  // Benchmark accumulations
  const selicAnual = benchmarks?.selicAnual ?? 13.25;
  const ipca12m = benchmarks?.ipca12m ?? 4.87;
  const ipcaMais6Anual = ipca12m + 6;

  const selicAcumuladaPct = acumularComposto(selicAnual, mesesDesdeCompra);
  const ipcaMais6AcumuladaPct = acumularComposto(ipcaMais6Anual, mesesDesdeCompra);

  const selic12mPct = acumularComposto(selicAnual, Math.min(12, mesesDesdeCompra));
  const ipcaMais6_12mPct = acumularComposto(ipcaMais6Anual, Math.min(12, mesesDesdeCompra));

  return {
    acumuladoPct,
    acumuladoReais,
    ultimos12mPct,
    ultimos12mReais,
    mesesDesdeCompra,
    selicAcumuladaPct,
    ipcaMais6AcumuladaPct,
    selic12mPct,
    ipcaMais6_12mPct,
    alphaVsSelicPct: acumuladoPct - selicAcumuladaPct,
    alphaVsIpcaPct: acumuladoPct - ipcaMais6AcumuladaPct,
  };
}

// IR on capital gains for real estate: 15% flat rate
const IR_GANHO_CAPITAL_PCT = 15;

// IR on financial applications based on holding period
function irAplicacaoFinanceira(meses: number): number {
  if (meses <= 6) return 22.5;
  if (meses <= 12) return 20;
  if (meses <= 24) return 17.5;
  return 15;
}

export interface RetornoTotalComparacao {
  // Gross comparison
  retornoBrutoImovelPct: number;   // yield bruto + valorização 12m bruta
  retornoBrutoSelicPct: number;
  retornoBrutoCdiPct: number;
  retornoBrutoIpcaMais6Pct: number;
  retornoBrutoPoupancaPct: number;
  // Net comparison
  retornoLiquidoImovelPct: number;  // yield líquido + valorização 12m líquida (após IR ganho capital)
  retornoLiquidoSelicPct: number;
  retornoLiquidoCdiPct: number;
  retornoLiquidoIpcaMais6Pct: number;
  retornoLiquidoPoupancaPct: number;
}

export function calcularRetornoTotal(
  yieldBruto: number,
  yieldLiquido: number,
  valorizacao12mPct: number,
  benchmarks: Benchmarks | null,
): RetornoTotalComparacao {
  const selicAnual = benchmarks?.selicAnual ?? 13.25;
  const ipca12m = benchmarks?.ipca12m ?? 4.87;
  const ipcaMais6Bruto = ipca12m + 6;
  const poupanca = benchmarks?.poupancaAnual ?? 6.17;

  // Gross: yield bruto + valorização bruta
  const retornoBrutoImovelPct = yieldBruto + valorizacao12mPct;

  // Net: yield líquido + valorização após IR ganho de capital (15%)
  const valorizacaoLiquida = valorizacao12mPct > 0
    ? valorizacao12mPct * (1 - IR_GANHO_CAPITAL_PCT / 100)
    : valorizacao12mPct;
  const retornoLiquidoImovelPct = yieldLiquido + valorizacaoLiquida;

  // Financial applications IR (assuming 12-month holding = 17.5%)
  const irApp = irAplicacaoFinanceira(12) / 100;

  return {
    retornoBrutoImovelPct,
    retornoBrutoSelicPct: selicAnual,
    retornoBrutoCdiPct: selicAnual,
    retornoBrutoIpcaMais6Pct: ipcaMais6Bruto,
    retornoBrutoPoupancaPct: poupanca,
    retornoLiquidoImovelPct,
    retornoLiquidoSelicPct: selicAnual * (1 - irApp),
    retornoLiquidoCdiPct: selicAnual * (1 - irApp),
    retornoLiquidoIpcaMais6Pct: ipcaMais6Bruto * (1 - irApp),
    retornoLiquidoPoupancaPct: poupanca, // Poupança is tax-free
  };
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

// Portfolio evolution calculation
export interface EvolucaoPortfolio {
  meses: string[];
  seriesPorImovel: Record<string, number[]>;
  equityTotal: number[];
  dividaTotal: number[];
  patrimonioLiquido: number[];
  selicAcumulada: number[];
  ipcaMais6Acumulada: number[];
  portfolioBase100: number[];
}

export function calcularEvolucaoPortfolio(
  imoveis: Imovel[],
  benchmarks: Benchmarks | null,
): EvolucaoPortfolio {
  const selicAnual = benchmarks?.selicAnual ?? 13.25;
  const ipca12m = benchmarks?.ipca12m ?? 4.87;
  const ipcaMais6Anual = ipca12m + 6;

  const selicMensal = Math.pow(1 + selicAnual / 100, 1 / 12) - 1;
  const ipcaMais6Mensal = Math.pow(1 + ipcaMais6Anual / 100, 1 / 12) - 1;

  // Find all months across all properties
  const allMonths = new Set<string>();
  for (const im of imoveis) {
    if (im.snapshots) {
      for (const s of im.snapshots) {
        allMonths.add(s.data);
      }
    }
  }

  const meses = [...allMonths].sort();
  if (meses.length === 0) {
    return { meses: [], seriesPorImovel: {}, equityTotal: [], dividaTotal: [], patrimonioLiquido: [], selicAcumulada: [], ipcaMais6Acumulada: [], portfolioBase100: [] };
  }

  // Build lookup maps per property
  const snapshotMap = new Map<string, Map<string, SnapshotMensal>>();
  for (const im of imoveis) {
    const map = new Map<string, SnapshotMensal>();
    if (im.snapshots) {
      for (const s of im.snapshots) {
        map.set(s.data, s);
      }
    }
    snapshotMap.set(im.id, map);
  }

  const seriesPorImovel: Record<string, number[]> = {};
  const equityTotal: number[] = [];
  const dividaTotal: number[] = [];
  const patrimonioLiquido: number[] = [];

  for (const im of imoveis) {
    seriesPorImovel[im.nome] = [];
  }

  let initialPatrimonio = 0;

  for (let i = 0; i < meses.length; i++) {
    const mes = meses[i];
    let totalEquity = 0;
    let totalDivida = 0;

    for (const im of imoveis) {
      const map = snapshotMap.get(im.id)!;
      const snap = map.get(mes);
      const equity = snap ? snap.equity : 0;
      const divida = snap ? snap.saldoDevedor : 0;

      seriesPorImovel[im.nome].push(equity);
      totalEquity += equity;
      totalDivida += divida;
    }

    equityTotal.push(totalEquity);
    dividaTotal.push(totalDivida);
    patrimonioLiquido.push(totalEquity);

    if (i === 0) {
      initialPatrimonio = totalEquity;
    }
  }

  // Benchmark base-100 series
  const selicAcumulada: number[] = [];
  const ipcaMais6Acumulada: number[] = [];
  const portfolioBase100: number[] = [];

  for (let i = 0; i < meses.length; i++) {
    selicAcumulada.push(100 * Math.pow(1 + selicMensal, i));
    ipcaMais6Acumulada.push(100 * Math.pow(1 + ipcaMais6Mensal, i));
    portfolioBase100.push(initialPatrimonio > 0 ? (equityTotal[i] / initialPatrimonio) * 100 : 100);
  }

  return {
    meses,
    seriesPorImovel,
    equityTotal,
    dividaTotal,
    patrimonioLiquido,
    selicAcumulada,
    ipcaMais6Acumulada,
    portfolioBase100,
  };
}
