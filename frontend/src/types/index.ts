export type TipoImovel = 'apartamento' | 'casa' | 'comercial' | 'terreno' | 'sala' | 'loja';
export type TipoRenda = 'aluguel_longterm' | 'airbnb' | 'misto';

export interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface DadosCompra {
  valorCompra: number;
  dataCompra: string; // ISO date
  itbiPago?: number;
  custosCartorio?: number;
  comissaoCorretor?: number;
}

export interface CustosRecorrentes {
  iptuAnual: number;
  condominioMensal: number;
  seguroAnual: number;
  manutencaoMensal: number;
}

export interface DadosRenda {
  tipo: TipoRenda;
  aluguelMensal?: number;
  taxaVacanciaPct: number;
  // Airbnb
  diariaMedia?: number;
  taxaOcupacaoPct?: number;
  custosPlataformaPct?: number;
}

export interface Imovel {
  id: string;
  nome: string;
  tipo: TipoImovel;
  endereco: Endereco;
  areaUtil: number;
  quartos: number;
  vagas: number;
  compra: DadosCompra;
  custos: CustosRecorrentes;
  renda: DadosRenda;
  valorAtualEstimado?: number;
  fonteAvaliacao?: string;
}

export interface YieldResult {
  yieldBruto: number;
  yieldLiquido: number;
  receitaBrutaAnual: number;
  receitaLiquidaAnual: number;
  custosTotaisAnual: number;
  irAnual: number;
  breakdown: {
    administracao: number;
    iptu: number;
    seguro: number;
    condominioAnual: number;
    manutencaoAnual: number;
  };
}

export interface AirbnbYieldResult {
  yieldBruto: number;
  yieldLiquido: number;
  receitaBrutaAnual: number;
  receitaLiquidaAnual: number;
  receitaLiquidaMensal: number;
  noitesOcupadasAno: number;
  breakdown: {
    taxaPlataforma: number;
    limpezaTotal: number;
    custosFixos: number;
  };
}

export interface BenchmarkComparacao {
  nome: string;
  taxa: number;
  taxaLiquida?: number;
  spreadPp: number;
}

export interface Benchmarks {
  selicAnual: number | null;
  ipca12m: number | null;
  igpm12m: number | null;
  poupancaAnual: number | null;
  financiamentoTx: number | null;
}

export interface ProjecaoPeriodo {
  imovelValor: number;
  imovelGanho: number;
  cdiValor: number;
  cdiGanho: number;
  diferenca: number;
  melhor: string;
}
