import type { Imovel, Benchmarks, SnapshotMensal } from '../types';

export const MOCK_BENCHMARKS: Benchmarks = {
  selicAnual: 13.25,
  ipca12m: 4.87,
  igpm12m: 3.52,
  poupancaAnual: 6.17,
  financiamentoTx: 10.49,
};

// Helper: generate monthly snapshots from purchase to today
function gerarSnapshots(
  dataCompra: string,
  valorCompra: number,
  valorAtual: number,
  financiamento?: { valorFinanciado: number; taxaJurosAnual: number; prazoMeses: number; sistema: 'SAC' | 'PRICE' },
  aluguelMensal?: number,
  vacanciaPct: number = 0,
): SnapshotMensal[] {
  const start = new Date(dataCompra);
  const now = new Date();
  const snapshots: SnapshotMensal[] = [];

  const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (totalMonths <= 0) return [];

  const taxaMensal = financiamento ? financiamento.taxaJurosAnual / 100 / 12 : 0;
  const amortMensal = financiamento ? financiamento.valorFinanciado / financiamento.prazoMeses : 0;
  let saldoDevedor = financiamento?.valorFinanciado ?? 0;

  for (let m = 0; m <= totalMonths; m++) {
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Smooth interpolation with slight randomness for realism
    const t = m / totalMonths;
    const curve = t * t * (3 - 2 * t); // smoothstep
    const valorEstimado = Math.round(valorCompra + (valorAtual - valorCompra) * curve);

    // Amortization (SAC simplified)
    if (financiamento && saldoDevedor > 0) {
      const juros = saldoDevedor * taxaMensal;
      if (financiamento.sistema === 'SAC') {
        saldoDevedor = Math.max(0, saldoDevedor - amortMensal);
      } else {
        // PRICE: constant payment
        const pmt = financiamento.valorFinanciado * (taxaMensal * Math.pow(1 + taxaMensal, financiamento.prazoMeses)) / (Math.pow(1 + taxaMensal, financiamento.prazoMeses) - 1);
        const amort = pmt - juros;
        saldoDevedor = Math.max(0, saldoDevedor - amort);
      }
    }

    const equity = valorEstimado - Math.round(saldoDevedor);
    const aluguel = aluguelMensal ? Math.round(aluguelMensal * (1 - vacanciaPct / 100)) : 0;

    snapshots.push({
      data: mes,
      valorEstimado,
      saldoDevedor: Math.round(saldoDevedor),
      equity,
      aluguelRecebido: aluguel,
    });
  }

  return snapshots;
}

// Helper: generate monthly value history
function gerarHistorico(dataCompra: string, valorCompra: number, valorAtual: number): { data: string; valor: number }[] {
  const start = new Date(dataCompra);
  const now = new Date();
  const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const result: { data: string; valor: number }[] = [];

  for (let m = 0; m <= totalMonths; m++) {
    const d = new Date(start.getFullYear(), start.getMonth() + m, 1);
    const t = m / Math.max(totalMonths, 1);
    const curve = t * t * (3 - 2 * t);
    result.push({
      data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      valor: Math.round(valorCompra + (valorAtual - valorCompra) * curve),
    });
  }

  return result;
}

export const MOCK_IMOVEIS: Imovel[] = [
  {
    id: '1',
    nome: 'Apto Pinheiros',
    tipo: 'apartamento',
    endereco: {
      logradouro: 'Rua dos Pinheiros',
      numero: '450',
      bairro: 'Pinheiros',
      cidade: 'São Paulo',
      uf: 'SP',
      latitude: -23.5613,
      longitude: -46.6920,
    },
    areaUtil: 70,
    quartos: 2,
    vagas: 1,
    compra: {
      valorCompra: 750_000,
      dataCompra: '2022-06-01',
      itbiPago: 22_500,
      custosCartorio: 5_200,
    },
    custos: {
      iptuAnual: 3_600,
      condominioMensal: 900,
      seguroAnual: 600,
      manutencaoMensal: 200,
    },
    renda: {
      tipo: 'aluguel_longterm',
      aluguelMensal: 4_200,
      taxaVacanciaPct: 5,
    },
    valorAtualEstimado: 830_000,
    fonteAvaliacao: 'FipeZAP',
    financiamento: {
      valorFinanciado: 500_000,
      taxaJurosAnual: 9.5,
      prazoMeses: 360,
      sistema: 'SAC',
      saldoDevedor: 465_000,
      banco: 'Caixa',
    },
    historicoValores: gerarHistorico('2022-06-01', 750_000, 830_000),
    snapshots: gerarSnapshots('2022-06-01', 750_000, 830_000, { valorFinanciado: 500_000, taxaJurosAnual: 9.5, prazoMeses: 360, sistema: 'SAC' }, 4_200, 5),
  },
  {
    id: '2',
    nome: 'Studio Vila Madalena',
    tipo: 'apartamento',
    endereco: {
      logradouro: 'Rua Harmonia',
      numero: '120',
      bairro: 'Vila Madalena',
      cidade: 'São Paulo',
      uf: 'SP',
      latitude: -23.5535,
      longitude: -46.6910,
    },
    areaUtil: 35,
    quartos: 1,
    vagas: 0,
    compra: {
      valorCompra: 420_000,
      dataCompra: '2023-03-15',
    },
    custos: {
      iptuAnual: 1_800,
      condominioMensal: 650,
      seguroAnual: 350,
      manutencaoMensal: 100,
    },
    renda: {
      tipo: 'airbnb',
      diariaMedia: 320,
      taxaOcupacaoPct: 62,
      custosPlataformaPct: 3,
      taxaVacanciaPct: 0,
    },
    valorAtualEstimado: 445_000,
    fonteAvaliacao: 'FipeZAP',
    historicoValores: gerarHistorico('2023-03-15', 420_000, 445_000),
    snapshots: gerarSnapshots('2023-03-15', 420_000, 445_000, undefined, 4_500, 0),
  },
  {
    id: '3',
    nome: 'Apto Copacabana',
    tipo: 'apartamento',
    endereco: {
      logradouro: 'Av. Nossa Senhora de Copacabana',
      numero: '680',
      bairro: 'Copacabana',
      cidade: 'Rio de Janeiro',
      uf: 'RJ',
      latitude: -22.9711,
      longitude: -43.1863,
    },
    areaUtil: 85,
    quartos: 3,
    vagas: 1,
    compra: {
      valorCompra: 680_000,
      dataCompra: '2021-09-10',
    },
    custos: {
      iptuAnual: 2_800,
      condominioMensal: 1_100,
      seguroAnual: 500,
      manutencaoMensal: 300,
    },
    renda: {
      tipo: 'aluguel_longterm',
      aluguelMensal: 3_800,
      taxaVacanciaPct: 8,
    },
    valorAtualEstimado: 720_000,
    fonteAvaliacao: 'FipeZAP',
    financiamento: {
      valorFinanciado: 450_000,
      taxaJurosAnual: 10.2,
      prazoMeses: 240,
      sistema: 'PRICE',
      saldoDevedor: 395_000,
      banco: 'Itaú',
    },
    historicoValores: gerarHistorico('2021-09-10', 680_000, 720_000),
    snapshots: gerarSnapshots('2021-09-10', 680_000, 720_000, { valorFinanciado: 450_000, taxaJurosAnual: 10.2, prazoMeses: 240, sistema: 'PRICE' }, 3_800, 8),
  },
  {
    id: '4',
    nome: 'Sala Comercial Faria Lima',
    tipo: 'sala',
    endereco: {
      logradouro: 'Av. Brigadeiro Faria Lima',
      numero: '3477',
      bairro: 'Itaim Bibi',
      cidade: 'São Paulo',
      uf: 'SP',
      latitude: -23.5868,
      longitude: -46.6803,
    },
    areaUtil: 45,
    quartos: 0,
    vagas: 1,
    compra: {
      valorCompra: 520_000,
      dataCompra: '2020-11-20',
      itbiPago: 15_600,
      custosCartorio: 4_100,
    },
    custos: {
      iptuAnual: 4_200,
      condominioMensal: 1_400,
      seguroAnual: 420,
      manutencaoMensal: 150,
    },
    renda: {
      tipo: 'aluguel_longterm',
      aluguelMensal: 3_500,
      taxaVacanciaPct: 10,
    },
    valorAtualEstimado: 590_000,
    fonteAvaliacao: 'FipeZAP',
    historicoValores: gerarHistorico('2020-11-20', 520_000, 590_000),
    snapshots: gerarSnapshots('2020-11-20', 520_000, 590_000, undefined, 3_500, 10),
  },
  {
    id: '5',
    nome: 'Casa Florianópolis',
    tipo: 'casa',
    endereco: {
      logradouro: 'Rua das Rendeiras',
      numero: '88',
      bairro: 'Lagoa da Conceição',
      cidade: 'Florianópolis',
      uf: 'SC',
      latitude: -27.6046,
      longitude: -48.4760,
    },
    areaUtil: 120,
    quartos: 3,
    vagas: 2,
    compra: {
      valorCompra: 950_000,
      dataCompra: '2023-01-10',
      itbiPago: 28_500,
      custosCartorio: 7_800,
    },
    custos: {
      iptuAnual: 3_200,
      condominioMensal: 0,
      seguroAnual: 900,
      manutencaoMensal: 500,
    },
    renda: {
      tipo: 'airbnb',
      diariaMedia: 550,
      taxaOcupacaoPct: 55,
      custosPlataformaPct: 3,
      taxaVacanciaPct: 0,
    },
    valorAtualEstimado: 1_080_000,
    fonteAvaliacao: 'FipeZAP',
    historicoValores: gerarHistorico('2023-01-10', 950_000, 1_080_000),
    snapshots: gerarSnapshots('2023-01-10', 950_000, 1_080_000, undefined, 7_500, 0),
  },
  {
    id: '6',
    nome: 'Kitnet Centro BH',
    tipo: 'apartamento',
    endereco: {
      logradouro: 'Rua da Bahia',
      numero: '1234',
      bairro: 'Centro',
      cidade: 'Belo Horizonte',
      uf: 'MG',
      latitude: -19.9191,
      longitude: -43.9387,
    },
    areaUtil: 28,
    quartos: 1,
    vagas: 0,
    compra: {
      valorCompra: 185_000,
      dataCompra: '2024-02-28',
    },
    custos: {
      iptuAnual: 900,
      condominioMensal: 380,
      seguroAnual: 200,
      manutencaoMensal: 80,
    },
    renda: {
      tipo: 'aluguel_longterm',
      aluguelMensal: 1_200,
      taxaVacanciaPct: 6,
    },
    valorAtualEstimado: 195_000,
    fonteAvaliacao: 'FipeZAP',
    historicoValores: gerarHistorico('2024-02-28', 185_000, 195_000),
    snapshots: gerarSnapshots('2024-02-28', 185_000, 195_000, undefined, 1_200, 6),
  },
];
