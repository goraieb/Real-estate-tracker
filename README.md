# Real Estate Tracker Brasil

Plataforma de análise imobiliária para São Paulo com dados reais de transações ITBI, mapa interativo, simulador de financiamento e benchmarks financeiros.

## Funcionalidades

### Explorador de Mercado (ITBI)
- Mapa interativo com **~1M+ transações reais** da Prefeitura de SP (2019-2025)
- Clusters por bairro com gradiente de cor por R$/m²
- Choropleth de preço mediano por bairro
- Heatmap de yield estimado (aluguel ÷ compra)
- Time-lapse: animação mensal da evolução de preços
- Filtros: período, tipo de imóvel, faixa de preço/m², área
- Indicador "Dados Reais" vs "Demo" com contagem total

### Portfólio de Imóveis
- Cards com valor de compra, valor atualizado, yield, tendência e ganhos líquidos
- Evolução patrimonial com gráficos
- Overlay do portfólio no mapa de mercado (comparação vs mercado)
- CRUD completo com formulário detalhado

### Análise Financeira
- Simulador de financiamento (SAC/Price, taxas, FGTS)
- Yield bruto/líquido (long-term + Airbnb + IR)
- Benchmark vs Selic/CDI/poupança/Tesouro IPCA+
- Gráfico equity vs dívida

### UX
- Dark mode (tema Dracula)
- Mobile-first responsive
- Demo mode com ~5K transações mock quando backend indisponível

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estado | Zustand |
| Mapas | Leaflet + react-leaflet |
| Gráficos | Recharts |
| Backend | Python + FastAPI |
| Banco | SQLite (aiosqlite) |
| Geo | GeoPandas + Geobr + Geopy (Nominatim) |
| Dados | Pandas + NumPy |

## Estrutura

```
Real-estate-tracker/
├── frontend/
│   └── src/
│       ├── components/         # 17 componentes React
│       │   ├── MarketExplorer  # Mapa ITBI com layers, filtros, time-lapse
│       │   ├── PropertyMap     # Mapa do portfólio
│       │   ├── PropertyCard    # Card de imóvel com métricas
│       │   ├── PropertyForm    # Formulário CRUD
│       │   ├── FinancingSimulator  # Simulador SAC/Price
│       │   ├── BenchmarkChart  # Gráfico comparativo
│       │   └── ...
│       ├── services/           # API clients + mock data
│       ├── hooks/              # usePropertyMetrics, useThemeColors, useTimeLapse
│       ├── store/              # Zustand store
│       └── types/              # TypeScript interfaces
├── backend/
│   └── src/
│       ├── api/
│       │   ├── routes.py           # CRUD imóveis, financiamento, benchmark
│       │   └── market_routes.py    # Transações ITBI, stats, yield, time-series
│       ├── data_sources/
│       │   ├── itbi.py             # Parser ITBI SP/RJ
│       │   ├── itbi_downloader.py  # Download XLSX Prefeitura SP (2019-2025)
│       │   ├── bcb.py              # Selic, IPCA, IGP-M (BCB SGS API)
│       │   ├── fipezap.py          # Preço/m² FipeZAP
│       │   ├── ibge.py             # Dados demográficos + malhas GeoJSON
│       │   ├── insideairbnb.py     # Inside Airbnb (SP/RJ)
│       │   └── ipeadata.py         # INCC, séries históricas
│       └── services/
│           ├── valuation.py        # Avaliação de imóvel
│           ├── yield_calc.py       # Yield bruto/líquido
│           ├── benchmark.py        # Benchmark vs renda fixa
│           ├── financing.py        # Simulação de financiamento
│           └── geocoding.py        # Geocodificação com cache
└── docs/
    └── data-sources.md         # Levantamento de 30+ fontes de dados
```

## Setup

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cd backend
pip install -r requirements.txt
uvicorn src.api.routes:app --reload   # http://localhost:8000

# Testes
pytest backend/tests/
```

## Carregar Dados Reais ITBI

O app funciona em modo demo sem backend. Para dados reais (~1M+ transações):

```bash
cd backend

# 1. Baixar XLSX da Prefeitura de SP (2019-2025)
python -m src.data_sources.itbi_downloader --download-all

# 2. Parsear e inserir no banco
python -m src.data_sources.itbi_downloader --parse --insert

# 3. Ver estatísticas
python -m src.data_sources.itbi_downloader --stats

# Anos específicos:
python -m src.data_sources.itbi_downloader --download-all --years 2023 2024 2025

# Download manual (se URLs mudaram):
# Baixe de: https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501
# Salve em: backend/data/itbi/raw/itbi_YYYY.xlsx
```

## Fontes de Dados

| Fonte | Dados | Acesso |
|-------|-------|--------|
| Prefeitura SP (ITBI) | Transações imobiliárias reais | XLSX público |
| FipeZAP | Índice de preços venda/locação | Excel público |
| BCB SGS API | Selic, IPCA, IGP-M, taxas | API REST |
| IBGE API | Demografia, municípios, malhas | API REST |
| Inside Airbnb | Dados short-term rental SP/RJ | CSV público |
| Ipeadata | INCC, séries históricas | API REST |

Detalhes completos em [`docs/data-sources.md`](docs/data-sources.md).
