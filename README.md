# Real Estate Tracker Brasil

App para acompanhar rentabilidade de imóveis no Brasil.

## Visão

Ferramenta para investidores imobiliários que permite:

- **Acompanhar investimentos**: Cards com valor de compra, valor atualizado, yield, tendência da região, % vacância e ganhos líquidos
- **Avaliar potenciais investimentos**: Calcular valor de semelhantes na área, valorização ao longo do tempo e rentabilidade projetada
- **Comparar estratégias**: Aluguel long-term vs. short-term (Airbnb) vs. renda fixa

## Funcionalidades Planejadas

- Dashboard com cards por imóvel (valor de compra, valor atualizado, yield, ganho líquido)
- Cálculo de valorização baseado em índices FipeZAP
- Estimativa de yield de aluguel (long-term e short-term)
- Tendência da região (dados demográficos IBGE + evolução de preços)
- Taxa de vacância por região
- Benchmark vs. Selic/CDI e FIIs
- Simulador de financiamento

## Stack Tecnológica

- **Backend**: Python + FastAPI
- **Frontend**: React
- **Dados**: PostgreSQL + Redis (cache)
- **Deploy**: Docker

## Fontes de Dados

O app alavanca bases de dados públicas do mercado imobiliário brasileiro. Veja o levantamento completo em [`docs/data-sources.md`](docs/data-sources.md).

Principais fontes:
- **FipeZAP** - Índice de preços de imóveis (venda e locação)
- **Banco Central (SGS API)** - Selic, IPCA, IGP-M, taxas de financiamento
- **IBGE API** - Dados demográficos por município
- **Ipeadata API** - INCC, IGP-M, séries históricas
- **Inside Airbnb** - Dados de short-term rental
- **SECOVI-SP** - Taxa de vacância, pesquisa de locação

## Estrutura do Projeto

```
Real-estate-tracker/
├── docs/
│   └── data-sources.md              # Levantamento completo de fontes de dados (837 linhas)
├── backend/
│   ├── requirements.txt
│   ├── src/
│   │   ├── data_sources/            # Clientes de dados
│   │   │   ├── bcb.py               # API BCB SGS (Selic, IPCA, IGP-M, financiamento)
│   │   │   ├── ibge.py              # API IBGE (municípios, população, malhas GeoJSON)
│   │   │   ├── ipeadata.py          # API Ipeadata (INCC, IGP-M, séries)
│   │   │   ├── fipezap.py           # Parser Excel FipeZAP (preço/m² venda e locação)
│   │   │   ├── insideairbnb.py      # Download/parse Inside Airbnb (SP/RJ)
│   │   │   └── itbi.py              # Parser ITBI SP (transações reais) + Data.Rio
│   │   ├── models/
│   │   │   └── property.py          # Modelo de dados (imóvel, custos, renda, métricas)
│   │   ├── services/
│   │   │   ├── valuation.py         # Avaliação de imóvel (valor atualizado, ganho real)
│   │   │   ├── yield_calc.py        # Yield bruto/líquido (long-term + Airbnb + IR)
│   │   │   └── benchmark.py         # Benchmark vs Selic/CDI/poupança/Tesouro
│   │   └── api/
│   │       └── routes.py            # Endpoints FastAPI
│   └── tests/
│       └── test_data_sources.py
├── notebooks/
│   └── 01_explore_data.ipynb         # Notebook exploratório
└── .gitignore
```

## Status

- [x] Fase 1: Pesquisa de fontes de dados (13 categorias, 30+ fontes)
- [x] Fase 2: Estrutura do projeto + clientes de dados + serviços de cálculo
- [ ] Fase 3: API FastAPI completa + frontend React

## Setup

```bash
# Clonar o repositório
git clone <repo-url>
cd Real-estate-tracker

# Instalar dependências
pip install -r backend/requirements.txt

# Rodar API
cd backend
uvicorn src.api.routes:app --reload

# Rodar testes
pytest backend/tests/

# Rodar notebook exploratório
jupyter notebook notebooks/01_explore_data.ipynb
```
