# Fontes de Dados - Real Estate Tracker Brasil

Levantamento completo de bases de dados públicas e APIs disponíveis para acompanhamento de rentabilidade imobiliária no Brasil.

---

## 1. Índices de Preços de Imóveis

### 1.1 FipeZAP (Índice FipeZAP)

- **O que é**: Principal índice de preços de imóveis residenciais do Brasil, calculado pela FIPE com base em anúncios do Grupo OLX (ZAP, Viva Real, OLX).
- **Dados disponíveis**:
  - Preço médio de **venda** por m² (50+ cidades)
  - Preço médio de **locação** por m² (25+ cidades)
  - Séries históricas mensais desde 2008 (venda) e 2010 (locação)
  - Segmentação por número de dormitórios (1, 2, 3, 4+)
- **Acesso**: Download gratuito de planilhas Excel no site da FIPE
- **URL**: https://www.fipe.org.br/pt-br/indices/fipezap
- **Formato**: XLSX (planilhas Excel)
- **Frequência**: Mensal
- **Custo**: Gratuito
- **Cobertura**: 50+ cidades brasileiras, índice composto nacional
- **Uso no app**: Referência principal para valor de mercado por m² em cada cidade. Permite calcular valorização ao longo do tempo e comparar regiões.

### 1.2 DataZAP (Grupo OLX)

- **O que é**: Braço de inteligência imobiliária do Grupo OLX, combinando a maior base de dados imobiliários do Brasil com análise econômica.
- **Dados disponíveis**:
  - AVM (Automated Valuation Models) - avaliação automática de imóveis
  - Estudos de mercado por região
  - Dados primários de anúncios (preço, tipo, características)
- **Acesso**: Portal corporativo, requer contrato
- **URL**: https://www.datazap.com.br
- **Formato**: Relatórios e API proprietária
- **Custo**: Pago (sob consulta)
- **Uso no app**: Fonte premium futura para AVMs e dados detalhados por bairro.

### 1.3 IGMI-C (FGV/Abrapp)

- **O que é**: Índice Geral do Mercado Imobiliário Comercial, calculado pela FGV com dados de fundos de pensão.
- **Dados disponíveis**:
  - Rentabilidade de imóveis comerciais (capital gain + income)
  - Séries trimestrais desde 2000
- **Acesso**: Portal IBRE/FGV
- **URL**: https://portalibre.fgv.br
- **Formato**: PDF / planilhas
- **Custo**: Gratuito (dados agregados)
- **Uso no app**: Benchmark de rentabilidade de imóveis comerciais.

---

## 2. APIs Públicas Gratuitas - Dados Macroeconômicos

### 2.1 Banco Central do Brasil - API SGS

- **O que é**: Sistema Gerenciador de Séries Temporais do BCB, com milhares de séries econômicas.
- **Base URL**: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json`
- **Últimos N valores**: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{N}?formato=json`
- **Com filtro de data**: `?formato=json&dataInicial=01/01/2020&dataFinal=31/12/2025`
- **Formato**: JSON
- **Custo**: Gratuito
- **Limitação**: A partir de mar/2025, consultas limitadas a 10 anos por request.

**Séries relevantes para o app:**

| Código | Série | Uso no App |
|--------|-------|------------|
| **11** | Taxa Selic (meta) | Benchmark de rentabilidade vs. renda fixa |
| **433** | IPCA - Variação mensal | Inflação para cálculo de retorno real |
| **189** | IGP-M - Variação mensal | Reajuste de aluguéis |
| **20772** | Taxa juros financiamento imobiliário PF | Custo de financiamento |
| **21340** | Inadimplência crédito imobiliário PF | Indicador de risco do mercado |
| **7456** | Saldo crédito imobiliário PF | Volume de crédito no setor |
| **4390** | Selic acumulada no mês | Cálculo de CDI |

**Exemplo de chamada:**
```
GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados/ultimos/12?formato=json
```
```json
[
  {"data": "01/01/2025", "valor": "12.25"},
  {"data": "01/02/2025", "valor": "13.25"}
]
```

### 2.2 IBGE - API de Dados Agregados (SIDRA)

- **O que é**: API REST que alimenta o SIDRA, disponibilizando dados de pesquisas e censos do IBGE.
- **Base URL (Agregados v3)**: `https://servicodados.ibge.gov.br/api/v3/agregados/`
- **Base URL (SIDRA direto)**: `https://apisidra.ibge.gov.br/values/`
- **Formato**: JSON
- **Custo**: Gratuito

**Tabelas/agregados relevantes:**

| Tabela | Descrição | Uso no App |
|--------|-----------|------------|
| **9514** | População municípios (Censo 2022) | Demografia da região |
| **6579** | Estimativas de população | Tendência populacional |
| **200** | População censos históricos (1970-2010) | Crescimento histórico |
| **3548** | Renda domiciliar per capita | Poder aquisitivo da região |

**Exemplo:**
```
GET https://apisidra.ibge.gov.br/values/t/9514/n6/3550308/p/last/v/allxp
```
(Retorna população de São Paulo no último censo)

### 2.3 IBGE - API de Localidades

- **O que é**: API para consultar a divisão territorial brasileira.
- **Base URL**: `https://servicodados.ibge.gov.br/api/v1/localidades/`
- **Endpoints úteis**:
  - `estados/{UF}/municipios` - municípios de um estado
  - `municipios/{codigo}` - dados de um município
  - `regioes-metropolitanas` - regiões metropolitanas
- **Formato**: JSON
- **Custo**: Gratuito
- **Uso no app**: Geolocalização, organização hierárquica de regiões.

### 2.4 Ipeadata - API de Séries Históricas

- **O que é**: Portal de dados do IPEA com milhares de séries econômicas.
- **Base URL**: `http://www.ipeadata.gov.br/api/`
- **Formato**: JSON / CSV
- **Custo**: Gratuito

**Séries relevantes:**

| Série | Descrição | Uso no App |
|-------|-----------|------------|
| IGP_IGPMG | IGP-M mensal | Reajuste de aluguéis |
| INCC | INCC-DI/M mensal | Custo de construção |
| IPCA | IPCA mensal | Inflação |
| POUPANCA | Poupança (rentabilidade) | Benchmark alternativo |

- **Uso no app**: Fonte complementar ao BCB para índices de reajuste (IGP-M para contratos de aluguel, INCC para custo de construção).

---

## 3. Dados de Aluguel Long-Term

### 3.1 SECOVI-SP (Sindicato da Habitação)

- **O que é**: Principal sindicato do setor imobiliário de SP, publica pesquisas mensais sobre locação.
- **Dados disponíveis**:
  - Pesquisa Mensal de Locação: valores de aluguel por m² por região de SP e número de dormitórios
  - Taxa de vacância residencial
  - Velocidade de locação (tempo médio para alugar)
  - Índice de Velocidade de Vendas (IVV)
- **Acesso**: PDFs no site (requer cadastro gratuito)
- **URL**: https://www.secovi.com.br/pesquisas-e-indices/
- **Formato**: PDF (dados tabulares)
- **Frequência**: Mensal
- **Custo**: Gratuito (cadastro)
- **Cobertura**: Cidade de São Paulo e RMSP
- **Uso no app**: Taxa de vacância e velocidade de locação são dados essenciais para calcular yield esperado. Parsing de PDFs necessário.

### 3.2 Quinto Andar (via scraping)

- **O que é**: Maior plataforma digital de aluguel do Brasil, com dados ricos de listagens.
- **Dados disponíveis**: Preço de aluguel, condomínio, IPTU, área, quartos, banheiros, vagas, endereço, bairro, amenidades.
- **Acesso**:
  - **API interna** (não oficial): `quintoandar.com.br/api/yellow-pages/search` - aceita coordenadas (lat/lng) como parâmetro
  - **Apify scraper**: $25/mês com 3 dias de trial gratuito
  - **Open-source**: [RentCrawler](https://github.com/Morelatto/RentCrawler) - Python 3.8+, MongoDB, suporta QuintoAndar + ZAP + VivaReal
- **Formato**: JSON
- **Cobertura**: Grandes capitais brasileiras
- **Uso no app**: Comparáveis de aluguel para calcular yield potencial. Dados por bairro/região.

### 3.3 ZAP Imóveis / Viva Real / OLX (Grupo OLX)

- **O que é**: Maiores portais de anúncios imobiliários do Brasil.
- **Dados disponíveis**: Preço venda/aluguel, IPTU, condomínio, área, quartos, banheiros, tipo de imóvel, endereço completo, fotos.
- **Acesso**:
  - **Portal de integração oficial**: https://developers.grupozap.com (API para anunciantes, não para consulta)
  - **Apify scraper** (ZAP Imóveis): extrai listagens completas
  - **Open-source**: [Web_Scraping_Imoveis](https://github.com/Nilton94/Web_Scraping_Imoveis) - scraper Python para ZAP
- **Formato**: JSON
- **Uso no app**: Base de comparáveis para avaliação de imóveis semelhantes.

---

## 4. Dados de Short-Term Rental (Airbnb/Temporada)

### 4.1 Inside Airbnb (Murray Cox)

- **O que é**: Projeto independente que publica snapshots de dados do Airbnb para cidades selecionadas.
- **Dados disponíveis**:
  - `listings.csv`: Todos os listings ativos (preço, localização, tipo, quartos, reviews, host info, availabilidade)
  - `calendar.csv`: Disponibilidade e preço para os próximos 365 dias
  - `reviews.csv`: Todas as reviews públicas
  - `neighbourhoods.geojson`: Limites geográficos dos bairros
- **Acesso**: Download direto de CSVs (gzip)
- **URL**: https://insideairbnb.com/get-the-data/
- **Formato**: CSV (gzip)
- **Frequência**: Trimestral (aproximadamente)
- **Custo**: Gratuito
- **Cobertura Brasil**: Rio de Janeiro (confirmado), possivelmente São Paulo
- **Uso no app**: Dados essenciais para calcular yield de short-term rental. Preço médio por noite, taxa de ocupação estimada, revenue anual projetado. Limitação: poucos dados de cidades brasileiras.

### 4.2 AirDNA

- **O que é**: Plataforma líder em analytics de short-term rental, cobrindo Airbnb + VRBO.
- **Dados disponíveis**:
  - Ocupação média por cidade/bairro
  - RevPAR (Revenue per Available Room)
  - ADR (Average Daily Rate)
  - Revenue mensal estimado
  - Sazonalidade
- **Dados Brasil**:
  - São Paulo: 57.371+ listings, 54% ocupação, $49 ADR, $5.574 revenue mensal
  - Brasil geral: 37% ocupação, $156 ADR, $5.439 revenue mensal
- **Acesso**: API REST (`apidocs.airdna.co`)
- **Custo**:
  - Free: dados limitados (MarketMinder)
  - Pro: $125/mês (mensal) ou $34/mês (anual)
  - API/Enterprise: preço sob consulta
- **Uso no app**: Fonte premium futura para análise detalhada de short-term rental em qualquer cidade brasileira.

---

## 5. Dados de Valor Venal e IPTU (Prefeituras)

### 5.1 São Paulo

- **GeoSampa**: Portal de mapas com camada de IPTU. Consulta por código SQL (Setor-Quadra-Lote).
  - URL: https://geosampa.prefeitura.sp.gov.br
- **Valor Venal de Referência (ITBI)**: Consulta do valor de referência para cálculo de ITBI.
  - URL: https://itbi.prefeitura.sp.gov.br/valorreferencia/
- **Dados Abertos SP**: Portal de dados abertos pode conter datasets de IPTU.
  - URL: https://dados.prefeitura.sp.gov.br
- **Infosimples** (terceiro): API JSON para consulta de valor venal e débitos IPTU SP.
  - URL: https://infosimples.com/consultas/pref-sp-sao-paulo-valor-ref/
  - Custo: Pago (por consulta)

### 5.2 Rio de Janeiro

- **Data.Rio**: Portal de dados abertos do RJ com datasets de IPTU.
  - URL: https://data.rio
- **Formato**: CSV / API

### 5.3 Outras capitais

- Muitas prefeituras possuem portais de dados abertos com informações de IPTU. Cobertura inconsistente.

**Uso no app**: Valor venal como referência para avaliação patrimonial e cálculo de impostos.

---

## 6. Dados de Fundos Imobiliários (FIIs) como Benchmark

### 6.1 B3 / CVM

- **O que é**: Dados de FIIs listados na B3 podem servir como benchmark de rentabilidade imobiliária.
- **Dados disponíveis**: Dividend yield, P/VP, tipo de fundo (tijolo, papel, híbrido), segmento (logístico, shopping, lajes corporativas, residencial).
- **Acesso**: APIs de mercado (Yahoo Finance, Status Invest, FundsExplorer)
- **Uso no app**: Comparar rentabilidade do imóvel físico vs. FIIs do mesmo segmento/região.

---

## 7. Resumo: Viabilidade por Funcionalidade do App

| Funcionalidade | Fonte Principal | Fonte Secundária | Viabilidade |
|---------------|----------------|-----------------|-------------|
| **Valor atualizado do imóvel** | FipeZAP (preço/m² por cidade) | DataZAP AVM (pago) | ✅ Alta |
| **Valorização ao longo do tempo** | FipeZAP série histórica | IGMI-C | ✅ Alta |
| **Yield de aluguel long-term** | FipeZAP Locação + SECOVI | Scraping QuintoAndar/ZAP | ✅ Alta |
| **Yield de aluguel short-term** | Inside Airbnb (Rio) | AirDNA (pago) | ⚠️ Média (limitado a poucas cidades gratuitas) |
| **Tendência da região** | IBGE (demografia) + FipeZAP | SECOVI | ✅ Alta |
| **Taxa de vacância** | SECOVI-SP | Estimativa via Inside Airbnb | ⚠️ Média (SP apenas) |
| **Ganho líquido** | Calculado (yield - custos - impostos) | BCB (Selic, IPCA como benchmark) | ✅ Alta |
| **Comparáveis na área** | Scraping ZAP/QuintoAndar | DataZAP (pago) | ✅ Alta |
| **Custo de financiamento** | BCB SGS (série 20772) | — | ✅ Alta |
| **Reajuste de aluguel** | Ipeadata (IGP-M) / BCB | — | ✅ Alta |

---

## 8. Estratégia Recomendada para MVP

### Fase 1 - Dados Gratuitos com API (imediato)
1. **BCB SGS API** → Selic, IPCA, IGP-M, taxa de financiamento
2. **IBGE API** → dados demográficos por município
3. **Ipeadata API** → INCC, IGP-M
4. **FipeZAP Excel** → preço/m² por cidade (download + parse)

### Fase 2 - Dados Gratuitos sem API (curto prazo)
5. **Inside Airbnb** → dados de short-term rental (Rio)
6. **SECOVI-SP** → taxa de vacância, velocidade de locação (parse PDF)

### Fase 3 - Scraping e Dados Enriquecidos (médio prazo)
7. **RentCrawler / Apify** → comparáveis de aluguel (QuintoAndar, ZAP)
8. **Prefeituras** → valor venal via dados abertos

### Fase 4 - Fontes Premium (longo prazo)
9. **AirDNA** → analytics de short-term rental
10. **DataZAP** → AVM e dados granulares

---

## 9. Stack Tecnológica Planejada

- **Backend**: Python + FastAPI
- **Frontend**: React (dashboard com cards)
- **Data Pipeline**: Python (requests, pandas, openpyxl)
- **Banco de dados**: PostgreSQL (dados persistidos) + Redis (cache de APIs)
- **Deploy**: Docker

---

## 10. Referências e Links Úteis

- FIPE ZAP: https://www.fipe.org.br/pt-br/indices/fipezap
- DataZAP: https://www.datazap.com.br
- BCB SGS: https://api.bcb.gov.br/dados/serie/
- BCB Dados Abertos: https://dadosabertos.bcb.gov.br
- IBGE API: https://servicodados.ibge.gov.br/api/docs/
- IBGE SIDRA: https://apisidra.ibge.gov.br
- Ipeadata: http://www.ipeadata.gov.br
- SECOVI-SP: https://www.secovi.com.br/pesquisas-e-indices/
- Inside Airbnb: https://insideairbnb.com/get-the-data/
- AirDNA: https://www.airdna.co / https://apidocs.airdna.co
- GeoSampa (SP): https://geosampa.prefeitura.sp.gov.br
- Data.Rio (RJ): https://data.rio
- Portal Grupo OLX Devs: https://developers.grupozap.com
- RentCrawler (GitHub): https://github.com/Morelatto/RentCrawler
- FGV IBRE: https://portalibre.fgv.br
