/**
 * Mock ITBI transaction data for São Paulo.
 * ~200 realistic transactions spread across key neighborhoods.
 * Used in demo mode when the backend is not available.
 */

import type { TransacaoITBI, NeighborhoodStats, YieldBairro, PriceEvolutionPoint } from '../types';

// Deterministic pseudo-random from seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface BairroConfig {
  name: string;
  lat: number;
  lng: number;
  precoM2Base: number;
  spread: number; // price variance
  yieldAnual: number;
}

const SP_BAIRROS: BairroConfig[] = [
  { name: 'Pinheiros', lat: -23.5613, lng: -46.6920, precoM2Base: 12800, spread: 3000, yieldAnual: 5.0 },
  { name: 'Itaim Bibi', lat: -23.5868, lng: -46.6803, precoM2Base: 16500, spread: 4000, yieldAnual: 4.2 },
  { name: 'Vila Madalena', lat: -23.5535, lng: -46.6910, precoM2Base: 11900, spread: 2800, yieldAnual: 5.2 },
  { name: 'Moema', lat: -23.6010, lng: -46.6700, precoM2Base: 13400, spread: 3200, yieldAnual: 4.8 },
  { name: 'Perdizes', lat: -23.5290, lng: -46.6810, precoM2Base: 10200, spread: 2500, yieldAnual: 5.5 },
  { name: 'Consolação', lat: -23.5510, lng: -46.6580, precoM2Base: 9800, spread: 2400, yieldAnual: 5.8 },
  { name: 'Bela Vista', lat: -23.5560, lng: -46.6430, precoM2Base: 8500, spread: 2200, yieldAnual: 6.2 },
  { name: 'Jardim Paulista', lat: -23.5700, lng: -46.6670, precoM2Base: 15200, spread: 3800, yieldAnual: 4.5 },
  { name: 'Vila Mariana', lat: -23.5891, lng: -46.6388, precoM2Base: 10800, spread: 2600, yieldAnual: 5.4 },
  { name: 'Butantã', lat: -23.5720, lng: -46.7090, precoM2Base: 7800, spread: 2000, yieldAnual: 6.5 },
  { name: 'Lapa', lat: -23.5190, lng: -46.7010, precoM2Base: 8900, spread: 2200, yieldAnual: 6.0 },
  { name: 'Santana', lat: -23.5050, lng: -46.6270, precoM2Base: 7500, spread: 1800, yieldAnual: 6.8 },
  { name: 'Tatuapé', lat: -23.5380, lng: -46.5770, precoM2Base: 8200, spread: 2000, yieldAnual: 6.3 },
  { name: 'Mooca', lat: -23.5580, lng: -46.6000, precoM2Base: 7200, spread: 1800, yieldAnual: 6.7 },
];

const TIPOS_IMOVEL = ['apartamento', 'apartamento', 'apartamento', 'casa', 'comercial'];
const LOGRADOUROS: Record<string, string[]> = {
  'Pinheiros': ['Rua dos Pinheiros', 'Rua Teodoro Sampaio', 'Rua Fradique Coutinho', 'Rua Mateus Grou'],
  'Itaim Bibi': ['Rua Joaquim Floriano', 'Rua Bandeira Paulista', 'Rua Leopoldo Couto de Magalhães Jr'],
  'Vila Madalena': ['Rua Aspicuelta', 'Rua Wisard', 'Rua Harmonia', 'Rua Girassol'],
  'Moema': ['Avenida Ibirapuera', 'Rua Canário', 'Alameda dos Maracatins', 'Rua Gaivota'],
  'Perdizes': ['Rua Monte Alegre', 'Rua Turiassú', 'Rua Cardoso de Almeida'],
  'Consolação': ['Rua da Consolação', 'Rua Augusta', 'Rua Frei Caneca'],
  'Bela Vista': ['Rua Treze de Maio', 'Rua Santo Antônio', 'Rua Major Diogo'],
  'Jardim Paulista': ['Alameda Santos', 'Rua Haddock Lobo', 'Alameda Jaú'],
  'Vila Mariana': ['Rua Domingos de Morais', 'Rua Vergueiro', 'Rua França Pinto'],
  'Butantã': ['Rua Alvarenga', 'Avenida Prof. Lineu Prestes', 'Rua Pirajussara'],
  'Lapa': ['Rua Guaicurus', 'Rua Clélia', 'Rua Catão'],
  'Santana': ['Rua Voluntários da Pátria', 'Rua Alfredo Pujol', 'Avenida Cruzeiro do Sul'],
  'Tatuapé': ['Rua Tuiuti', 'Rua Serra de Bragança', 'Rua Coelho Lisboa'],
  'Mooca': ['Rua da Mooca', 'Rua Taquari', 'Avenida Paes de Barros'],
};

function generateTransactions(): TransacaoITBI[] {
  const rand = seededRandom(42);
  const transactions: TransacaoITBI[] = [];
  let id = 1;

  // Generate ~14-15 transactions per bairro = ~200 total
  for (const bairro of SP_BAIRROS) {
    const count = 13 + Math.floor(rand() * 4); // 13-16 per bairro
    const streets = LOGRADOUROS[bairro.name] || ['Rua Principal'];

    for (let i = 0; i < count; i++) {
      const precoM2 = bairro.precoM2Base + (rand() - 0.5) * bairro.spread;
      const area = 40 + rand() * 160; // 40-200 m²
      const valorTransacao = precoM2 * area;

      // Random date in 2023-2025
      const year = 2023 + Math.floor(rand() * 3);
      const month = 1 + Math.floor(rand() * 12);
      const day = 1 + Math.floor(rand() * 28);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Offset coordinates slightly from bairro center
      const latOffset = (rand() - 0.5) * 0.012;
      const lngOffset = (rand() - 0.5) * 0.012;

      transactions.push({
        id: id++,
        latitude: bairro.lat + latOffset,
        longitude: bairro.lng + lngOffset,
        valorTransacao: Math.round(valorTransacao),
        precoM2: Math.round(precoM2),
        areaM2: Math.round(area),
        tipoImovel: TIPOS_IMOVEL[Math.floor(rand() * TIPOS_IMOVEL.length)],
        bairro: bairro.name,
        logradouro: streets[Math.floor(rand() * streets.length)],
        dataTransacao: dateStr,
      });
    }
  }

  return transactions;
}

function generateNeighborhoodStats(): NeighborhoodStats[] {
  return SP_BAIRROS.map(b => ({
    bairro: b.name,
    qtdTransacoes: 80 + Math.floor(Math.random() * 120),
    precoM2Medio: b.precoM2Base,
    precoM2Mediano: Math.round(b.precoM2Base * 0.97),
    centroLat: b.lat,
    centroLng: b.lng,
  }));
}

function generateYieldData(): YieldBairro[] {
  return SP_BAIRROS.map(b => ({
    bairro: b.name,
    precoM2Compra: b.precoM2Base,
    aluguelM2Estimado: Math.round(b.precoM2Base * b.yieldAnual / 100 / 12 * 100) / 100,
    yieldAnualPct: b.yieldAnual,
    yieldMensalPct: Math.round(b.yieldAnual / 12 * 1000) / 1000,
    qtdTransacoes: 80 + Math.floor(Math.random() * 120),
    centroLat: b.lat,
    centroLng: b.lng,
  }));
}

function generatePriceEvolution(bairro: string): PriceEvolutionPoint[] {
  const config = SP_BAIRROS.find(b => b.name === bairro);
  if (!config) return [];

  const points: PriceEvolutionPoint[] = [];
  let price = config.precoM2Base * 0.88; // start lower, appreciate over time

  for (let year = 2023; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2025 && month > 6) break;
      // Gradual appreciation with some noise
      const noise = (Math.random() - 0.5) * 400;
      price = price * (1 + 0.004) + noise; // ~0.4% monthly appreciation
      points.push({
        date: `${year}-${String(month).padStart(2, '0')}`,
        medianPrecoM2: Math.round(price),
        count: 8 + Math.floor(Math.random() * 15),
      });
    }
  }
  return points;
}

// Pre-generate mock data
export const MOCK_TRANSACTIONS = generateTransactions();
export const MOCK_NEIGHBORHOOD_STATS = generateNeighborhoodStats();
export const MOCK_YIELD_DATA = generateYieldData();
export const getMockPriceEvolution = generatePriceEvolution;
export const MOCK_BAIRRO_NAMES = SP_BAIRROS.map(b => b.name);
