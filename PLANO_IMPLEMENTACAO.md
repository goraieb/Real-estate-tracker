# Plano de Implementação — Real Estate Tracker

## Visão Geral

Transformar o protótipo atual (backend funcional + frontend com mock data) em uma aplicação completa com:
- Persistência em SQLite
- Integração real com APIs (BCB, IBGE, FipeZAP)
- Formulário CRUD de imóveis
- Mapas interativos com heatmap de preços
- Simulador de financiamento (SAC/PRICE)
- State management robusto no frontend

---

## Fase 1 — Infraestrutura de Dados (SQLite + CRUD Backend)

### 1.1 Banco de Dados SQLite

**Arquivo:** `backend/src/database/db.py`

```python
# Gerenciador de conexão SQLite com aiosqlite
# - create_tables() automático no startup
# - get_db() dependency injection para FastAPI
# - Caminho configurável via DATABASE_URL env var (default: data/imoveis.db)
```

**Arquivo:** `backend/src/database/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS imoveis (
    id TEXT PRIMARY KEY,           -- UUID
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,             -- enum: apartamento, casa, comercial, etc.

    -- Endereço
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT DEFAULT 'SP',
    cep TEXT,
    latitude REAL,
    longitude REAL,

    -- Características
    area_util REAL NOT NULL,
    area_total REAL,
    quartos INTEGER DEFAULT 0,
    vagas INTEGER DEFAULT 0,
    andar INTEGER,
    ano_construcao INTEGER,

    -- Compra
    valor_compra REAL,
    data_compra TEXT,              -- ISO date
    valor_escritura REAL,
    itbi_pago REAL,
    custos_cartorio REAL,
    comissao_corretor REAL,

    -- Financiamento
    valor_financiado REAL,
    taxa_juros_anual REAL,
    prazo_meses INTEGER,
    banco TEXT,
    sistema TEXT DEFAULT 'SAC',
    saldo_devedor REAL,

    -- Custos recorrentes
    iptu_anual REAL DEFAULT 0,
    condominio_mensal REAL DEFAULT 0,
    seguro_anual REAL DEFAULT 0,
    manutencao_mensal REAL DEFAULT 0,

    -- Renda
    tipo_renda TEXT DEFAULT 'ALUGUEL_LONGTERM',
    aluguel_mensal REAL,
    taxa_vacancia_pct REAL DEFAULT 0,
    diaria_media REAL,
    taxa_ocupacao_pct REAL,
    custos_plataforma_pct REAL DEFAULT 3,

    -- Avaliação
    valor_atual_estimado REAL,
    data_ultima_avaliacao TEXT,
    fonte_avaliacao TEXT,

    -- Metadata
    sql_cadastral TEXT,
    matricula TEXT,
    notas TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_imoveis_cidade ON imoveis(cidade);
CREATE INDEX idx_imoveis_bairro ON imoveis(bairro);
CREATE INDEX idx_imoveis_tipo ON imoveis(tipo);
```

### 1.2 Repository Pattern

**Arquivo:** `backend/src/database/repository.py`

```python
class ImovelRepository:
    async def criar(imovel_data: dict) -> dict       # INSERT + return with id
    async def listar() -> list[dict]                   # SELECT ALL
    async def buscar(id: str) -> Optional[dict]        # SELECT by id
    async def atualizar(id: str, data: dict) -> dict   # UPDATE
    async def deletar(id: str) -> bool                 # DELETE
    async def buscar_por_cidade(cidade: str) -> list    # Filter by city
    async def buscar_por_bairro(bairro: str) -> list    # Filter by neighborhood
```

### 1.3 Endpoints CRUD

**Arquivo:** `backend/src/api/routes.py` (adicionar)

```
POST   /api/v1/imoveis           → Criar imóvel
GET    /api/v1/imoveis           → Listar todos
GET    /api/v1/imoveis/{id}      → Buscar por ID
PUT    /api/v1/imoveis/{id}      → Atualizar
DELETE /api/v1/imoveis/{id}      → Deletar
GET    /api/v1/imoveis/{id}/yield → Calcular yield do imóvel
GET    /api/v1/imoveis/{id}/valuation → Avaliação atualizada
```

**Pydantic Schemas (adicionar a routes.py):**

```python
class ImovelCreate(BaseModel):
    nome: str
    tipo: str  # apartamento, casa, etc.
    # Endereço
    logradouro: str = ""
    numero: str = ""
    bairro: str = ""
    cidade: str = "São Paulo"
    uf: str = "SP"
    cep: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Características
    area_util: float
    quartos: int = 0
    vagas: int = 0
    andar: Optional[int] = None
    ano_construcao: Optional[int] = None
    # Financeiro
    valor_compra: float
    data_compra: str  # YYYY-MM-DD
    iptu_anual: float = 0
    condominio_mensal: float = 0
    seguro_anual: float = 0
    manutencao_mensal: float = 0
    # Renda
    tipo_renda: str = "ALUGUEL_LONGTERM"
    aluguel_mensal: Optional[float] = None
    diaria_media: Optional[float] = None
    taxa_ocupacao_pct: Optional[float] = None
    taxa_vacancia_pct: float = 0

class ImovelUpdate(BaseModel):
    # Todos opcionais para PATCH-style update
    nome: Optional[str] = None
    valor_compra: Optional[float] = None
    aluguel_mensal: Optional[float] = None
    # ... demais campos
```

### 1.4 Dependências Novas (backend)

```
# Adicionar ao requirements.txt
aiosqlite>=0.19.0
```

**Estimativa de arquivos:**
| Ação | Arquivo |
|------|---------|
| Criar | `backend/src/database/__init__.py` |
| Criar | `backend/src/database/db.py` |
| Criar | `backend/src/database/schema.sql` |
| Criar | `backend/src/database/repository.py` |
| Modificar | `backend/src/api/routes.py` |
| Modificar | `backend/requirements.txt` |
| Criar | `backend/tests/test_crud.py` |

---

## Fase 2 — Integração Frontend ↔ Backend (API Real)

### 2.1 API Client Service

**Arquivo:** `frontend/src/services/api.ts`

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Wrapper genérico com error handling
async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T>

// Endpoints tipados:
export const api = {
  // Imóveis CRUD
  imoveis: {
    listar: () => fetchAPI<Imovel[]>('/api/v1/imoveis'),
    buscar: (id: string) => fetchAPI<Imovel>(`/api/v1/imoveis/${id}`),
    criar: (data: ImovelCreate) => fetchAPI<Imovel>('/api/v1/imoveis', { method: 'POST', body }),
    atualizar: (id: string, data: Partial<ImovelCreate>) => fetchAPI('/api/v1/imoveis/${id}', { method: 'PUT', body }),
    deletar: (id: string) => fetchAPI(`/api/v1/imoveis/${id}`, { method: 'DELETE' }),
    getYield: (id: string) => fetchAPI(`/api/v1/imoveis/${id}/yield`),
  },
  // Dados de mercado
  benchmark: {
    atual: () => fetchAPI<BenchmarkData>('/api/v1/benchmark'),
    comparar: (yieldPct: number) => fetchAPI(`/api/v1/benchmark/comparar?yield_imovel=${yieldPct}`),
  },
  // BCB
  bcb: {
    serie: (nome: string) => fetchAPI(`/api/v1/bcb/${nome}`),
  },
  // IBGE
  ibge: {
    municipios: (uf: string) => fetchAPI(`/api/v1/ibge/municipios/${uf}`),
    populacao: (cod: string) => fetchAPI(`/api/v1/ibge/populacao/${cod}`),
  },
  // Yield calculators
  yield: {
    longterm: (data: YieldRequest) => fetchAPI('/api/v1/yield/longterm', { method: 'POST', body }),
    airbnb: (data: AirbnbYieldRequest) => fetchAPI('/api/v1/yield/airbnb', { method: 'POST', body }),
  },
};
```

### 2.2 TypeScript Types (Frontend)

**Arquivo:** `frontend/src/types/index.ts`

```typescript
// Tipos alinhados com o backend
export interface Imovel {
  id: string;
  nome: string;
  tipo: TipoImovel;
  // Endereço
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude?: number;
  longitude?: number;
  // Características
  area_util: number;
  quartos: number;
  vagas: number;
  // Financeiro
  valor_compra: number;
  data_compra: string;
  iptu_anual: number;
  condominio_mensal: number;
  seguro_anual: number;
  manutencao_mensal: number;
  // Renda
  tipo_renda: 'ALUGUEL_LONGTERM' | 'AIRBNB' | 'MISTO';
  aluguel_mensal?: number;
  diaria_media?: number;
  taxa_ocupacao_pct?: number;
  taxa_vacancia_pct: number;
  // Avaliação
  valor_atual_estimado?: number;
  criado_em: string;
}

export type TipoImovel = 'apartamento' | 'casa' | 'comercial' | 'terreno' | 'sala' | 'loja' | 'galpao';

export interface BenchmarkData {
  selic_anual: number;
  ipca_12m: number;
  igpm_12m: number;
  poupanca_anual: number;
  financiamento_tx: number;
}

export interface YieldResult {
  yield_bruto: number;
  yield_liquido: number;
  receita_bruta_anual: number;
  receita_liquida_anual: number;
  custos_totais_anual: number;
  ir_anual: number;
}
```

### 2.3 State Management (Zustand)

**Arquivo:** `frontend/src/store/useStore.ts`

```typescript
import { create } from 'zustand';

interface AppState {
  // Imóveis
  imoveis: Imovel[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;

  // Benchmarks (cache)
  benchmarks: BenchmarkData | null;
  benchmarksLoadedAt: number | null;

  // Actions
  fetchImoveis: () => Promise<void>;
  selectImovel: (id: string | null) => void;
  criarImovel: (data: ImovelCreate) => Promise<void>;
  atualizarImovel: (id: string, data: Partial<ImovelCreate>) => Promise<void>;
  deletarImovel: (id: string) => Promise<void>;
  fetchBenchmarks: () => Promise<void>;
}
```

### 2.4 Proxy de Desenvolvimento (Vite)

**Arquivo:** `frontend/vite.config.ts` (modificar)

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
```

### 2.5 Refatorar Componentes Existentes

| Componente | Mudança |
|-----------|---------|
| `App.tsx` | Trocar `useState` por `useStore()`, carregar dados via API no `useEffect` |
| `PropertyCard.tsx` | Receber `Imovel` (novo type), remover cálculos inline, chamar store |
| `YieldBreakdown.tsx` | Buscar yield do backend (`/api/v1/imoveis/{id}/yield`) |
| `BenchmarkChart.tsx` | Buscar benchmarks reais (`/api/v1/benchmark`) |
| `PortfolioSummary.tsx` | Derivar métricas de `imoveis[]` do store |

### 2.6 Remover Mock Data

- Deletar `frontend/src/services/mockData.ts`
- Deletar constantes `MOCK_BENCHMARKS` de componentes

**Dependências novas (frontend):**
```
npm install zustand
```

**Estimativa de arquivos:**
| Ação | Arquivo |
|------|---------|
| Criar | `frontend/src/services/api.ts` |
| Criar | `frontend/src/types/index.ts` |
| Criar | `frontend/src/store/useStore.ts` |
| Modificar | `frontend/vite.config.ts` |
| Modificar | `frontend/src/App.tsx` |
| Modificar | `frontend/src/components/PropertyCard.tsx` |
| Modificar | `frontend/src/components/YieldBreakdown.tsx` |
| Modificar | `frontend/src/components/BenchmarkChart.tsx` |
| Modificar | `frontend/src/components/PortfolioSummary.tsx` |
| Deletar | `frontend/src/services/mockData.ts` |

---

## Fase 3 — Formulário de Imóvel (CRUD Frontend)

### 3.1 Modal Multi-Step

**Arquivo:** `frontend/src/components/PropertyForm.tsx`

```
Formulário em 4 steps (accordion ou stepper):

Step 1: Identificação
  - nome (text) *
  - tipo (select: apartamento, casa, comercial, terreno, sala, loja, galpão) *
  - Endereço: logradouro, numero, bairro, cidade, uf, cep
  - Mapa pin-drop para lat/lng (integra com Leaflet da Fase 4)

Step 2: Características
  - area_util (number) *
  - quartos (number)
  - vagas (number)
  - andar (number)
  - ano_construcao (number)

Step 3: Financeiro
  - valor_compra (currency input) *
  - data_compra (date) *
  - Custos aquisição: escritura, itbi, cartorio, corretor
  - Custos recorrentes: iptu_anual, condominio_mensal, seguro_anual, manutencao_mensal
  - Financiamento (toggle): valor_financiado, taxa_juros, prazo, banco, sistema

Step 4: Renda
  - tipo_renda (radio: Aluguel LP, Airbnb, Misto)
  - Se LP: aluguel_mensal, taxa_vacancia_pct
  - Se Airbnb: diaria_media, taxa_ocupacao_pct, custos_plataforma_pct
  - Se Misto: ambos os campos

Validação:
  - Campos obrigatórios: nome, tipo, area_util, valor_compra, data_compra
  - valor_compra > 0
  - area_util > 0
  - data_compra no passado ou hoje
```

### 3.2 Componentes Auxiliares

**Arquivo:** `frontend/src/components/CurrencyInput.tsx`
```
Input formatado para R$ com máscara (1.234.567,89)
- Armazena valor numérico, exibe formatado
- Suporta paste de valores com/sem formatação
```

**Arquivo:** `frontend/src/components/ConfirmDialog.tsx`
```
Modal de confirmação para delete
- "Tem certeza que deseja excluir {nome}?"
- Botão Cancelar + Botão Confirmar (vermelho)
```

### 3.3 Edição Inline

- PropertyCard ganha botões de editar (ícone lápis) e deletar (ícone lixeira)
- Editar abre o mesmo PropertyForm preenchido
- Deletar abre ConfirmDialog

**Estimativa de arquivos:**
| Ação | Arquivo |
|------|---------|
| Criar | `frontend/src/components/PropertyForm.tsx` |
| Criar | `frontend/src/components/CurrencyInput.tsx` |
| Criar | `frontend/src/components/ConfirmDialog.tsx` |
| Modificar | `frontend/src/components/PropertyCard.tsx` (botões edit/delete) |
| Modificar | `frontend/src/App.tsx` (modal state, handlers) |

---

## Fase 4 — Mapas Interativos

### 4.1 Dependências

```
npm install leaflet react-leaflet @types/leaflet
```

### 4.2 Componente de Mapa Principal

**Arquivo:** `frontend/src/components/PropertyMap.tsx`

```typescript
// Mapa com react-leaflet mostrando:
// 1. Marker para cada imóvel do portfólio (com popup de resumo)
// 2. Centralizado na média das coordenadas dos imóveis
// 3. Zoom automático para caber todos os markers

interface PropertyMapProps {
  imoveis: Imovel[];
  selectedId?: string;
  onSelectImovel?: (id: string) => void;
}

// Popup de cada marker mostra:
// - Nome do imóvel
// - Tipo + Bairro
// - Valor de compra
// - Yield bruto
// - Link "Ver detalhes"
```

### 4.3 Heatmap de Preços por Bairro

**Arquivo:** `frontend/src/components/PriceHeatmap.tsx`

```typescript
// Usa GeoJSON do IBGE (endpoint já existe: ibge.get_malha_geojson)
// Cores por faixa de preço/m² (dados ITBI ou FipeZAP)

// Backend - novo endpoint necessário:
// GET /api/v1/mapa/precos/{cidade}
//   → Retorna GeoJSON com propriedade preco_m2 por bairro
//   → Cruza IBGE malha + ITBI preço por bairro

// Escala de cores:
// < R$5.000/m²   → verde
// R$5-10k/m²     → amarelo
// R$10-20k/m²    → laranja
// > R$20k/m²     → vermelho
```

### 4.4 Novo Endpoint Backend (Mapa de Preços)

**Arquivo:** `backend/src/api/routes.py` (adicionar)

```
GET /api/v1/mapa/precos/{cidade}
  - Busca malha GeoJSON via IBGEClient
  - Cruza com dados de preço/m² por bairro (ITBI se disponível, ou FipeZAP)
  - Retorna GeoJSON enriquecido com { preco_m2, qtd_transacoes } por feature

GET /api/v1/mapa/imoveis
  - Retorna lista de { id, nome, lat, lng, valor, yield_bruto } para plotar markers
```

### 4.5 Geocoding (endereço → lat/lng)

**Arquivo:** `backend/src/data_sources/geocoding.py`

```python
# Usar Nominatim (OpenStreetMap) - gratuito
# Rate limit: 1 req/segundo
# Cache em SQLite para evitar repetição

class GeocodingClient:
    async def geocode(endereco: str, cidade: str, uf: str) -> tuple[float, float]
    # Retorna (latitude, longitude) ou None
    # Busca: "{logradouro}, {numero}, {bairro}, {cidade} - {uf}, Brasil"
```

### 4.6 Integração no Layout

- Tab/toggle no App.tsx para alternar entre "Lista" e "Mapa"
- Modo mapa: mapa ocupa toda a largura, sidebar com detalhes
- Clicar no marker seleciona o imóvel (mesmo selectedId do store)

### 4.7 CSS do Leaflet

**Arquivo:** `frontend/src/index.css` (adicionar)
```css
/* Importar CSS do Leaflet */
@import 'leaflet/dist/leaflet.css';
```

**Estimativa de arquivos:**
| Ação | Arquivo |
|------|---------|
| Criar | `frontend/src/components/PropertyMap.tsx` |
| Criar | `frontend/src/components/PriceHeatmap.tsx` |
| Criar | `backend/src/data_sources/geocoding.py` |
| Modificar | `backend/src/api/routes.py` (endpoints mapa) |
| Modificar | `frontend/src/App.tsx` (toggle lista/mapa) |
| Modificar | `frontend/src/index.css` (leaflet CSS) |
| Modificar | `frontend/src/store/useStore.ts` (viewMode state) |

---

## Fase 5 — Simulador de Financiamento

### 5.1 Serviço Backend

**Arquivo:** `backend/src/services/financing.py`

```python
class FinancingService:

    def tabela_sac(
        valor_financiado: float,
        taxa_juros_anual: float,
        prazo_meses: int,
        valor_seguro_mensal: float = 0,
        taxa_administracao_mensal: float = 25
    ) -> dict:
        """
        Retorna:
        {
            tabela: [
                {
                    parcela: int,
                    amortizacao: float,
                    juros: float,
                    seguro: float,
                    prestacao: float,
                    saldo_devedor: float
                }, ...
            ],
            resumo: {
                primeira_parcela: float,
                ultima_parcela: float,
                total_pago: float,
                total_juros: float,
                total_seguro: float,
                custo_efetivo_total: float  # CET
            }
        }
        """

    def tabela_price(
        valor_financiado: float,
        taxa_juros_anual: float,
        prazo_meses: int,
        ...
    ) -> dict:
        # Mesma estrutura de retorno, parcela fixa

    def comparar_sac_vs_price(
        valor_financiado: float,
        taxa_juros_anual: float,
        prazo_meses: int
    ) -> dict:
        """
        Retorna:
        {
            sac: { resumo },
            price: { resumo },
            economia_sac: float,  # diferença total pago
            recomendacao: str
        }
        """

    def comparar_avista_vs_financiado(
        valor_imovel: float,
        valor_entrada: float,
        taxa_juros_anual: float,
        prazo_meses: int,
        taxa_rendimento_anual: float  # quanto renderia investido
    ) -> dict:
        """
        Compara: comprar à vista vs financiar e investir a diferença
        Retorna projeção de patrimônio ao longo do tempo
        """
```

### 5.2 Endpoints

```
POST /api/v1/financiamento/sac
POST /api/v1/financiamento/price
POST /api/v1/financiamento/comparar
POST /api/v1/financiamento/avista-vs-financiado
```

**Request schema:**
```python
class FinanciamentoRequest(BaseModel):
    valor_imovel: float
    valor_entrada: float
    taxa_juros_anual: float
    prazo_meses: int = 360  # 30 anos default
    sistema: str = "SAC"    # SAC ou PRICE
```

### 5.3 Componente Frontend

**Arquivo:** `frontend/src/components/FinancingSimulator.tsx`

```
Layout:
┌─────────────────────────────────────────┐
│ Simulador de Financiamento              │
├──────────────┬──────────────────────────┤
│ Inputs:      │ Resultado:               │
│ Valor imóvel │ ┌─ SAC ─────┬─ PRICE ─┐ │
│ Entrada      │ │ 1ª parc   │ Parcela  │ │
│ Taxa juros   │ │ Última    │ fixa     │ │
│ Prazo        │ │ Total     │ Total    │ │
│ [Calcular]   │ └───────────┴──────────┘ │
│              │                           │
│              │ Gráfico: evolução parcela │
│              │ Gráfico: saldo devedor    │
│              │ Tabela: amortização       │
│              │ (colapsável, com export)  │
├──────────────┴──────────────────────────┤
│ À Vista vs Financiado                   │
│ Gráfico: patrimônio ao longo do tempo   │
└─────────────────────────────────────────┘
```

**Gráficos (Recharts):**
1. Linha: evolução da parcela (SAC decrescente vs PRICE constante)
2. Área: saldo devedor ao longo do tempo
3. Barra empilhada: composição da parcela (amortização + juros)
4. Linha dupla: patrimônio à vista vs financiado

**Estimativa de arquivos:**
| Ação | Arquivo |
|------|---------|
| Criar | `backend/src/services/financing.py` |
| Criar | `frontend/src/components/FinancingSimulator.tsx` |
| Modificar | `backend/src/api/routes.py` (endpoints financiamento) |
| Modificar | `frontend/src/App.tsx` (nova tab/rota) |
| Criar | `backend/tests/test_financing.py` |

---

## Fase 6 — Polimento e Qualidade

### 6.1 Refatorações no Frontend

- Extrair `getYieldForProperty()` duplicado em App/PropertyCard/PortfolioSummary para um hook `usePropertyMetrics(imovel)`
- Remover taxa de administração hardcoded (8%) — buscar do backend ou config
- Loading skeletons para todos os componentes que fazem fetch
- Error boundaries com fallback UI
- Toast notifications para sucesso/erro de operações CRUD

### 6.2 Testes

**Backend:**
| Teste | Arquivo |
|-------|---------|
| CRUD SQLite | `tests/test_crud.py` |
| API endpoints | `tests/test_api.py` |
| Financing calcs | `tests/test_financing.py` |
| Geocoding | `tests/test_geocoding.py` |

**Frontend:**
| Teste | Arquivo |
|-------|---------|
| API client | `src/services/__tests__/api.test.ts` |
| Store | `src/store/__tests__/useStore.test.ts` |
| PropertyForm | `src/components/__tests__/PropertyForm.test.ts` |

### 6.3 Configuração

**Arquivo:** `backend/.env.example`
```
DATABASE_URL=sqlite:///data/imoveis.db
CORS_ORIGINS=http://localhost:5173
BCB_TIMEOUT=30
```

**Arquivo:** `frontend/.env.example`
```
VITE_API_URL=http://localhost:8000
```

### 6.4 Docker Compose (produção)

**Arquivo:** `docker-compose.yml`
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes: ["./data:/app/data"]  # SQLite persistence
    env_file: ./backend/.env

  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [backend]
```

---

## Fase 7 — Mobile-First + Dark Mode (Dracula-inspired) ✅

### 7.1 Mobile-First Responsive Redesign
- Reescrito App.css com media queries `min-width` (mobile-first)
- Breakpoints: 480px (tablet portrait), 768px (tablet landscape), 1024px (desktop)
- Layout base mobile: single column, full-width cards, stacked grids
- Form modal: full-screen no mobile, 600px max no desktop
- Map: `60vh` responsivo em vez de 500px fixo
- Botões/inputs: min-height 44px (touch-friendly)
- Tabs e form-tabs com scroll horizontal no mobile
- Font-size 16px nos inputs (previne zoom no iOS)

### 7.2 Dark Mode (VSCode Dracula-inspired)
- Todas as cores extraídas para CSS custom properties (`:root` / `[data-theme="dark"]`)
- Paleta dark: #282a36 (bg), #343746 (cards), #44475a (borders), #f8f8f2 (text), #50fa7b (green), #ff5555 (red), #bd93f9 (purple), #8be9fd (cyan), #ffb86c (orange), #ff79c6 (pink)
- Toggle Sun/Moon no header, persistido em localStorage
- Respeita `prefers-color-scheme` como default
- State gerenciado no Zustand store (`theme`, `toggleTheme`)
- Hook `useThemeColors()` para cores nos charts (Recharts)
- Overrides CSS para Recharts tooltips/grids/legends no dark mode
- Leaflet tiles com filtro CSS para dark mode

### Arquivos Modificados
| Arquivo | Mudança |
|---------|---------|
| `frontend/src/App.css` | CSS variables + mobile-first rewrite completo |
| `frontend/src/index.css` | Theme-aware body styles |
| `frontend/src/store/useStore.ts` | `theme` state + `toggleTheme` action |
| `frontend/src/App.tsx` | Theme toggle button (Sun/Moon) |
| `frontend/src/hooks/useThemeColors.ts` | **NOVO** — hook para cores de charts |
| `frontend/src/components/YieldBreakdown.tsx` | Chart colors via hook |
| `frontend/src/components/BenchmarkChart.tsx` | Chart colors via hook |
| `frontend/src/components/EquityDebtChart.tsx` | Chart colors via hook |
| `frontend/src/components/PortfolioEvolution.tsx` | Chart colors via hook |
| `frontend/src/components/FinancingSimulator.tsx` | Chart colors via hook |
| `frontend/src/components/PropertyCard.tsx` | Remove inline style colors |

---

## Ordem de Execução (Priorizada)

```
Fase 1 → Fase 2 → Fase 4 → Fase 3 → Fase 5 → Fase 7 ✅ → Fase 6
  DB       API      Mapas    Form     Financ.   UI/UX       Polish
```

**Justificativa da ordem:**
1. **Fase 1 (DB)** — Pré-requisito para tudo; sem persistência não há app real
2. **Fase 2 (API)** — Conecta frontend ao backend; maior impacto visual imediato
3. **Fase 4 (Mapas)** — Prioridade do usuário; diferencial visual forte
4. **Fase 3 (Form)** — CRUD permite sair do mock; depende da Fase 1+2
5. **Fase 5 (Financ.)** — Feature nova independente; pode ser feita em paralelo com Fase 4
6. **Fase 7 (Mobile-First + Dark Mode)** — UX essencial; mobile-first e tema escuro
7. **Fase 6 (Polish)** — Qualidade e testes; último passo antes de "produção"

---

## Resumo de Arquivos

### Criar (16 arquivos)
```
backend/src/database/__init__.py
backend/src/database/db.py
backend/src/database/schema.sql
backend/src/database/repository.py
backend/src/services/financing.py
backend/src/data_sources/geocoding.py
backend/tests/test_crud.py
backend/tests/test_financing.py
backend/.env.example
frontend/src/services/api.ts
frontend/src/types/index.ts
frontend/src/store/useStore.ts
frontend/src/components/PropertyForm.tsx
frontend/src/components/PropertyMap.tsx
frontend/src/components/PriceHeatmap.tsx
frontend/src/components/FinancingSimulator.tsx
frontend/src/components/CurrencyInput.tsx
frontend/src/components/ConfirmDialog.tsx
```

### Modificar (10 arquivos)
```
backend/src/api/routes.py          (CRUD + mapa + financiamento endpoints)
backend/requirements.txt            (aiosqlite)
frontend/vite.config.ts             (proxy)
frontend/src/App.tsx                (store, layout, tabs)
frontend/src/components/PropertyCard.tsx     (real types, edit/delete)
frontend/src/components/YieldBreakdown.tsx   (API fetch)
frontend/src/components/BenchmarkChart.tsx   (real benchmarks)
frontend/src/components/PortfolioSummary.tsx (store integration)
frontend/src/index.css              (leaflet CSS)
frontend/package.json               (zustand, leaflet deps)
```

### Deletar (1 arquivo)
```
frontend/src/services/mockData.ts
```

---

## Dependências Novas

**Backend:**
- `aiosqlite>=0.19.0`

**Frontend:**
- `zustand` (state management)
- `leaflet` + `react-leaflet` + `@types/leaflet` (mapas)

**Total estimado: ~27 arquivos tocados**
