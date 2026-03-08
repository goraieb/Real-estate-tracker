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

## 8. Scraping & Programmatic Access — Detailed Platform Research

Detailed research on programmatic access to individual Brazilian real estate listing platforms. This covers data fields, access methods, rate limits, legal considerations, and available open-source tools.

### 8.1 ZAP Imóveis

**Platform**: https://www.zapimoveis.com.br — Largest real estate listing portal in Brazil (part of Grupo OLX).

**Data fields available**:
- Price (sale or rent), IPTU, condominium fee
- Full address (street, neighborhood, city, state)
- Property details: area (m²), bedrooms, bathrooms, parking spots
- Property type (apartment, house, commercial, land)
- Description text, image URLs
- Advertiser / agent info

**Access methods**:
1. **Apify — Zap Imóveis Scraper** (by avorio): ~$4 per 1,000 listings. Supports filters: listing type (rent/sale), city, state, price range, area range, unit type, usage (residential/commercial), number of bedrooms. Uses Cheerio (no browser needed). URL: https://apify.com/avorio/zap-imoveis-scraper
2. **Apify — Scrappe-Imoveis-Zap** (by aiteks.ltda): Uses Crawlee+Cheerio, faster/lighter. Handles pagination automatically. URL: https://apify.com/aiteks.ltda/scrappe-imoveis-zap
3. **PyPI — `zapimoveis-scraper`** (by GeovRodri): `pip install zapimoveis-scraper`. Uses BeautifulSoup4. Search example: `zap.search(localization="go+goiania++setor-oeste", num_pages=5)`. **Status: likely abandoned** (no updates in 12+ months). GitHub: https://github.com/GeovRodri/zapimoveis-scraper
4. **Scrapy + Splash** (by sebastrogers): Requires Docker for Splash. GitHub: https://github.com/sebastrogers/zapimoveis_scraper
5. **Selenium + concurrent.futures** (by Nilton94): Handles dynamic page loading, uses IBGE API for city names. Has Streamlit UI. GitHub: https://github.com/Nilton94/Web_Scraping_Imoveis
6. **Full ETL project** (by ziggy-data): 400 pages scraped, 9,600 houses + 8,400 apartments datasets. GitHub: https://github.com/ziggy-data/scraping_zap_imoveis

**Anti-scraping**: ZAP Imóveis uses dynamic JavaScript rendering (hence need for Splash/Selenium). Likely uses Cloudflare or similar WAF. Residential proxies recommended for large-scale scraping. Expect 429 (rate limit) or 403 (blocked) responses without proper headers/delays.

**Rate limits**: No official documentation. Empirically, 2-5 second delays between requests with rotating User-Agents and residential proxies are recommended.

---

### 8.2 QuintoAndar

**Platform**: https://www.quintoandar.com.br — Leading digital rental/sales platform in major Brazilian cities.

**Data fields available**:
- Rental or sale price, condominium fee, IPTU
- Location: city, neighborhood, full address, coordinates (lat/lng)
- Bedrooms, bathrooms, parking spots, area (m²)
- Property type (apartment, house)
- Description, remarks about surroundings/amenities
- Furniture/furnishing details (air conditioning, cabinets, etc.)
- Property photos
- Historical sale/rental pricing data
- Agent/listing info

**Access methods**:
1. **Internal API** (undocumented): `quintoandar.com.br/api/yellow-pages/search` — accepts coordinates (lat/lng) as parameters. Discoverable via browser DevTools network inspection. Not officially supported; may change without notice.
2. **Apify — Quinto Andar API** (by brasil-scrapers): Accepts city name or search URL as input. No-code interface. Outputs JSON/CSV. URL: https://apify.com/brasil-scrapers/quinto-andar-api
3. **RentCrawler** (open-source): Python 3.8+, MongoDB. Supports QuintoAndar + ZAP + VivaReal. GitHub: https://github.com/Morelatto/RentCrawler

**Anti-scraping**: QuintoAndar uses JavaScript-heavy rendering. The internal API endpoints are more reliable than HTML scraping but may require session tokens or cookies.

**Rate limits**: No official documentation. The internal API likely has rate limiting; use delays and rotating IPs.

---

### 8.3 Viva Real

**Platform**: https://www.vivareal.com.br — Major portal (~28M monthly visits), part of Grupo OLX (same group as ZAP).

**Data fields available**:
- Price (sale or rent), condominium fee, IPTU
- Full address, neighborhood, city
- Area (m²), bedrooms, bathrooms, parking spots
- Property description, amenities
- Unique listing URL/link
- Images

**Access methods**:
1. **Apify — Viva Real Scraper** (by makemakers): Configurable search_type ('aluguel' or 'venda'). Structured dataset with price, location, rooms, bathrooms, amenities. URL: https://apify.com/makemakers/viva-real-scraper
2. **GitHub — Dados_Imoveis-Web_Scraper** (by MikeWilliamm): Extracts all listings for a city. Output: CSV with description, address, area, rooms, bathrooms, parking, price, link. Count verified against site totals. GitHub: https://github.com/MikeWilliamm/Dados_Imoveis-Web_Scraper
3. **GitHub — webscraping_vivareal** (by arturlunardi): User provides initial URL with filters, specifies number of pages. GitHub: https://github.com/arturlunardi/webscraping_vivareal
4. **Medium tutorial** (by Ingo Reichert Jr.): BeautifulSoup + Requests for Florianópolis listings. URL: https://medium.com/@ingoreichertjr/web-scraping-com-python-e-beautiful-soup-criando-um-dataframe-de-im%C3%B3veis-a-venda-em-florian%C3%B3polis-6c037073deda

**Note**: Viva Real and ZAP Imóveis are part of the same group. Many listings appear on both platforms. ImovelWeb is also part of this group (Navent/ZAP). Scraping one may give partial coverage of the others.

---

### 8.4 OLX Imóveis

**Platform**: https://www.olx.com.br/imoveis — Largest general classifieds platform in Brazil, with significant real estate section.

**Data fields available**:
- Price (sale or rent)
- Location (city, state, neighborhood)
- Property type, area, bedrooms, bathrooms, parking
- Description, images
- Seller info (private or agency)

**Access methods**:
1. **Official API** (for advertisers only): https://developers.olx.com.br — The API de Importação de Anúncios supports real estate categories with specific subcategory parameters. **Important**: This is for *posting* listings, not for *querying/searching*. Integration only available to authorized integrators (Imobex, Imovelpro, Tecimob, Microsistec, Izzi). Contact: suporteintegrador@olxbr.com
2. **Apify — Brazil Real Estate Scraper** (by viralanalyzer): Covers OLX Imóveis + QuintoAndar + ImovelWeb + Airbnb. ~$0.001 per listing. All 27 states. URL: https://apify.com/viralanalyzer/brazil-real-estate-scraper
3. **GitHub — buscaimoveis-scraper** (by gilsondev): Scrapy-based, currently supports sales in Distrito Federal (DF). GitHub: https://github.com/gilsondev/buscaimoveis-scraper

**Note**: OLX has 2.7M+ real estate listings, making it the largest single source by volume. However, listing quality varies (many duplicates, outdated listings, private sellers).

---

### 8.5 ImovelWeb

**Platform**: https://www.imovelweb.com.br — Part of Navent/ZAP group. Significant overlap with ZAP and Viva Real listings.

**Data fields available**:
- Price, location (address, neighborhood, city, state)
- Area (m²), bedrooms, bathrooms, parking
- Property type, posting ID
- Description, images
- 20+ structured fields in JSON output
- JSON-LD structured data often embedded in pages (price, address, rooms, images)

**Access methods**:
1. **Apify — ImovelWeb Property Search Scraper** (by ecomscrape): 20+ data fields, JSON output, proxy support, retry configuration. URL: https://apify.com/ecomscrape/imovelweb-property-search-scraper
2. **Apify — ImovelWeb Property Details Scraper** (by ecomscrape): Detail-level scraper for individual listings. URL: https://apify.com/ecomscrape/imovelweb-property-details-scraper
3. **Scrapfly guide**: Detailed how-to. Notes: requires Brazilian geolocation proxy, inspects browser fingerprints, uses DataDome protection. JSON-LD is cleanest extraction method. URL: https://scrapfly.io/blog/posts/how-to-scrape-imovelweb
4. **GitHub — iw-scraper** (by cordeirossauro): Parameters: state (abbreviation), property type (houses/apartments), contract type (sale/rent). Known issue: occasional CAPTCHA responses. GitHub: https://github.com/cordeirossauro/iw-scraper

**Anti-scraping**: DataDome protection, browser fingerprint inspection, requires Brazilian IP geolocation. 403/429 responses common without proper proxy setup.

---

### 8.6 Apify Multi-Platform Scrapers (Consolidated)

**Brazil Real Estate Scraper — 4 Platforms** (by viralanalyzer):
- **Platforms**: OLX Imóveis, QuintoAndar, ImovelWeb, Airbnb
- **Coverage**: All 27 Brazilian states; houses, apartments, vacation rentals, commercial
- **Cost**: ~$0.001 per listing
- **Note**: ZAP/VivaReal not directly included, but ImovelWeb (same group) provides significant overlap
- **URL**: https://apify.com/viralanalyzer/brazil-real-estate-scraper

**Individual Apify scrapers summary**:

| Platform | Apify Actor | Approx. Cost |
|----------|------------|--------------|
| ZAP Imóveis | avorio/zap-imoveis-scraper | $4/1,000 listings |
| ZAP Imóveis | aiteks.ltda/scrappe-imoveis-zap | Varies |
| QuintoAndar | brasil-scrapers/quinto-andar-api | Varies |
| Viva Real | makemakers/viva-real-scraper | Varies |
| ImovelWeb | ecomscrape/imovelweb-property-search-scraper | Varies |
| ImovelWeb | ecomscrape/imovelweb-property-details-scraper | Varies |
| Multi (4) | viralanalyzer/brazil-real-estate-scraper | $0.001/listing |

All Apify actors support programmatic access via the Apify API (REST + Python/JS SDKs), scheduled runs, and data export in JSON/CSV.

---

### 8.7 Open-Source GitHub Projects (Consolidated)

| Project | Platforms | Tech Stack | Status | URL |
|---------|-----------|-----------|--------|-----|
| RentCrawler | QuintoAndar, ZAP, VivaReal | Python 3.8+, MongoDB | Active | https://github.com/Morelatto/RentCrawler |
| zapimoveis-scraper | ZAP Imóveis | Python, BeautifulSoup4 | Inactive (12+ months) | https://github.com/GeovRodri/zapimoveis-scraper |
| zapimoveis_scraper | ZAP Imóveis | Scrapy + Splash (Docker) | Unknown | https://github.com/sebastrogers/zapimoveis_scraper |
| Web_Scraping_Imoveis | ZAP Imóveis | Python, Selenium, Streamlit | Active | https://github.com/Nilton94/Web_Scraping_Imoveis |
| scraping_zap_imoveis | ZAP Imóveis | Python (ETL + dashboard) | Complete project | https://github.com/ziggy-data/scraping_zap_imoveis |
| buscaimoveis-scraper | OLX, ZAP | Python, Scrapy | Limited (DF only) | https://github.com/gilsondev/buscaimoveis-scraper |
| Dados_Imoveis-Web_Scraper | Viva Real | Python | Active | https://github.com/MikeWilliamm/Dados_Imoveis-Web_Scraper |
| webscraping_vivareal | Viva Real | Python | Unknown | https://github.com/arturlunardi/webscraping_vivareal |
| iw-scraper | ImovelWeb | Python | Active (CAPTCHA issues) | https://github.com/cordeirossauro/iw-scraper |

---

### 8.8 Legal Considerations & LGPD Compliance

**LGPD (Lei Geral de Proteção de Dados — Law 13.709/2018)**:
- In effect since September 2020; Brazil's equivalent of GDPR.
- Applies to any processing of personal data of individuals located in Brazil, regardless of where the processor is based.
- **Personal data** = any information relating to an identified or identifiable natural person (names, CPF, phone numbers, email of agents/owners).
- Penalties: up to 2% of company revenue, capped at R$50,000,000 per infraction, plus potential data deletion orders.
- Enforced by ANPD (Autoridade Nacional de Proteção de Dados).

**Key guidelines for scraping Brazilian real estate platforms**:

1. **DO scrape**: Property characteristics (price, area, rooms, location, description) — these are publicly listed commercial data, not personal data.
2. **AVOID scraping**: Agent names, phone numbers, email addresses, CPF numbers, or any personally identifiable information unless you have a legitimate legal basis.
3. **Purpose limitation**: Scraping for market analysis/research is more legally defensible than scraping to republish or build a competing platform.
4. **Data minimization**: Only collect fields you actually need. Do not bulk-harvest personal data.
5. **Terms of Service**: Violating a platform's ToS can expose you to breach-of-contract claims under Brazilian civil law. Most platforms (ZAP, QuintoAndar, OLX) prohibit scraping in their ToS.
6. **Academic exception**: LGPD does not apply to data collected exclusively for academic research, but this is a narrow exception.
7. **Robots.txt**: Respect `robots.txt` directives. Not legally binding in Brazil but demonstrates good faith.
8. **Precedent**: Cyrela (major Brazilian developer) was sued for sharing customer personal data with third parties without authorization — illustrates enforcement activity in the real estate sector.

**Practical risk assessment for this project**:
- Scraping aggregate property data (price, area, rooms, location) for personal investment analysis = **low risk**.
- Scraping at scale to republish or compete = **high risk**.
- Storing/processing agent personal data = **medium-high risk** under LGPD.
- Recommendation: Use official APIs where available (OLX developer portal, FipeZAP data), Apify for managed scraping with built-in compliance, and open-source scrapers for personal/research use only.

---

## 9. Estratégia Recomendada para MVP

### Fase 1 - Dados Gratuitos com API (imediato)
1. **BCB SGS API** → Selic, IPCA, IGP-M, taxa de financiamento
2. **IBGE API** → dados demográficos por município
3. **Ipeadata API** → INCC, IGP-M
4. **FipeZAP Excel** → preço/m² por cidade (download + parse)

### Fase 2 - Dados Gratuitos sem API (curto prazo)
5. **Inside Airbnb** → dados de short-term rental (Rio)
6. **SECOVI-SP** → taxa de vacância, velocidade de locação (parse PDF)

### Fase 3 - Scraping e Dados Enriquecidos (médio prazo)
7. **RentCrawler** (open-source) → comparáveis de aluguel (QuintoAndar, ZAP, VivaReal)
8. **Apify multi-platform scraper** → OLX + QuintoAndar + ImovelWeb + Airbnb (~$0.001/listing)
9. **Prefeituras** → valor venal via dados abertos

### Fase 4 - Fontes Premium (longo prazo)
10. **AirDNA** → analytics de short-term rental
11. **DataZAP** → AVM e dados granulares

---

## 10. Stack Tecnológica Planejada

- **Backend**: Python + FastAPI
- **Frontend**: React (dashboard com cards)
- **Data Pipeline**: Python (requests, pandas, openpyxl)
- **Banco de dados**: PostgreSQL (dados persistidos) + Redis (cache de APIs)
- **Deploy**: Docker

---

## 11. Referências e Links Úteis

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
- OLX Developers (API Anúncios): https://developers.olx.com.br
- RentCrawler (GitHub): https://github.com/Morelatto/RentCrawler
- Apify Brazil Real Estate (4 platforms): https://apify.com/viralanalyzer/brazil-real-estate-scraper
- Apify ZAP Imóveis Scraper: https://apify.com/avorio/zap-imoveis-scraper
- Apify QuintoAndar API: https://apify.com/brasil-scrapers/quinto-andar-api
- Apify Viva Real Scraper: https://apify.com/makemakers/viva-real-scraper
- Scrapfly ImovelWeb Guide: https://scrapfly.io/blog/posts/how-to-scrape-imovelweb
- LGPD Full Text: https://lgpd-brazil.info
- FGV IBRE: https://portalibre.fgv.br
- ITBI SP (dados abertos): https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501
- ONR: https://app.onr.org.br
- ONR Mapa: https://mapa.onr.org.br
- SINTER/CIB: https://cadastroimobiliario.economia.gov.br
- IBGE Malhas Setores Censitários: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html
- IBGE Malha Municipal: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html
- IBGE Malha API (GeoJSON): https://servicodados.ibge.gov.br/api/v3/malhas/
- AirBSet (Zenodo): https://zenodo.org/record/8101910

---

## 12. Validação de Valor Real de Transação (Cartórios e ITBI)

### 12.1 Dados de ITBI da Prefeitura de São Paulo (DESCOBERTA IMPORTANTE)

A Prefeitura de SP disponibiliza dados abertos de **todas as transações imobiliárias** com recolhimento de ITBI.

- **Dados**: Código SQL (Setor-Quadra-Lote), endereço, **valor de transação** (preço real), cartório, natureza da transação, data
- **URL**: https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501
- **Formato**: XLSX e ODS (jan-dez por ano, desde 2019)
- **Custo**: Gratuito
- **Limitações**: Não inclui imóveis rurais nem transações via PPI. Sem nomes de compradores/vendedores.
- **Uso no app**: **Melhor fonte para validar valores reais de transação.** Permite cruzar preço de anúncio vs. preço real de venda, construir modelos de preço por bairro/tipo, e identificar tendências reais (não apenas preços de oferta).

### 12.2 ONR - Operador Nacional do Registro Eletrônico de Imóveis

Plataforma que conecta os 3.600+ cartórios de registro de imóveis do Brasil (Lei 13.465/2017).

- **Serviços**: Certidão eletrônica, pesquisa de bens por CPF/CNPJ, matrícula online, monitoramento de matrícula
- **Portais**: https://app.onr.org.br | https://mapa.onr.org.br | https://mapa.onr.org.br/sigri/
- **API**: Não há API pública documentada. Serviços via plataforma web.
- **Custo**: Consultas individuais pagas (custo de certidão)
- **Uso no app**: Validação pontual de matrícula e histórico do imóvel. Não viável para consultas em massa.

### 12.3 SINTER - Sistema Nacional de Gestão de Informações Territoriais

Sistema da Receita Federal (Decreto 11.208/2022) que integra dados registrais, cadastrais, geoespaciais e fiscais de todos os imóveis do Brasil.

- **CIB (Cadastro Imobiliário Brasileiro)**: "CPF do imóvel" - identificação única nacional
- **Prazos**: Capitais até 01/01/2026, demais municípios até 01/01/2027
- **Status**: Apenas 21% dos municípios têm base cadastral georreferenciada (IBGE 2019)
- **Portal**: https://cadastroimobiliario.economia.gov.br
- **Uso no app**: **Futuro game-changer.** Quando implementado, será a fonte definitiva de dados de transações imobiliárias em todo o Brasil.

### 12.4 Hierarquia de Confiabilidade de Preços

| Nível | Fonte | Confiabilidade | Acesso |
|-------|-------|---------------|--------|
| 1 | **ITBI SP** (valor declarado na escritura) | Alta | Gratuito (SP) |
| 2 | **Valor venal ITBI** (referência da prefeitura) | Média-alta | Consulta individual |
| 3 | **FipeZAP** (média de anúncios) | Média | Gratuito |
| 4 | **Scraping ZAP/QuintoAndar** (preço pedido) | Média-baixa | Scraping |
| 5 | **DataZAP AVM** (algoritmo) | Variável | Pago |

---

## 13. Dados Geográficos para Visualização em Mapa

### 13.1 IBGE - Malha de Setores Censitários 2022

- **Dados**: Limites de setores censitários (menor unidade IBGE) + dados demográficos do Censo 2022, todos os 5.568 municípios
- **Download**: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html
- **Formatos**: GeoPackage (.gpkg) e Shapefile (.shp), convertíveis para GeoJSON
- **Custo**: Gratuito

### 13.2 IBGE - Malha Municipal (API direta com GeoJSON)

- **API**: `https://servicodados.ibge.gov.br/api/v3/malhas/` (retorna GeoJSON/TopoJSON direto)
- **Download**: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html
- **Uso**: Limites de municípios para mapa interativo de preço/m² por cidade

### 13.3 GeoSampa (São Paulo)

- **Dados**: Shapefiles de bairros, distritos, subprefeituras, com layers de IPTU e zoneamento
- **URL**: https://geosampa.prefeitura.sp.gov.br
- **Formato**: Shapefile, WMS/WFS

### 13.4 Inside Airbnb - GeoJSON de Bairros

- **Dados**: `neighbourhoods.geojson` para Rio de Janeiro **e São Paulo**
- **Download**: https://insideairbnb.com/get-the-data/
- **Nota**: São Paulo ESTÁ disponível no Inside Airbnb (não apenas RJ)

### 13.5 AirBSet (Dataset Acadêmico)

- **O que é**: Dataset acadêmico com imóveis brasileiros do Airbnb e avaliações
- **Download**: https://zenodo.org/record/8101910
- **Custo**: Gratuito

### 13.6 Visualizações Possíveis

| Visualização | Fontes | Viabilidade |
|---|---|---|
| **Heatmap preço/m² por cidade** | FipeZAP + IBGE malha municipal (API GeoJSON) | ✅ Imediato |
| **Mapa de valorização** | FipeZAP série histórica + IBGE malha | ✅ Imediato |
| **Heatmap Airbnb (SP e RJ)** | Inside Airbnb listings (lat/lng + preço) | ✅ Imediato |
| **Mapa de transações reais (SP)** | ITBI SP + geocoding endereços | ✅ Viável |
| **Mapa de yield por bairro (SP)** | ITBI SP + SECOVI + GeoSampa | ✅ Viável |
| **Mapa demográfico** | IBGE Censo 2022 + malha setores censitários | ✅ Viável |
| **Mapa de oportunidades** | Scraping listings + FipeZAP como referência | ⚠️ Médio prazo |
| **Comparativo de bairros** | Yield + vacância + tendência por bairro | ⚠️ Médio prazo |
