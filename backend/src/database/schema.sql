CREATE TABLE IF NOT EXISTS imoveis (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'apartamento',

    -- Endereço
    logradouro TEXT DEFAULT '',
    numero TEXT DEFAULT '',
    bairro TEXT DEFAULT '',
    cidade TEXT DEFAULT 'São Paulo',
    uf TEXT DEFAULT 'SP',
    cep TEXT DEFAULT '',
    latitude REAL,
    longitude REAL,

    -- Características
    area_util REAL NOT NULL,
    quartos INTEGER DEFAULT 0,
    vagas INTEGER DEFAULT 0,
    andar INTEGER,
    ano_construcao INTEGER,

    -- Compra
    valor_compra REAL NOT NULL,
    data_compra TEXT NOT NULL,
    itbi_pago REAL DEFAULT 0,
    custos_cartorio REAL DEFAULT 0,
    comissao_corretor REAL DEFAULT 0,

    -- Financiamento
    valor_financiado REAL DEFAULT 0,
    taxa_juros_anual REAL DEFAULT 0,
    prazo_meses INTEGER DEFAULT 0,
    banco TEXT DEFAULT '',
    sistema TEXT DEFAULT 'SAC',
    saldo_devedor REAL DEFAULT 0,

    -- Custos recorrentes
    iptu_anual REAL DEFAULT 0,
    condominio_mensal REAL DEFAULT 0,
    seguro_anual REAL DEFAULT 0,
    manutencao_mensal REAL DEFAULT 0,

    -- Renda
    tipo_renda TEXT DEFAULT 'aluguel_longterm',
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
    notas TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_imoveis_cidade ON imoveis(cidade);
CREATE INDEX IF NOT EXISTS idx_imoveis_bairro ON imoveis(bairro);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo);

-- ============================================
-- ITBI TRANSACTIONS (Market Explorer)
-- ============================================

CREATE TABLE IF NOT EXISTS transacoes_itbi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cidade TEXT NOT NULL DEFAULT 'São Paulo',
    bairro TEXT,
    logradouro TEXT,
    numero TEXT,
    sql_cadastral TEXT,
    tipo_imovel TEXT,
    area_construida REAL,
    area_terreno REAL,
    valor_transacao REAL NOT NULL,
    preco_m2 REAL,
    data_transacao TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    geocoded INTEGER DEFAULT 0,
    fonte TEXT DEFAULT 'prefeitura_sp',
    criado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transacoes_cidade ON transacoes_itbi(cidade);
CREATE INDEX IF NOT EXISTS idx_transacoes_bairro ON transacoes_itbi(bairro);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes_itbi(data_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_geo ON transacoes_itbi(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_transacoes_preco ON transacoes_itbi(preco_m2);

CREATE TABLE IF NOT EXISTS geocode_cache (
    endereco_normalizado TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL,
    provider TEXT DEFAULT 'nominatim',
    criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS market_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    bairro TEXT,
    logradouro TEXT,
    preco_m2_limite REAL,
    yield_limite REAL,
    ativo INTEGER DEFAULT 1,
    ultimo_disparo TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ECONOMIC INDICATORS CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS indicadores_economicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fonte TEXT NOT NULL,          -- 'bcb', 'ipeadata', 'b3', 'abecip'
    serie TEXT NOT NULL,          -- 'selic', 'ipca', 'igpm', 'ifix', etc.
    data TEXT NOT NULL,
    valor REAL NOT NULL,
    criado_em TEXT DEFAULT (datetime('now')),
    UNIQUE(fonte, serie, data)
);

CREATE INDEX IF NOT EXISTS idx_indicadores_fonte_serie ON indicadores_economicos(fonte, serie);
CREATE INDEX IF NOT EXISTS idx_indicadores_data ON indicadores_economicos(data);

-- ============================================
-- FIPEZAP PRICE INDEX CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS fipezap_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,           -- 'venda' or 'locacao'
    cidade TEXT NOT NULL,
    data TEXT NOT NULL,
    preco_m2 REAL NOT NULL,
    variacao_mensal REAL,
    criado_em TEXT DEFAULT (datetime('now')),
    UNIQUE(tipo, cidade, data)
);

CREATE INDEX IF NOT EXISTS idx_fipezap_cidade ON fipezap_precos(cidade);
CREATE INDEX IF NOT EXISTS idx_fipezap_tipo ON fipezap_precos(tipo);
CREATE INDEX IF NOT EXISTS idx_fipezap_data ON fipezap_precos(data);

-- ============================================
-- AIRBNB LISTINGS CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS airbnb_listings (
    id INTEGER PRIMARY KEY,
    cidade TEXT NOT NULL,
    bairro TEXT,
    latitude REAL,
    longitude REAL,
    tipo_quarto TEXT,
    preco_noite REAL,
    minimo_noites INTEGER,
    qtd_reviews INTEGER,
    reviews_por_mes REAL,
    disponibilidade_365 INTEGER,
    snapshot_data TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_airbnb_cidade ON airbnb_listings(cidade);
CREATE INDEX IF NOT EXISTS idx_airbnb_bairro ON airbnb_listings(bairro);

-- ============================================
-- DATA LOAD STATUS TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS data_load_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,         -- 'itbi', 'bcb', 'fipezap', 'airbnb', 'ibge', etc.
    status TEXT NOT NULL,         -- 'running', 'completed', 'failed'
    records_loaded INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);
