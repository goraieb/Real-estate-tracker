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

## Status

🔬 **Fase atual**: Pesquisa de fontes de dados - levantamento completo das bases disponíveis.

## Setup

```bash
# Em breve
```
