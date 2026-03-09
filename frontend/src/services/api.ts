import type { ImovelAPI, BenchmarkAPI } from '../types';

const API_BASE = '/api/v1';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json();
}

export const api = {
  imoveis: {
    listar: () => fetchAPI<ImovelAPI[]>('/imoveis'),
    buscar: (id: string) => fetchAPI<ImovelAPI>(`/imoveis/${id}`),
    criar: (data: Record<string, unknown>) =>
      fetchAPI<ImovelAPI>('/imoveis', { method: 'POST', body: JSON.stringify(data) }),
    atualizar: (id: string, data: Record<string, unknown>) =>
      fetchAPI<ImovelAPI>(`/imoveis/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletar: (id: string) =>
      fetchAPI<{ ok: boolean }>(`/imoveis/${id}`, { method: 'DELETE' }),
  },
  benchmark: {
    atual: () => fetchAPI<BenchmarkAPI>('/benchmark'),
    comparar: (yieldPct: number) =>
      fetchAPI<Record<string, unknown>>(`/benchmark/comparar?yield_imovel=${yieldPct}`),
  },
  bcb: {
    serie: (nome: string) => fetchAPI<Record<string, unknown>>(`/bcb/${nome}`),
  },
};
