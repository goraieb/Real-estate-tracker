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
