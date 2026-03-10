/**
 * Static data loader for GitHub Pages deployment.
 *
 * Loads pre-generated JSON files from /data/ instead of mock data.
 * Results are cached after first load to avoid redundant fetches.
 */

import type { Imovel, Benchmarks, SnapshotMensal } from '../types';
import { getRealBenchmarks } from './realData';

const BASE = import.meta.env.BASE_URL;

// ── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, unknown>();

async function loadJson<T>(path: string): Promise<T> {
  if (cache.has(path)) return cache.get(path) as T;
  const resp = await fetch(`${BASE}data/${path}`);
  if (!resp.ok) throw new Error(`Failed to load ${path}: ${resp.status}`);
  const data = await resp.json();
  cache.set(path, data);
  return data as T;
}

// ── Snapshot generation (extracted from former mockData.ts) ────────────────

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

    const t = m / totalMonths;
    const curve = t * t * (3 - 2 * t); // smoothstep
    const valorEstimado = Math.round(valorCompra + (valorAtual - valorCompra) * curve);

    if (financiamento && saldoDevedor > 0) {
      const juros = saldoDevedor * taxaMensal;
      if (financiamento.sistema === 'SAC') {
        saldoDevedor = Math.max(0, saldoDevedor - amortMensal);
      } else {
        const pmt = financiamento.valorFinanciado * (taxaMensal * Math.pow(1 + taxaMensal, financiamento.prazoMeses)) / (Math.pow(1 + taxaMensal, financiamento.prazoMeses) - 1);
        const amort = pmt - juros;
        saldoDevedor = Math.max(0, saldoDevedor - amort);
      }
    }

    const equity = valorEstimado - Math.round(saldoDevedor);
    const aluguel = aluguelMensal ? Math.round(aluguelMensal * (1 - vacanciaPct / 100)) : 0;

    snapshots.push({ data: mes, valorEstimado, saldoDevedor: Math.round(saldoDevedor), equity, aluguelRecebido: aluguel });
  }

  return snapshots;
}

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

// ── Hydrate a raw portfolio item into a full Imovel ────────────────────────

function hydrateImovel(raw: Imovel): Imovel {
  const valorAtual = raw.valorAtualEstimado ?? raw.compra.valorCompra;
  return {
    ...raw,
    historicoValores: gerarHistorico(raw.compra.dataCompra, raw.compra.valorCompra, valorAtual),
    snapshots: gerarSnapshots(
      raw.compra.dataCompra,
      raw.compra.valorCompra,
      valorAtual,
      raw.financiamento,
      raw.renda.aluguelMensal,
      raw.renda.taxaVacanciaPct,
    ),
  };
}

// ── Public loaders ─────────────────────────────────────────────────────────

export async function loadPortfolio(): Promise<Imovel[]> {
  const raw = await loadJson<Imovel[]>('portfolio.json');
  return raw.map(hydrateImovel);
}

export async function loadBenchmarks(): Promise<Benchmarks> {
  // Try loading fresh indicators from build-time BCB fetch
  try {
    const data = await loadJson<{
      selic_anual?: number;
      ipca_12m?: number;
      igpm_12m?: number;
      poupanca_anual?: number;
      financiamento_tx?: number;
    }>('indicators.json');
    return {
      selicAnual: data.selic_anual ?? null,
      ipca12m: data.ipca_12m ?? null,
      igpm12m: data.igpm_12m ?? null,
      poupancaAnual: data.poupanca_anual ?? null,
      financiamentoTx: data.financiamento_tx ?? null,
    };
  } catch {
    // Fall back to hardcoded real data from realData.ts
    return getRealBenchmarks();
  }
}

export interface ItbiAggregate {
  bairro: string;
  periodo: string;
  count: number;
  precoM2Medio: number;
  precoM2Mediano: number;
  precoM2Min: number;
  precoM2Max: number;
  valorTotal: number;
}

export async function loadItbiStats(): Promise<ItbiAggregate[]> {
  try {
    return await loadJson<ItbiAggregate[]>('itbi_stats.json');
  } catch {
    return [];
  }
}

export async function loadItbiSample(): Promise<unknown[]> {
  try {
    return await loadJson<unknown[]>('itbi_transactions_sample.json');
  } catch {
    return [];
  }
}

export interface DataMetadata {
  lastUpdated: string;
  sources: Record<string, string>;
}

// São Paulo official bairros — used for alert dropdowns and filters
export const SP_BAIRRO_NAMES = [
  'Alto de Pinheiros', 'Bela Vista', 'Bom Retiro', 'Brás', 'Brooklin', 'Butantã',
  'Cambuci', 'Campo Belo', 'Campo Limpo', 'Capão Redondo', 'Casa Verde', 'Cidade Ademar',
  'Cidade Dutra', 'Consolação', 'Cursino', 'Ermelino Matarazzo', 'Flamengo', 'Grajaú',
  'Interlagos', 'Ipiranga', 'Itaim Bibi', 'Itaquera', 'Jabaquara', 'Jardim Ângela',
  'Jardim Paulista', 'Jardim São Luís', 'Lapa', 'Liberdade', 'Mandaqui', 'Moema',
  'Mooca', 'Morumbi', 'Paraíso', 'Pedreira', 'Penha', 'Perdizes', 'Pinheiros',
  'Pirituba', 'República', 'Rio Pequeno', 'Sacomã', 'Santa Cecília', 'Santana',
  'Santo Amaro', 'São Mateus', 'São Miguel Paulista', 'Sapopemba', 'Saúde', 'Socorro',
  'Tatuapé', 'Tremembé', 'Tucuruvi', 'Vila Andrade', 'Vila Formosa', 'Vila Guilherme',
  'Vila Leopoldina', 'Vila Madalena', 'Vila Mariana', 'Vila Olímpia', 'Vila Prudente',
  'Vila Sônia',
];

export async function loadMetadata(): Promise<DataMetadata | null> {
  try {
    return await loadJson<DataMetadata>('metadata.json');
  } catch {
    return null;
  }
}
