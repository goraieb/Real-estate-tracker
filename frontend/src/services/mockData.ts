import type { Imovel, Benchmarks } from '../types';

// Mock data para desenvolvimento - será substituído por chamadas à API
export const MOCK_BENCHMARKS: Benchmarks = {
  selicAnual: 13.25,
  ipca12m: 4.87,
  igpm12m: 3.52,
  poupancaAnual: 6.17,
  financiamentoTx: 10.49,
};

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
  },
];
