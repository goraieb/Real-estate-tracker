import { describe, it, expect } from 'vitest';
import {
  calcularYieldLongterm,
  calcularYieldAirbnb,
  calcularValorizacao,
  calcularBenchmarks,
} from '../services/calculations';
import type { Imovel } from '../types';

// --- calcularYieldLongterm ---

describe('calcularYieldLongterm', () => {
  it('basic net yield', () => {
    const result = calcularYieldLongterm(500_000, 2_500);
    expect(result.yieldBruto).toBeCloseTo(6.0, 1);
    expect(result.yieldLiquido).toBeLessThanOrEqual(result.yieldBruto);
  });

  it('with all costs', () => {
    const result = calcularYieldLongterm(
      500_000, 3_000, 3_600, 800, 600, 200, 8, 5
    );
    expect(result.yieldLiquido).toBeLessThan(result.yieldBruto);
    expect(result.custosTotaisAnual).toBeGreaterThan(0);
    expect(result.breakdown.administracao).toBeGreaterThan(0);
  });

  it('with vacancy 10%', () => {
    const noVacancy = calcularYieldLongterm(500_000, 2_500, 0, 0, 0, 0, 0, 0);
    const withVacancy = calcularYieldLongterm(500_000, 2_500, 0, 0, 0, 0, 0, 10);
    expect(withVacancy.yieldBruto).toBeLessThan(noVacancy.yieldBruto);
  });

  it('zero property value', () => {
    const result = calcularYieldLongterm(0, 2_500);
    expect(result.yieldBruto).toBe(0);
    expect(result.yieldLiquido).toBe(0);
  });

  it('IR isento below threshold', () => {
    const result = calcularYieldLongterm(500_000, 2_000);
    expect(result.irAnual).toBe(0);
  });

  it('IR highest bracket', () => {
    const result = calcularYieldLongterm(500_000, 10_000);
    expect(result.irAnual).toBeGreaterThan(0);
  });
});

// --- calcularYieldAirbnb ---

describe('calcularYieldAirbnb', () => {
  it('basic Airbnb yield', () => {
    const result = calcularYieldAirbnb(500_000, 300, 70);
    expect(result.yieldBruto).toBeGreaterThan(10);
    expect(result.noitesOcupadasAno).toBe(Math.round(365 * 0.7));
  });

  it('with platform fee', () => {
    const withoutFee = calcularYieldAirbnb(500_000, 300, 70, 0, 0);
    const withFee = calcularYieldAirbnb(500_000, 300, 70, 0, 3);
    expect(withFee.yieldLiquido).toBeLessThan(withoutFee.yieldLiquido);
  });

  it('with cleaning costs', () => {
    const without = calcularYieldAirbnb(500_000, 300, 70, 0, 0, 0, 3);
    const withCleaning = calcularYieldAirbnb(500_000, 300, 70, 0, 0, 120, 3);
    expect(withCleaning.yieldLiquido).toBeLessThan(without.yieldLiquido);
  });

  it('zero occupancy', () => {
    const result = calcularYieldAirbnb(500_000, 300, 0);
    expect(result.yieldBruto).toBe(0);
    expect(result.noitesOcupadasAno).toBe(0);
  });

  it('full occupancy', () => {
    const result = calcularYieldAirbnb(500_000, 300, 100);
    expect(result.noitesOcupadasAno).toBe(365);
    expect(result.receitaBrutaAnual).toBe(300 * 365);
  });
});

// --- calcularValorizacao ---

describe('calcularValorizacao', () => {
  const baseImovel: Imovel = {
    id: '1',
    nome: 'Test',
    tipo: 'apartamento',
    endereco: { logradouro: '', numero: '', bairro: '', cidade: 'SP', uf: 'SP' },
    areaUtil: 65,
    quartos: 2,
    vagas: 1,
    compra: { valorCompra: 500_000, dataCompra: '2023-01-01' },
    custos: { iptuAnual: 0, condominioMensal: 0, seguroAnual: 0, manutencaoMensal: 0 },
    renda: { tipo: 'aluguel_longterm', taxaVacanciaPct: 0 },
  };

  it('no estimated value uses purchase value', () => {
    const result = calcularValorizacao(baseImovel);
    expect(result.valorAtual).toBe(500_000);
    expect(result.ganhoNominal).toBe(0);
    expect(result.valorizacaoPct).toBe(0);
  });

  it('with estimated value higher', () => {
    const imovel = { ...baseImovel, valorAtualEstimado: 600_000 };
    const result = calcularValorizacao(imovel);
    expect(result.valorAtual).toBe(600_000);
    expect(result.ganhoNominal).toBe(100_000);
    expect(result.valorizacaoPct).toBeCloseTo(20, 1);
  });

  it('with estimated value lower', () => {
    const imovel = { ...baseImovel, valorAtualEstimado: 450_000 };
    const result = calcularValorizacao(imovel);
    expect(result.ganhoNominal).toBe(-50_000);
    expect(result.valorizacaoPct).toBeCloseTo(-10, 1);
  });

  it('preco/m2 calculation', () => {
    const result = calcularValorizacao(baseImovel);
    expect(result.precoM2).toBeCloseTo(500_000 / 65, 0);
  });
});

// --- calcularBenchmarks ---

describe('calcularBenchmarks', () => {
  it('returns 5 benchmarks', () => {
    const result = calcularBenchmarks(6.0, 13.75, 4.62);
    expect(result.length).toBe(5);
  });

  it('benchmark names correct', () => {
    const result = calcularBenchmarks(6.0, 13.75, 4.62);
    const names = result.map(b => b.nome);
    expect(names).toContain('Selic');
    expect(names).toContain('CDB 100% CDI');
    expect(names).toContain('Tesouro Selic');
    expect(names).toContain('Tesouro IPCA+');
    expect(names).toContain('Poupança');
  });

  it('spread calculation', () => {
    const yieldImovel = 8.0;
    const result = calcularBenchmarks(yieldImovel, 13.75, 4.62);
    const selic = result.find(b => b.nome === 'Selic')!;
    expect(selic.spreadPp).toBeCloseTo(yieldImovel - 13.75, 2);
  });
});
