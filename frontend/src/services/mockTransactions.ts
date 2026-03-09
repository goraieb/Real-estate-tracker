/**
 * Mock ITBI transaction data for São Paulo.
 * ~5,000 realistic transactions spread across 30+ neighborhoods (2019-2025).
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
  weight: number; // relative transaction volume (higher = more transactions)
}

// 30 neighborhoods covering central, west, south, east, and north SP
const SP_BAIRROS: BairroConfig[] = [
  // Premium west/southwest
  { name: 'Pinheiros', lat: -23.5613, lng: -46.6920, precoM2Base: 12800, spread: 3000, yieldAnual: 5.0, weight: 3 },
  { name: 'Itaim Bibi', lat: -23.5868, lng: -46.6803, precoM2Base: 16500, spread: 4000, yieldAnual: 4.2, weight: 3 },
  { name: 'Vila Madalena', lat: -23.5535, lng: -46.6910, precoM2Base: 11900, spread: 2800, yieldAnual: 5.2, weight: 2 },
  { name: 'Jardim Paulista', lat: -23.5700, lng: -46.6670, precoM2Base: 15200, spread: 3800, yieldAnual: 4.5, weight: 2 },
  { name: 'Vila Olímpia', lat: -23.5980, lng: -46.6860, precoM2Base: 14500, spread: 3500, yieldAnual: 4.6, weight: 2 },
  // South zone
  { name: 'Moema', lat: -23.6010, lng: -46.6700, precoM2Base: 13400, spread: 3200, yieldAnual: 4.8, weight: 3 },
  { name: 'Vila Mariana', lat: -23.5891, lng: -46.6388, precoM2Base: 10800, spread: 2600, yieldAnual: 5.4, weight: 3 },
  { name: 'Saúde', lat: -23.6200, lng: -46.6350, precoM2Base: 8800, spread: 2200, yieldAnual: 5.8, weight: 2 },
  { name: 'Ipiranga', lat: -23.5870, lng: -46.6100, precoM2Base: 7200, spread: 1800, yieldAnual: 6.5, weight: 2 },
  { name: 'Campo Belo', lat: -23.6200, lng: -46.6670, precoM2Base: 11500, spread: 2800, yieldAnual: 5.0, weight: 2 },
  { name: 'Santo Amaro', lat: -23.6500, lng: -46.7100, precoM2Base: 8500, spread: 2200, yieldAnual: 6.0, weight: 2 },
  // Center
  { name: 'Consolação', lat: -23.5510, lng: -46.6580, precoM2Base: 9800, spread: 2400, yieldAnual: 5.8, weight: 2 },
  { name: 'Bela Vista', lat: -23.5560, lng: -46.6430, precoM2Base: 8500, spread: 2200, yieldAnual: 6.2, weight: 3 },
  { name: 'República', lat: -23.5440, lng: -46.6430, precoM2Base: 6800, spread: 2000, yieldAnual: 7.0, weight: 2 },
  { name: 'Liberdade', lat: -23.5600, lng: -46.6330, precoM2Base: 8200, spread: 2000, yieldAnual: 6.0, weight: 2 },
  // West
  { name: 'Perdizes', lat: -23.5290, lng: -46.6810, precoM2Base: 10200, spread: 2500, yieldAnual: 5.5, weight: 2 },
  { name: 'Lapa', lat: -23.5190, lng: -46.7010, precoM2Base: 8900, spread: 2200, yieldAnual: 6.0, weight: 2 },
  { name: 'Butantã', lat: -23.5720, lng: -46.7090, precoM2Base: 7800, spread: 2000, yieldAnual: 6.5, weight: 2 },
  { name: 'Alto de Pinheiros', lat: -23.5450, lng: -46.7100, precoM2Base: 13000, spread: 3200, yieldAnual: 4.8, weight: 1 },
  // North
  { name: 'Santana', lat: -23.5050, lng: -46.6270, precoM2Base: 7500, spread: 1800, yieldAnual: 6.8, weight: 3 },
  { name: 'Tucuruvi', lat: -23.4810, lng: -46.6100, precoM2Base: 6200, spread: 1500, yieldAnual: 7.2, weight: 2 },
  { name: 'Casa Verde', lat: -23.5110, lng: -46.6530, precoM2Base: 6500, spread: 1600, yieldAnual: 7.0, weight: 2 },
  { name: 'Mandaqui', lat: -23.4900, lng: -46.6300, precoM2Base: 6000, spread: 1400, yieldAnual: 7.3, weight: 1 },
  // East
  { name: 'Tatuapé', lat: -23.5380, lng: -46.5770, precoM2Base: 8200, spread: 2000, yieldAnual: 6.3, weight: 3 },
  { name: 'Mooca', lat: -23.5580, lng: -46.6000, precoM2Base: 7200, spread: 1800, yieldAnual: 6.7, weight: 3 },
  { name: 'Penha', lat: -23.5200, lng: -46.5400, precoM2Base: 5500, spread: 1400, yieldAnual: 7.5, weight: 2 },
  { name: 'Vila Prudente', lat: -23.5790, lng: -46.5800, precoM2Base: 6000, spread: 1500, yieldAnual: 7.2, weight: 2 },
  { name: 'Anália Franco', lat: -23.5540, lng: -46.5610, precoM2Base: 9500, spread: 2400, yieldAnual: 5.6, weight: 2 },
  { name: 'Belém', lat: -23.5400, lng: -46.6100, precoM2Base: 6300, spread: 1600, yieldAnual: 7.0, weight: 1 },
  { name: 'Carrão', lat: -23.5500, lng: -46.5500, precoM2Base: 6800, spread: 1700, yieldAnual: 6.8, weight: 1 },
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
  'Vila Olímpia': ['Rua Funchal', 'Rua Gomes de Carvalho', 'Rua Olimpíadas'],
  'Campo Belo': ['Rua Vieira de Morais', 'Rua Demóstenes', 'Rua Campo Belo'],
  'Santo Amaro': ['Rua Amador Bueno', 'Avenida Santo Amaro', 'Rua Isabel Schmidt'],
  'Saúde': ['Rua Loefgreen', 'Rua Guaranésia', 'Rua Luís Góis'],
  'Ipiranga': ['Rua Bom Pastor', 'Avenida Nazaré', 'Rua Silva Bueno'],
  'República': ['Avenida São Luís', 'Rua Barão de Itapetininga', 'Rua Sete de Abril'],
  'Liberdade': ['Rua da Glória', 'Rua Galvão Bueno', 'Rua São Joaquim'],
  'Alto de Pinheiros': ['Rua Iquiririm', 'Rua Desembargador do Vale', 'Rua Professor Manoelito de Ornellas'],
  'Tucuruvi': ['Avenida Tucuruvi', 'Rua Guapira', 'Rua Alfredo Pujol'],
  'Casa Verde': ['Avenida Casa Verde', 'Rua Tanque Velho', 'Rua Jaguari'],
  'Mandaqui': ['Rua Voluntários da Pátria', 'Rua Coronel Moreira César', 'Rua Joana D\'Arc'],
  'Penha': ['Rua Dr. João Ribeiro', 'Avenida Penha de França', 'Rua Padre Adelino'],
  'Vila Prudente': ['Rua do Orfanato', 'Avenida do Oratório', 'Rua Ibitirama'],
  'Anália Franco': ['Rua Eleonora Cintra', 'Rua Cantagalo', 'Rua Emília Marengo'],
  'Belém': ['Rua Visconde de Parnaíba', 'Avenida Celso Garcia', 'Rua Conselheiro Cotegipe'],
  'Carrão': ['Avenida Conselheiro Carrão', 'Rua Taquari', 'Rua Belo Horizonte'],
};

// Total target: ~5,000 transactions. Weight determines share per neighborhood.
const TOTAL_TARGET = 5000;

// Annual appreciation rate by year (simulates real market trends)
const ANNUAL_APPRECIATION: Record<number, number> = {
  2019: 1.00,
  2020: 0.97,  // pandemic dip
  2021: 1.05,  // recovery boom
  2022: 1.10,
  2023: 1.14,
  2024: 1.19,
  2025: 1.22,
};

function generateTransactions(): TransacaoITBI[] {
  const rand = seededRandom(42);
  const transactions: TransacaoITBI[] = [];
  let id = 1;

  const totalWeight = SP_BAIRROS.reduce((s, b) => s + b.weight, 0);

  for (const bairro of SP_BAIRROS) {
    const count = Math.round((bairro.weight / totalWeight) * TOTAL_TARGET);
    const streets = LOGRADOUROS[bairro.name] || ['Rua Principal'];

    for (let i = 0; i < count; i++) {
      // Random date in 2019-2025
      const year = 2019 + Math.floor(rand() * 7);
      const month = 1 + Math.floor(rand() * 12);
      const day = 1 + Math.floor(rand() * 28);
      // Skip future months in 2025
      if (year === 2025 && month > 3) continue;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // Apply year-based appreciation to base price
      const appreciation = ANNUAL_APPRECIATION[year] || 1.0;
      const precoM2 = (bairro.precoM2Base * appreciation) + (rand() - 0.5) * bairro.spread;
      const area = 30 + rand() * 200; // 30-230 m²
      const valorTransacao = precoM2 * area;

      // Offset coordinates from bairro center (wider spread for more realistic distribution)
      const latOffset = (rand() - 0.5) * 0.015;
      const lngOffset = (rand() - 0.5) * 0.015;

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
  const rand = seededRandom(123);
  return SP_BAIRROS.map(b => ({
    bairro: b.name,
    qtdTransacoes: Math.round(b.weight * 400 + rand() * 200),
    precoM2Medio: b.precoM2Base,
    precoM2Mediano: Math.round(b.precoM2Base * 0.97),
    centroLat: b.lat,
    centroLng: b.lng,
  }));
}

function generateYieldData(): YieldBairro[] {
  const rand = seededRandom(456);
  return SP_BAIRROS.map(b => ({
    bairro: b.name,
    precoM2Compra: b.precoM2Base,
    aluguelM2Estimado: Math.round(b.precoM2Base * b.yieldAnual / 100 / 12 * 100) / 100,
    yieldAnualPct: b.yieldAnual,
    yieldMensalPct: Math.round(b.yieldAnual / 12 * 1000) / 1000,
    qtdTransacoes: Math.round(b.weight * 400 + rand() * 200),
    centroLat: b.lat,
    centroLng: b.lng,
  }));
}

function generatePriceEvolution(bairro: string): PriceEvolutionPoint[] {
  const config = SP_BAIRROS.find(b => b.name === bairro);
  if (!config) return [];

  const rand = seededRandom(bairro.length * 17 + 7);
  const points: PriceEvolutionPoint[] = [];
  let price = config.precoM2Base * 0.82; // start from 2019 base

  for (let year = 2019; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2025 && month > 3) break;
      // Pandemic dip in 2020, recovery in 2021+
      let monthlyGrowth = 0.003; // ~0.3% monthly baseline
      if (year === 2020 && month >= 3 && month <= 8) monthlyGrowth = -0.002;
      if (year === 2021) monthlyGrowth = 0.006;

      const noise = (rand() - 0.5) * 400;
      price = price * (1 + monthlyGrowth) + noise;
      points.push({
        date: `${year}-${String(month).padStart(2, '0')}`,
        medianPrecoM2: Math.round(price),
        count: Math.round(8 + rand() * 30 * config.weight),
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
