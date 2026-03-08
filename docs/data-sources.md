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
- ITBI RJ Data.Rio (transações por logradouro): https://www.data.rio/datasets/5e4dda4d33f44b1eb9246559b281d1b8_8/about
- ITBI RJ valores médios por m²: https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro/
- ITBI Recife: http://dados.recife.pe.gov.br/dataset/imposto-sobre-transmissao-de-bens-imoveis-itbi
- ITBI Niterói: https://www.fazenda.niteroi.rj.gov.br/site/dados-das-transacoes-imobiliarias/
- Base dos Dados - Registro de Imóveis: https://basedosdados.org/dataset/1f81c113-41c2-493c-985a-c0f1502a37cd
- FIPE Indicadores do Registro Imobiliário: https://www.fipe.org.br/pt-br/indices/indicadores-do-registro-imobiliario/
- ONR: https://app.onr.org.br
- ONR Mapa: https://mapa.onr.org.br
- ONR RI Digital: https://registradores.onr.org.br/
- ONR PGV-CNM: https://cnm.onr.org.br/
- ONR API Integração: https://integracao.registrodeimoveis.org.br/
- ONR Swagger: https://www.registrodeimoveis.org.br/swagger/index.html
- Portal Estatístico Registral: https://www.registrodeimoveis.org.br/portal-estatistico-registral
- Infosimples ONR API: https://infosimples.com/consultas/onr-mapa-registro-imoveis/
- ARISP: https://arisp.com.br/
- SINTER: https://www.sinter.fazenda.gov.br/
- SINTER/CIB: https://cadastroimobiliario.economia.gov.br
- IBGE Malhas Setores Censitários: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/estrutura-territorial/26565-malhas-de-setores-censitarios-divisoes-intramunicipais.html
- IBGE Malha Municipal: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html
- IBGE Malha API (GeoJSON): https://servicodados.ibge.gov.br/api/v3/malhas/
- AirBSet (Zenodo): https://zenodo.org/record/8101910

---

## 12. Dados de Transações Reais - Cartórios e ITBI (Preços Efetivos de Venda)

> **Nota importante**: Os dados abaixo representam **preços reais de transação** (não preços de anúncio/listing).
> No Brasil, existem duas vias principais para obter preços efetivos: (1) dados de ITBI das prefeituras,
> que registram o valor declarado na transação para fins tributários; e (2) dados dos Registros de Imóveis
> (cartórios), que registram a transferência de propriedade. Ambos podem subestimar o valor real
> (subdeclaração para pagar menos imposto), mas são as melhores fontes de preço efetivo disponíveis.

### 12.1 ITBI - Prefeitura de São Paulo (Melhor fonte gratuita individual)

A Prefeitura de SP disponibiliza dados abertos de **todas as transações imobiliárias** com recolhimento de ITBI.

- **Dados por transação (cada linha = 1 DTI paga)**:
  - Número do cadastro do imóvel (SQL - Setor-Quadra-Lote)
  - Endereço do imóvel
  - **Valor da transação** (preço efetivo declarado pelo comprador)
  - Cartório de registro do imóvel
  - Natureza da transação
- **O que NÃO contém**: Nomes de compradores/vendedores (sigilo fiscal), imóveis rurais, transações com ITBI pago via PPI (parcelamento incentivado)
- **URL**: https://prefeitura.sp.gov.br/web/fazenda/w/acesso_a_informacao/31501
- **Formato**: XLSX (Excel) e ODS
- **Frequência**: Mensal (atualizado com dados consolidados do mês anterior)
- **Cobertura temporal**: Desde 2019
- **Custo**: Gratuito, download direto sem cadastro
- **Organização temporal**: Dados organizados pela **data de pagamento** do ITBI (não data da transação nem data de preenchimento da DTI). Exemplo: DTI preenchida em março/2021, ITBI pago em abril/2021, referente a transação de fevereiro/2021 = aparece na tabela de abril/2021.
- **Nota jurídica**: Base de cálculo do ITBI em SP = maior valor entre a transação declarada e o valor venal do imóvel. O "valor venal de referência" foi declarado inaplicável pelo TJ-SP via IRDR.
- **Uso no app**: **Melhor fonte para preços reais de transação em SP.** Cruzar com SQL do GeoSampa para obter coordenadas geográficas e calcular preço/m² real por bairro/rua. Permite comparar preço de anúncio vs. preço real de venda.

### 12.2 ITBI - Data.Rio (Rio de Janeiro)

Portal de dados abertos do RJ com múltiplos datasets de transações imobiliárias baseadas em ITBI.

- **Datasets disponíveis** (múltiplas granularidades):
  - Transações por logradouro e mês — residenciais e não residenciais, desde 2010
  - Transações por logradouro e ano
  - Transações por divisão administrativa (AP, RP, RA, bairro) e ano
  - Transações de imóveis territoriais por divisão administrativa
  - Painel de monitoramento ITBI por bairro
  - **Valores médios por m² por trecho de logradouro** (Secretaria de Fazenda — particularmente útil)
- **URLs**:
  - Transações por logradouro/mês: https://www.data.rio/datasets/5e4dda4d33f44b1eb9246559b281d1b8_8/about
  - Transações por logradouro/ano: https://www.data.rio/datasets/7ca51bd09ec54576be54c27b88fb098c_4/explore
  - Transações por divisão administrativa: https://www.data.rio/datasets/f2ef379e0d6f431ba6bb74dfed7016a0_1/about
  - Valores médios por m²: https://fazenda.prefeitura.rio/itbi-valores-medios-por-m2-de-transacoes-imobiliarias-por-trecho-de-logradouro/
- **Formato**: CSV, GeoJSON, Shapefile (múltiplos formatos via portal ArcGIS Hub)
- **Frequência**: Variável (mensal a anual dependendo do dataset)
- **Cobertura temporal**: Desde 2010
- **Custo**: Gratuito
- **Uso no app**: Preços reais de transação no Rio. Dados de valor médio por m² por logradouro validam estimativas de valor de mercado. Cobertura mais longa que SP (2010 vs 2019).

### 12.3 ITBI - Outras Prefeituras com Dados Abertos

- **Recife (PE)**: Portal de Dados Abertos com dados de ITBI (características dos imóveis e informações de operações).
  - URL: http://dados.recife.pe.gov.br/dataset/imposto-sobre-transmissao-de-bens-imoveis-itbi
  - Custo: Gratuito
- **Niterói (RJ)**: Secretaria da Fazenda publica média de valor de avaliação, média de valor de transação, quantidade de transações, tipologia e natureza.
  - URL: https://www.fazenda.niteroi.rj.gov.br/site/dados-das-transacoes-imobiliarias/
  - Custo: Gratuito
- **Porto Alegre (RS)**: Em 2023 aprovou a **Lei da Transparência Imobiliária**, primeira do país a obrigar a prefeitura a divulgar dados de transações de ITBI. Modelo para outros municípios.
- **Tendência nacional**: O movimento de abertura de dados de ITBI está crescendo. Verificar periodicamente portais de dados abertos de cada município de interesse.

### 12.4 Base dos Dados (basedosdados.org) - Registro de Imóveis do Brasil

Dataset tratado e padronizado com dados de transferências imobiliárias dos cartórios, produzido pela ARISP (SP) e ARIRJ (RJ) em parceria com a FIPE.

- **Dados disponíveis**:
  - Transferências imobiliárias registradas **desde 2012**
  - Total de transferências mensais (por data do negócio jurídico e por data de registro)
  - Tipologias: compra e venda, herança, doação, entre outros
  - Cobertura: **mais de 400 ofícios de registro de imóveis de SP e RJ**
- **Acesso**: SQL (Google BigQuery), Python, R ou Stata via pacote `basedosdados`
- **URL**: https://basedosdados.org/dataset/1f81c113-41c2-493c-985a-c0f1502a37cd
- **Formato**: BigQuery SQL, download via pacotes Python/R
- **Custo**: Gratuito (BigQuery oferece 1 TB/mês gratuito de consultas)
- **Exemplo de consulta**:
  ```sql
  SELECT *
  FROM `basedosdados.br_registro_imoveis.transferencias`
  LIMIT 1000
  ```
- **IMPORTANTE**: Verificar diretamente no site se o dataset inclui **valores** de transação ou apenas contagens/volumes. A documentação enfatiza "quantidade de transações" como principal indicador publicado. Os microdados com valores podem estar restritos.
- **Uso no app**: Volumes de transação por região/período com certeza. Se contiver valores, é a melhor fonte padronizada para preços reais cobrindo SP + RJ desde 2012.

### 12.5 FIPE - Indicadores do Registro Imobiliário

Parceria entre Registro de Imóveis do Brasil e FIPE (desde 2019) para produção de indicadores e estatísticas sobre registros de operações imobiliárias.

- **Dados disponíveis**:
  - Estatísticas de transações registradas (volumes, tendências)
  - Dados mensais e trimestrais
  - Análise por tipo de operação e tipo de imóvel
- **Cobertura geográfica atual**:
  - **Informes mensais** — Capitais: São Paulo, Rio de Janeiro, Curitiba, Florianópolis, Recife, Campo Grande. Municípios: Campinas, Ribeirão Preto, Santos, São José dos Campos, Guarulhos, Joinville, Londrina, Maringá.
  - **Informes trimestrais**: Estado de São Paulo e suas mesorregiões (divisão IBGE)
  - Expansão contínua prevista
- **URL**: https://www.fipe.org.br/pt-br/indices/indicadores-do-registro-imobiliario/
- **Formato**: PDF (informes)
- **Custo**: Gratuito
- **Limitação**: Dados são **agregados** (estatísticas e indicadores), não microdados individuais de transações. Não publica preços individuais.
- **Uso no app**: Benchmark de volume de transações por cidade/região. Validação cruzada de tendências de mercado.

### 12.6 ONR - Operador Nacional do Sistema de Registro Eletrônico de Imóveis

Instituição oficial (Lei 13.465/2017) encarregada de implementar o Sistema de Registro Eletrônico de Imóveis (SREI), centralizando acesso a 3.600+ cartórios do Brasil.

- **Serviços principais**:
  - **Mapa do Registro de Imóveis** (https://mapa.onr.org.br/): Visualização de dados públicos sobre ocupação legal, incluindo **últimas vendas, número de matrícula, cartório responsável, e valores finais da última transação**. Usa IA para processar dados.
  - **RI Digital** (https://registradores.onr.org.br/): Visualização instantânea de matrículas, certidões digitais com assinatura eletrônica (validade 30 dias), alertas automáticos sobre alterações em matrículas monitoradas.
  - **PGV-CNM** (https://cnm.onr.org.br/): Validação gratuita de Código Nacional de Matrícula, sem cadastro.
- **API oficial**:
  - Portal de integração: https://integracao.registrodeimoveis.org.br/
  - Documentação Swagger: https://www.registrodeimoveis.org.br/swagger/index.html
  - Autenticação: JWT
  - **RESTRITO A CARTÓRIOS**: Destinada exclusivamente a empresas desenvolvedoras de sistemas para cartórios. O ONR **não fornece API para terceiros**, despachantes ou documentalistas. API não pode ser cedida. Violação = cancelamento de acesso.
  - **Anti-scraping**: Sistema bloqueia buscas massivas por robôs e acessos de fora do Brasil.
- **API via terceiros (Infosimples)**:
  - Web service JSON para consulta ao Mapa do ONR
  - URL: https://infosimples.com/consultas/onr-mapa-registro-imoveis/
  - Custo: Pago (por consulta, preço variável por volume — consultar calculadora em https://infosimples.com/consultas/precos/)
  - Consultas em tempo real nas fontes públicas originais
  - A Infosimples não comercializa bases de dados, apenas automação de consulta
- **Custo das certidões diretas**: Certidões digitais via RI Digital são pagas (emolumentos cartorários, variam por estado — tipicamente R$50-150 por certidão)
- **Uso no app**: O Mapa do ONR mostra valores da última transação por imóvel — útil para consulta pontual. Para uso em escala, Infosimples é a opção (paga). **Não há API aberta gratuita para consultas em massa.**

### 12.7 SINTER - Sistema Nacional de Gestão de Informações Territoriais

Sistema da Receita Federal (Decreto 8.764/2016, regulamentado pelo Decreto 11.208/2022) que integra dados de TODOS os imóveis do Brasil.

- **O que integra**:
  - Dados jurídicos de registros públicos (cartórios — escrituras, matrículas)
  - Dados fiscais e cadastrais municipais (IPTU urbano, ITR rural)
  - Dados rurais (INCRA/CNIR/CAR)
  - Dados geoespaciais (georreferenciamento de imóveis)
  - **CIB (Cadastro de Imóveis Brasileiros)**: Identificador único nacional de cada imóvel — funciona como "CPF do imóvel". Inscrição no CIB é gratuita.
- **Plataforma**: https://www.sinter.fazenda.gov.br/
- **Estado atual**: Lançado oficialmente em dezembro de 2022 pela Receita Federal. Em fase de expansão.
- **Desafios de implantação**:
  - Apenas **21% dos municípios** (1.159 de 5.570) possuem base cadastral georreferenciada (IBGE 2019)
  - 59% (3.300) possuem cadastro sem base georreferenciada
  - 20% (1.111) não possuem qualquer tipo de cadastro digital
  - Antes do SINTER: União tinha 20+ bases de dados rurais não interoperáveis; 5.570 cadastros urbanos diferentes sem padronização
- **Acesso público**: Cidadão terá acesso gratuito ao visualizador gráfico em mapa digital. Sem API pública aberta para desenvolvedores no momento.
- **Prazos**: Capitais até 01/01/2026, demais municípios até 01/01/2027
- **Uso no app**: **Futuro game-changer.** Quando plenamente implementado, será o sistema mais completo do Brasil integrando registro + fiscal + geoespacial. Monitorar evolução. Não utilizável programaticamente hoje.

### 12.8 Portal Estatístico Registral

Portal do Registro de Imóveis do Brasil com estatísticas e análises em parceria com a FIPE.

- **URL**: https://www.registrodeimoveis.org.br/portal-estatistico-registral
- **URL alternativa**: https://www.registrodeimoveis.org.br/estatisticas-imobiliarias
- **Dados**: Estatísticas de registros por cidade, tipo de operação, evolução temporal
- **Formato**: Relatórios online, gráficos interativos
- **Custo**: Gratuito
- **Uso no app**: Dados complementares de volume de mercado por região.

### 12.9 Resumo: Acesso a Preços Reais de Transação

| Fonte | Tem preço real? | Granularidade | Cobertura geográfica | Série histórica | Acesso | Custo |
|-------|----------------|---------------|---------------------|----------------|--------|-------|
| **ITBI São Paulo** | **Sim** (valor declarado) | Imóvel individual (SQL) | São Paulo capital | Desde 2019 | Download XLSX | Gratuito |
| **ITBI Data.Rio** | **Sim** (agregado por logradouro) | Logradouro/bairro | Rio de Janeiro | Desde 2010 | Download CSV/GeoJSON | Gratuito |
| **ITBI Recife** | **Sim** | Variável | Recife | Variável | Download | Gratuito |
| **ITBI Niterói** | **Sim** (médias) | Agregado | Niterói | Variável | Download | Gratuito |
| **Base dos Dados** | A verificar | Micro a agregado | SP + RJ (400+ cartórios) | Desde 2012 | BigQuery SQL | Gratuito |
| **FIPE Indicadores** | Não (só volumes) | Agregado por cidade | 14 cidades | Desde 2019 | PDF | Gratuito |
| **Mapa ONR** | **Sim** (última transação) | Imóvel individual | Nacional | Última transação | Web (pontual) | Gratuito (pontual) |
| **Infosimples/ONR** | **Sim** (última transação) | Imóvel individual | Nacional | Última transação | API JSON | Pago (por consulta) |
| **SINTER** | Futuro | Imóvel individual | Nacional (em implantação) | Futuro | Web | Gratuito (futuro) |

### 12.10 Hierarquia de Confiabilidade de Preços

| Nível | Fonte | Tipo de preço | Confiabilidade | Acesso |
|-------|-------|--------------|---------------|--------|
| 1 | **ITBI SP/RJ** (valor declarado na escritura) | Transação real | Alta (pode ter subdeclaração) | Gratuito |
| 2 | **Mapa ONR** (valor registrado em cartório) | Transação real | Alta | Gratuito (pontual) / Pago (escala) |
| 3 | **Base dos Dados ARISP/FIPE** (registro em cartório) | Transação real (se disponível) | Alta | Gratuito |
| 4 | **Valor venal ITBI** (referência da prefeitura) | Avaliação fiscal | Média-alta | Consulta individual |
| 5 | **FipeZAP** (média de anúncios) | Preço pedido (listing) | Média | Gratuito |
| 6 | **Scraping ZAP/QuintoAndar** (preço pedido) | Preço pedido (listing) | Média-baixa | Scraping |
| 7 | **DataZAP AVM** (algoritmo) | Estimativa algorítmica | Variável | Pago |

### 12.11 Estratégia Recomendada para Dados de Transação Real

**Fase 1 — Imediata (gratuito)**:
1. Download e parse dos dados de ITBI de São Paulo (XLSX desde 2019)
2. Download dos dados de ITBI do Data.Rio (CSV desde 2010)
3. Cruzar ITBI SP com GeoSampa (SQL → coordenadas → bairro → preço/m² real)
4. Consultar Base dos Dados via BigQuery para verificar se há valores de transação

**Fase 2 — Curto prazo (gratuito)**:
5. Integrar dados de ITBI de Recife e Niterói
6. Monitorar novos municípios que abram dados de ITBI
7. Baixar e analisar informes FIPE do Registro Imobiliário para volumes

**Fase 3 — Médio prazo (pago)**:
8. Avaliar Infosimples para consultas ao ONR em escala (para cidades sem ITBI aberto)
9. Monitorar evolução do SINTER para uso futuro

**Fase 4 — Longo prazo**:
10. Integrar SINTER quando houver API pública disponível
11. Usar CIB como identificador único para cruzar todas as fontes

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

### 13.6 ITBI Map (Mapa de Transações Reais - SP)

- **O que é**: Mapa interativo com 1M+ transações reais de ITBI em São Paulo
- **URL**: https://www.itbimap.com.br/
- **Dados**: Preços reais de transação geolocalizados, 15-30% mais precisos que preços de anúncio
- **Custo**: Gratuito (mapa interativo)
- **Uso no app**: Referência visual e de dados para validação de preços por localização em SP

### 13.7 IBGE API de Malhas v3 (GeoJSON direto via REST)

- **Endpoint**: `https://servicodados.ibge.gov.br/api/v3/malhas/estados/{UF}?formato=application/vnd.geo+json&resolucao={0-5}`
- **Resoluções**: 0=país, 1=região, 2=UF, 3=mesorregião, 4=microrregião, 5=município
- **Exemplo**: `https://servicodados.ibge.gov.br/api/v3/malhas/estados/SP?formato=application/vnd.geo+json&resolucao=5`
- **Docs**: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
- **Uso no app**: Boundaries de municípios sem precisar baixar arquivos — serve GeoJSON direto para o frontend

### 13.8 Dados Pré-processados (GitHub / Kaggle)

- **geodata-br** (GitHub): GeoJSON pré-construídos por estado, licença CC0 — https://github.com/tbrugz/geodata-br
- **Brazil GeoJSON** (Kaggle): https://www.kaggle.com/datasets/thiagobodruk/brazil-geojson
- **Brasil Real Estate** (Kaggle): Dataset de listings para análise — https://www.kaggle.com/datasets/ashishkumarjayswal/brasil-real-estate

### 13.9 Bairros — Nota sobre Fragmentação

- **Não existe um dataset nacional unificado de bairros.** Cada município define seus próprios limites.
- **IBGE Censo 2022** criou polígonos de bairros para grandes municípios (não todos). Tocantins e DF sem dados.
- **GeoSampa (SP)**: 96 distritos (não "bairros" oficiais) disponíveis via WMS/WFS
- **Forest-GIS Projeto Bairros**: Esforço crowdsourced para shapefile nacional — https://forest-gis.com/en/shapefile-bairros-das-cidades-brasileiras/
- Para SP no nível bairro, usar GeoSampa distritos ou setores censitários como proxy.

### 13.10 Stack Recomendada para Mapas

- **Frontend**: `react-leaflet` + `leaflet` (choropleth com GeoJSON do IBGE)
- **Heatmap de pontos**: plugin `leaflet.heat` (lat/lng + preço como intensidade)
- **Tiles base**: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Abordagem**: Buscar boundaries IBGE API → agregar preços por unidade geográfica → choropleth colorido por preço/m²

### 13.11 Visualizações Possíveis

| Visualização | Fontes | Viabilidade |
|---|---|---|
| **Heatmap preço/m² por cidade** | FipeZAP + IBGE malha municipal (API GeoJSON) | ✅ Imediato |
| **Mapa de valorização** | FipeZAP série histórica + IBGE malha | ✅ Imediato |
| **Heatmap Airbnb (SP e RJ)** | Inside Airbnb listings (lat/lng + preço) | ✅ Imediato |
| **Mapa de transações reais (SP)** | ITBI SP + ITBI Map | ✅ Imediato |
| **Choropleth yield por distrito (SP)** | ITBI SP + SECOVI + GeoSampa distritos | ✅ Viável |
| **Mapa demográfico** | IBGE Censo 2022 + malha setores censitários | ✅ Viável |
| **Mapa de oportunidades** | Scraping listings + FipeZAP como referência | ⚠️ Médio prazo |
| **Comparativo de bairros** | Yield + vacância + tendência por bairro | ⚠️ Médio prazo |
