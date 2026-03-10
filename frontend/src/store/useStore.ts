import { create } from 'zustand';
import type { Imovel, Benchmarks } from '../types';
import { apiToImovel, benchmarkApiToLocal } from '../types';
import { api } from '../services/api';
import { loadPortfolio, loadBenchmarks } from '../services/staticData';

const DEMO_MODE = import.meta.env.VITE_DEMO === 'true';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

interface AppState {
  imoveis: Imovel[];
  selectedId: string | null;
  benchmarks: Benchmarks | null;
  isLoading: boolean;
  error: string | null;
  isDemo: boolean;
  theme: Theme;

  fetchImoveis: () => Promise<void>;
  fetchBenchmarks: () => Promise<void>;
  selectImovel: (id: string | null) => void;
  criarImovel: (data: Record<string, unknown>) => Promise<void>;
  atualizarImovel: (id: string, data: Record<string, unknown>) => Promise<void>;
  deletarImovel: (id: string) => Promise<void>;
  toggleTheme: () => void;
}

function uniqueDemoId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function flatToImovel(data: Record<string, unknown>): Imovel {
  return {
    id: String(data.id ?? uniqueDemoId()),
    nome: String(data.nome ?? ''),
    tipo: (data.tipo as Imovel['tipo']) ?? 'apartamento',
    endereco: {
      logradouro: String(data.logradouro ?? ''),
      numero: String(data.numero ?? ''),
      bairro: String(data.bairro ?? ''),
      cidade: String(data.cidade ?? ''),
      uf: String(data.uf ?? ''),
    },
    areaUtil: Number(data.area_util ?? 0),
    quartos: Number(data.quartos ?? 0),
    vagas: Number(data.vagas ?? 0),
    compra: {
      valorCompra: Number(data.valor_compra ?? 0),
      dataCompra: String(data.data_compra ?? new Date().toISOString().slice(0, 10)),
      itbiPago: data.itbi_pago ? Number(data.itbi_pago) : undefined,
      custosCartorio: data.custos_cartorio ? Number(data.custos_cartorio) : undefined,
      comissaoCorretor: data.comissao_corretor ? Number(data.comissao_corretor) : undefined,
    },
    custos: {
      iptuAnual: Number(data.iptu_anual ?? 0),
      condominioMensal: Number(data.condominio_mensal ?? 0),
      seguroAnual: Number(data.seguro_anual ?? 0),
      manutencaoMensal: Number(data.manutencao_mensal ?? 0),
    },
    renda: {
      tipo: (data.tipo_renda as Imovel['renda']['tipo']) ?? 'aluguel_longterm',
      aluguelMensal: data.aluguel_mensal ? Number(data.aluguel_mensal) : undefined,
      taxaVacanciaPct: Number(data.taxa_vacancia_pct ?? 0),
      diariaMedia: data.diaria_media ? Number(data.diaria_media) : undefined,
      taxaOcupacaoPct: data.taxa_ocupacao_pct ? Number(data.taxa_ocupacao_pct) : undefined,
      custosPlataformaPct: data.custos_plataforma_pct ? Number(data.custos_plataforma_pct) : undefined,
    },
    valorAtualEstimado: data.valor_atual_estimado ? Number(data.valor_atual_estimado) : undefined,
    fonteAvaliacao: data.fonte_avaliacao ? String(data.fonte_avaliacao) : undefined,
  };
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useStore = create<AppState>((set, get) => ({
  imoveis: [],
  selectedId: null,
  benchmarks: null,
  isLoading: false,
  error: null,
  isDemo: DEMO_MODE,
  theme: initialTheme,

  fetchImoveis: async () => {
    set({ isLoading: true, error: null });

    if (DEMO_MODE) {
      try {
        const imoveis = await loadPortfolio();
        set({
          imoveis,
          isLoading: false,
          isDemo: true,
          selectedId: imoveis[0]?.id ?? null,
        });
      } catch {
        set({ imoveis: [], isLoading: false, isDemo: true, error: 'Failed to load portfolio data' });
      }
      return;
    }

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
    } catch {
      // API unreachable — fall back to static data
      try {
        const imoveis = await loadPortfolio();
        set({
          imoveis,
          isLoading: false,
          isDemo: true,
          selectedId: imoveis[0]?.id ?? null,
        });
      } catch {
        set({ imoveis: [], isLoading: false, isDemo: true, error: 'Failed to load data' });
      }
    }
  },

  fetchBenchmarks: async () => {
    if (DEMO_MODE) {
      const benchmarks = await loadBenchmarks();
      set({ benchmarks });
      return;
    }

    try {
      const raw = await api.benchmark.atual();
      set({ benchmarks: benchmarkApiToLocal(raw) });
    } catch {
      const benchmarks = await loadBenchmarks();
      set({ benchmarks });
    }
  },

  selectImovel: (id) => set({ selectedId: id }),

  criarImovel: async (data) => {
    if (get().isDemo) {
      const novo = flatToImovel({ ...data, id: uniqueDemoId() });
      const imoveis = [...get().imoveis, novo];
      set({ imoveis, selectedId: novo.id });
      return;
    }
    await api.imoveis.criar(data);
    await get().fetchImoveis();
  },

  atualizarImovel: async (id, data) => {
    if (get().isDemo) {
      const updated = flatToImovel({ ...data, id });
      const imoveis = get().imoveis.map(i => i.id === id ? updated : i);
      set({ imoveis });
      return;
    }
    await api.imoveis.atualizar(id, data);
    await get().fetchImoveis();
  },

  deletarImovel: async (id) => {
    if (get().isDemo) {
      const imoveis = get().imoveis.filter(i => i.id !== id);
      const { selectedId } = get();
      set({
        imoveis,
        selectedId: selectedId === id ? (imoveis[0]?.id ?? null) : selectedId,
      });
      return;
    }
    await api.imoveis.deletar(id);
    const { selectedId } = get();
    if (selectedId === id) set({ selectedId: null });
    await get().fetchImoveis();
  },

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    set({ theme: next });
  },
}));
