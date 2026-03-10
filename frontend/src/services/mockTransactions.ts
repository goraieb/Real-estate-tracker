/**
 * Mock ITBI transaction data for São Paulo.
 * ~1,000,000 realistic transactions spread across 58 neighborhoods (2019-2025).
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

// 58 neighborhoods covering ALL geographic regions of São Paulo
const SP_BAIRROS: BairroConfig[] = [
  // === Premium west/southwest ===
  { name: 'Pinheiros', lat: -23.5613, lng: -46.6920, precoM2Base: 12800, spread: 3000, yieldAnual: 5.0, weight: 4 },
  { name: 'Itaim Bibi', lat: -23.5868, lng: -46.6803, precoM2Base: 16500, spread: 4000, yieldAnual: 4.2, weight: 4 },
  { name: 'Vila Madalena', lat: -23.5535, lng: -46.6910, precoM2Base: 11900, spread: 2800, yieldAnual: 5.2, weight: 3 },
  { name: 'Jardim Paulista', lat: -23.5700, lng: -46.6670, precoM2Base: 15200, spread: 3800, yieldAnual: 4.5, weight: 3 },
  { name: 'Vila Olímpia', lat: -23.5980, lng: -46.6860, precoM2Base: 14500, spread: 3500, yieldAnual: 4.6, weight: 3 },
  { name: 'Alto de Pinheiros', lat: -23.5450, lng: -46.7100, precoM2Base: 13000, spread: 3200, yieldAnual: 4.8, weight: 2 },

  // === South zone ===
  { name: 'Moema', lat: -23.6010, lng: -46.6700, precoM2Base: 13400, spread: 3200, yieldAnual: 4.8, weight: 4 },
  { name: 'Vila Mariana', lat: -23.5891, lng: -46.6388, precoM2Base: 10800, spread: 2600, yieldAnual: 5.4, weight: 4 },
  { name: 'Saúde', lat: -23.6200, lng: -46.6350, precoM2Base: 8800, spread: 2200, yieldAnual: 5.8, weight: 3 },
  { name: 'Ipiranga', lat: -23.5870, lng: -46.6100, precoM2Base: 7200, spread: 1800, yieldAnual: 6.5, weight: 3 },
  { name: 'Campo Belo', lat: -23.6200, lng: -46.6670, precoM2Base: 11500, spread: 2800, yieldAnual: 5.0, weight: 3 },
  { name: 'Santo Amaro', lat: -23.6500, lng: -46.7100, precoM2Base: 8500, spread: 2200, yieldAnual: 6.0, weight: 3 },
  { name: 'Cursino', lat: -23.6100, lng: -46.6250, precoM2Base: 7200, spread: 1800, yieldAnual: 6.5, weight: 2 },

  // === Far south ===
  { name: 'Jabaquara', lat: -23.6350, lng: -46.6450, precoM2Base: 7500, spread: 1900, yieldAnual: 6.3, weight: 2 },
  { name: 'Interlagos', lat: -23.6800, lng: -46.6750, precoM2Base: 5800, spread: 1500, yieldAnual: 7.0, weight: 2 },
  { name: 'Campo Limpo', lat: -23.6480, lng: -46.7680, precoM2Base: 4500, spread: 1200, yieldAnual: 7.5, weight: 2 },
  { name: 'Capão Redondo', lat: -23.6680, lng: -46.7810, precoM2Base: 3800, spread: 1000, yieldAnual: 8.0, weight: 2 },
  { name: 'Grajaú', lat: -23.7400, lng: -46.6950, precoM2Base: 3200, spread: 900, yieldAnual: 8.5, weight: 2 },
  { name: 'Cidade Dutra', lat: -23.7100, lng: -46.6700, precoM2Base: 4200, spread: 1100, yieldAnual: 7.8, weight: 2 },

  // === Center ===
  { name: 'Consolação', lat: -23.5510, lng: -46.6580, precoM2Base: 9800, spread: 2400, yieldAnual: 5.8, weight: 3 },
  { name: 'Bela Vista', lat: -23.5560, lng: -46.6430, precoM2Base: 8500, spread: 2200, yieldAnual: 6.2, weight: 4 },
  { name: 'República', lat: -23.5440, lng: -46.6430, precoM2Base: 6800, spread: 2000, yieldAnual: 7.0, weight: 3 },
  { name: 'Liberdade', lat: -23.5600, lng: -46.6330, precoM2Base: 8200, spread: 2000, yieldAnual: 6.0, weight: 3 },
  { name: 'Brás', lat: -23.5420, lng: -46.6180, precoM2Base: 5500, spread: 1400, yieldAnual: 7.5, weight: 2 },
  { name: 'Cambuci', lat: -23.5650, lng: -46.6200, precoM2Base: 6800, spread: 1700, yieldAnual: 6.8, weight: 2 },
  { name: 'Pari', lat: -23.5280, lng: -46.6150, precoM2Base: 5000, spread: 1300, yieldAnual: 7.8, weight: 1 },

  // === West ===
  { name: 'Perdizes', lat: -23.5290, lng: -46.6810, precoM2Base: 10200, spread: 2500, yieldAnual: 5.5, weight: 3 },
  { name: 'Lapa', lat: -23.5190, lng: -46.7010, precoM2Base: 8900, spread: 2200, yieldAnual: 6.0, weight: 3 },
  { name: 'Butantã', lat: -23.5720, lng: -46.7090, precoM2Base: 7800, spread: 2000, yieldAnual: 6.5, weight: 3 },
  { name: 'Rio Pequeno', lat: -23.5650, lng: -46.7450, precoM2Base: 6200, spread: 1600, yieldAnual: 7.0, weight: 2 },
  { name: 'Raposo Tavares', lat: -23.5900, lng: -46.7850, precoM2Base: 4800, spread: 1200, yieldAnual: 7.5, weight: 1 },
  { name: 'Jaguaré', lat: -23.5450, lng: -46.7450, precoM2Base: 6500, spread: 1600, yieldAnual: 6.8, weight: 2 },
  { name: 'Vila Sônia', lat: -23.6050, lng: -46.7350, precoM2Base: 7000, spread: 1800, yieldAnual: 6.5, weight: 2 },

  // === North ===
  { name: 'Santana', lat: -23.5050, lng: -46.6270, precoM2Base: 7500, spread: 1800, yieldAnual: 6.8, weight: 4 },
  { name: 'Tucuruvi', lat: -23.4810, lng: -46.6100, precoM2Base: 6200, spread: 1500, yieldAnual: 7.2, weight: 3 },
  { name: 'Casa Verde', lat: -23.5110, lng: -46.6530, precoM2Base: 6500, spread: 1600, yieldAnual: 7.0, weight: 3 },
  { name: 'Mandaqui', lat: -23.4900, lng: -46.6300, precoM2Base: 6000, spread: 1400, yieldAnual: 7.3, weight: 2 },
  { name: 'Vila Guilherme', lat: -23.5050, lng: -46.6050, precoM2Base: 5800, spread: 1400, yieldAnual: 7.2, weight: 2 },
  { name: 'Vila Maria', lat: -23.5150, lng: -46.5950, precoM2Base: 5500, spread: 1400, yieldAnual: 7.5, weight: 2 },

  // === Far north ===
  { name: 'Tremembé', lat: -23.4600, lng: -46.6280, precoM2Base: 5500, spread: 1400, yieldAnual: 7.5, weight: 2 },
  { name: 'Jaçanã', lat: -23.4700, lng: -46.6000, precoM2Base: 4800, spread: 1200, yieldAnual: 7.8, weight: 2 },
  { name: 'Pirituba', lat: -23.4850, lng: -46.7350, precoM2Base: 5000, spread: 1300, yieldAnual: 7.6, weight: 2 },
  { name: 'Freguesia do Ó', lat: -23.5050, lng: -46.6950, precoM2Base: 5800, spread: 1500, yieldAnual: 7.2, weight: 2 },

  // === East ===
  { name: 'Tatuapé', lat: -23.5380, lng: -46.5770, precoM2Base: 8200, spread: 2000, yieldAnual: 6.3, weight: 4 },
  { name: 'Mooca', lat: -23.5580, lng: -46.6000, precoM2Base: 7200, spread: 1800, yieldAnual: 6.7, weight: 4 },
  { name: 'Penha', lat: -23.5200, lng: -46.5400, precoM2Base: 5500, spread: 1400, yieldAnual: 7.5, weight: 3 },
  { name: 'Vila Prudente', lat: -23.5790, lng: -46.5800, precoM2Base: 6000, spread: 1500, yieldAnual: 7.2, weight: 3 },
  { name: 'Anália Franco', lat: -23.5540, lng: -46.5610, precoM2Base: 9500, spread: 2400, yieldAnual: 5.6, weight: 3 },
  { name: 'Belém', lat: -23.5400, lng: -46.6100, precoM2Base: 6300, spread: 1600, yieldAnual: 7.0, weight: 2 },
  { name: 'Carrão', lat: -23.5500, lng: -46.5500, precoM2Base: 6800, spread: 1700, yieldAnual: 6.8, weight: 2 },
  { name: 'Água Rasa', lat: -23.5600, lng: -46.5750, precoM2Base: 6500, spread: 1600, yieldAnual: 7.0, weight: 2 },
  { name: 'Aricanduva', lat: -23.5600, lng: -46.5100, precoM2Base: 5200, spread: 1300, yieldAnual: 7.5, weight: 2 },
  { name: 'Sapopemba', lat: -23.5950, lng: -46.5200, precoM2Base: 4500, spread: 1200, yieldAnual: 7.8, weight: 2 },

  // === Far east ===
  { name: 'Itaquera', lat: -23.5400, lng: -46.4550, precoM2Base: 4000, spread: 1000, yieldAnual: 8.0, weight: 2 },
  { name: 'São Mateus', lat: -23.6100, lng: -46.4750, precoM2Base: 3500, spread: 900, yieldAnual: 8.3, weight: 2 },
  { name: 'São Miguel Paulista', lat: -23.4950, lng: -46.4400, precoM2Base: 3300, spread: 900, yieldAnual: 8.5, weight: 2 },
  { name: 'Ermelino Matarazzo', lat: -23.5100, lng: -46.4800, precoM2Base: 3600, spread: 950, yieldAnual: 8.2, weight: 1 },
  { name: 'Guaianases', lat: -23.5400, lng: -46.4100, precoM2Base: 3000, spread: 800, yieldAnual: 8.8, weight: 1 },
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
  // New neighborhoods
  'Cursino': ['Rua Lino Coutinho', 'Rua Manifesto', 'Rua Coronel Lisboa'],
  'Jabaquara': ['Avenida Jabaquara', 'Rua das Rosas', 'Rua Alcindo Cardoso de Paiva'],
  'Interlagos': ['Avenida Interlagos', 'Rua Alcides Cintra Bueno', 'Rua Professor Abel Ferreira'],
  'Campo Limpo': ['Estrada do Campo Limpo', 'Rua Marcelina', 'Rua Ernesto Nazareth'],
  'Capão Redondo': ['Estrada do Capão Redondo', 'Rua Luíza Macuco', 'Rua Gervásio Leite Rebelo'],
  'Grajaú': ['Avenida Belmira Marin', 'Rua Paulo Setubal', 'Rua Engenheiro Maia Jiboia'],
  'Cidade Dutra': ['Avenida Senador Teotônio Vilela', 'Rua Amaro de Souza', 'Rua Maria Firmina dos Reis'],
  'Brás': ['Rua do Gasômetro', 'Rua Bresser', 'Rua Caetano Pinto'],
  'Cambuci': ['Rua da Independência', 'Rua Muniz de Souza', 'Rua Lins de Vasconcelos'],
  'Pari': ['Rua Silva Teles', 'Rua Canindé', 'Rua João Teodoro'],
  'Rio Pequeno': ['Rua André Cepellos', 'Rua Soares de Faria', 'Rua Moisés Kahan'],
  'Raposo Tavares': ['Rodovia Raposo Tavares', 'Rua Agostinho Gomes', 'Rua José Jannarelli'],
  'Jaguaré': ['Avenida Jaguaré', 'Rua Guaianazes', 'Rua Iguaçu'],
  'Vila Sônia': ['Rua Professor Francisco Morato', 'Rua Nazaré Paulista', 'Rua Otonis'],
  'Vila Guilherme': ['Rua Alfredo Pujol', 'Avenida Morvan Dias de Figueiredo', 'Rua Santa Virgínia'],
  'Vila Maria': ['Avenida Guilherme Cottching', 'Rua Guaporé', 'Rua Itapeti'],
  'Tremembé': ['Avenida Tremembé', 'Rua João Elias Saada', 'Rua Líbero David'],
  'Jaçanã': ['Rua André de Leão', 'Rua Miguel de Oliveira', 'Rua Filinto de Almeida'],
  'Pirituba': ['Avenida Mutinga', 'Rua Apotribu', 'Rua Dr. Felipe Pinel'],
  'Freguesia do Ó': ['Largo da Matriz', 'Rua João Kopke', 'Rua Ministro Heitor Bastos Tigre'],
  'Água Rasa': ['Rua Serra de Botucatu', 'Rua Itajaí', 'Rua Borges de Figueiredo'],
  'Aricanduva': ['Avenida Aricanduva', 'Rua Atucuri', 'Rua Ibiapinópolis'],
  'Sapopemba': ['Avenida Sapopemba', 'Rua Rincão', 'Rua Isidora Lopes'],
  'Itaquera': ['Avenida Itaquera', 'Rua Vilela de Andrade', 'Rua Dom Helder Câmara'],
  'São Mateus': ['Avenida Mateo Bei', 'Rua Sabaúna', 'Rua Francisco Inácio'],
  'São Miguel Paulista': ['Rua Dr. José Guilherme Eiras', 'Rua Salvador de Medeiros', 'Rua São Mateus'],
  'Ermelino Matarazzo': ['Avenida São Miguel', 'Rua Flor da Serra', 'Rua Anita Costa'],
  'Guaianases': ['Rua Salvador Gianetti', 'Rua Otelo Augusto Ribeiro', 'Rua Rosa Fortino'],
};

// Total target: ~1,000,000 transactions. Weight determines share per neighborhood.
const TOTAL_TARGET = 1_000_000;

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

      // Offset coordinates from bairro center (wider spread for complete coverage)
      const latOffset = (rand() - 0.5) * 0.025;
      const lngOffset = (rand() - 0.5) * 0.025;

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
    qtdTransacoes: Math.round(b.weight * 4000 + rand() * 2000),
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
    qtdTransacoes: Math.round(b.weight * 4000 + rand() * 2000),
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
        count: Math.round(80 + rand() * 300 * config.weight),
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
