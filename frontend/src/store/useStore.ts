import { create } from 'zustand';
import type { Imovel, Benchmarks } from '../types';
import { apiToImovel, benchmarkApiToLocal } from '../types';
import { api } from '../services/api';

interface AppState {
  imoveis: Imovel[];
  selectedId: string | null;
  benchmarks: Benchmarks | null;
  isLoading: boolean;
  error: string | null;

  fetchImoveis: () => Promise<void>;
  fetchBenchmarks: () => Promise<void>;
  selectImovel: (id: string | null) => void;
  criarImovel: (data: Record<string, unknown>) => Promise<void>;
  atualizarImovel: (id: string, data: Record<string, unknown>) => Promise<void>;
  deletarImovel: (id: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  imoveis: [],
  selectedId: null,
  benchmarks: null,
  isLoading: false,
  error: null,

  fetchImoveis: async () => {
    set({ isLoading: true, error: null });
    try {
      const raw = await api.imoveis.listar();
      const imoveis = raw.map(apiToImovel);
      const { selectedId } = get();
      set({
        imoveis,
        isLoading: false,
        selectedId: selectedId && imoveis.some(i => i.id === selectedId)
          ? selectedId
          : imoveis[0]?.id ?? null,
      });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  fetchBenchmarks: async () => {
    try {
      const raw = await api.benchmark.atual();
      set({ benchmarks: benchmarkApiToLocal(raw) });
    } catch {
      // Benchmarks are optional — silently degrade
    }
  },

  selectImovel: (id) => set({ selectedId: id }),

  criarImovel: async (data) => {
    await api.imoveis.criar(data);
    await get().fetchImoveis();
  },

  atualizarImovel: async (id, data) => {
    await api.imoveis.atualizar(id, data);
    await get().fetchImoveis();
  },

  deletarImovel: async (id) => {
    await api.imoveis.deletar(id);
    const { selectedId } = get();
    if (selectedId === id) set({ selectedId: null });
    await get().fetchImoveis();
  },
}));
