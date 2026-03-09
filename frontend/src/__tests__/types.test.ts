import { describe, it, expect } from 'vitest';
import { apiToImovel, benchmarkApiToLocal } from '../types';
import type { ImovelAPI, BenchmarkAPI } from '../types';

const SAMPLE_API: ImovelAPI = {
  id: 'abc-123',
  nome: 'Apto Teste',
  tipo: 'apartamento',
  logradouro: 'Rua Augusta',
  numero: '100',
  bairro: 'Consolação',
  cidade: 'São Paulo',
  uf: 'SP',
  cep: '01310-000',
  latitude: -23.55,
  longitude: -46.66,
  area_util: 65,
  quartos: 2,
  vagas: 1,
  andar: 5,
  ano_construcao: 2010,
  valor_compra: 500000,
  data_compra: '2024-01-15',
  itbi_pago: 15000,
  custos_cartorio: 5000,
  comissao_corretor: 30000,
  valor_financiado: 300000,
  taxa_juros_anual: 10,
  prazo_meses: 360,
  banco: 'Caixa',
  sistema: 'SAC',
  saldo_devedor: 290000,
  iptu_anual: 2400,
  condominio_mensal: 800,
  seguro_anual: 600,
  manutencao_mensal: 200,
  tipo_renda: 'aluguel_longterm',
  aluguel_mensal: 2500,
  taxa_vacancia_pct: 5,
  diaria_media: null,
  taxa_ocupacao_pct: null,
  custos_plataforma_pct: 3,
  valor_atual_estimado: 550000,
  data_ultima_avaliacao: '2024-06-01',
  fonte_avaliacao: 'FipeZAP',
  notas: 'Boa localização',
  criado_em: '2024-01-15T10:00:00',
  atualizado_em: '2024-06-01T15:00:00',
};

describe('apiToImovel', () => {
  it('basic conversion', () => {
    const result = apiToImovel(SAMPLE_API);
    expect(result.id).toBe('abc-123');
    expect(result.nome).toBe('Apto Teste');
    expect(result.tipo).toBe('apartamento');
    expect(result.areaUtil).toBe(65);
    expect(result.quartos).toBe(2);
    expect(result.vagas).toBe(1);
  });

  it('endereco mapping', () => {
    const result = apiToImovel(SAMPLE_API);
    expect(result.endereco.logradouro).toBe('Rua Augusta');
    expect(result.endereco.numero).toBe('100');
    expect(result.endereco.bairro).toBe('Consolação');
    expect(result.endereco.cidade).toBe('São Paulo');
    expect(result.endereco.uf).toBe('SP');
  });

  it('compra mapping', () => {
    const result = apiToImovel(SAMPLE_API);
    expect(result.compra.valorCompra).toBe(500000);
    expect(result.compra.dataCompra).toBe('2024-01-15');
    expect(result.compra.itbiPago).toBe(15000);
    expect(result.compra.custosCartorio).toBe(5000);
    expect(result.compra.comissaoCorretor).toBe(30000);
  });

  it('custos mapping', () => {
    const result = apiToImovel(SAMPLE_API);
    expect(result.custos.iptuAnual).toBe(2400);
    expect(result.custos.condominioMensal).toBe(800);
    expect(result.custos.seguroAnual).toBe(600);
    expect(result.custos.manutencaoMensal).toBe(200);
  });

  it('renda longterm', () => {
    const result = apiToImovel(SAMPLE_API);
    expect(result.renda.tipo).toBe('aluguel_longterm');
    expect(result.renda.aluguelMensal).toBe(2500);
    expect(result.renda.taxaVacanciaPct).toBe(5);
  });

  it('renda airbnb', () => {
    const airbnbApi: ImovelAPI = {
      ...SAMPLE_API,
      tipo_renda: 'airbnb',
      aluguel_mensal: null,
      diaria_media: 300,
      taxa_ocupacao_pct: 70,
    };
    const result = apiToImovel(airbnbApi);
    expect(result.renda.tipo).toBe('airbnb');
    expect(result.renda.diariaMedia).toBe(300);
    expect(result.renda.taxaOcupacaoPct).toBe(70);
    expect(result.renda.aluguelMensal).toBeUndefined();
  });

  it('null handling', () => {
    const apiWithNulls: ImovelAPI = {
      ...SAMPLE_API,
      aluguel_mensal: null,
      diaria_media: null,
      taxa_ocupacao_pct: null,
      valor_atual_estimado: null,
      fonte_avaliacao: null,
    };
    const result = apiToImovel(apiWithNulls);
    expect(result.renda.aluguelMensal).toBeUndefined();
    expect(result.renda.diariaMedia).toBeUndefined();
    expect(result.renda.taxaOcupacaoPct).toBeUndefined();
    expect(result.valorAtualEstimado).toBeUndefined();
    expect(result.fonteAvaliacao).toBeUndefined();
  });
});

describe('benchmarkApiToLocal', () => {
  it('converts correctly', () => {
    const api: BenchmarkAPI = {
      selic_anual: 13.75,
      ipca_12m: 4.62,
      igpm_12m: -3.48,
      poupanca_anual: 6.17,
      financiamento_tx: 9.45,
    };
    const result = benchmarkApiToLocal(api);
    expect(result.selicAnual).toBe(13.75);
    expect(result.ipca12m).toBe(4.62);
    expect(result.igpm12m).toBe(-3.48);
    expect(result.poupancaAnual).toBe(6.17);
    expect(result.financiamentoTx).toBe(9.45);
  });
});
