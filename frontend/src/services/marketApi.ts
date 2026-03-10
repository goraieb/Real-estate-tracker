/**
 * API client for market explorer endpoints.
 * Falls back to mock data when the backend is unavailable.
 *
 * Tracks data source ("database" for real data, "mock" for demo data)
 * so the UI can indicate whether the user is viewing real ITBI transactions.
 */

import type {
  TransacaoITBI,
  NeighborhoodStats,
  YieldBairro,
  PriceEvolutionPoint,
  MarketStats,
  MarketAlert,
} from '../types';
import {
  MOCK_TRANSACTIONS,
  MOCK_NEIGHBORHOOD_STATS,
  MOCK_YIELD_DATA,
  getMockPriceEvolution,
} from './mockTransactions';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(`${BASE_URL}${url}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

/** Metadata about the data source for the last fetch. */
export interface DataSourceInfo {
  source: 'database' | 'mock';
  total: number;
  filtered?: number;
  minDate?: string | null;
  maxDate?: string | null;
}

/** Tracks the latest data source info (updated by fetchTransactions). */
let _lastDataSource: DataSourceInfo = {
  source: 'mock',
  total: MOCK_TRANSACTIONS.length,
};

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
    const info: DataSourceInfo = {
      source: 'mock',
      total: MOCK_TRANSACTIONS.length,
      filtered: MOCK_TRANSACTIONS.length,
    };
    _lastDataSource = info;
    return info;
  }
}

// --- Transactions ---

export interface TransactionResult {
  transactions: TransacaoITBI[];
  total: number;
  source: 'database' | 'mock';
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
    // Fallback to mock data
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
}

// --- Neighborhoods ---

export async function fetchNeighborhoods(): Promise<{ neighborhoods: NeighborhoodStats[]; boundaries: unknown }> {
  try {
    return await fetchJson('/api/v1/market/neighborhoods');
  } catch {
    return { neighborhoods: MOCK_NEIGHBORHOOD_STATS, boundaries: null };
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
    return getMockPriceEvolution(bairro);
  }
}

// --- Stats ---

export async function fetchMarketStats(bbox?: string): Promise<MarketStats> {
  try {
    const qs = bbox ? `?bbox=${bbox}` : '';
    return await fetchJson(`/api/v1/market/stats${qs}`);
  } catch {
    // Generate from mock data
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
}

// --- Yield Map ---

export async function fetchYieldMap(): Promise<YieldBairro[]> {
  try {
    const data = await fetchJson<{ yieldData: YieldBairro[] }>('/api/v1/market/yield-map');
    return data.yieldData;
  } catch {
    return MOCK_YIELD_DATA;
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
    // Filter mock data by month
    return MOCK_TRANSACTIONS.filter(t => t.dataTransacao.startsWith(periodo));
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
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/market/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    return resp.json();
  } catch {
    // Mock: return a fake alert
    return {
      id: Date.now(),
      tipo: alert.tipo as MarketAlert['tipo'],
      bairro: alert.bairro,
      logradouro: alert.logradouro,
      preco_m2_limite: alert.preco_m2_limite,
      yield_limite: alert.yield_limite,
      ativo: true,
      criado_em: new Date().toISOString(),
    };
  }
}

export async function deleteAlert(id: number): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/v1/market/alerts/${id}`, { method: 'DELETE' });
  } catch {
    // Silently fail in demo mode
  }
}
