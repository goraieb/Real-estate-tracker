# Cross-Dataset Analytics: Architecture & Implementation Guide

## Overview

The Real Estate Tracker has 6 data tables that, when cross-joined, produce investment insights
no single dataset can provide alone. This document explains every cross-join we've implemented,
the ones we deliberately chose not to build, the data quality caveats investors must understand,
and how to extend the system with new analyses.

---

## 1. Data Model — What We Have

### Table Inventory

```
┌───────────────────────┐     ┌──────────────────────────┐
│   transacoes_itbi     │     │   indicadores_economicos  │
│   (1M+ rows)          │     │   (EAV pattern)           │
├───────────────────────┤     ├──────────────────────────┤
│ bairro                │     │ fonte: bcb/abecip/secovi/ │
│ preco_m2              │     │        ipeadata/b3        │
│ data_transacao        │     │ serie: selic/ipca/igpm/   │
│ tipo_imovel           │     │        cdi/ifix/vso/...   │
│ area_construida       │     │ data                      │
│ latitude/longitude    │     │ valor                     │
└───────┬───────────────┘     └─────────┬────────────────┘
        │                               │
        │  bairro        month          │  month
        │                               │
┌───────┴───────────────┐     ┌─────────┴────────────────┐
│   airbnb_listings     │     │   fipezap_precos          │
│   (SP + RJ only)      │     │   (10 cities)             │
├───────────────────────┤     ├──────────────────────────┤
│ bairro                │     │ tipo: venda/locacao       │
│ preco_noite           │     │ cidade                    │
│ disponibilidade_365   │     │ data                      │
│ qtd_reviews           │     │ preco_m2                  │
│ tipo_quarto           │     │ variacao_mensal           │
│ latitude/longitude    │     └──────────────────────────┘
└───────────────────────┘
        ▲
        │  bairro
┌───────┴───────────────┐
│   imoveis (portfolio) │
├───────────────────────┤
│ bairro, cidade        │
│ valor_compra          │
│ data_compra           │
│ aluguel_mensal        │
│ diaria_media          │
│ valor_atual_estimado  │
└───────────────────────┘
```

### Join Key Compatibility

| Table A             | Table B                  | Join Key                          | Quality  |
|---------------------|--------------------------|-----------------------------------|----------|
| transacoes_itbi     | airbnb_listings          | `bairro` (case-insensitive)       | Good     |
| transacoes_itbi     | fipezap_precos           | `cidade` + `month`                | Good     |
| transacoes_itbi     | indicadores_economicos   | `month` (strftime('%Y-%m'))       | Good     |
| fipezap_precos      | fipezap_precos (self)    | `cidade` + `data` (venda×locação) | Exact    |
| imoveis             | transacoes_itbi          | `bairro`                          | Good     |
| imoveis             | indicadores_economicos   | `data_compra` → date range        | Good     |
| airbnb_listings     | fipezap_precos           | `cidade` (SP/RJ only)             | Limited  |
| transacoes_itbi     | airbnb_listings (spatial)| `latitude/longitude` radius       | **Impractical** — no spatial index |

### The EAV Constraint

`indicadores_economicos` stores all economic data in one table using an Entity-Attribute-Value
pattern. Every join requires a CTE or subquery to pivot:

```sql
-- To use Selic in a join:
WITH selic AS (
  SELECT strftime('%Y-%m', data) as mes, valor
  FROM indicadores_economicos
  WHERE fonte = 'bcb' AND serie = 'selic'
)
SELECT t.bairro, AVG(t.preco_m2), s.valor as selic
FROM transacoes_itbi t
JOIN selic s ON strftime('%Y-%m', t.data_transacao) = s.mes
GROUP BY t.bairro
```

We standardized this with `indicators_helper.py`:
- `get_indicator_series(db, fonte, serie)` → single series
- `get_indicators_pivot(db, series_list, months)` → wide-format multi-series
- `get_latest_indicator(db, fonte, serie)` → most recent value

### Available Series in `indicadores_economicos`

| fonte     | serie                     | Frequency | Description                                |
|-----------|---------------------------|-----------|--------------------------------------------|
| bcb       | selic                     | Daily     | Selic target rate (% a.a.)                 |
| bcb       | ipca                      | Monthly   | Monthly IPCA inflation (% change)          |
| bcb       | igpm                      | Monthly   | IGP-M inflation index (% change)           |
| bcb       | cdi                       | Daily     | CDI rate (≈ Selic)                         |
| bcb       | incc                      | Monthly   | Construction cost index                    |
| bcb       | financiamento_imobiliario | Monthly   | Average mortgage rate                      |
| abecip    | taxa_media_imobiliario    | Monthly   | SBPE average mortgage rate                 |
| abecip    | volume_financiamento      | Monthly   | Credit concession volume (R$)              |
| abecip    | inadimplencia_imobiliario | Monthly   | Mortgage delinquency rate (%)              |
| secovi    | vso                       | Monthly   | Sales velocity (% of stock sold/month)     |
| secovi    | locacao_m2_sp             | Monthly   | Rental price per m² in SP                  |
| ipeadata  | renda_media               | Monthly   | Median household income                    |
| ipeadata  | pib_real                  | Quarterly | Real GDP                                   |
| b3        | ifix                      | Daily     | IFIX (REIT) index                          |
| b3        | ntnb                      | Point     | NTN-B (IPCA+ bond) rate                    |

---

## 2. Implemented Cross-Joins (6 Endpoints)

### 2.1 Neighborhood Investment Scorecard

**Endpoint:** `GET /api/v1/market/neighborhood-scorecard`
**File:** `backend/src/api/market_routes.py`

**What it crosses:**
```
transacoes_itbi (price, momentum)
  × airbnb_listings (short-term yield)
  × indicadores_economicos/secovi (long-term yield)
  × indicadores_economicos/bcb (Selic, CDI for spread)
```

**Logic:**
1. ITBI: Avg price/m² per bairro (last 6 months) + same metric 6-12 months ago → momentum
2. Airbnb: Avg nightly rate × occupancy × 12 ÷ (price/m² × 50m²) → short-term yield
3. SECOVI: City-wide rental/m² × bairro multiplier × 12 ÷ price/m² → long-term yield
4. Best yield = max(Airbnb, SECOVI) - Selic → spread in pp
5. Total return = yield + annualized momentum - CDI → excess return
6. Arbitrage flag: price < city median AND yield > city median

**Output per bairro:**
```json
{
  "bairro": "Pinheiros",
  "precoM2": 14250.50,
  "momentum6mPct": 3.2,
  "yieldAirbnbPct": 5.8,
  "yieldLongtermPct": 4.1,
  "bestYieldPct": 5.8,
  "spreadVsSelicPp": -7.95,
  "totalReturnVsCdiPp": -0.55,
  "liquidityScore": 342,
  "airbnbDensity": 85,
  "isArbitrage": false
}
```

**Investor interpretation:** Negative Selic spread is normal in Brazil (Selic ~13.75%).
The total return vs CDI matters more — it includes capital appreciation.
Positive `totalReturnVsCdiPp` means real estate outperformed bonds in that neighborhood.

---

### 2.2 Market Timing Dashboard

**Endpoint:** `GET /api/v1/market/timing-signals`
**File:** `backend/src/api/market_routes.py`

**What it crosses:**
```
indicadores_economicos (selic × taxa_media × volume_financiamento × inadimplencia × vso)
  × transacoes_itbi (monthly count + avg price)
  × indicadores_economicos/ipeadata (renda_media for affordability)
```

**Composite signal scoring:**

| Indicator          | Bullish (+1)           | Bearish (-1)             |
|--------------------|------------------------|--------------------------|
| Selic direction    | Falling                | Rising                   |
| Credit volume      | Expanding              | Contracting              |
| VSO                | < 10% (low)            | > 15% (overheated)       |
| ITBI volume        | > 5% MoM growth        | > 5% MoM decline         |
| Delinquency        | Stable or falling      | Rising                   |

- Score ≥ +2 → **Favorable** (conditions support buying)
- Score ≤ -2 → **Unfavorable** (conditions suggest caution)
- Otherwise → **Neutral**

**Affordability index:** `(median_itbi_price × 65m²) / (monthly_income × 12)`
Measures how many years of income to buy a median apartment.

---

### 2.3 City Yields (FipeZAP Self-Join)

**Endpoint:** `GET /api/v1/market/city-yields`
**File:** `backend/src/api/market_routes.py`

**What it crosses:**
```sql
SELECT v.cidade, v.data,
       (l.preco_m2 * 12.0 / v.preco_m2) * 100 as yield_bruto_pct
FROM fipezap_precos v
INNER JOIN fipezap_precos l
    ON v.cidade = l.cidade AND v.data = l.data
WHERE v.tipo = 'venda' AND l.tipo = 'locacao'
```

This is a **self-join** on fipezap_precos: sale prices × rental prices, matched by city and month.

**Available cities (where both venda and locação exist):**
São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Porto Alegre, Recife

**Typical yield range:** 3.5%–7.0% gross. Cities in the Northeast tend to have higher yields
(lower prices, relatively stable rents) while SP/RJ have lower yields (high prices).

---

### 2.4 Real Price Appreciation (ITBI × IPCA)

**Endpoint:** `GET /api/v1/market/real-appreciation?bairro=Pinheiros&months=24`
**File:** `backend/src/api/market_routes.py`

**What it crosses:**
```
transacoes_itbi (monthly avg price by bairro)
  × indicadores_economicos (bcb/ipca cumulative index)
```

**Logic:**
1. Build cumulative IPCA index: for each month, `index *= (1 + ipca_monthly/100)`
2. For each bairro: nominal change = `(last_price - first_price) / first_price`
3. Real change = `(last_price / first_price) / (ipca_last / ipca_first) - 1`

**Why this matters:**
A neighborhood showing +15% nominal appreciation over 2 years with 10% cumulative IPCA
actually had only ~4.5% real return. Many investors confuse nominal with real gains.

---

### 2.5 Portfolio vs Neighborhood (imoveis × ITBI × Selic)

**Endpoint:** `GET /api/v1/imoveis/{id}/market-comparison`
**File:** `backend/src/api/routes.py`

**What it crosses:**
```
imoveis (user's property)
  × transacoes_itbi (same bairro, last 6 months → median, min, max)
  × indicadores_economicos (bcb/selic → spread)
```

**Output:**
```json
{
  "imovel": { "precoM2": 12500, "yieldBrutoPct": 5.2, "spreadVsSelicPp": -8.55 },
  "bairro": { "precoM2Medio": 14200, "precoM2Min": 8500, "precoM2Max": 22000, "qtdTransacoes": 180 },
  "comparison": { "precoM2VsBairro": -11.97, "status": "below_market" }
}
```

If user's price/m² is >10% below bairro median → "below_market" (potential value).
If >10% above → "above_market" (premium paid or overvalued).

---

### 2.6 Opportunity Cost Calculator (imoveis × IFIX × CDI)

**Endpoint:** `GET /api/v1/imoveis/{id}/opportunity-cost`
**File:** `backend/src/api/routes.py`

**What it crosses:**
```
imoveis (data_compra, valor_compra, valor_atual, aluguel_mensal)
  × indicadores_economicos (b3/ifix → REIT counterfactual)
  × indicadores_economicos (bcb/selic → CDI counterfactual)
```

**CDI calculation:**
- Uses average Selic over holding period as CDI proxy
- Applies Brazilian IR regressive table: 22.5% (<6mo), 20% (6-12mo), 17.5% (1-2yr), 15% (>2yr)
- Returns net-of-tax value

**IFIX calculation:**
- `ifix_return = ifix_today / ifix_at_purchase - 1`
- `counterfactual = valor_compra × (1 + ifix_return)`

**Verdict:** Compares total real estate return (capital gain + rental income) against
net CDI return. Returns `"melhorOpcao": "imovel"` or `"cdi"`.

---

## 3. Data Quality Caveats (What Investors Must Know)

### Airbnb: No Area, No Real Occupancy

The `airbnb_listings` table has **no `area` column**. Every yield calculation that needs price/m²
uses a hardcoded assumption of 50m² per listing. This is roughly correct for SP apartments but
wrong for houses, studios, and shared rooms.

Occupancy is derived as `(365 - disponibilidade_365) / 365`. This measures **unavailability**,
not actual bookings. A host who blocks weekdays will appear to have high "occupancy" despite
low actual revenue. We cap at 85% and filter listings with 0 reviews to reduce noise.

**Impact:** Airbnb yield estimates are directionally correct for bairro-level comparisons but
should not be trusted as absolute numbers for individual properties.

### SECOVI Multipliers: Hardcoded, Not Data-Driven

The SECOVI rental client (`secovi.py`) uses manually maintained neighborhood multipliers:

| Bairro          | Multiplier | Bairro       | Multiplier |
|-----------------|------------|--------------|------------|
| Itaim Bibi      | 1.55       | Jabaquara    | 0.80       |
| Jardim Paulista | 1.50       | Tucuruvi     | 0.80       |
| Vila Olímpia    | 1.50       | Butantã      | 0.85       |
| Pinheiros       | 1.45       | Ipiranga     | 0.85       |
| Moema           | 1.40       | Casa Verde   | 0.75       |
| Vila Madalena   | 1.35       | Santo Amaro  | 0.90       |
| Brooklin        | 1.35       | Santana      | 0.95       |
| Morumbi         | 1.30       | (default)    | 1.00       |

These multiply the city-wide SECOVI rental index (currently ~R$ 62.50/m²). Neighborhoods
not in the table default to 1.0×. These multipliers are approximations from SECOVI regional
reports and may drift over time.

### ITBI Transaction Prices: Declared, Not Market

ITBI (Imposto sobre Transmissão de Bens Imóveis) values are **declared by the buyer** to the
municipal government. They are often **below actual market prices** because:
- Buyers minimize declared value to reduce the ITBI tax (3% in SP)
- The Prefeitura has a reference value floor, but it's often below market
- Cash transactions are more commonly under-declared

**Expected discount:** ITBI values typically run 5-15% below FipeZAP or real market prices.
This is consistent across neighborhoods, so **relative comparisons** (bairro A vs B) are valid
even if absolute levels are understated.

### FipeZAP: City-Level Only

FipeZAP provides price/m² indexes for 10 Brazilian cities, not per-neighborhood. The cities are:
São Paulo, Rio de Janeiro, Belo Horizonte, Curitiba, Porto Alegre, Recife, Brasília,
Fortaleza, Salvador, Florianópolis.

Rental data (locação) is only available for a subset (~6 cities). This limits the city-yields
cross-join to cities where both venda and locação data exist.

### indicadores_economicos: Seeded, Not Always Live

The economic indicators table is populated by the `data_loader.py` service, which calls live
APIs (BCB, Ipeadata, B3). If the data hasn't been loaded recently, the cached values may be
stale. The `benchmark.py` service bypasses this table entirely and calls BCB live — so the
main dashboard always has current rates, but the cross-join analytics depend on the cache.

---

## 4. Analyses We Chose NOT to Build (and Why)

### Spatial Proximity Joins

Joining ITBI transactions to nearby Airbnb listings by lat/lng distance would give hyper-local
yield estimates (e.g., "Airbnb listings within 500m of this transaction"). However, SQLite has
no spatial index. On 1M+ ITBI rows × 50K+ Airbnb listings, a distance-based join is O(n×m)
and would take minutes per query. **Use bairro-level aggregation instead.**

To enable spatial joins in the future: migrate to PostGIS, or pre-compute bairro assignments
and join on that column (which is what we do today).

### FipeZAP vs SECOVI Rental Crosscheck

Comparing two independent rental price sources sounds valuable but produces "the data sources
disagree by X%" — which tells the investor nothing actionable. Both sources have different
methodologies (FipeZAP = advertised prices, SECOVI = signed contracts). The disagreement is
structural, not informative.

### INCC Passthrough to Prices

Comparing construction cost inflation (INCC) against sale price changes reveals whether
developers are absorbing costs or passing them through. This is relevant for **developers and
builders**, not for individual investors buying existing properties.

### Portfolio Stress Testing

Modeling "what if Selic rises 300bps?" or "what if vacancy doubles?" requires a full scenario
simulation engine with correlation matrices. This is over-engineered for the current stage of
the app. The opportunity cost calculator provides the key "what if" comparison investors need.

### IFIX vs Selic Inverse Correlation

The inverse relationship between IFIX (REIT index) and Selic is well-documented in every
Brazilian finance textbook. Plotting it confirms what everyone already knows — no edge.

---

## 5. How to Add New Cross-Joins

### Step 1: Define the SQL

Every cross-join against `indicadores_economicos` follows this CTE pattern:

```python
from ..services.indicators_helper import get_indicators_pivot

series_list = [
    ("bcb", "selic", "selic"),
    ("bcb", "ipca", "ipca"),
    # Add more as needed
]
indicators = await get_indicators_pivot(db, series_list, months=24)
```

For ITBI data, always filter outliers: `preco_m2 BETWEEN 500 AND 150000`

### Step 2: Add the Endpoint

Add to `backend/src/api/market_routes.py` under the `router` (prefix `/api/v1/market`):

```python
@router.get("/my-new-analysis")
async def my_analysis():
    db = await get_db()
    try:
        # Your cross-join logic here
        return {"data": result}
    finally:
        await db.close()
```

### Step 3: Add the Frontend API Function

Add to `frontend/src/services/marketApi.ts`:

```typescript
export interface MyAnalysisResponse { /* ... */ }

export async function fetchMyAnalysis(): Promise<MyAnalysisResponse> {
  try {
    return await fetchJson('/api/v1/market/my-new-analysis');
  } catch {
    return { /* empty fallback */ };
  }
}
```

### Step 4: Add the Component

Create `frontend/src/components/MyAnalysis.tsx`, following the pattern of
`NeighborhoodScorecard.tsx` (data table) or `MarketTimingDashboard.tsx` (charts + signals).

Use `useThemeColors()` for Recharts colors that adapt to dark mode.

---

## 6. Cross-Join Reference Matrix

This matrix shows every possible pairwise join between the 5 tables and whether we
implemented it, skipped it, or it's a future candidate.

| Table A ↓ / Table B → | transacoes_itbi | airbnb_listings | fipezap_precos | indicadores_eco | imoveis |
|------------------------|:-:|:-:|:-:|:-:|:-:|
| **transacoes_itbi**    | Self-join (momentum) | Scorecard (yield) | Price gap (future) | Real appreciation | Portfolio comps |
| **airbnb_listings**    | — | Self (density) | Limited (2 cities) | — | Portfolio Airbnb |
| **fipezap_precos**     | — | — | Self-join (city yields) | Price vs CUB (future) | Valuation |
| **indicadores_eco**    | — | — | — | Self-pivot (timing signals) | Opportunity cost |
| **imoveis**            | — | — | — | — | — |

**Legend:**
- **Bold** = implemented
- "future" = high value, not yet built
- "Limited" = data coverage prevents useful analysis

---

## 7. Key SQL Patterns Used

### CTE with Temporal Self-Join (Momentum)

```sql
WITH recent AS (
    SELECT bairro, AVG(preco_m2) as preco_m2_atual
    FROM transacoes_itbi
    WHERE data_transacao >= date('now', '-6 months')
    GROUP BY bairro
),
prior AS (
    SELECT bairro, AVG(preco_m2) as preco_m2_anterior
    FROM transacoes_itbi
    WHERE data_transacao >= date('now', '-12 months')
      AND data_transacao < date('now', '-6 months')
    GROUP BY bairro
)
SELECT r.bairro,
       r.preco_m2_atual,
       (r.preco_m2_atual - p.preco_m2_anterior) / p.preco_m2_anterior * 100 as momentum
FROM recent r
LEFT JOIN prior p ON r.bairro = p.bairro
```

### FipeZAP Self-Join (Venda × Locação)

```sql
SELECT v.cidade, v.data,
       (l.preco_m2 * 12.0 / v.preco_m2) * 100 as yield_pct
FROM fipezap_precos v
INNER JOIN fipezap_precos l ON v.cidade = l.cidade AND v.data = l.data
WHERE v.tipo = 'venda' AND l.tipo = 'locacao'
```

### EAV Pivot (Multiple Indicators)

```python
# Python-side pivot using indicators_helper
series = [("bcb", "selic", "selic"), ("abecip", "taxa_media_imobiliario", "mortgage")]
wide_data = await get_indicators_pivot(db, series, months=24)
# Returns: [{"mes": "2024-01", "selic": 11.75, "mortgage": 9.5}, ...]
```

### Cumulative Index from Monthly % Changes (IPCA)

```python
cumulative = 1.0
for row in ipca_rows:
    cumulative *= (1 + row["valor"] / 100)
    ipca_index[row["data"][:7]] = cumulative

# Deflate: real_return = (nominal_price_change / ipca_change) - 1
```

---

## 8. Frontend Components Architecture

```
App.tsx
├── "Evolução" tab
│   ├── MarketTimingDashboard.tsx  ← NEW (timing signals + sparklines)
│   ├── NeighborhoodScorecard.tsx  ← NEW (sortable table + arbitrage filter)
│   ├── EconomicIndicators.tsx     (existing BCB data display)
│   ├── FipeZapChart.tsx           (extended with "Yield por Cidade" tab)
│   ├── PortfolioEvolution.tsx     (existing stacked area chart)
│   └── EquityDebtChart.tsx        (existing base-100 comparison)
├── "Dashboard" tab
│   ├── PropertyCard.tsx           (per-property; future: add bairro comparison badge)
│   └── BenchmarkChart.tsx         (per-property; future: add CDI/IFIX counterfactual)
└── "Explorador de Mercado" tab
    └── MarketExplorer.tsx         (existing ITBI map with 7 layers)
```

### Data Flow

```
Backend API                    Frontend Service           Component
────────────                   ─────────────────          ─────────
/neighborhood-scorecard  →  fetchNeighborhoodScorecard()  →  NeighborhoodScorecard
/timing-signals          →  fetchTimingSignals()          →  MarketTimingDashboard
/city-yields             →  fetchCityYields()             →  FipeZapChart (city_yields view)
/real-appreciation       →  fetchRealAppreciation()       →  (future component)
/imoveis/{id}/market-comparison  →  (future)              →  PropertyCard (badge)
/imoveis/{id}/opportunity-cost   →  (future)              →  BenchmarkChart (line)
```

---

## 9. Future Work — Highest-Value Additions

### Near-term (extend existing endpoints)

1. **ITBI vs FipeZAP price gap** — Add city-level comparison between actual transaction prices
   and the FipeZAP index to quantify the "ITBI discount" over time.

2. **Price vs CUB (construction cost)** — Join FipeZAP sale prices against CUB/m² from
   `indicadores_economicos` to show developer margin trends. High ratio = land premium.

3. **Frontend for real-appreciation** — The endpoint exists but has no dedicated component.
   Add a toggle to `PriceEvolutionChart.tsx` for nominal vs real view.

### Medium-term (new endpoints)

4. **Credit cycle phase classifier** — Use the timing-signals data to classify into 4 phases:
   expansion (falling rates + growing credit), peak (rising delinquency), contraction
   (rising rates + falling volume), trough (low VSO + stable delinquency).

5. **Portfolio refinancing opportunity** — Compare user's `taxa_juros_anual` against current
   `taxa_media_imobiliario` from ABECIP. If market rate < user rate, quantify savings.

6. **Neighborhood price forecasting** — Use 12-month ITBI price trends + credit conditions
   to project 6-month price ranges (simple linear extrapolation, not ML).

### Long-term (infrastructure changes needed)

7. **Spatial joins** — Migrate to PostgreSQL + PostGIS for true lat/lng proximity queries.
   Enables "Airbnb listings within 500m" and hyper-local yield estimation.

8. **Live indicator refresh** — Add a scheduled task that refreshes `indicadores_economicos`
   daily from BCB/Ipeadata/B3 APIs, ensuring cross-joins always have fresh data.

9. **Multi-city ITBI** — Extend ITBI scraping beyond São Paulo to Rio de Janeiro, Curitiba,
   and other cities that publish open data. This would make the scorecard and appreciation
   endpoints work across multiple markets.
