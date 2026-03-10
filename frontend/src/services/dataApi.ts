/**
 * API client for the data loading/admin endpoints.
 *
 * Connects to the backend's /api/v1/data/* routes for:
 * - Triggering data loads from real sources
 * - Monitoring load status
 * - Querying cached economic indicators
 * - Accessing Airbnb, SECOVI, CUB, ABECIP, B3 data
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(`${BASE_URL}${url}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

// --- Data Loading ---

export interface LoadRequest {
  sources?: string[];
  include_itbi?: boolean;
  itbi_years?: number[];
}

export interface LoadStatus {
  running: Record<string, string>;
  recent: Record<string, string>;
  history: Array<{
    source: string;
    status: string;
    records_loaded: number;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
  }>;
}

export interface DataSummary {
  itbi_transactions: number;
  indicators: Array<{
    fonte: string;
    serie: string;
    c: number;
    min_d: string;
    max_d: string;
  }>;
  fipezap: Array<{ tipo: string; cidades: number; c: number }>;
  airbnb: Array<{ cidade: string; c: number }>;
}

/** Trigger data loading from specified sources (or all). */
export async function triggerDataLoad(req: LoadRequest = {}): Promise<{ message: string; sources: string[] }> {
  return postJson('/api/v1/data/load', req);
}

/** Trigger loading for a single source. */
export async function triggerSingleLoad(source: string): Promise<{ message: string }> {
  return postJson(`/api/v1/data/load/${source}`, {});
}

/** Get current load status and history. */
export async function getLoadStatus(): Promise<LoadStatus> {
  return fetchJson('/api/v1/data/status');
}

/** Get summary of all loaded data. */
export async function getDataSummary(): Promise<DataSummary> {
  return fetchJson('/api/v1/data/summary');
}

// --- Economic Indicators ---

export interface IndicatorSeries {
  serie: string;
  fonte: string | null;
  total: number;
  data: Array<{ fonte: string; serie: string; data: string; valor: number }>;
}

export interface IndicatorList {
  indicators: Array<{
    fonte: string;
    serie: string;
    records: number;
    data_inicio: string;
    data_fim: string;
  }>;
}

/** Get cached indicator time series. */
export async function getIndicatorSeries(serie: string, fonte?: string): Promise<IndicatorSeries> {
  const qs = fonte ? `?fonte=${fonte}` : '';
  return fetchJson(`/api/v1/data/indicators/${encodeURIComponent(serie)}${qs}`);
}

/** List all available cached indicator series. */
export async function listIndicators(): Promise<IndicatorList> {
  return fetchJson('/api/v1/data/indicators');
}

// --- Airbnb ---

export interface AirbnbStats {
  cidade: string;
  total_bairros: number;
  stats: Array<{
    bairro: string;
    qtd_listings: number;
    preco_medio: number;
    reviews_mes_medio: number;
    ocupacao_estimada: number;
  }>;
}

export interface AirbnbYieldEstimate {
  bairro: string;
  preco_noite_medio: number;
  ocupacao_estimada_pct: number;
  receita_mensal_estimada: number;
  preco_m2_compra: number;
  yield_bruto_anual_pct: number;
  yield_liquido_anual_pct: number;
  qtd_listings_referencia: number;
}

/** Get Airbnb neighborhood statistics. */
export async function getAirbnbStats(cidade: string = 'São Paulo'): Promise<AirbnbStats> {
  return fetchJson(`/api/v1/data/airbnb/stats?cidade=${encodeURIComponent(cidade)}`);
}

/** Get Airbnb yield estimate for a neighborhood. */
export async function getAirbnbYieldEstimate(bairro: string): Promise<AirbnbYieldEstimate> {
  return fetchJson(`/api/v1/data/airbnb/yield-estimate?bairro=${encodeURIComponent(bairro)}`);
}

// --- Credit Market ---

export interface CreditSummary {
  taxa_media_aa?: number;
  inadimplencia_pct?: number;
  volume_concessoes_mm?: number;
}

/** Get real estate credit market summary. */
export async function getCreditSummary(): Promise<CreditSummary> {
  return fetchJson('/api/v1/data/credit/summary');
}

// --- FipeZAP ---

export interface FipeZapData {
  tipo: string;
  total: number;
  data: Array<{ tipo: string; cidade: string; data: string; preco_m2: number }>;
}

/** Get cached FipeZAP price data. */
export async function getFipeZapPrecos(tipo: string = 'venda', cidade?: string): Promise<FipeZapData> {
  const qs = new URLSearchParams({ tipo });
  if (cidade) qs.set('cidade', cidade);
  return fetchJson(`/api/v1/data/fipezap/precos?${qs}`);
}
