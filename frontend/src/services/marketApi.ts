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

// Lazy-load mock data only in demo mode to avoid bundling it in production
async function getMocks() {
  const { MOCK_TRANSACTIONS, MOCK_NEIGHBORHOOD_STATS, MOCK_YIELD_DATA, getMockPriceEvolution } =
    await import('./mockTransactions');
  return { MOCK_TRANSACTIONS, MOCK_NEIGHBORHOOD_STATS, MOCK_YIELD_DATA, getMockPriceEvolution };
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
      const { MOCK_TRANSACTIONS } = await getMocks();
      const info: DataSourceInfo = {
        source: 'mock',
        total: MOCK_TRANSACTIONS.length,
        filtered: MOCK_TRANSACTIONS.length,
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
      const { MOCK_TRANSACTIONS } = await getMocks();
      let data = [...MOCK_TRANSACTIONS];
      if (params.dataInicio) data = data.filter(t => t.dataTransacao >= params.dataInicio!);
      if (params.dataFim) data = data.filter(t => t.dataTransacao <= params.dataFim!);
      if (params.precoM2Min) data = data.filter(t => t.precoM2 !== null && t.precoM2 >= params.precoM2Min!);
      if (params.precoM2Max) data = data.filter(t => t.precoM2 !== null && t.precoM2 <= params.precoM2Max!);
      if (params.bairro) data = data.filter(t => t.bairro?.toLowerCase().includes(params.bairro!.toLowerCase()));
      _lastDataSource = { source: 'mock', total: data.length };
      const start = params.offset || 0;
      const limit = params.limit || 100_000;
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
      const { MOCK_NEIGHBORHOOD_STATS } = await getMocks();
      return { neighborhoods: MOCK_NEIGHBORHOOD_STATS, boundaries: null };
    }
    return { neighborhoods: [], boundaries: null };
  }
}

// --- Price Evolution ---

export async function fetchPriceEvolution(bairro: string, freq = 'monthly'): Promise<PriceEvolutionPoint[]> {
  try {
    const data = await fetchJson<{ data: PriceEvolutionPoint[] }>(
      `/api/v1/market/price-evolution?bairro=${encodeURIComponent(bairro)}&freq=${freq}`
    );
    return data.data;
  } catch {
    if (DEMO_MODE) {
      const { getMockPriceEvolution } = await getMocks();
      return getMockPriceEvolution(bairro);
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
      const { MOCK_TRANSACTIONS, MOCK_NEIGHBORHOOD_STATS } = await getMocks();
      const prices = MOCK_TRANSACTIONS.filter(t => t.precoM2).map(t => t.precoM2!);
      prices.sort((a, b) => a - b);
      return {
        totalTransacoes: MOCK_TRANSACTIONS.length,
        precoM2Medio: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
        precoM2Min: prices[0],
        precoM2Max: prices[prices.length - 1],
        topBairros: MOCK_NEIGHBORHOOD_STATS.slice(0, 5).map(n => ({
          bairro: n.bairro,
          precoM2: n.precoM2Medio || 0,
          qtd: n.qtdTransacoes,
        })),
        bottomBairros: [...MOCK_NEIGHBORHOOD_STATS].reverse().slice(0, 5).map(n => ({
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
      const { MOCK_YIELD_DATA } = await getMocks();
      return MOCK_YIELD_DATA;
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
      const { MOCK_TRANSACTIONS } = await getMocks();
      return MOCK_TRANSACTIONS.filter(t => t.dataTransacao.startsWith(periodo));
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
