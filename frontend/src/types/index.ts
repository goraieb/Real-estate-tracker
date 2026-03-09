export type TipoImovel = 'apartamento' | 'casa' | 'comercial' | 'terreno' | 'sala' | 'loja';
export type TipoRenda = 'aluguel_longterm' | 'airbnb' | 'misto';

export interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude?: number;
  longitude?: number;
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

export interface DadosFinanciamento {
  valorFinanciado: number;
  taxaJurosAnual: number;
  prazoMeses: number;
  sistema: 'SAC' | 'PRICE';
  saldoDevedor?: number;
  banco?: string;
}

export interface SnapshotMensal {
  data: string;           // "2024-01"
  valorEstimado: number;
  saldoDevedor: number;   // 0 se à vista
  equity: number;         // valor - saldo_devedor
  aluguelRecebido: number;
}

export interface ValorizacaoDetalhada {
  acumuladoPct: number;
  acumuladoReais: number;
  ultimos12mPct: number;
  ultimos12mReais: number;
  mesesDesdeCompra: number;
  selicAcumuladaPct: number;
  ipcaMais6AcumuladaPct: number;
  selic12mPct: number;
  ipcaMais6_12mPct: number;
  alphaVsSelicPct: number;
  alphaVsIpcaPct: number;
}

export interface DadosMercadoBairro {
  bairro: string;
  cidade: string;
  uf: string;
  centroLat: number;
  centroLng: number;
  precoM2Atual: number;
  precoM2_12mAtras: number;
  variacaoPct12m: number;
  porTipo: {
    tipo: 'apartamento' | 'casa';
    condicao: 'novo' | 'usado';
    quartos: number;
    precoM2: number;
    variacaoPct12m: number;
    amostra: number;
  }[];
}

export interface MapFilter {
  tipo: 'apartamento' | 'casa' | 'todos';
  condicao: 'novo' | 'usado' | 'todos';
  quartos: number | 'todos'; // 1,2,3,4 or 'todos'
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
  financiamento?: DadosFinanciamento;
  historicoValores?: { data: string; valor: number }[];
  snapshots?: SnapshotMensal[];
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

// --- API types (flat, snake_case from backend) ---

export interface ImovelAPI {
  id: string;
  nome: string;
  tipo: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
  area_util: number;
  quartos: number;
  vagas: number;
  andar: number | null;
  ano_construcao: number | null;
  valor_compra: number;
  data_compra: string;
  itbi_pago: number;
  custos_cartorio: number;
  comissao_corretor: number;
  valor_financiado: number;
  taxa_juros_anual: number;
  prazo_meses: number;
  banco: string;
  sistema: string;
  saldo_devedor: number;
  iptu_anual: number;
  condominio_mensal: number;
  seguro_anual: number;
  manutencao_mensal: number;
  tipo_renda: string;
  aluguel_mensal: number | null;
  taxa_vacancia_pct: number;
  diaria_media: number | null;
  taxa_ocupacao_pct: number | null;
  custos_plataforma_pct: number;
  valor_atual_estimado: number | null;
  data_ultima_avaliacao: string | null;
  fonte_avaliacao: string | null;
  notas: string;
  criado_em: string;
  atualizado_em: string;
}

export interface BenchmarkAPI {
  selic_anual: number | null;
  ipca_12m: number | null;
  igpm_12m: number | null;
  poupanca_anual: number | null;
  financiamento_tx: number | null;
}

export function apiToImovel(a: ImovelAPI): Imovel {
  return {
    id: a.id,
    nome: a.nome,
    tipo: (a.tipo || 'apartamento') as TipoImovel,
    endereco: {
      logradouro: a.logradouro || '',
      numero: a.numero || '',
      bairro: a.bairro || '',
      cidade: a.cidade || '',
      uf: a.uf || '',
    },
    areaUtil: a.area_util,
    quartos: a.quartos,
    vagas: a.vagas,
    compra: {
      valorCompra: a.valor_compra,
      dataCompra: a.data_compra,
      itbiPago: a.itbi_pago || undefined,
      custosCartorio: a.custos_cartorio || undefined,
      comissaoCorretor: a.comissao_corretor || undefined,
    },
    custos: {
      iptuAnual: a.iptu_anual,
      condominioMensal: a.condominio_mensal,
      seguroAnual: a.seguro_anual,
      manutencaoMensal: a.manutencao_mensal,
    },
    renda: {
      tipo: (a.tipo_renda || 'aluguel_longterm') as TipoRenda,
      aluguelMensal: a.aluguel_mensal ?? undefined,
      taxaVacanciaPct: a.taxa_vacancia_pct,
      diariaMedia: a.diaria_media ?? undefined,
      taxaOcupacaoPct: a.taxa_ocupacao_pct ?? undefined,
      custosPlataformaPct: a.custos_plataforma_pct,
    },
    valorAtualEstimado: a.valor_atual_estimado ?? undefined,
    fonteAvaliacao: a.fonte_avaliacao ?? undefined,
  };
}

export function benchmarkApiToLocal(b: BenchmarkAPI): Benchmarks {
  return {
    selicAnual: b.selic_anual,
    ipca12m: b.ipca_12m,
    igpm12m: b.igpm_12m,
    poupancaAnual: b.poupanca_anual,
    financiamentoTx: b.financiamento_tx,
  };
}

// ============================================
// MARKET EXPLORER TYPES
// ============================================

export interface TransacaoITBI {
  id: number;
  latitude: number;
  longitude: number;
  valorTransacao: number;
  precoM2: number | null;
  areaM2: number | null;
  tipoImovel: string | null;
  bairro: string | null;
  logradouro: string | null;
  dataTransacao: string;
}

export interface NeighborhoodStats {
  bairro: string;
  qtdTransacoes: number;
  precoM2Medio: number | null;
  precoM2Mediano: number | null;
  centroLat: number | null;
  centroLng: number | null;
  yieldEstimado?: number;
}

export interface YieldBairro {
  bairro: string;
  precoM2Compra: number;
  aluguelM2Estimado: number;
  yieldAnualPct: number;
  yieldMensalPct: number;
  qtdTransacoes: number;
  centroLat: number | null;
  centroLng: number | null;
}

export interface PriceEvolutionPoint {
  date: string;
  medianPrecoM2: number;
  count: number;
}

export interface MarketAlert {
  id: number;
  tipo: 'price_drop' | 'new_transaction' | 'yield_change';
  bairro?: string;
  logradouro?: string;
  preco_m2_limite?: number;
  yield_limite?: number;
  ativo: boolean;
  ultimo_disparo?: string;
  criado_em: string;
}

export interface MarketStats {
  totalTransacoes: number;
  precoM2Medio: number | null;
  precoM2Min: number | null;
  precoM2Max: number | null;
  topBairros: { bairro: string; precoM2: number; qtd: number }[];
  bottomBairros: { bairro: string; precoM2: number; qtd: number }[];
}

export type MarketLayer = 'clusters' | 'choropleth' | 'heatmap' | 'portfolio' | 'yield';

export interface MarketFilters {
  dataInicio: string;
  dataFim: string;
  tipoImovel: string[];
  precoM2Min: number;
  precoM2Max: number;
  areaMin: number;
  areaMax: number;
  activeLayers: MarketLayer[];
}

export interface MarketExplorerState {
  transactions: TransacaoITBI[];
  neighborhoods: NeighborhoodStats[];
  yieldData: YieldBairro[];
  alerts: MarketAlert[];
  selectedBairro: string | null;
  filters: MarketFilters;
  isLoading: boolean;
}
