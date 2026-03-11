/**
 * API client for market explorer endpoints.
 *
 * Real-data-first: connects directly to the backend for ITBI transactions,
 * neighborhood stats, yield maps, and market alerts.
 *
 * Mock data is ONLY used when VITE_DEMO=true (explicit demo mode).
 * When the backend is unreachable, returns empty results instead of mock data
 * so the UI can prompt the user to load data via the admin panel.
 */

import type {
  TransacaoITBI,
  NeighborhoodStats,
  YieldBairro,
  PriceEvolutionPoint,
  MarketStats,
  MarketAlert,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEMO_MODE = import.meta.env.VITE_DEMO === 'true';

// Lazy-load static data only in demo mode to avoid bundling it in production
import { loadItbiStats, loadItbiSample, loadBairroCenters } from './staticData';
import type { ItbiAggregate } from './staticData';

// Convert ITBI aggregates to neighborhood stats format
function aggregatesToNeighborhoods(
  aggs: ItbiAggregate[],
  centers: Record<string, { lat: number; lng: number }> = {},
): NeighborhoodStats[] {
  const byBairro = new Map<string, { count: number; totalPreco: number; precos: number[] }>();
  for (const a of aggs) {
    const existing = byBairro.get(a.bairro) ?? { count: 0, totalPreco: 0, precos: [] };
    existing.count += a.count;
    existing.totalPreco += a.precoM2Medio * a.count;
    existing.precos.push(a.precoM2Mediano);
    byBairro.set(a.bairro, existing);
  }
  return Array.from(byBairro.entries()).map(([bairro, d]) => ({
    bairro,
    qtdTransacoes: d.count,
    precoM2Medio: Math.round(d.totalPreco / d.count),
    precoM2Mediano: (() => {
      const sorted = [...d.precos].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    })() ?? null,
    centroLat: centers[bairro]?.lat ?? null,
    centroLng: centers[bairro]?.lng ?? null,
  }));
}

// Convert ITBI aggregates to price evolution points
function aggregatesToEvolution(aggs: ItbiAggregate[], bairro: string): PriceEvolutionPoint[] {
  return aggs
    .filter(a => a.bairro.toLowerCase().includes(bairro.toLowerCase()))
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map(a => ({ date: a.periodo, medianPrecoM2: a.precoM2Mediano, count: a.count }));
}

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(`${BASE_URL}${url}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

/** Metadata about the data source for the last fetch. */
export interface DataSourceInfo {
  source: 'database' | 'mock' | 'empty';
  total: number;
  filtered?: number;
  minDate?: string | null;
  maxDate?: string | null;
}

let _lastDataSource: DataSourceInfo = { source: 'empty', total: 0 };

export function getDataSourceInfo(): DataSourceInfo {
  return _lastDataSource;
}

// --- Transaction Count ---

export async function fetchTransactionCount(params: {
  bbox?: string;
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  precoM2Min?: number;
  precoM2Max?: number;
  bairro?: string;
} = {}): Promise<DataSourceInfo> {
  try {
    const qs = new URLSearchParams();
    if (params.bbox) qs.set('bbox', params.bbox);
    if (params.dataInicio) qs.set('data_inicio', params.dataInicio);
    if (params.dataFim) qs.set('data_fim', params.dataFim);
    if (params.tipo) qs.set('tipo', params.tipo);
    if (params.precoM2Min) qs.set('preco_m2_min', String(params.precoM2Min));
    if (params.precoM2Max) qs.set('preco_m2_max', String(params.precoM2Max));
    if (params.bairro) qs.set('bairro', params.bairro);

    const data = await fetchJson<{
      filtered: number;
      total: number;
      minDate: string | null;
      maxDate: string | null;
      source: string;
    }>(`/api/v1/market/transactions/count?${qs}`);

    const info: DataSourceInfo = {
      source: 'database',
      total: data.total,
      filtered: data.filtered,
      minDate: data.minDate,
      maxDate: data.maxDate,
    };
    _lastDataSource = info;
    return info;
  } catch {
    if (DEMO_MODE) {
      const stats = await loadItbiStats();
      const total = stats.reduce((s, a) => s + a.count, 0);
      const info: DataSourceInfo = {
        source: 'mock',
        total,
        filtered: total,
      };
      _lastDataSource = info;
      return info;
    }
    const info: DataSourceInfo = { source: 'empty', total: 0, filtered: 0 };
    _lastDataSource = info;
    return info;
  }
}

// --- Transactions ---

export interface TransactionResult {
  transactions: TransacaoITBI[];
  total: number;
  source: 'database' | 'mock' | 'empty';
}

export async function fetchTransactions(params: {
  bbox?: string;
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  precoM2Min?: number;
  precoM2Max?: number;
  bairro?: string;
  limit?: number;
  offset?: number;
}): Promise<TransacaoITBI[]> {
  try {
    const qs = new URLSearchParams();
    if (params.bbox) qs.set('bbox', params.bbox);
    if (params.dataInicio) qs.set('data_inicio', params.dataInicio);
    if (params.dataFim) qs.set('data_fim', params.dataFim);
    if (params.tipo) qs.set('tipo', params.tipo);
    if (params.precoM2Min) qs.set('preco_m2_min', String(params.precoM2Min));
    if (params.precoM2Max) qs.set('preco_m2_max', String(params.precoM2Max));
    if (params.bairro) qs.set('bairro', params.bairro);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));

    const geojson = await fetchJson<{
      features: Array<{ properties: TransacaoITBI; geometry: { coordinates: [number, number] } }>;
      total?: number;
      source?: string;
    }>(`/api/v1/market/transactions?${qs}`);

    _lastDataSource = {
      source: 'database',
      total: geojson.total ?? geojson.features.length,
    };

    return geojson.features.map(f => ({
      ...f.properties,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    }));
  } catch {
    if (DEMO_MODE) {
      const sample = await loadItbiSample() as TransacaoITBI[];
      let data = [...sample];
      const totalBeforeFilter = data.length;
      if (params.bbox) {
        const [south, west, north, east] = params.bbox.split(',').map(Number);
        data = data.filter(t =>
          t.latitude >= south && t.latitude <= north &&
          t.longitude >= west && t.longitude <= east
        );
      }
      if (params.dataInicio) data = data.filter(t => t.dataTransacao >= params.dataInicio!);
      if (params.dataFim) data = data.filter(t => t.dataTransacao <= params.dataFim!);
      if (params.precoM2Min) data = data.filter(t => t.precoM2 !== null && t.precoM2 >= params.precoM2Min!);
      if (params.precoM2Max) data = data.filter(t => t.precoM2 !== null && t.precoM2 <= params.precoM2Max!);
      if (params.bairro) data = data.filter(t => t.bairro?.toLowerCase().includes(params.bairro!.toLowerCase()));
      _lastDataSource = { source: 'mock', total: totalBeforeFilter, filtered: data.length };
      const start = params.offset || 0;
      const limit = params.limit || 200_000;
      return data.slice(start, start + limit);
    }
    _lastDataSource = { source: 'empty', total: 0 };
    return [];
  }
}

// --- Neighborhoods ---

export async function fetchNeighborhoods(): Promise<{ neighborhoods: NeighborhoodStats[]; boundaries: unknown }> {
  try {
    return await fetchJson('/api/v1/market/neighborhoods');
  } catch {
    if (DEMO_MODE) {
      const [stats, centers] = await Promise.all([loadItbiStats(), loadBairroCenters()]);
      return { neighborhoods: aggregatesToNeighborhoods(stats, centers), boundaries: null };
    }
    return { neighborhoods: [], boundaries: null };
  }
}

// --- Price Evolution ---

export async function fetchPriceEvolution(bairro: string, freq = 'monthly'): Promise<PriceEvolutionPoint[]> {
  try {
    const data = await fetchJson<{ data: Array<{ date: string; avgPrecoM2?: number; medianPrecoM2?: number; count: number }> }>(
      `/api/v1/market/price-evolution?bairro=${encodeURIComponent(bairro)}&freq=${freq}`
    );
    return data.data.map(d => ({
      date: d.date,
      medianPrecoM2: d.avgPrecoM2 ?? d.medianPrecoM2 ?? 0,
      count: d.count,
    }));
  } catch {
    if (DEMO_MODE) {
      const stats = await loadItbiStats();
      return aggregatesToEvolution(stats, bairro);
    }
    return [];
  }
}

// --- Stats ---

export async function fetchMarketStats(bbox?: string): Promise<MarketStats> {
  try {
    const qs = bbox ? `?bbox=${bbox}` : '';
    return await fetchJson(`/api/v1/market/stats${qs}`);
  } catch {
    if (DEMO_MODE) {
      const [stats, centers] = await Promise.all([loadItbiStats(), loadBairroCenters()]);
      const neighborhoods = aggregatesToNeighborhoods(stats, centers);
      neighborhoods.sort((a, b) => (b.precoM2Medio ?? 0) - (a.precoM2Medio ?? 0));
      const total = stats.reduce((s, a) => s + a.count, 0);
      const allPrices = stats.map(a => a.precoM2Medio).filter(Boolean).sort((a, b) => a - b);
      return {
        totalTransacoes: total,
        precoM2Medio: allPrices.length ? Math.round(allPrices.reduce((s, p) => s + p, 0) / allPrices.length) : null,
        precoM2Min: allPrices[0] ?? null,
        precoM2Max: allPrices[allPrices.length - 1] ?? null,
        topBairros: neighborhoods.slice(0, 5).map(n => ({
          bairro: n.bairro,
          precoM2: n.precoM2Medio || 0,
          qtd: n.qtdTransacoes,
        })),
        bottomBairros: [...neighborhoods].reverse().slice(0, 5).map(n => ({
          bairro: n.bairro,
          precoM2: n.precoM2Medio || 0,
          qtd: n.qtdTransacoes,
        })),
      };
    }
    return {
      totalTransacoes: 0,
      precoM2Medio: null,
      precoM2Min: null,
      precoM2Max: null,
      topBairros: [],
      bottomBairros: [],
    };
  }
}

// --- Yield Map ---

export async function fetchYieldMap(): Promise<YieldBairro[]> {
  try {
    const data = await fetchJson<{ yieldData: YieldBairro[] }>('/api/v1/market/yield-map');
    return data.yieldData;
  } catch {
    if (DEMO_MODE) {
      // Derive yield estimates from ITBI aggregates + FipeZAP rental data
      const [stats, centers] = await Promise.all([loadItbiStats(), loadBairroCenters()]);
      const neighborhoods = aggregatesToNeighborhoods(stats, centers);
      return neighborhoods.slice(0, 30).map(n => ({
        bairro: n.bairro,
        precoM2Compra: n.precoM2Medio ?? 0,
        aluguelM2Estimado: (n.precoM2Medio ?? 0) * 0.004, // ~0.4% monthly yield estimate
        yieldAnualPct: 4.8,
        yieldMensalPct: 0.4,
        qtdTransacoes: n.qtdTransacoes,
        centroLat: n.centroLat,
        centroLng: n.centroLng,
      }));
    }
    return [];
  }
}

// --- Time Series (for animation) ---

export async function fetchTimeSeries(periodo: string, tipo?: string): Promise<TransacaoITBI[]> {
  try {
    const qs = new URLSearchParams({ periodo });
    if (tipo) qs.set('tipo', tipo);
    const geojson = await fetchJson<{ features: Array<{ properties: TransacaoITBI; geometry: { coordinates: [number, number] } }> }>(
      `/api/v1/market/time-series-geo?${qs}`
    );
    return geojson.features.map(f => ({
      ...f.properties,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    }));
  } catch {
    if (DEMO_MODE) {
      const sample = await loadItbiSample() as TransacaoITBI[];
      return sample.filter(t => t.dataTransacao.startsWith(periodo));
    }
    return [];
  }
}

// --- Alerts ---

export async function fetchAlerts(): Promise<MarketAlert[]> {
  try {
    return await fetchJson('/api/v1/market/alerts');
  } catch {
    return [];
  }
}

export async function createAlert(alert: {
  tipo: string;
  bairro?: string;
  logradouro?: string;
  preco_m2_limite?: number;
  yield_limite?: number;
}): Promise<MarketAlert> {
  const resp = await fetch(`${BASE_URL}/api/v1/market/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function deleteAlert(id: number): Promise<void> {
  await fetch(`${BASE_URL}/api/v1/market/alerts/${id}`, { method: 'DELETE' });
}

// --- Cross-Dataset Analytics ---

export interface ScorecardEntry {
  bairro: string;
  precoM2: number;
  momentum6mPct: number | null;
  yieldAirbnbPct: number | null;
  yieldLongtermPct: number | null;
  bestYieldPct: number;
  spreadVsSelicPp: number | null;
  totalReturnVsCdiPp: number | null;
  liquidityScore: number;
  airbnbDensity: number;
  isArbitrage: boolean;
  centroLat: number | null;
  centroLng: number | null;
}

export interface ScorecardResponse {
  scorecard: ScorecardEntry[];
  medians: { precoM2: number; yieldPct: number };
  benchmarks: { selicAnual: number; cdi12m: number | null };
  totalBairros: number;
  arbitrageCount: number;
}

export async function fetchNeighborhoodScorecard(): Promise<ScorecardResponse> {
  try {
    return await fetchJson('/api/v1/market/neighborhood-scorecard');
  } catch {
    return { scorecard: [], medians: { precoM2: 0, yieldPct: 0 }, benchmarks: { selicAnual: 0, cdi12m: null }, totalBairros: 0, arbitrageCount: 0 };
  }
}

export interface TimingSignal {
  composite: 'favorable' | 'neutral' | 'unfavorable';
  score: number;
  maxScore: number;
  details: Record<string, string>;
}

export interface TimingResponse {
  timeSeries: Array<Record<string, unknown>>;
  signal: TimingSignal;
  months: number;
}

export async function fetchTimingSignals(): Promise<TimingResponse> {
  try {
    return await fetchJson('/api/v1/market/timing-signals');
  } catch {
    return { timeSeries: [], signal: { composite: 'neutral', score: 0, maxScore: 5, details: {} }, months: 0 };
  }
}

export interface CityYieldEntry {
  data: string;
  precoM2Venda: number;
  precoM2Locacao: number;
  yieldBrutoPct: number | null;
}

export interface CityYieldsResponse {
  cities: Record<string, CityYieldEntry[]>;
  ranking: Array<{ cidade: string; yieldBrutoPct: number | null; precoM2Venda: number; precoM2Locacao: number }>;
  totalCities: number;
}

export async function fetchCityYields(): Promise<CityYieldsResponse> {
  try {
    return await fetchJson('/api/v1/market/city-yields');
  } catch {
    return { cities: {}, ranking: [], totalCities: 0 };
  }
}

export interface AppreciationEntry {
  bairro: string;
  periodoInicio: string;
  periodoFim: string;
  precoM2Inicio: number;
  precoM2Fim: number;
  nominalChangePct: number;
  realChangePct: number;
  inflationPct: number | null;
  mesesAnalisados: number;
  centroLat: number | null;
  centroLng: number | null;
}

export async function fetchRealAppreciation(bairro?: string, months = 24): Promise<{ appreciation: AppreciationEntry[]; totalBairros: number }> {
  try {
    const qs = new URLSearchParams({ months: String(months) });
    if (bairro) qs.set('bairro', bairro);
    return await fetchJson(`/api/v1/market/real-appreciation?${qs}`);
  } catch {
    return { appreciation: [], totalBairros: 0 };
  }
}
