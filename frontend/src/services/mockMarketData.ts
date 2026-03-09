import type { DadosMercadoBairro } from '../types';

// Realistic market data for neighborhoods in SP, RJ, BH, and Florianópolis
// Based on approximate FipeZAP values for 2025
export const MOCK_MARKET_DATA: DadosMercadoBairro[] = [
  // São Paulo
  {
    bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5613, centroLng: -46.6920,
    precoM2Atual: 12800, precoM2_12mAtras: 12100, variacaoPct12m: 5.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 13200, variacaoPct12m: 6.1, amostra: 85 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 12500, variacaoPct12m: 5.5, amostra: 120 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 12000, variacaoPct12m: 4.8, amostra: 60 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 15800, variacaoPct12m: 7.2, amostra: 30 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 14500, variacaoPct12m: 6.8, amostra: 15 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 10200, variacaoPct12m: 3.2, amostra: 12 },
    ],
  },
  {
    bairro: 'Vila Madalena', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5535, centroLng: -46.6910,
    precoM2Atual: 11900, precoM2_12mAtras: 11300, variacaoPct12m: 5.3,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 12800, variacaoPct12m: 5.8, amostra: 70 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 11500, variacaoPct12m: 5.0, amostra: 90 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 1, precoM2: 15200, variacaoPct12m: 7.0, amostra: 20 },
      { tipo: 'casa', condicao: 'usado', quartos: 2, precoM2: 9800, variacaoPct12m: 3.5, amostra: 8 },
    ],
  },
  {
    bairro: 'Itaim Bibi', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5868, centroLng: -46.6803,
    precoM2Atual: 16500, precoM2_12mAtras: 15600, variacaoPct12m: 5.8,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 15800, variacaoPct12m: 5.2, amostra: 95 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 15200, variacaoPct12m: 4.9, amostra: 70 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 19500, variacaoPct12m: 7.5, amostra: 25 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 18200, variacaoPct12m: 6.8, amostra: 18 },
    ],
  },
  {
    bairro: 'Moema', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.6010, centroLng: -46.6700,
    precoM2Atual: 13400, precoM2_12mAtras: 12900, variacaoPct12m: 3.9,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 13000, variacaoPct12m: 3.5, amostra: 110 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 12800, variacaoPct12m: 3.2, amostra: 80 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 16500, variacaoPct12m: 5.5, amostra: 12 },
    ],
  },
  {
    bairro: 'Vila Mariana', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5891, centroLng: -46.6388,
    precoM2Atual: 10800, precoM2_12mAtras: 10300, variacaoPct12m: 4.9,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 11200, variacaoPct12m: 5.2, amostra: 65 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 10500, variacaoPct12m: 4.5, amostra: 100 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 10200, variacaoPct12m: 4.0, amostra: 55 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 8900, variacaoPct12m: 2.8, amostra: 15 },
    ],
  },
  {
    bairro: 'Perdizes', cidade: 'São Paulo', uf: 'SP',
    centroLat: -23.5290, centroLng: -46.6810,
    precoM2Atual: 10200, precoM2_12mAtras: 9800, variacaoPct12m: 4.1,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 10000, variacaoPct12m: 3.8, amostra: 85 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 9800, variacaoPct12m: 3.5, amostra: 70 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 8500, variacaoPct12m: 2.5, amostra: 10 },
    ],
  },
  // Rio de Janeiro
  {
    bairro: 'Copacabana', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9711, centroLng: -43.1863,
    precoM2Atual: 11200, precoM2_12mAtras: 10800, variacaoPct12m: 3.7,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 11800, variacaoPct12m: 4.0, amostra: 90 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 10800, variacaoPct12m: 3.5, amostra: 120 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 10500, variacaoPct12m: 3.0, amostra: 60 },
    ],
  },
  {
    bairro: 'Ipanema', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9838, centroLng: -43.2096,
    precoM2Atual: 18500, precoM2_12mAtras: 17800, variacaoPct12m: 3.9,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 18000, variacaoPct12m: 3.8, amostra: 65 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 17500, variacaoPct12m: 3.5, amostra: 40 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 22000, variacaoPct12m: 5.2, amostra: 8 },
    ],
  },
  {
    bairro: 'Leblon', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9859, centroLng: -43.2230,
    precoM2Atual: 21000, precoM2_12mAtras: 20200, variacaoPct12m: 4.0,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 20500, variacaoPct12m: 3.8, amostra: 45 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 20000, variacaoPct12m: 3.5, amostra: 30 },
    ],
  },
  {
    bairro: 'Botafogo', cidade: 'Rio de Janeiro', uf: 'RJ',
    centroLat: -22.9519, centroLng: -43.1823,
    precoM2Atual: 10500, precoM2_12mAtras: 10000, variacaoPct12m: 5.0,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 11000, variacaoPct12m: 5.5, amostra: 75 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 10200, variacaoPct12m: 4.8, amostra: 85 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 13500, variacaoPct12m: 6.5, amostra: 15 },
    ],
  },
  // Belo Horizonte
  {
    bairro: 'Centro', cidade: 'Belo Horizonte', uf: 'MG',
    centroLat: -19.9191, centroLng: -43.9387,
    precoM2Atual: 5800, precoM2_12mAtras: 5600, variacaoPct12m: 3.6,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 6200, variacaoPct12m: 4.0, amostra: 50 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 5500, variacaoPct12m: 3.2, amostra: 70 },
    ],
  },
  {
    bairro: 'Savassi', cidade: 'Belo Horizonte', uf: 'MG',
    centroLat: -19.9340, centroLng: -43.9370,
    precoM2Atual: 9500, precoM2_12mAtras: 9100, variacaoPct12m: 4.4,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 9200, variacaoPct12m: 4.0, amostra: 55 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 8800, variacaoPct12m: 3.5, amostra: 35 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 2, precoM2: 12000, variacaoPct12m: 6.2, amostra: 10 },
    ],
  },
  {
    bairro: 'Lourdes', cidade: 'Belo Horizonte', uf: 'MG',
    centroLat: -19.9310, centroLng: -43.9430,
    precoM2Atual: 11200, precoM2_12mAtras: 10700, variacaoPct12m: 4.7,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 3, precoM2: 10800, variacaoPct12m: 4.2, amostra: 40 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 13500, variacaoPct12m: 6.0, amostra: 8 },
    ],
  },
  // Florianópolis
  {
    bairro: 'Lagoa da Conceição', cidade: 'Florianópolis', uf: 'SC',
    centroLat: -27.6046, centroLng: -48.4760,
    precoM2Atual: 10800, precoM2_12mAtras: 10000, variacaoPct12m: 8.0,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 10200, variacaoPct12m: 7.5, amostra: 30 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 9500, variacaoPct12m: 7.0, amostra: 18 },
      { tipo: 'casa', condicao: 'novo', quartos: 3, precoM2: 13500, variacaoPct12m: 10.0, amostra: 6 },
    ],
  },
  {
    bairro: 'Jurerê', cidade: 'Florianópolis', uf: 'SC',
    centroLat: -27.4400, centroLng: -48.4980,
    precoM2Atual: 14500, precoM2_12mAtras: 13200, variacaoPct12m: 9.8,
    porTipo: [
      { tipo: 'casa', condicao: 'novo', quartos: 4, precoM2: 16000, variacaoPct12m: 11.0, amostra: 10 },
      { tipo: 'casa', condicao: 'usado', quartos: 3, precoM2: 13000, variacaoPct12m: 8.5, amostra: 15 },
      { tipo: 'apartamento', condicao: 'novo', quartos: 3, precoM2: 14200, variacaoPct12m: 9.0, amostra: 12 },
    ],
  },
  {
    bairro: 'Centro', cidade: 'Florianópolis', uf: 'SC',
    centroLat: -27.5954, centroLng: -48.5480,
    precoM2Atual: 8200, precoM2_12mAtras: 7800, variacaoPct12m: 5.1,
    porTipo: [
      { tipo: 'apartamento', condicao: 'usado', quartos: 1, precoM2: 8800, variacaoPct12m: 5.5, amostra: 40 },
      { tipo: 'apartamento', condicao: 'usado', quartos: 2, precoM2: 7900, variacaoPct12m: 4.8, amostra: 55 },
    ],
  },
];
